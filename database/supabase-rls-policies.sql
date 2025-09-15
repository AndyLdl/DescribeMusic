-- Supabase Row Level Security (RLS) 策略
-- 确保用户只能访问自己的数据，保护隐私和安全

-- 1. 启用RLS并创建user_profiles表的策略

-- 启用RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- 用户只能查看自己的配置
CREATE POLICY "Users can view own profile" ON user_profiles
    FOR SELECT USING (auth.uid() = id);

-- 用户只能更新自己的配置
CREATE POLICY "Users can update own profile" ON user_profiles
    FOR UPDATE USING (auth.uid() = id);

-- 用户可以插入自己的配置（注册时）
CREATE POLICY "Users can insert own profile" ON user_profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- 用户不能删除配置（使用软删除）
-- CREATE POLICY "Users cannot delete profiles" ON user_profiles
--     FOR DELETE USING (false);

-- 2. 设置device_fingerprints表的RLS策略

-- 启用RLS
ALTER TABLE device_fingerprints ENABLE ROW LEVEL SECURITY;

-- 允许匿名用户查看和更新自己的设备指纹（通过fingerprint_hash匹配）
-- 注意：这里我们不能使用auth.uid()因为匿名用户没有认证
-- 所以我们需要在应用层面控制访问

-- 服务端可以访问所有设备指纹记录（用于云函数）
CREATE POLICY "Service role can access all device fingerprints" ON device_fingerprints
    FOR ALL USING (
        current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
    );

-- 已认证用户可以查看关联到自己的设备指纹
CREATE POLICY "Users can view own associated device fingerprints" ON device_fingerprints
    FOR SELECT USING (auth.uid() = user_id);

-- 已认证用户可以更新关联到自己的设备指纹
CREATE POLICY "Users can update own associated device fingerprints" ON device_fingerprints
    FOR UPDATE USING (auth.uid() = user_id);

-- 3. 设置usage_logs表的RLS策略

-- 启用RLS
ALTER TABLE usage_logs ENABLE ROW LEVEL SECURITY;

-- 用户只能查看自己的使用记录
CREATE POLICY "Users can view own usage logs" ON usage_logs
    FOR SELECT USING (auth.uid() = user_id);

-- 服务端可以插入使用记录
CREATE POLICY "Service role can insert usage logs" ON usage_logs
    FOR INSERT WITH CHECK (
        current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
    );

-- 服务端可以查看所有使用记录（用于统计和管理）
CREATE POLICY "Service role can view all usage logs" ON usage_logs
    FOR SELECT USING (
        current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
    );

-- 4. 创建视图的RLS策略

-- 为user_usage_stats视图创建RLS策略
-- 注意：视图会继承基础表的RLS策略，但我们可以添加额外的限制

-- 5. 创建安全函数，绕过RLS进行必要的操作

-- 创建一个安全函数来检查设备指纹使用情况（绕过RLS）
CREATE OR REPLACE FUNCTION check_device_fingerprint_usage(fingerprint_hash_param TEXT)
RETURNS TABLE(
    can_analyze BOOLEAN,
    remaining_trials INTEGER,
    is_registered BOOLEAN
) 
SECURITY DEFINER -- 使用函数定义者的权限执行
SET search_path = public
AS $$
DECLARE
    trial_count INTEGER := 0;
    associated_user UUID := NULL;
BEGIN
    -- 查询设备指纹信息
    SELECT df.trial_usage, df.user_id 
    INTO trial_count, associated_user
    FROM device_fingerprints df
    WHERE df.fingerprint_hash = fingerprint_hash_param 
    AND df.deleted_at IS NULL;
    
    -- 如果设备指纹不存在，创建新记录
    IF NOT FOUND THEN
        INSERT INTO device_fingerprints (fingerprint_hash, trial_usage, last_used_at)
        VALUES (fingerprint_hash_param, 0, NOW());
        
        -- 返回新设备的状态
        RETURN QUERY SELECT true, 5, false;
        RETURN;
    END IF;
    
    -- 更新最后使用时间
    UPDATE device_fingerprints 
    SET last_used_at = NOW()
    WHERE fingerprint_hash = fingerprint_hash_param 
    AND deleted_at IS NULL;
    
    -- 如果已关联用户，不能再使用试用
    IF associated_user IS NOT NULL THEN
        RETURN QUERY SELECT false, 0, true;
        RETURN;
    END IF;
    
    -- 返回试用状态
    RETURN QUERY SELECT 
        (trial_count < 5), 
        (5 - trial_count), 
        false;
END;
$$ LANGUAGE plpgsql;

-- 创建一个安全函数来获取或创建设备指纹记录
CREATE OR REPLACE FUNCTION get_or_create_device_fingerprint(fingerprint_hash_param TEXT)
RETURNS UUID
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    device_id UUID;
BEGIN
    -- 尝试获取现有设备指纹
    SELECT id INTO device_id
    FROM device_fingerprints 
    WHERE fingerprint_hash = fingerprint_hash_param 
    AND deleted_at IS NULL;
    
    -- 如果不存在，创建新记录
    IF NOT FOUND THEN
        INSERT INTO device_fingerprints (fingerprint_hash, trial_usage, last_used_at)
        VALUES (fingerprint_hash_param, 0, NOW())
        RETURNING id INTO device_id;
    ELSE
        -- 更新最后使用时间
        UPDATE device_fingerprints 
        SET last_used_at = NOW()
        WHERE id = device_id;
    END IF;
    
    RETURN device_id;
