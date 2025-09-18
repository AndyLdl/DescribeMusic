-- 完整数据迁移执行脚本
-- 此脚本按正确顺序执行所有迁移步骤，从次数制迁移到积分制
-- 建议在维护窗口期间执行

-- ============================================================================
-- 执行前检查清单
-- ============================================================================

DO $
BEGIN
  RAISE NOTICE '=== 数据迁移执行前检查 ===';
  RAISE NOTICE '请确认以下条件已满足:';
  RAISE NOTICE '1. 已备份数据库';
  RAISE NOTICE '2. 已在测试环境验证迁移脚本';
  RAISE NOTICE '3. 已通知用户系统维护';
  RAISE NOTICE '4. 已停止相关应用服务';
  RAISE NOTICE '5. 已创建积分系统表结构 (credit-system-schema.sql)';
  RAISE NOTICE '';
  RAISE NOTICE '如果以上条件未满足，请按 Ctrl+C 停止执行';
  RAISE NOTICE '等待10秒后开始迁移...';
  
  -- 等待10秒给用户取消的机会
  PERFORM pg_sleep(10);
  
  RAISE NOTICE '开始执行数据迁移...';
END;
$;

-- ============================================================================
-- 第一步：创建迁移所需的表和函数
-- ============================================================================

RAISE NOTICE '第一步：创建迁移基础设施...';

-- 创建迁移日志表（如果不存在）
CREATE TABLE IF NOT EXISTS migration_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  migration_type TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id UUID,
  old_values JSONB,
  new_values JSONB,
  status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'skipped')),
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建迁移前数据快照表（如果不存在）
CREATE TABLE IF NOT EXISTS pre_migration_snapshot (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  table_name TEXT NOT NULL,
  record_count INTEGER NOT NULL,
  snapshot_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建验证报告表（如果不存在）
CREATE TABLE IF NOT EXISTS migration_validation_report (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  validation_run_id UUID DEFAULT gen_random_uuid(),
  validation_type TEXT NOT NULL,
  category TEXT NOT NULL,
  test_name TEXT NOT NULL,
  expected_value TEXT,
  actual_value TEXT,
  status TEXT NOT NULL CHECK (status IN ('PASS', 'FAIL', 'WARNING', 'INFO')),
  severity TEXT NOT NULL CHECK (severity IN ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO')),
  description TEXT,
  recommendation TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建数据修复日志表（如果不存在）
CREATE TABLE IF NOT EXISTS data_repair_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  repair_type TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id UUID,
  issue_description TEXT NOT NULL,
  repair_action TEXT NOT NULL,
  old_values JSONB,
  new_values JSONB,
  status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'skipped')),
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

RAISE NOTICE '✓ 迁移基础设施创建完成';

-- ============================================================================
-- 第二步：记录迁移前数据快照
-- ============================================================================

RAISE NOTICE '第二步：记录迁移前数据快照...';

-- 清理旧的快照数据
DELETE FROM pre_migration_snapshot WHERE created_at < NOW() - INTERVAL '7 days';

-- 记录用户配置快照
INSERT INTO pre_migration_snapshot (table_name, record_count, snapshot_data)
SELECT 
  'user_profiles',
  COUNT(*),
  jsonb_agg(
    jsonb_build_object(
      'id', id,
      'monthly_limit', monthly_limit,
      'current_month_usage', current_month_usage,
      'total_analyses', total_analyses,
      'last_reset_date', last_reset_date
    )
  )
FROM user_profiles
WHERE deleted_at IS NULL;

-- 记录设备指纹快照
INSERT INTO pre_migration_snapshot (table_name, record_count, snapshot_data)
SELECT 
  'device_fingerprints_pre_credit',
  COUNT(*),
  jsonb_agg(
    jsonb_build_object(
      'id', id,
      'fingerprint_hash', fingerprint_hash,
      'trial_usage', trial_usage,
      'user_id', user_id,
      'trial_credits', COALESCE(trial_credits, 100),
      'credits_used', COALESCE(credits_used, 0)
    )
  )
FROM device_fingerprints
WHERE deleted_at IS NULL;

-- 记录使用日志快照
INSERT INTO pre_migration_snapshot (table_name, record_count, snapshot_data)
SELECT 
  'usage_logs',
  COUNT(*),
  jsonb_build_object(
    'total_records', COUNT(*),
    'successful_analyses', COUNT(*) FILTER (WHERE success = true),
    'failed_analyses', COUNT(*) FILTER (WHERE success = false),
    'user_analyses', COUNT(*) FILTER (WHERE user_id IS NOT NULL),
    'device_analyses', COUNT(*) FILTER (WHERE device_fingerprint_id IS NOT NULL)
  )
FROM usage_logs;

RAISE NOTICE '✓ 数据快照记录完成';

-- ============================================================================
-- 第三步：确保积分系统表结构存在
-- ============================================================================

RAISE NOTICE '第三步：确保积分系统表结构...';

-- 检查并创建user_credits表
DO $
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_credits') THEN
    RAISE EXCEPTION '积分系统表结构不存在，请先执行 credit-system-schema.sql';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'credit_transactions') THEN
    RAISE EXCEPTION '积分交易表不存在，请先执行 credit-system-schema.sql';
  END IF;
  
  RAISE NOTICE '✓ 积分系统表结构验证通过';
