-- Supabase数据库表结构
-- 用于音频分析应用的用户认证和使用限制功能

-- 1. 用户配置表 (user_profiles)
-- 扩展Supabase内置的auth.users表
CREATE TABLE user_profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  monthly_limit INTEGER DEFAULT 10,
  current_month_usage INTEGER DEFAULT 0,
  last_reset_date DATE DEFAULT CURRENT_DATE,
  -- 用户偏好设置
  preferences JSONB DEFAULT '{}',
  -- 用户统计信息
  total_analyses INTEGER DEFAULT 0,
  -- 软删除标记
  deleted_at TIMESTAMP WITH TIME ZONE NULL
);

-- 2. 设备指纹表 (device_fingerprints)
-- 用于管理未注册用户的试用次数
CREATE TABLE device_fingerprints (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  fingerprint_hash TEXT UNIQUE NOT NULL,
  trial_usage INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- 关联到用户（注册后）
  user_id UUID REFERENCES auth.users(id) NULL,
  -- 存储设备信息（已哈希，用于调试）
  metadata JSONB DEFAULT '{}',
  -- 软删除标记
  deleted_at TIMESTAMP WITH TIME ZONE NULL
);

-- 3. 使用记录表 (usage_logs)
-- 记录所有音频分析的使用情况
CREATE TABLE usage_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NULL,
  device_fingerprint_id UUID REFERENCES device_fingerprints(id) NULL,
  analysis_type TEXT NOT NULL DEFAULT 'audio_analysis',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- 文件信息
  file_name TEXT,
  file_size BIGINT,
  file_format TEXT,
  -- 处理信息
  processing_time INTEGER,
  success BOOLEAN DEFAULT TRUE,
  error_message TEXT NULL,
  -- 与现有历史记录系统集成
  analysis_result_id TEXT NULL,
  -- 分析结果摘要（用于统计）
  result_summary JSONB DEFAULT '{}'
);

-- 4. 创建索引优化查询性能

-- user_profiles表索引
CREATE INDEX idx_user_profiles_last_reset_date ON user_profiles(last_reset_date);
CREATE INDEX idx_user_profiles_deleted_at ON user_profiles(deleted_at) WHERE deleted_at IS NULL;

-- device_fingerprints表索引
CREATE INDEX idx_device_fingerprints_hash ON device_fingerprints(fingerprint_hash);
CREATE INDEX idx_device_fingerprints_user_id ON device_fingerprints(user_id);
CREATE INDEX idx_device_fingerprints_last_used ON device_fingerprints(last_used_at);
CREATE INDEX idx_device_fingerprints_deleted_at ON device_fingerprints(deleted_at) WHERE deleted_at IS NULL;

-- usage_logs表索引
CREATE INDEX idx_usage_logs_user_id ON usage_logs(user_id);
CREATE INDEX idx_usage_logs_device_fingerprint ON usage_logs(device_fingerprint_id);
CREATE INDEX idx_usage_logs_created_at ON usage_logs(created_at);
CREATE INDEX idx_usage_logs_analysis_type ON usage_logs(analysis_type);
CREATE INDEX idx_usage_logs_success ON usage_logs(success);

-- 5. 创建触发器自动更新时间戳

-- 更新user_profiles的updated_at字段
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_profiles_updated_at 
    BEFORE UPDATE ON user_profiles 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- 6. 创建月度重置函数
-- 用于每月重置用户的使用次数
CREATE OR REPLACE FUNCTION reset_monthly_usage()
RETURNS void AS $$
BEGIN
    UPDATE user_profiles 
    SET 
        current_month_usage = 0,
        last_reset_date = CURRENT_DATE
    WHERE 
        last_reset_date < DATE_TRUNC('month', CURRENT_DATE)
        AND deleted_at IS NULL;
END;
$$ LANGUAGE plpgsql;

-- 7. 创建清理过期设备指纹的函数
-- 清理90天未使用的设备指纹记录
CREATE OR REPLACE FUNCTION cleanup_old_device_fingerprints()
RETURNS void AS $$
BEGIN
    UPDATE device_fingerprints 
    SET deleted_at = NOW()
    WHERE 
        last_used_at < NOW() - INTERVAL '90 days'
        AND user_id IS NULL  -- 只清理未关联用户的指纹
        AND deleted_at IS NULL;
END;
$$ LANGUAGE plpgsql;

-- 8. 创建用户统计视图
-- 提供用户使用情况的统计信息
CREATE OR REPLACE VIEW user_usage_stats AS
SELECT 
    up.id as user_id,
    up.monthly_limit,
    up.current_month_usage,
    up.total_analyses,
    up.last_reset_date,
    -- 本月剩余次数
    (up.monthly_limit - up.current_month_usage) as remaining_this_month,
    -- 本月使用率
    CASE 
        WHEN up.monthly_limit > 0 THEN 
            ROUND((up.current_month_usage::decimal / up.monthly_limit) * 100, 2)
        ELSE 0 
    END as usage_percentage,
    -- 最近一次分析时间
    (
        SELECT MAX(created_at) 
        FROM usage_logs ul 
        WHERE ul.user_id = up.id AND ul.success = true
    ) as last_analysis_at,
    -- 本月分析次数
    (
        SELECT COUNT(*) 
        FROM usage_logs ul 
        WHERE ul.user_id = up.id 
        AND ul.created_at >= DATE_TRUNC('month', CURRENT_DATE)
        AND ul.success = true
    ) as this_month_analyses
FROM user_profiles up
WHERE up.deleted_at IS NULL;

