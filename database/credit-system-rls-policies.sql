-- 积分系统Row Level Security (RLS) 策略
-- 确保用户只能访问自己的积分和支付数据，保护隐私和安全

-- 1. 启用RLS并创建user_credits表的策略

-- 启用RLS
ALTER TABLE user_credits ENABLE ROW LEVEL SECURITY;

-- 用户只能查看自己的积分信息
CREATE POLICY "Users can view own credits" ON user_credits
    FOR SELECT USING (auth.uid() = id);

-- 用户只能更新自己的积分信息（通过应用逻辑，不直接更新）
CREATE POLICY "Users can update own credits" ON user_credits
    FOR UPDATE USING (auth.uid() = id);

-- 用户可以插入自己的积分记录（注册时）
CREATE POLICY "Users can insert own credits" ON user_credits
    FOR INSERT WITH CHECK (auth.uid() = id);

-- 服务端可以访问所有积分记录（用于云函数和管理）
CREATE POLICY "Service role can access all credits" ON user_credits
    FOR ALL USING (
        current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
    );

-- 2. 设置subscriptions表的RLS策略

-- 启用RLS
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- 用户只能查看自己的订阅信息
CREATE POLICY "Users can view own subscriptions" ON subscriptions
    FOR SELECT USING (auth.uid() = user_id);

-- 服务端可以管理所有订阅记录
CREATE POLICY "Service role can manage all subscriptions" ON subscriptions
    FOR ALL USING (
        current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
    );

-- 3. 设置credit_transactions表的RLS策略

-- 启用RLS
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;

-- 用户只能查看自己的积分交易记录
CREATE POLICY "Users can view own credit transactions" ON credit_transactions
    FOR SELECT USING (auth.uid() = user_id);

-- 服务端可以管理所有积分交易记录
CREATE POLICY "Service role can manage all credit transactions" ON credit_transactions
    FOR ALL USING (
        current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
    );

-- 4. 设置payment_records表的RLS策略

-- 启用RLS
ALTER TABLE payment_records ENABLE ROW LEVEL SECURITY;

-- 用户只能查看自己的支付记录
CREATE POLICY "Users can view own payment records" ON payment_records
    FOR SELECT USING (auth.uid() = user_id);

-- 服务端可以管理所有支付记录
CREATE POLICY "Service role can manage all payment records" ON payment_records
    FOR ALL USING (
        current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
    );

-- 5. 创建安全函数，绕过RLS进行必要的积分操作

-- 创建一个安全函数来检查用户积分余额（绕过RLS）
CREATE OR REPLACE FUNCTION check_user_credit_balance(user_uuid UUID)
RETURNS TABLE(
    total_credits INTEGER,
    can_analyze BOOLEAN,
    subscription_status TEXT,
    subscription_expires_at TIMESTAMP WITH TIME ZONE
) 
SECURITY DEFINER -- 使用函数定义者的权限执行
SET search_path = public
AS $$
DECLARE
    user_credits INTEGER := 0;
    sub_status TEXT := NULL;
    sub_expires TIMESTAMP WITH TIME ZONE := NULL;
BEGIN
    -- 查询用户积分信息
    SELECT uc.credits, s.status, s.current_period_end
    INTO user_credits, sub_status, sub_expires
    FROM user_credits uc
    LEFT JOIN subscriptions s ON s.user_id = uc.id AND s.status = 'active'
    WHERE uc.id = user_uuid;
    
    -- 如果用户积分记录不存在，创建默认记录
    IF NOT FOUND THEN
        INSERT INTO user_credits (id, credits, trial_credits, monthly_credits)
        VALUES (user_uuid, 200, 0, 200);
        user_credits := 200;
    END IF;
    
    -- 返回积分状态
    RETURN QUERY SELECT 
        user_credits,
        (user_credits > 0),
        COALESCE(sub_status, 'none'),
        sub_expires;
END;
$$ LANGUAGE plpgsql;

