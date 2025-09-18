-- 用户数据迁移脚本：从次数制迁移到积分制
-- 执行前请确保已经创建了积分系统的表结构
-- 建议在维护窗口期间执行此脚本

-- ============================================================================
-- 第一部分：数据迁移准备和验证
-- ============================================================================

-- 创建迁移日志表用于记录迁移过程
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

-- 创建迁移前数据快照表
CREATE TABLE IF NOT EXISTS pre_migration_snapshot (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  table_name TEXT NOT NULL,
  record_count INTEGER NOT NULL,
  snapshot_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 记录迁移前的数据快照
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

INSERT INTO pre_migration_snapshot (table_name, record_count, snapshot_data)
SELECT 
  'device_fingerprints',
  COUNT(*),
  jsonb_agg(
    jsonb_build_object(
      'id', id,
      'fingerprint_hash', fingerprint_hash,
      'trial_usage', trial_usage,
      'user_id', user_id
    )
  )
FROM device_fingerprints
WHERE deleted_at IS NULL;

-- ============================================================================
-- 第二部分：迁移现有注册用户数据
-- ============================================================================

-- 迁移函数：将用户配置转换为积分制
CREATE OR REPLACE FUNCTION migrate_user_to_credits(user_uuid UUID)
RETURNS BOOLEAN AS $
DECLARE
  user_record RECORD;
  remaining_monthly_credits INTEGER;
  total_credits INTEGER;
  migration_success BOOLEAN := TRUE;
BEGIN
  -- 获取用户当前数据
  SELECT * INTO user_record
  FROM user_profiles
  WHERE id = user_uuid AND deleted_at IS NULL;
  
  IF NOT FOUND THEN
    INSERT INTO migration_log (migration_type, table_name, record_id, status, error_message)
    VALUES ('user_migration', 'user_profiles', user_uuid, 'failed', 'User profile not found');
    RETURN FALSE;
  END IF;
  
  -- 计算剩余月度积分
  -- 每次使用等价于180积分（3分钟平均时长）
  remaining_monthly_credits := GREATEST(0, (user_record.monthly_limit - user_record.current_month_usage) * 180);
  
  -- 计算总积分：剩余月度积分 + 当月基础积分200
  total_credits := remaining_monthly_credits + 200;
  
  BEGIN
    -- 插入或更新用户积分记录
    INSERT INTO user_credits (
      id, 
      credits, 
      trial_credits, 
      monthly_credits, 
      purchased_credits,
      last_monthly_reset
    ) VALUES (
      user_uuid,
      total_credits,
      0, -- 注册用户没有试用积分
      200, -- 月度基础积分
      0, -- 初始购买积分为0
      user_record.last_reset_date
    )
    ON CONFLICT (id) DO UPDATE SET
      credits = EXCLUDED.credits,
      monthly_credits = EXCLUDED.monthly_credits,
      last_monthly_reset = EXCLUDED.last_monthly_reset,
      updated_at = NOW();
    
    -- 记录迁移成功的交易
    IF total_credits > 0 THEN
      INSERT INTO credit_transactions (
        user_id,
        transaction_type,
        amount,
        balance_after,
        source,
        description,
        metadata
      ) VALUES (
        user_uuid,
        'add',
        total_credits,
        total_credits,
        'migration',
        'Migrated from usage-based system to credit system',
        jsonb_build_object(
          'original_monthly_limit', user_record.monthly_limit,
          'original_current_usage', user_record.current_month_usage,
          'original_total_analyses', user_record.total_analyses,
          'remaining_monthly_credits', remaining_monthly_credits,
          'base_monthly_credits', 200
        )
      );
    END IF;
    
    -- 记录迁移日志
    INSERT INTO migration_log (
      migration_type, 
      table_name, 
      record_id, 
      old_values, 
      new_values, 
      status
    ) VALUES (
      'user_migration',
      'user_profiles',
      user_uuid,
      jsonb_build_object(
        'monthly_limit', user_record.monthly_limit,
        'current_month_usage', user_record.current_month_usage,
        'total_analyses', user_record.total_analyses
      ),
      jsonb_build_object(
        'credits', total_credits,
        'monthly_credits', 200,
        'remaining_monthly_credits', remaining_monthly_credits
      ),
      'success'
    );
    
  EXCEPTION WHEN OTHERS THEN
    migration_success := FALSE;
    INSERT INTO migration_log (
      migration_type, 
      table_name, 
      record_id, 
      status, 
      error_message
    ) VALUES (
      'user_migration',
      'user_profiles',
      user_uuid,
      'failed',
      SQLERRM
    );
  END;
  
  RETURN migration_success;
END;
$ LANGUAGE plpgsql;

-- 执行用户数据迁移
DO $
DECLARE
  user_record RECORD;
  migration_count INTEGER := 0;
  success_count INTEGER := 0;
  failed_count INTEGER := 0;
BEGIN
  RAISE NOTICE '开始迁移注册用户数据到积分制...';
  
  FOR user_record IN 
    SELECT id FROM user_profiles WHERE deleted_at IS NULL
  LOOP
    migration_count := migration_count + 1;
    
    IF migrate_user_to_credits(user_record.id) THEN
      success_count := success_count + 1;
    ELSE
      failed_count := failed_count + 1;
    END IF;
    
    -- 每100个用户输出一次进度
    IF migration_count % 100 = 0 THEN
      RAISE NOTICE '已处理 % 个用户，成功 %，失败 %', migration_count, success_count, failed_count;
    END IF;
  END LOOP;
  
  RAISE NOTICE '用户数据迁移完成！总计: %，成功: %，失败: %', migration_count, success_count, failed_count;
END;
$;

-- ============================================================================
-- 第三部分：创建向后兼容的视图和函数
-- ============================================================================

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

-- 创建兼容性函数：检查用户是否可以分析（基于积分）
CREATE OR REPLACE FUNCTION can_user_analyze_compat(user_uuid UUID)
RETURNS boolean AS $
DECLARE
  user_credits_count INTEGER;
BEGIN
  SELECT credits INTO user_credits_count
  FROM user_credits 
  WHERE id = user_uuid;
  
  -- 如果用户不存在，返回false
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  -- 检查是否有足够积分（至少需要1积分）
  RETURN user_credits_count > 0;
END;
$ LANGUAGE plpgsql;

-- ============================================================================
-- 第四部分：数据完整性验证
-- ============================================================================

-- 验证迁移结果的函数
CREATE OR REPLACE FUNCTION validate_user_migration()
RETURNS TABLE (
  validation_type TEXT,
  expected_count INTEGER,
  actual_count INTEGER,
  status TEXT,
  details TEXT
) AS $
DECLARE
  original_user_count INTEGER;
  migrated_user_count INTEGER;
  total_original_analyses INTEGER;
  total_migrated_transactions INTEGER;
BEGIN
  -- 获取原始用户数量
  SELECT record_count INTO original_user_count
  FROM pre_migration_snapshot 
  WHERE table_name = 'user_profiles';
  
  -- 获取迁移后的用户积分记录数量
  SELECT COUNT(*) INTO migrated_user_count
  FROM user_credits;
  
  -- 验证用户数量
  RETURN QUERY SELECT 
    'user_count'::TEXT,
    original_user_count,
    migrated_user_count,
    CASE WHEN original_user_count = migrated_user_count THEN 'PASS' ELSE 'FAIL' END,
    format('Original: %s, Migrated: %s', original_user_count, migrated_user_count);
  
  -- 验证积分交易记录
  SELECT COUNT(*) INTO total_migrated_transactions
  FROM credit_transactions 
  WHERE source = 'migration';
  
  RETURN QUERY SELECT 
    'migration_transactions'::TEXT,
    original_user_count,
    total_migrated_transactions,
    CASE WHEN original_user_count = total_migrated_transactions THEN 'PASS' ELSE 'FAIL' END,
    format('Expected migration transactions: %s, Actual: %s', original_user_count, total_migrated_transactions);
  
  -- 验证积分总量合理性
  RETURN QUERY SELECT 
    'credit_balance_check'::TEXT,
    0,
    (SELECT COUNT(*) FROM user_credits WHERE credits < 0),
    CASE WHEN (SELECT COUNT(*) FROM user_credits WHERE credits < 0) = 0 THEN 'PASS' ELSE 'FAIL' END,
    'Checking for negative credit balances';
  
  -- 验证迁移日志
  RETURN QUERY SELECT 
    'migration_log_success_rate'::TEXT,
    original_user_count,
    (SELECT COUNT(*) FROM migration_log WHERE migration_type = 'user_migration' AND status = 'success'),
    CASE WHEN (SELECT COUNT(*) FROM migration_log WHERE migration_type = 'user_migration' AND status = 'success') = original_user_count THEN 'PASS' ELSE 'FAIL' END,
    format('Successful migrations: %s/%s', 
      (SELECT COUNT(*) FROM migration_log WHERE migration_type = 'user_migration' AND status = 'success'),
      original_user_count);
END;
$ LANGUAGE plpgsql;

-- 执行验证
SELECT * FROM validate_user_migration();

-- ============================================================================
-- 第五部分：清理和优化
-- ============================================================================

-- 更新统计信息
ANALYZE user_credits;
ANALYZE credit_transactions;
ANALYZE migration_log;

-- 输出迁移摘要
DO $
DECLARE
  summary_record RECORD;
BEGIN
  RAISE NOTICE '=== 用户数据迁移摘要 ===';
  
  FOR summary_record IN 
    SELECT 
      COUNT(*) as total_users,
      SUM(credits) as total_credits,
      AVG(credits) as avg_credits,
      MIN(credits) as min_credits,
      MAX(credits) as max_credits
    FROM user_credits
  LOOP
    RAISE NOTICE '迁移用户总数: %', summary_record.total_users;
    RAISE NOTICE '积分总量: %', summary_record.total_credits;
    RAISE NOTICE '平均积分: %', ROUND(summary_record.avg_credits, 2);
    RAISE NOTICE '最少积分: %', summary_record.min_credits;
    RAISE NOTICE '最多积分: %', summary_record.max_credits;
  END LOOP;
  
  RAISE NOTICE '=== 迁移完成 ===';
END;
$;

-- 注释：
-- 1. 此脚本将现有的用户配置数据迁移到积分制系统
-- 2. 每次剩余使用次数转换为180积分（基于3分钟平均音频时长）
-- 3. 所有注册用户获得200积分的月度基础积分
-- 4. 创建了向后兼容的视图和函数，确保现有代码继续工作
-- 5. 包含完整的验证和日志记录机制
-- 6. 建议在测试环境中先执行并验证结果