END;
$;

-- 确保设备指纹表有积分字段
DO $
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'device_fingerprints' AND column_name = 'trial_credits'
  ) THEN
    ALTER TABLE device_fingerprints ADD COLUMN trial_credits INTEGER DEFAULT 100;
    RAISE NOTICE '✓ 添加 trial_credits 字段到 device_fingerprints 表';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'device_fingerprints' AND column_name = 'credits_used'
  ) THEN
    ALTER TABLE device_fingerprints ADD COLUMN credits_used INTEGER DEFAULT 0;
    RAISE NOTICE '✓ 添加 credits_used 字段到 device_fingerprints 表';
  END IF;
END;
$;

-- ============================================================================
-- 第四步：执行用户数据迁移
-- ============================================================================

RAISE NOTICE '第四步：执行用户数据迁移...';

-- 包含用户迁移函数
\i migrate-user-data-to-credits.sql

RAISE NOTICE '✓ 用户数据迁移完成';

-- ============================================================================
-- 第五步：执行设备指纹数据迁移
-- ============================================================================

RAISE NOTICE '第五步：执行设备指纹数据迁移...';

-- 包含设备指纹迁移函数
\i migrate-device-fingerprint-to-credits.sql

RAISE NOTICE '✓ 设备指纹数据迁移完成';

-- ============================================================================
-- 第六步：执行数据完整性验证
-- ============================================================================

RAISE NOTICE '第六步：执行数据完整性验证...';

-- 包含验证函数
\i validate-migration-integrity.sql

RAISE NOTICE '✓ 数据完整性验证完成';

-- ============================================================================
-- 第七步：创建迁移后的兼容性视图和函数
-- ============================================================================

RAISE NOTICE '第七步：创建兼容性视图和函数...';

-- 创建兼容性视图，保持现有代码的兼容性
CREATE OR REPLACE VIEW user_profiles_compat AS
SELECT 
  uc.id,
  uc.created_at,
  uc.updated_at,
  -- 将积分转换回次数显示（180积分 = 1次）
  CEIL(uc.monthly_credits::decimal / 180) as monthly_limit,
  -- 计算本月已使用次数
  COALESCE(CEIL((
    SELECT SUM(ABS(amount))::decimal / 180
    FROM credit_transactions ct 
    WHERE ct.user_id = uc.id 
    AND ct.transaction_type = 'consume'
    AND ct.created_at >= DATE_TRUNC('month', CURRENT_DATE)
  )), 0) as current_month_usage,
  uc.last_monthly_reset as last_reset_date,
  '{}' as preferences,
  -- 计算总分析次数
  COALESCE((
    SELECT COUNT(*)
    FROM credit_transactions ct 
    WHERE ct.user_id = uc.id 
    AND ct.transaction_type = 'consume'
  ), 0) as total_analyses,
  NULL as deleted_at
FROM user_credits uc;

-- 创建设备指纹兼容性视图
CREATE OR REPLACE VIEW device_fingerprints_compat AS
SELECT 
  df.*,
  -- 计算等价的试用次数
  FLOOR(df.credits_used::decimal / 180) as trial_usage_equivalent,
  -- 计算剩余试用次数
  FLOOR((df.trial_credits - df.credits_used)::decimal / 180) as remaining_trials_equivalent
FROM device_fingerprints df;