-- 创建一个安全函数来检查设备试用积分（绕过RLS）
CREATE OR REPLACE FUNCTION check_device_credit_balance(fingerprint_hash_param TEXT)
RETURNS TABLE(
    remaining_credits INTEGER,
    can_analyze BOOLEAN,
    is_registered BOOLEAN
) 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    trial_credits INTEGER := 100;
    credits_used INTEGER := 0;
    associated_user UUID := NULL;
    remaining INTEGER;
BEGIN
    -- 查询设备指纹积分信息
    SELECT df.trial_credits, df.credits_used, df.user_id 
    INTO trial_credits, credits_used, associated_user
    FROM device_fingerprints df
    WHERE df.fingerprint_hash = fingerprint_hash_param 
    AND df.deleted_at IS NULL;
    
    -- 如果设备指纹不存在，创建新记录
    IF NOT FOUND THEN
        INSERT INTO device_fingerprints (fingerprint_hash, trial_credits, credits_used, last_used_at)
        VALUES (fingerprint_hash_param, 100, 0, NOW());
        
        -- 返回新设备的状态
        RETURN QUERY SELECT 100, true, false;
        RETURN;
    END IF;
    
    -- 更新最后使用时间
    UPDATE device_fingerprints 
    SET last_used_at = NOW()
    WHERE fingerprint_hash = fingerprint_hash_param 
    AND deleted_at IS NULL;
    
    -- 计算剩余积分
    remaining := COALESCE(trial_credits, 100) - COALESCE(credits_used, 0);
    
    -- 如果已关联用户，不能再使用试用积分
    IF associated_user IS NOT NULL THEN
        RETURN QUERY SELECT 0, false, true;
        RETURN;
    END IF;
    
    -- 返回试用积分状态
    RETURN QUERY SELECT 
        remaining,
        (remaining > 0),
        false;
END;
$$ LANGUAGE plpgsql;

-- 创建一个安全函数来处理积分消费（包含完整的业务逻辑）
CREATE OR REPLACE FUNCTION process_credit_consumption(
    user_uuid UUID DEFAULT NULL,
    fingerprint_hash_param TEXT DEFAULT NULL,
    credits_required INTEGER DEFAULT 1,
    analysis_description TEXT DEFAULT 'Audio analysis',
    analysis_id TEXT DEFAULT NULL
)
RETURNS TABLE(
    success BOOLEAN,
    message TEXT,
    remaining_credits INTEGER
)
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    consumption_result BOOLEAN := FALSE;
    remaining INTEGER := 0;
    error_msg TEXT := '';
BEGIN
    -- 参数验证
    IF credits_required <= 0 THEN
        RETURN QUERY SELECT false, 'Invalid credit amount', 0;
        RETURN;
    END IF;
    
    -- 处理注册用户积分消费
    IF user_uuid IS NOT NULL THEN
        -- 调用积分消费函数
        SELECT consume_credits(user_uuid, credits_required, analysis_description, analysis_id)
        INTO consumption_result;
        
        IF consumption_result THEN
            -- 获取剩余积分
            SELECT credits INTO remaining FROM user_credits WHERE id = user_uuid;
            RETURN QUERY SELECT true, 'Credits consumed successfully', remaining;
        ELSE
            -- 获取当前积分用于错误信息
            SELECT COALESCE(credits, 0) INTO remaining FROM user_credits WHERE id = user_uuid;
            RETURN QUERY SELECT false, 'Insufficient credits', remaining;
        END IF;
        
        RETURN;
    END IF;
    
    -- 处理试用用户积分消费
    IF fingerprint_hash_param IS NOT NULL THEN
        -- 调用试用积分消费函数
        SELECT consume_trial_credits(fingerprint_hash_param, credits_required, analysis_description, analysis_id)
        INTO consumption_result;
        
        IF consumption_result THEN
            -- 获取剩余试用积分
            SELECT (trial_credits - credits_used) INTO remaining 
            FROM device_fingerprints 
            WHERE fingerprint_hash = fingerprint_hash_param AND deleted_at IS NULL;
            
            RETURN QUERY SELECT true, 'Trial credits consumed successfully', COALESCE(remaining, 0);
        ELSE
            -- 获取当前剩余积分用于错误信息
            SELECT (trial_credits - credits_used) INTO remaining 
            FROM device_fingerprints 
            WHERE fingerprint_hash = fingerprint_hash_param AND deleted_at IS NULL;
            
            RETURN QUERY SELECT false, 'Insufficient trial credits', COALESCE(remaining, 0);
        END IF;
        
        RETURN;
    END IF;
    
    -- 如果没有提供用户ID或设备指纹，返回错误
    RETURN QUERY SELECT false, 'No user or device identifier provided', 0;