END;
$$ LANGUAGE plpgsql;

-- 创建一个安全函数来关联设备指纹到用户（注册时）
CREATE OR REPLACE FUNCTION associate_device_fingerprint_to_user(
    fingerprint_hash_param TEXT,
    user_uuid UUID
)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    device_id UUID;
    existing_user UUID;
BEGIN
    -- 查找设备指纹
    SELECT id, user_id INTO device_id, existing_user
    FROM device_fingerprints 
    WHERE fingerprint_hash = fingerprint_hash_param 
    AND deleted_at IS NULL;
    
    -- 如果设备指纹不存在，返回false
    IF NOT FOUND THEN
        RETURN false;
    END IF;
    
    -- 如果已经关联到其他用户，返回false
    IF existing_user IS NOT NULL AND existing_user != user_uuid THEN
        RETURN false;
    END IF;
    
    -- 关联设备指纹到用户
    UPDATE device_fingerprints 
    SET user_id = user_uuid, last_used_at = NOW()
    WHERE id = device_id;
    
    RETURN true;
END;
$$ LANGUAGE plpgsql;

-- 6. 创建用户注册时的触发器函数

-- 当新用户注册时，自动创建用户配置记录
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO user_profiles (id, monthly_limit, current_month_usage, total_analyses)
    VALUES (NEW.id, 10, 0, 0);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 创建触发器，在用户注册时自动创建配置
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- 7. 创建管理员查询函数（仅限服务端使用）

-- 获取系统统计信息
CREATE OR REPLACE FUNCTION get_system_stats()
RETURNS TABLE(
    total_users BIGINT,
    active_users_this_month BIGINT,
    total_analyses BIGINT,
    analyses_this_month BIGINT,
    trial_devices BIGINT,
    registered_devices BIGINT
)
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        (SELECT COUNT(*) FROM user_profiles WHERE deleted_at IS NULL),
        (SELECT COUNT(DISTINCT user_id) FROM usage_logs 
         WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE) AND user_id IS NOT NULL),
        (SELECT COUNT(*) FROM usage_logs WHERE success = true),
        (SELECT COUNT(*) FROM usage_logs 
         WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE) AND success = true),
        (SELECT COUNT(*) FROM device_fingerprints 
         WHERE user_id IS NULL AND deleted_at IS NULL),
        (SELECT COUNT(*) FROM device_fingerprints 
         WHERE user_id IS NOT NULL AND deleted_at IS NULL);
END;
$$ LANGUAGE plpgsql;

-- 8. 创建数据清理和维护函数

-- 清理孤立的使用记录（没有关联用户或设备的记录）
CREATE OR REPLACE FUNCTION cleanup_orphaned_usage_logs()
RETURNS INTEGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM usage_logs 
    WHERE user_id IS NULL 
    AND device_fingerprint_id IS NULL
    AND created_at < NOW() - INTERVAL '30 days';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- 9. 创建用于API的安全查询函数

-- 检查用户月度使用限制
CREATE OR REPLACE FUNCTION check_user_monthly_limit(user_uuid UUID)
RETURNS TABLE(
    can_analyze BOOLEAN,
    remaining_analyses INTEGER,
    monthly_limit INTEGER,
    current_usage INTEGER,
    reset_date DATE
)
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    user_limit INTEGER;
    user_usage INTEGER;
    last_reset DATE;
BEGIN
    -- 首先检查是否需要重置月度计数
    PERFORM reset_monthly_usage();
    
    -- 获取用户使用情况
    SELECT up.monthly_limit, up.current_month_usage, up.last_reset_date
    INTO user_limit, user_usage, last_reset
    FROM user_profiles up
    WHERE up.id = user_uuid AND up.deleted_at IS NULL;
    
    -- 如果用户不存在
    IF NOT FOUND THEN
        RETURN QUERY SELECT false, 0, 0, 0, CURRENT_DATE;
        RETURN;
    END IF;
    
    -- 返回使用状态
    RETURN QUERY SELECT 
        (user_usage < user_limit),
        (user_limit - user_usage),
        user_limit,
        user_usage,
        last_reset;
END;
$$ LANGUAGE plpgsql;

-- 10. 授予必要的权限

-- 授予认证用户对自己数据的访问权限
GRANT SELECT, UPDATE ON user_profiles TO authenticated;
GRANT SELECT ON usage_logs TO authenticated;
GRANT SELECT ON device_fingerprints TO authenticated;

-- 授予匿名用户对设备指纹检查函数的执行权限
GRANT EXECUTE ON FUNCTION check_device_fingerprint_usage(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION get_or_create_device_fingerprint(TEXT) TO anon;

-- 授予认证用户对用户相关函数的执行权限
GRANT EXECUTE ON FUNCTION check_user_monthly_limit(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION associate_device_fingerprint_to_user(TEXT, UUID) TO authenticated;

-- 授予服务角色对所有函数的执行权限
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- 完成RLS策略设置
-- 请在Supabase控制台的SQL编辑器中执行此脚本