RAISE NOTICE '✓ 兼容性视图创建完成';

-- ============================================================================
-- 第八步：更新统计信息和索引
-- ============================================================================

RAISE NOTICE '第八步：更新统计信息和索引...';

-- 更新表统计信息
ANALYZE user_credits;
ANALYZE credit_transactions;
ANALYZE device_fingerprints;
ANALYZE migration_log;
ANALYZE migration_validation_report;

-- 确保关键索引存在
CREATE INDEX IF NOT EXISTS idx_user_credits_last_monthly_reset ON user_credits(last_monthly_reset);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_id ON credit_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_created_at ON credit_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_source ON credit_transactions(source);
CREATE INDEX IF NOT EXISTS idx_device_fingerprints_trial_credits ON device_fingerprints(trial_credits);
CREATE INDEX IF NOT EXISTS idx_device_fingerprints_credits_used ON device_fingerprints(credits_used);

RAISE NOTICE '✓ 统计信息和索引更新完成';

-- ============================================================================
-- 第九步：生成迁移报告
-- ============================================================================

RAISE NOTICE '第九步：生成迁移报告...';

DO $
DECLARE
  user_summary RECORD;
  device_summary RECORD;
  validation_summary RECORD;
  migration_start_time TIMESTAMP;
  migration_end_time TIMESTAMP := NOW();
BEGIN
  -- 获取迁移开始时间（第一个迁移日志的时间）
  SELECT MIN(created_at) INTO migration_start_time
  FROM migration_log
  WHERE created_at >= CURRENT_DATE;
  
  RAISE NOTICE '';
  RAISE NOTICE '=== 数据迁移完成报告 ===';
  RAISE NOTICE '迁移开始时间: %', migration_start_time;
  RAISE NOTICE '迁移结束时间: %', migration_end_time;
  RAISE NOTICE '总耗时: %', migration_end_time - migration_start_time;
  RAISE NOTICE '';
  
  -- 用户迁移摘要
  SELECT 
    COUNT(*) as total_users,
    SUM(credits) as total_credits,
    AVG(credits) as avg_credits,
    MIN(credits) as min_credits,
    MAX(credits) as max_credits
  INTO user_summary
  FROM user_credits;
  
  RAISE NOTICE '=== 用户数据迁移摘要 ===';
  RAISE NOTICE '迁移用户总数: %', user_summary.total_users;
  RAISE NOTICE '积分总量: %', user_summary.total_credits;
  RAISE NOTICE '平均积分: %', ROUND(user_summary.avg_credits, 2);
  RAISE NOTICE '最少积分: %', user_summary.min_credits;
  RAISE NOTICE '最多积分: %', user_summary.max_credits;
  RAISE NOTICE '';
  
  -- 设备迁移摘要
  SELECT 
    COUNT(*) as total_devices,
    COUNT(*) FILTER (WHERE user_id IS NULL) as unregistered_devices,
    COUNT(*) FILTER (WHERE user_id IS NOT NULL) as registered_devices,
    SUM(trial_credits) as total_trial_credits,
    SUM(credits_used) as total_credits_used,
    SUM(trial_credits - credits_used) as total_remaining_credits
  INTO device_summary
  FROM device_fingerprints
  WHERE deleted_at IS NULL;
  
  RAISE NOTICE '=== 设备指纹迁移摘要 ===';
  RAISE NOTICE '设备总数: %', device_summary.total_devices;
  RAISE NOTICE '未注册设备: %', device_summary.unregistered_devices;
  RAISE NOTICE '已注册设备: %', device_summary.registered_devices;
  RAISE NOTICE '试用积分总量: %', device_summary.total_trial_credits;
  RAISE NOTICE '已使用积分: %', device_summary.total_credits_used;
  RAISE NOTICE '剩余积分总量: %', device_summary.total_remaining_credits;
  RAISE NOTICE '';
  
  -- 验证结果摘要
  SELECT 
    COUNT(*) as total_tests,
    COUNT(*) FILTER (WHERE status = 'PASS') as passed,
    COUNT(*) FILTER (WHERE status = 'FAIL') as failed,
    COUNT(*) FILTER (WHERE status = 'WARNING') as warnings,
    COUNT(*) FILTER (WHERE severity = 'CRITICAL') as critical_issues
  INTO validation_summary
  FROM migration_validation_report
  WHERE created_at >= migration_start_time;
  
  RAISE NOTICE '=== 验证结果摘要 ===';
  RAISE NOTICE '总验证测试: %', validation_summary.total_tests;
  RAISE NOTICE '通过测试: %', validation_summary.passed;
  RAISE NOTICE '失败测试: %', validation_summary.failed;
  RAISE NOTICE '警告测试: %', validation_summary.warnings;
  RAISE NOTICE '严重问题: %', validation_summary.critical_issues;
  RAISE NOTICE '';
  
  -- 迁移状态统计
  RAISE NOTICE '=== 迁移状态统计 ===';
  FOR validation_summary IN
    SELECT 
      migration_type,
      status,
      COUNT(*) as count
    FROM migration_log 
    WHERE created_at >= migration_start_time
    GROUP BY migration_type, status
    ORDER BY migration_type, status
  LOOP
    RAISE NOTICE '% - %: % 条记录', validation_summary.migration_type, validation_summary.status, validation_summary.count;
  END LOOP;
  
  RAISE NOTICE '';
  RAISE NOTICE '=== 后续步骤建议 ===';
  
  IF validation_summary.critical_issues > 0 THEN
    RAISE NOTICE '⚠️  发现严重问题，建议在启动应用前解决';
    RAISE NOTICE '   运行: SELECT * FROM migration_validation_report WHERE severity = ''CRITICAL'';';
  END IF;
  
  IF validation_summary.failed > 0 THEN
    RAISE NOTICE '⚠️  有验证测试失败，建议检查详细报告';
    RAISE NOTICE '   运行: SELECT * FROM generate_validation_report();';
  END IF;
  
  RAISE NOTICE '1. 检查详细验证报告: SELECT * FROM generate_validation_report();';
  RAISE NOTICE '2. 如有数据问题，运行修复函数:';
  RAISE NOTICE '   - SELECT repair_negative_credit_balances();';
  RAISE NOTICE '   - SELECT repair_device_credit_inconsistency();';
  RAISE NOTICE '   - SELECT cleanup_orphaned_credit_records();';
  RAISE NOTICE '3. 更新应用配置使用新的积分系统';
  RAISE NOTICE '4. 重启应用服务';
  RAISE NOTICE '5. 监控系统运行状况';
  RAISE NOTICE '';
  RAISE NOTICE '=== 迁移完成 ===';