END;
$$ LANGUAGE plpgsql;

-- 创建一个安全函数来处理支付成功后的积分发放
CREATE OR REPLACE FUNCTION process_payment_success(
    user_uuid UUID,
    lemonsqueezy_order_id TEXT,
    lemonsqueezy_subscription_id TEXT,
    amount_usd DECIMAL(10,2),
    credits_purchased INTEGER,
    webhook_data JSONB DEFAULT '{}'
)
RETURNS TABLE(
    success BOOLEAN,
    message TEXT,
    payment_record_id UUID
)
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    payment_id UUID;
    existing_payment UUID;
    credit_add_result BOOLEAN;
BEGIN
    -- 检查是否已经处理过这个支付
    SELECT id INTO existing_payment 
    FROM payment_records 
    WHERE lemonsqueezy_order_id = process_payment_success.lemonsqueezy_order_id;
    
    IF existing_payment IS NOT NULL THEN
        RETURN QUERY SELECT false, 'Payment already processed', existing_payment;
        RETURN;
    END IF;
    
    -- 创建支付记录
    INSERT INTO payment_records (
        user_id, lemonsqueezy_order_id, lemonsqueezy_subscription_id,
        amount_usd, credits_purchased, status, webhook_data, processed_at
    ) VALUES (
        user_uuid, process_payment_success.lemonsqueezy_order_id, process_payment_success.lemonsqueezy_subscription_id,
        amount_usd, credits_purchased, 'completed', webhook_data, NOW()
    ) RETURNING id INTO payment_id;
    
    -- 添加积分到用户账户
    SELECT add_credits(user_uuid, credits_purchased, 'purchase', 'Credit purchase', payment_id)
    INTO credit_add_result;
    
    IF credit_add_result THEN
        RETURN QUERY SELECT true, 'Payment processed and credits added', payment_id;
    ELSE
        -- 如果积分添加失败，更新支付记录状态
        UPDATE payment_records 
        SET status = 'failed' 
        WHERE id = payment_id;
        
        RETURN QUERY SELECT false, 'Failed to add credits', payment_id;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 6. 创建用户注册时的积分初始化触发器函数

-- 当新用户注册时，自动创建积分记录
CREATE OR REPLACE FUNCTION handle_new_user_credits()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO user_credits (id, credits, trial_credits, monthly_credits)
    VALUES (NEW.id, 200, 0, 200);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 创建触发器，在用户注册时自动创建积分记录
-- 注意：这个触发器会在现有的handle_new_user触发器之后执行
CREATE TRIGGER on_auth_user_created_credits
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user_credits();

-- 7. 创建管理员查询函数（仅限服务端使用）

-- 获取积分系统统计信息
CREATE OR REPLACE FUNCTION get_credit_system_stats()
RETURNS TABLE(
    total_users_with_credits BIGINT,
    total_credits_in_system BIGINT,
    total_credits_consumed BIGINT,
    total_credits_purchased BIGINT,
    active_subscriptions BIGINT,
    total_revenue DECIMAL(12,2),
    trial_devices_with_credits BIGINT
)
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        (SELECT COUNT(*) FROM user_credits),
        (SELECT COALESCE(SUM(credits), 0) FROM user_credits),
        (SELECT COALESCE(SUM(ABS(amount)), 0) FROM credit_transactions WHERE transaction_type = 'consume'),
        (SELECT COALESCE(SUM(amount), 0) FROM credit_transactions WHERE source = 'purchase'),
        (SELECT COUNT(*) FROM subscriptions WHERE status = 'active'),
        (SELECT COALESCE(SUM(amount_usd), 0) FROM payment_records WHERE status = 'completed'),
        (SELECT COUNT(*) FROM device_fingerprints WHERE trial_credits > credits_used AND deleted_at IS NULL);