-- 9. 创建设备指纹统计视图
CREATE OR REPLACE VIEW device_fingerprint_stats AS
SELECT 
    df.id,
    df.fingerprint_hash,
    df.trial_usage,
    df.created_at,
    df.last_used_at,
    df.user_id,
    -- 剩余试用次数
    (5 - df.trial_usage) as remaining_trials,
    -- 是否已关联用户
    CASE WHEN df.user_id IS NOT NULL THEN true ELSE false END as is_registered,
    -- 最近一次使用时间
    (
        SELECT MAX(created_at) 
        FROM usage_logs ul 
        WHERE ul.device_fingerprint_id = df.id AND ul.success = true
    ) as last_usage_at
FROM device_fingerprints df
WHERE df.deleted_at IS NULL;

-- 10. 插入默认数据和测试数据（可选）
-- 这部分在生产环境中可以跳过

-- 创建一个测试用的设备指纹记录（用于开发测试）
-- INSERT INTO device_fingerprints (fingerprint_hash, trial_usage, metadata) 
-- VALUES (
--     'test_fingerprint_hash_12345',
--     0,
--     '{"test": true, "created_for": "development"}'
-- );

-- 11. 设置定时任务（需要在Supabase控制台中手动设置）
-- 每月1号重置用户使用次数
-- SELECT cron.schedule('reset-monthly-usage', '0 0 1 * *', 'SELECT reset_monthly_usage();');

-- 每周清理过期设备指纹
-- SELECT cron.schedule('cleanup-device-fingerprints', '0 2 * * 0', 'SELECT cleanup_old_device_fingerprints();');

-- 12. 创建有用的查询函数

-- 检查用户是否可以进行分析
CREATE OR REPLACE FUNCTION can_user_analyze(user_uuid UUID)
RETURNS boolean AS $$
DECLARE
    user_usage INTEGER;
    user_limit INTEGER;
BEGIN
    SELECT current_month_usage, monthly_limit 
    INTO user_usage, user_limit
    FROM user_profiles 
    WHERE id = user_uuid AND deleted_at IS NULL;
    
    -- 如果用户不存在，返回false
    IF NOT FOUND THEN
        RETURN false;
    END IF;
    
    -- 检查是否超出限制
    RETURN user_usage < user_limit;
END;
$$ LANGUAGE plpgsql;

-- 检查设备指纹是否可以进行试用分析
CREATE OR REPLACE FUNCTION can_device_analyze(fingerprint_hash_param TEXT)
RETURNS boolean AS $$
DECLARE
    trial_count INTEGER;
BEGIN
    SELECT trial_usage 
    INTO trial_count
    FROM device_fingerprints 
    WHERE fingerprint_hash = fingerprint_hash_param 
    AND deleted_at IS NULL
    AND user_id IS NULL;  -- 只检查未关联用户的设备
    
    -- 如果设备指纹不存在，可以分析（新设备）
    IF NOT FOUND THEN
        RETURN true;
    END IF;
    
    -- 检查是否超出试用限制（5次）
    RETURN trial_count < 5;
END;
$$ LANGUAGE plpgsql;

-- 记录分析使用
CREATE OR REPLACE FUNCTION record_analysis_usage(
    user_uuid UUID DEFAULT NULL,
    fingerprint_hash_param TEXT DEFAULT NULL,
    file_name_param TEXT DEFAULT NULL,
    file_size_param BIGINT DEFAULT NULL,
    file_format_param TEXT DEFAULT NULL,
    processing_time_param INTEGER DEFAULT NULL,
    success_param BOOLEAN DEFAULT TRUE,
    error_message_param TEXT DEFAULT NULL,
    analysis_result_id_param TEXT DEFAULT NULL,
    result_summary_param JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
    device_fingerprint_uuid UUID;
    usage_log_id UUID;
BEGIN
    -- 如果提供了设备指纹，查找或创建设备指纹记录
    IF fingerprint_hash_param IS NOT NULL THEN
        SELECT id INTO device_fingerprint_uuid
        FROM device_fingerprints 
        WHERE fingerprint_hash = fingerprint_hash_param AND deleted_at IS NULL;
        
        -- 如果设备指纹不存在，创建新记录
        IF NOT FOUND THEN
            INSERT INTO device_fingerprints (fingerprint_hash, trial_usage, last_used_at)
            VALUES (fingerprint_hash_param, 0, NOW())
            RETURNING id INTO device_fingerprint_uuid;
        ELSE
            -- 更新最后使用时间
            UPDATE device_fingerprints 
            SET last_used_at = NOW()
            WHERE id = device_fingerprint_uuid;
        END IF;
    END IF;
    
    -- 插入使用记录
    INSERT INTO usage_logs (
        user_id, device_fingerprint_id, file_name, file_size, file_format,
        processing_time, success, error_message, analysis_result_id, result_summary
    ) VALUES (
        user_uuid, device_fingerprint_uuid, file_name_param, file_size_param, file_format_param,
        processing_time_param, success_param, error_message_param, analysis_result_id_param, result_summary_param
    ) RETURNING id INTO usage_log_id;
    
    -- 如果分析成功，更新使用计数
    IF success_param THEN
        IF user_uuid IS NOT NULL THEN
            -- 更新用户使用计数
            UPDATE user_profiles 
            SET 
                current_month_usage = current_month_usage + 1,
                total_analyses = total_analyses + 1
            WHERE id = user_uuid;
        ELSIF device_fingerprint_uuid IS NOT NULL THEN
            -- 更新设备试用计数
            UPDATE device_fingerprints 
            SET trial_usage = trial_usage + 1
            WHERE id = device_fingerprint_uuid;
        END IF;
    END IF;
    
    RETURN usage_log_id;
END;
$$ LANGUAGE plpgsql;

-- 完成数据库表结构创建
-- 请在Supabase控制台的SQL编辑器中执行此脚本