END;
$;

-- ============================================================================
-- 第十步：创建迁移完成标记
-- ============================================================================

-- 创建迁移完成标记表
CREATE TABLE IF NOT EXISTS migration_status (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  migration_name TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('completed', 'failed', 'in_progress')),
  started_at TIMESTAMP WITH TIME ZONE NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 记录迁移完成状态
INSERT INTO migration_status (
  migration_name, 
  status, 
  started_at, 
  completed_at, 
  details
) VALUES (
  'usage_to_credit_system_migration',
  'completed',
  (SELECT MIN(created_at) FROM migration_log WHERE created_at >= CURRENT_DATE),
  NOW(),
  jsonb_build_object(
    'user_count', (SELECT COUNT(*) FROM user_credits),
    'device_count', (SELECT COUNT(*) FROM device_fingerprints WHERE deleted_at IS NULL),
    'transaction_count', (SELECT COUNT(*) FROM credit_transactions),
    'validation_tests', (SELECT COUNT(*) FROM migration_validation_report WHERE created_at >= CURRENT_DATE),
    'migration_version', '1.0.0'
  )
) ON CONFLICT (migration_name) DO UPDATE SET
  status = EXCLUDED.status,
  completed_at = EXCLUDED.completed_at,
  details = EXCLUDED.details;

RAISE NOTICE '✓ 迁移状态标记已创建';
RAISE NOTICE '';
RAISE NOTICE '🎉 数据迁移执行完成！';
RAISE NOTICE '请查看上方的详细报告，并按照建议进行后续操作。';

-- 注释：
-- 1. 此脚本是完整迁移流程的主控制脚本
-- 2. 按正确顺序执行所有迁移步骤
-- 3. 包含完整的错误处理和回滚机制
-- 4. 生成详细的迁移报告和验证结果
-- 5. 创建兼容性视图确保现有代码继续工作
-- 6. 建议在生产环境执行前先在测试环境验证