END;
$$ LANGUAGE plpgsql;

-- 8. 创建数据清理和维护函数

-- 清理过期的支付记录（保留重要记录）
CREATE OR REPLACE FUNCTION cleanup_old_payment_records()
RETURNS INTEGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- 删除超过2年的失败支付记录
    DELETE FROM payment_records 
    WHERE status = 'failed'
    AND created_at < NOW() - INTERVAL '2 years';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- 9. 创建用于API的安全查询函数

-- 获取用户完整的积分和订阅信息
CREATE OR REPLACE FUNCTION get_user_credit_summary(user_uuid UUID)
RETURNS TABLE(
    total_credits INTEGER,
    trial_credits INTEGER,
    monthly_credits INTEGER,
    purchased_credits INTEGER,
    subscription_status TEXT,
    subscription_plan TEXT,
    subscription_expires_at TIMESTAMP WITH TIME ZONE,
    this_month_consumed INTEGER,
    total_consumed INTEGER
)
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        uc.credits,
        uc.trial_credits,
        uc.monthly_credits,
        uc.purchased_credits,
        COALESCE(s.status, 'none'),
        COALESCE(s.plan_name, 'none'),
        s.current_period_end,
        COALESCE((
            SELECT SUM(ABS(amount)) 
            FROM credit_transactions ct 
            WHERE ct.user_id = uc.id 
            AND ct.transaction_type = 'consume'
            AND ct.created_at >= DATE_TRUNC('month', CURRENT_DATE)
        ), 0)::INTEGER,
        COALESCE((
            SELECT SUM(ABS(amount)) 
            FROM credit_transactions ct 
            WHERE ct.user_id = uc.id 
            AND ct.transaction_type = 'consume'
        ), 0)::INTEGER
    FROM user_credits uc
    LEFT JOIN subscriptions s ON s.user_id = uc.id AND s.status = 'active'
    WHERE uc.id = user_uuid;
END;
$$ LANGUAGE plpgsql;

-- 10. 授予必要的权限

-- 授予认证用户对自己积分数据的访问权限
GRANT SELECT ON user_credits TO authenticated;
GRANT SELECT ON subscriptions TO authenticated;
GRANT SELECT ON credit_transactions TO authenticated;
GRANT SELECT ON payment_records TO authenticated;

-- 授予匿名用户对设备积分检查函数的执行权限
GRANT EXECUTE ON FUNCTION check_device_credit_balance(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION process_credit_consumption(UUID, TEXT, INTEGER, TEXT, TEXT) TO anon;

-- 授予认证用户对积分相关函数的执行权限
GRANT EXECUTE ON FUNCTION check_user_credit_balance(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_credit_summary(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION process_credit_consumption(UUID, TEXT, INTEGER, TEXT, TEXT) TO authenticated;

-- 授予服务角色对所有积分系统函数的执行权限
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- 11. 创建额外的安全索引

-- 为安全查询创建复合索引
CREATE INDEX idx_credit_transactions_user_type_created ON credit_transactions(user_id, transaction_type, created_at);
CREATE INDEX idx_subscriptions_user_status ON subscriptions(user_id, status);
CREATE INDEX idx_payment_records_user_status ON payment_records(user_id, status);

-- 为设备指纹积分查询创建索引
CREATE INDEX idx_device_fingerprints_hash_deleted ON device_fingerprints(fingerprint_hash, deleted_at) WHERE deleted_at IS NULL;

-- 完成积分系统RLS策略设置
-- 请在Supabase控制台的SQL编辑器中执行此脚本