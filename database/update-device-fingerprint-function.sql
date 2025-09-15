-- 更新设备指纹检查函数，使其在检查时自动创建记录
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