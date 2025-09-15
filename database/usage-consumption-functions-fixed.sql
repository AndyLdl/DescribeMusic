-- 创建消费使用次数的数据库函数

-- 1. 消费设备试用次数
CREATE OR REPLACE FUNCTION consume_device_trial(fingerprint_hash_param TEXT)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    current_usage INTEGER := 0;
    device_exists BOOLEAN := false;
BEGIN
    -- 检查设备是否存在并获取当前使用次数
    SELECT trial_usage INTO current_usage
    FROM device_fingerprints 
    WHERE fingerprint_hash = fingerprint_hash_param 
    AND deleted_at IS NULL
    AND user_id IS NULL; -- 只处理未关联用户的设备
    
    -- 如果设备不存在或已关联用户，返回false
    IF NOT FOUND THEN
        RETURN false;
    END IF;
    
    -- 检查是否还有试用次数
    IF current_usage >= 5 THEN
        RETURN false;
    END IF;
    
    -- 增加使用次数
    UPDATE device_fingerprints 
    SET trial_usage = trial_usage + 1,
        last_used_at = NOW()
    WHERE fingerprint_hash = fingerprint_hash_param 
    AND deleted_at IS NULL
    AND user_id IS NULL;
    
    RETURN true;
END;
$$ LANGUAGE plpgsql;

-- 2. 消费用户月度使用次数
CREATE OR REPLACE FUNCTION consume_user_monthly_usage(user_uuid UUID)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    current_usage INTEGER := 0;
    monthly_limit INTEGER := 10;
    current_month DATE := CURRENT_DATE;
    last_reset DATE;
BEGIN
    -- 获取用户配置信息
    SELECT current_month_usage, monthly_limit, last_reset_date
    INTO current_usage, monthly_limit, last_reset
    FROM user_profiles 
    WHERE id = user_uuid 
    AND deleted_at IS NULL;
    
    -- 如果用户不存在，返回false
    IF NOT FOUND THEN
        RETURN false;
    END IF;
    
    -- 检查是否需要重置月度计数（新月份）
    IF last_reset IS NULL OR DATE_TRUNC('month', last_reset) < DATE_TRUNC('month', current_month) THEN
        -- 重置月度使用次数
        UPDATE user_profiles 
        SET current_month_usage = 0,
            last_reset_date = current_month
        WHERE id = user_uuid;
        
        current_usage := 0;
    END IF;
    
    -- 检查是否还有月度次数
    IF current_usage >= monthly_limit THEN
        RETURN false;
    END IF;
    
    -- 增加使用次数
    UPDATE user_profiles 
    SET current_month_usage = current_month_usage + 1,
        total_analyses = total_analyses + 1,
        updated_at = NOW()
    WHERE id = user_uuid;
    
    RETURN true;
END;
$$ LANGUAGE plpgsql;

-- 3. 授予执行权限
GRANT EXECUTE ON FUNCTION consume_device_trial(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION consume_user_monthly_usage(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION consume_user_monthly_usage(UUID) TO service_role;