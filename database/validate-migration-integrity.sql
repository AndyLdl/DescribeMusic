-- 数据迁移完整性验证脚本
-- 用于验证从次数制到积分制的迁移是否成功和完整
-- 执行此脚本来检查迁移结果并修复任何数据不一致问题

-- ============================================================================
-- 第一部分：创建验证报告表
-- ============================================================================

-- 创建验证报告表
CREATE TABLE IF NOT EXISTS migration_validation_report (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  validation_run_id UUID DEFAULT gen_random_uuid(),
  validation_type TEXT NOT NULL,
  category TEXT NOT NULL, -- 'user', 'device', 'transaction', 'integrity'
  test_name TEXT NOT NULL,
  expected_value TEXT,
  actual_value TEXT,
  status TEXT NOT NULL CHECK (status IN ('PASS', 'FAIL', 'WARNING', 'INFO')),
  severity TEXT NOT NULL CHECK (severity IN ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO')),
  description TEXT,
  recommendation TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建数据修复日志表
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

-- ============================================================================
-- 第二部分：综合验证函数
-- ============================================================================

-- 主验证函数
CREATE OR REPLACE FUNCTION run_comprehensive_migration_validation()
RETURNS UUID AS $
DECLARE
  validation_run_id UUID := gen_random_uuid();
  rec RECORD;
  total_tests INTEGER := 0;
  passed_tests INTEGER := 0;
  failed_tests INTEGER := 0;
  warning_tests INTEGER := 0;
BEGIN
  RAISE NOTICE '开始执行综合迁移验证，运行ID: %', validation_run_id;
  
  -- 清理旧的验证报告（保留最近10次）
  DELETE FROM migration_validation_report 
  WHERE created_at < NOW() - INTERVAL '30 days';
  
  -- 1. 用户数据验证
  PERFORM validate_user_data_integrity(validation_run_id);
  
  -- 2. 设备指纹数据验证
  PERFORM validate_device_data_integrity(validation_run_id);
  
  -- 3. 积分交易数据验证
  PERFORM validate_transaction_data_integrity(validation_run_id);
  
  -- 4. 跨表数据一致性验证
  PERFORM validate_cross_table_consistency(validation_run_id);
  
  -- 5. 业务逻辑验证
  PERFORM validate_business_logic_integrity(validation_run_id);
  
  -- 统计验证结果
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'PASS'),
    COUNT(*) FILTER (WHERE status = 'FAIL'),
    COUNT(*) FILTER (WHERE status = 'WARNING')
  INTO total_tests, passed_tests, failed_tests, warning_tests
  FROM migration_validation_report 
  WHERE validation_run_id = validation_run_id;
  
  RAISE NOTICE '验证完成！总测试: %, 通过: %, 失败: %, 警告: %', 
    total_tests, passed_tests, failed_tests, warning_tests;
  
  RETURN validation_run_id;
END;
$ LANGUAGE plpgsql;

-- ============================================================================
-- 第三部分：用户数据完整性验证
-- ============================================================================

CREATE OR REPLACE FUNCTION validate_user_data_integrity(validation_run_id UUID)
RETURNS VOID AS $
DECLARE
  original_user_count INTEGER;
  current_user_count INTEGER;
  negative_credits_count INTEGER;
  missing_transactions_count INTEGER;
  orphaned_credits_count INTEGER;
BEGIN
  -- 获取原始用户数量
  SELECT COALESCE(record_count, 0) INTO original_user_count
  FROM pre_migration_snapshot 
  WHERE table_name = 'user_profiles';
  
  -- 当前用户积分记录数量
  SELECT COUNT(*) INTO current_user_count FROM user_credits;
  
  -- 验证用户数量一致性
  INSERT INTO migration_validation_report (
    validation_run_id, validation_type, category, test_name,
    expected_value, actual_value, status, severity, description, recommendation
  ) VALUES (
    validation_run_id, 'data_count', 'user', 'user_count_consistency',
    original_user_count::TEXT, current_user_count::TEXT,
    CASE WHEN original_user_count = current_user_count THEN 'PASS' ELSE 'FAIL' END,
    CASE WHEN original_user_count = current_user_count THEN 'INFO' ELSE 'CRITICAL' END,
    format('Original users: %s, Migrated users: %s', original_user_count, current_user_count),
    CASE WHEN original_user_count != current_user_count THEN 'Check migration logs and re-run user migration' ELSE NULL END
  );
  
  -- 检查负积分
  SELECT COUNT(*) INTO negative_credits_count
  FROM user_credits WHERE credits < 0;
  
  INSERT INTO migration_validation_report (
    validation_run_id, validation_type, category, test_name,
    expected_value, actual_value, status, severity, description, recommendation
  ) VALUES (
    validation_run_id, 'data_integrity', 'user', 'negative_credits_check',
    '0', negative_credits_count::TEXT,
    CASE WHEN negative_credits_count = 0 THEN 'PASS' ELSE 'FAIL' END,
    CASE WHEN negative_credits_count = 0 THEN 'INFO' ELSE 'HIGH' END,
    format('Users with negative credits: %s', negative_credits_count),
    CASE WHEN negative_credits_count > 0 THEN 'Run credit balance repair function' ELSE NULL END
  );
  
  -- 检查缺失的迁移交易记录
  SELECT COUNT(*) INTO missing_transactions_count
  FROM user_credits uc
  LEFT JOIN credit_transactions ct ON ct.user_id = uc.id AND ct.source = 'migration'
  WHERE ct.id IS NULL AND uc.credits > 200; -- 只有基础200积分的用户可能没有迁移交易
  
  INSERT INTO migration_validation_report (
    validation_run_id, validation_type, category, test_name,
    expected_value, actual_value, status, severity, description, recommendation
  ) VALUES (
    validation_run_id, 'data_integrity', 'user', 'missing_migration_transactions',
    '0', missing_transactions_count::TEXT,
    CASE WHEN missing_transactions_count = 0 THEN 'PASS' ELSE 'WARNING' END,
    CASE WHEN missing_transactions_count = 0 THEN 'INFO' ELSE 'MEDIUM' END,
    format('Users without migration transaction records: %s', missing_transactions_count),
    CASE WHEN missing_transactions_count > 0 THEN 'Review users with credits > 200 but no migration transactions' ELSE NULL END
  );
  
  -- 检查孤立的用户积分记录（在auth.users中不存在的用户）
  SELECT COUNT(*) INTO orphaned_credits_count
  FROM user_credits uc
  LEFT JOIN auth.users au ON au.id = uc.id
  WHERE au.id IS NULL;
  
  INSERT INTO migration_validation_report (
    validation_run_id, validation_type, category, test_name,
    expected_value, actual_value, status, severity, description, recommendation
  ) VALUES (
    validation_run_id, 'data_integrity', 'user', 'orphaned_credit_records',
    '0', orphaned_credits_count::TEXT,
    CASE WHEN orphaned_credits_count = 0 THEN 'PASS' ELSE 'FAIL' END,
    CASE WHEN orphaned_credits_count = 0 THEN 'INFO' ELSE 'HIGH' END,
    format('Credit records for non-existent users: %s', orphaned_credits_count),
    CASE WHEN orphaned_credits_count > 0 THEN 'Clean up orphaned credit records' ELSE NULL END
  );
END;
$ LANGUAGE plpgsql;

-- ============================================================================
-- 第四部分：设备指纹数据完整性验证
-- ============================================================================

CREATE OR REPLACE FUNCTION validate_device_data_integrity(validation_run_id UUID)
RETURNS VOID AS $
DECLARE
  original_device_count INTEGER;
  current_device_count INTEGER;
  negative_remaining_credits INTEGER;
  inconsistent_credit_usage INTEGER;
  missing_credit_fields INTEGER;
BEGIN
  -- 获取原始设备数量
  SELECT COALESCE(record_count, 0) INTO original_device_count
  FROM pre_migration_snapshot 
  WHERE table_name = 'device_fingerprints_pre_credit';
  
  -- 当前设备数量
  SELECT COUNT(*) INTO current_device_count 
  FROM device_fingerprints WHERE deleted_at IS NULL;
  
  -- 验证设备数量一致性
  INSERT INTO migration_validation_report (
    validation_run_id, validation_type, category, test_name,
    expected_value, actual_value, status, severity, description, recommendation
  ) VALUES (
    validation_run_id, 'data_count', 'device', 'device_count_consistency',
    original_device_count::TEXT, current_device_count::TEXT,
    CASE WHEN original_device_count = current_device_count THEN 'PASS' ELSE 'FAIL' END,
    CASE WHEN original_device_count = current_device_count THEN 'INFO' ELSE 'HIGH' END,
    format('Original devices: %s, Current devices: %s', original_device_count, current_device_count),
    CASE WHEN original_device_count != current_device_count THEN 'Check for deleted or missing device records' ELSE NULL END
  );
  
  -- 检查负剩余积分
  SELECT COUNT(*) INTO negative_remaining_credits
  FROM device_fingerprints 
  WHERE (trial_credits - credits_used) < 0 AND deleted_at IS NULL;
  
  INSERT INTO migration_validation_report (
    validation_run_id, validation_type, category, test_name,
    expected_value, actual_value, status, severity, description, recommendation
  ) VALUES (
    validation_run_id, 'data_integrity', 'device', 'negative_remaining_credits',
    '0', negative_remaining_credits::TEXT,
    CASE WHEN negative_remaining_credits = 0 THEN 'PASS' ELSE 'FAIL' END,
    CASE WHEN negative_remaining_credits = 0 THEN 'INFO' ELSE 'HIGH' END,
    format('Devices with negative remaining credits: %s', negative_remaining_credits),
    CASE WHEN negative_remaining_credits > 0 THEN 'Run device credit repair function' ELSE NULL END
  );
  
  -- 检查积分使用与试用次数的一致性
  SELECT COUNT(*) INTO inconsistent_credit_usage
  FROM device_fingerprints 
  WHERE credits_used != trial_usage * 180 AND deleted_at IS NULL;
  
  INSERT INTO migration_validation_report (
    validation_run_id, validation_type, category, test_name,
    expected_value, actual_value, status, severity, description, recommendation
  ) VALUES (
    validation_run_id, 'data_integrity', 'device', 'credit_usage_consistency',
    '0', inconsistent_credit_usage::TEXT,
    CASE WHEN inconsistent_credit_usage = 0 THEN 'PASS' ELSE 'FAIL' END,
    CASE WHEN inconsistent_credit_usage = 0 THEN 'INFO' ELSE 'MEDIUM' END,
    format('Devices with inconsistent credit usage calculation: %s', inconsistent_credit_usage),
    CASE WHEN inconsistent_credit_usage > 0 THEN 'Recalculate credits_used based on trial_usage' ELSE NULL END
  );
  
  -- 检查缺失积分字段的设备
  SELECT COUNT(*) INTO missing_credit_fields
  FROM device_fingerprints 
  WHERE (trial_credits IS NULL OR credits_used IS NULL) AND deleted_at IS NULL;
  
  INSERT INTO migration_validation_report (
    validation_run_id, validation_type, category, test_name,
    expected_value, actual_value, status, severity, description, recommendation
  ) VALUES (
    validation_run_id, 'data_integrity', 'device', 'missing_credit_fields',
    '0', missing_credit_fields::TEXT,
    CASE WHEN missing_credit_fields = 0 THEN 'PASS' ELSE 'FAIL' END,
    CASE WHEN missing_credit_fields = 0 THEN 'INFO' ELSE 'HIGH' END,
    format('Devices with missing credit fields: %s', missing_credit_fields),
    CASE WHEN missing_credit_fields > 0 THEN 'Re-run device fingerprint migration' ELSE NULL END
  );
END;
$ LANGUAGE plpgsql;

-- ============================================================================
-- 第五部分：积分交易数据验证
-- ============================================================================

CREATE OR REPLACE FUNCTION validate_transaction_data_integrity(validation_run_id UUID)
RETURNS VOID AS $
DECLARE
  migration_transactions_count INTEGER;
  negative_balance_transactions INTEGER;
  orphaned_transactions INTEGER;
  balance_mismatch_count INTEGER;
BEGIN
  -- 检查迁移交易记录数量
  SELECT COUNT(*) INTO migration_transactions_count
  FROM credit_transactions WHERE source = 'migration';
  
  INSERT INTO migration_validation_report (
    validation_run_id, validation_type, category, test_name,
    expected_value, actual_value, status, severity, description, recommendation
  ) VALUES (
    validation_run_id, 'data_count', 'transaction', 'migration_transactions_exist',
    '>0', migration_transactions_count::TEXT,
    CASE WHEN migration_transactions_count > 0 THEN 'PASS' ELSE 'FAIL' END,
    CASE WHEN migration_transactions_count > 0 THEN 'INFO' ELSE 'HIGH' END,
    format('Migration transaction records: %s', migration_transactions_count),
    CASE WHEN migration_transactions_count = 0 THEN 'Check if migration was completed properly' ELSE NULL END
  );
  
  -- 检查负余额的交易记录
  SELECT COUNT(*) INTO negative_balance_transactions
  FROM credit_transactions WHERE balance_after < 0;
  
  INSERT INTO migration_validation_report (
    validation_run_id, validation_type, category, test_name,
    expected_value, actual_value, status, severity, description, recommendation
  ) VALUES (
    validation_run_id, 'data_integrity', 'transaction', 'negative_balance_transactions',
    '0', negative_balance_transactions::TEXT,
    CASE WHEN negative_balance_transactions = 0 THEN 'PASS' ELSE 'FAIL' END,
    CASE WHEN negative_balance_transactions = 0 THEN 'INFO' ELSE 'HIGH' END,
    format('Transactions with negative balance_after: %s', negative_balance_transactions),
    CASE WHEN negative_balance_transactions > 0 THEN 'Review and fix negative balance transactions' ELSE NULL END
  );
  
  -- 检查孤立的交易记录（既没有user_id也没有device_fingerprint_id）
  SELECT COUNT(*) INTO orphaned_transactions
  FROM credit_transactions 
  WHERE user_id IS NULL AND device_fingerprint_id IS NULL;
  
  INSERT INTO migration_validation_report (
    validation_run_id, validation_type, category, test_name,
    expected_value, actual_value, status, severity, description, recommendation
  ) VALUES (
    validation_run_id, 'data_integrity', 'transaction', 'orphaned_transactions',
    '0', orphaned_transactions::TEXT,
    CASE WHEN orphaned_transactions = 0 THEN 'PASS' ELSE 'WARNING' END,
    CASE WHEN orphaned_transactions = 0 THEN 'INFO' ELSE 'MEDIUM' END,
    format('Transactions without user or device reference: %s', orphaned_transactions),
    CASE WHEN orphaned_transactions > 0 THEN 'Review orphaned transactions and assign proper references' ELSE NULL END
  );
  
  -- 检查余额不匹配的情况（最新交易的balance_after与当前积分不符）
  WITH latest_balances AS (
    SELECT DISTINCT ON (COALESCE(user_id, device_fingerprint_id))
      COALESCE(user_id, device_fingerprint_id) as entity_id,
      user_id IS NOT NULL as is_user,
      balance_after
    FROM credit_transactions
    ORDER BY COALESCE(user_id, device_fingerprint_id), created_at DESC
  )
  SELECT COUNT(*) INTO balance_mismatch_count
  FROM latest_balances lb
  LEFT JOIN user_credits uc ON lb.is_user AND uc.id = lb.entity_id
  LEFT JOIN device_fingerprints df ON NOT lb.is_user AND df.id = lb.entity_id
  WHERE (lb.is_user AND uc.credits != lb.balance_after)
     OR (NOT lb.is_user AND (df.trial_credits - df.credits_used) != lb.balance_after);
  
  INSERT INTO migration_validation_report (
    validation_run_id, validation_type, category, test_name,
    expected_value, actual_value, status, severity, description, recommendation
  ) VALUES (
    validation_run_id, 'data_integrity', 'transaction', 'balance_consistency',
    '0', balance_mismatch_count::TEXT,
    CASE WHEN balance_mismatch_count = 0 THEN 'PASS' ELSE 'WARNING' END,
    CASE WHEN balance_mismatch_count = 0 THEN 'INFO' ELSE 'MEDIUM' END,
    format('Entities with balance mismatches: %s', balance_mismatch_count),
    CASE WHEN balance_mismatch_count > 0 THEN 'Recalculate balances and update transaction records' ELSE NULL END
  );
END;
$ LANGUAGE plpgsql;

-- ============================================================================
-- 第六部分：跨表一致性验证
-- ============================================================================

CREATE OR REPLACE FUNCTION validate_cross_table_consistency(validation_run_id UUID)
RETURNS VOID AS $
DECLARE
  users_without_credits INTEGER;
  credits_without_users INTEGER;
  transaction_user_mismatch INTEGER;
  device_transaction_mismatch INTEGER;
BEGIN
  -- 检查有用户配置但没有积分记录的用户
  SELECT COUNT(*) INTO users_without_credits
  FROM user_profiles up
  LEFT JOIN user_credits uc ON uc.id = up.id
  WHERE uc.id IS NULL AND up.deleted_at IS NULL;
  
  INSERT INTO migration_validation_report (
    validation_run_id, validation_type, category, test_name,
    expected_value, actual_value, status, severity, description, recommendation
  ) VALUES (
    validation_run_id, 'cross_table', 'integrity', 'users_without_credits',
    '0', users_without_credits::TEXT,
    CASE WHEN users_without_credits = 0 THEN 'PASS' ELSE 'WARNING' END,
    CASE WHEN users_without_credits = 0 THEN 'INFO' ELSE 'MEDIUM' END,
    format('Users with profiles but no credit records: %s', users_without_credits),
    CASE WHEN users_without_credits > 0 THEN 'Create credit records for users without them' ELSE NULL END
  );
  
  -- 检查有积分记录但用户不存在的情况
  SELECT COUNT(*) INTO credits_without_users
  FROM user_credits uc
  LEFT JOIN auth.users au ON au.id = uc.id
  WHERE au.id IS NULL;
  
  INSERT INTO migration_validation_report (
    validation_run_id, validation_type, category, test_name,
    expected_value, actual_value, status, severity, description, recommendation
  ) VALUES (
    validation_run_id, 'cross_table', 'integrity', 'credits_without_users',
    '0', credits_without_users::TEXT,
    CASE WHEN credits_without_users = 0 THEN 'PASS' ELSE 'FAIL' END,
    CASE WHEN credits_without_users = 0 THEN 'INFO' ELSE 'HIGH' END,
    format('Credit records for non-existent users: %s', credits_without_users),
    CASE WHEN credits_without_users > 0 THEN 'Remove orphaned credit records' ELSE NULL END
  );
  
  -- 检查交易记录中引用不存在用户的情况
  SELECT COUNT(*) INTO transaction_user_mismatch
  FROM credit_transactions ct
  LEFT JOIN user_credits uc ON uc.id = ct.user_id
  WHERE ct.user_id IS NOT NULL AND uc.id IS NULL;
  
  INSERT INTO migration_validation_report (
    validation_run_id, validation_type, category, test_name,
    expected_value, actual_value, status, severity, description, recommendation
  ) VALUES (
    validation_run_id, 'cross_table', 'integrity', 'transaction_user_references',
    '0', transaction_user_mismatch::TEXT,
    CASE WHEN transaction_user_mismatch = 0 THEN 'PASS' ELSE 'FAIL' END,
    CASE WHEN transaction_user_mismatch = 0 THEN 'INFO' ELSE 'HIGH' END,
    format('Transactions referencing non-existent users: %s', transaction_user_mismatch),
    CASE WHEN transaction_user_mismatch > 0 THEN 'Fix or remove invalid transaction references' ELSE NULL END
  );
  
  -- 检查交易记录中引用不存在设备的情况
  SELECT COUNT(*) INTO device_transaction_mismatch
  FROM credit_transactions ct
  LEFT JOIN device_fingerprints df ON df.id = ct.device_fingerprint_id
  WHERE ct.device_fingerprint_id IS NOT NULL AND df.id IS NULL;
  
  INSERT INTO migration_validation_report (
    validation_run_id, validation_type, category, test_name,
    expected_value, actual_value, status, severity, description, recommendation
  ) VALUES (
    validation_run_id, 'cross_table', 'integrity', 'transaction_device_references',
    '0', device_transaction_mismatch::TEXT,
    CASE WHEN device_transaction_mismatch = 0 THEN 'PASS' ELSE 'FAIL' END,
    CASE WHEN device_transaction_mismatch = 0 THEN 'INFO' ELSE 'HIGH' END,
    format('Transactions referencing non-existent devices: %s', device_transaction_mismatch),
    CASE WHEN device_transaction_mismatch > 0 THEN 'Fix or remove invalid device transaction references' ELSE NULL END
  );
END;
$ LANGUAGE plpgsql;

-- ============================================================================
-- 第七部分：业务逻辑完整性验证
-- ============================================================================

CREATE OR REPLACE FUNCTION validate_business_logic_integrity(validation_run_id UUID)
RETURNS VOID AS $
DECLARE
  excessive_credits_count INTEGER;
  zero_credit_active_users INTEGER;
  future_reset_dates INTEGER;
  invalid_transaction_amounts INTEGER;
BEGIN
  -- 检查积分过多的用户（可能的数据错误）
  SELECT COUNT(*) INTO excessive_credits_count
  FROM user_credits WHERE credits > 10000; -- 假设10000积分是合理上限
  
  INSERT INTO migration_validation_report (
    validation_run_id, validation_type, category, test_name,
    expected_value, actual_value, status, severity, description, recommendation
  ) VALUES (
    validation_run_id, 'business_logic', 'integrity', 'excessive_credits_check',
    '0', excessive_credits_count::TEXT,
    CASE WHEN excessive_credits_count = 0 THEN 'PASS' ELSE 'WARNING' END,
    CASE WHEN excessive_credits_count = 0 THEN 'INFO' ELSE 'MEDIUM' END,
    format('Users with excessive credits (>10000): %s', excessive_credits_count),
    CASE WHEN excessive_credits_count > 0 THEN 'Review users with unusually high credit balances' ELSE NULL END
  );
  
  -- 检查零积分但有活跃订阅的用户
  SELECT COUNT(*) INTO zero_credit_active_users
  FROM user_credits uc
  JOIN subscriptions s ON s.user_id = uc.id
  WHERE uc.credits = 0 AND s.status = 'active';
  
  INSERT INTO migration_validation_report (
    validation_run_id, validation_type, category, test_name,
    expected_value, actual_value, status, severity, description, recommendation
  ) VALUES (
    validation_run_id, 'business_logic', 'integrity', 'zero_credits_active_subscription',
    '0', zero_credit_active_users::TEXT,
    CASE WHEN zero_credit_active_users = 0 THEN 'PASS' ELSE 'WARNING' END,
    CASE WHEN zero_credit_active_users = 0 THEN 'INFO' ELSE 'MEDIUM' END,
    format('Users with zero credits but active subscriptions: %s', zero_credit_active_users),
    CASE WHEN zero_credit_active_users > 0 THEN 'Review subscription status and credit allocation' ELSE NULL END
  );
  
  -- 检查未来的重置日期
  SELECT COUNT(*) INTO future_reset_dates
  FROM user_credits WHERE last_monthly_reset > CURRENT_DATE;
  
  INSERT INTO migration_validation_report (
    validation_run_id, validation_type, category, test_name,
    expected_value, actual_value, status, severity, description, recommendation
  ) VALUES (
    validation_run_id, 'business_logic', 'integrity', 'future_reset_dates',
    '0', future_reset_dates::TEXT,
    CASE WHEN future_reset_dates = 0 THEN 'PASS' ELSE 'FAIL' END,
    CASE WHEN future_reset_dates = 0 THEN 'INFO' ELSE 'HIGH' END,
    format('Users with future reset dates: %s', future_reset_dates),
    CASE WHEN future_reset_dates > 0 THEN 'Correct future reset dates to current date or earlier' ELSE NULL END
  );
  
  -- 检查无效的交易金额（零金额交易）
  SELECT COUNT(*) INTO invalid_transaction_amounts
  FROM credit_transactions WHERE amount = 0;
  
  INSERT INTO migration_validation_report (
    validation_run_id, validation_type, category, test_name,
    expected_value, actual_value, status, severity, description, recommendation
  ) VALUES (
    validation_run_id, 'business_logic', 'integrity', 'zero_amount_transactions',
    '0', invalid_transaction_amounts::TEXT,
    CASE WHEN invalid_transaction_amounts = 0 THEN 'PASS' ELSE 'WARNING' END,
    CASE WHEN invalid_transaction_amounts = 0 THEN 'INFO' ELSE 'LOW' END,
    format('Transactions with zero amount: %s', invalid_transaction_amounts),
    CASE WHEN invalid_transaction_amounts > 0 THEN 'Review zero-amount transactions for validity' ELSE NULL END
  );
END;
$ LANGUAGE plpgsql;

-- ============================================================================
-- 第八部分：数据修复函数
-- ============================================================================

-- 修复负积分余额
CREATE OR REPLACE FUNCTION repair_negative_credit_balances()
RETURNS INTEGER AS $
DECLARE
  repair_count INTEGER := 0;
  rec RECORD;
BEGIN
  FOR rec IN 
    SELECT id, credits FROM user_credits WHERE credits < 0
  LOOP
    UPDATE user_credits SET credits = 0 WHERE id = rec.id;
    
    INSERT INTO data_repair_log (
      repair_type, table_name, record_id, issue_description, repair_action,
      old_values, new_values, status
    ) VALUES (
      'negative_credits', 'user_credits', rec.id, 
      'User had negative credit balance', 'Set credits to 0',
      jsonb_build_object('credits', rec.credits),
      jsonb_build_object('credits', 0),
      'success'
    );
    
    repair_count := repair_count + 1;
  END LOOP;
  
  RETURN repair_count;
END;
$ LANGUAGE plpgsql;

-- 修复设备指纹积分不一致
CREATE OR REPLACE FUNCTION repair_device_credit_inconsistency()
RETURNS INTEGER AS $
DECLARE
  repair_count INTEGER := 0;
  rec RECORD;
  correct_credits_used INTEGER;
BEGIN
  FOR rec IN 
    SELECT id, trial_usage, credits_used 
    FROM device_fingerprints 
    WHERE credits_used != trial_usage * 180 AND deleted_at IS NULL
  LOOP
    correct_credits_used := rec.trial_usage * 180;
    
    UPDATE device_fingerprints 
    SET credits_used = correct_credits_used 
    WHERE id = rec.id;
    
    INSERT INTO data_repair_log (
      repair_type, table_name, record_id, issue_description, repair_action,
      old_values, new_values, status
    ) VALUES (
      'credit_calculation', 'device_fingerprints', rec.id, 
      'Credits used calculation was incorrect', 'Recalculated based on trial_usage * 180',
      jsonb_build_object('credits_used', rec.credits_used),
      jsonb_build_object('credits_used', correct_credits_used),
      'success'
    );
    
    repair_count := repair_count + 1;
  END LOOP;
  
  RETURN repair_count;
END;
$ LANGUAGE plpgsql;

-- 清理孤立的积分记录
CREATE OR REPLACE FUNCTION cleanup_orphaned_credit_records()
RETURNS INTEGER AS $
DECLARE
  cleanup_count INTEGER := 0;
  rec RECORD;
BEGIN
  FOR rec IN 
    SELECT uc.id, uc.credits
    FROM user_credits uc
    LEFT JOIN auth.users au ON au.id = uc.id
    WHERE au.id IS NULL
  LOOP
    DELETE FROM credit_transactions WHERE user_id = rec.id;
    DELETE FROM user_credits WHERE id = rec.id;
    
    INSERT INTO data_repair_log (
      repair_type, table_name, record_id, issue_description, repair_action,
      old_values, new_values, status
    ) VALUES (
      'orphaned_record', 'user_credits', rec.id, 
      'Credit record for non-existent user', 'Deleted orphaned record and related transactions',
      jsonb_build_object('credits', rec.credits),
      jsonb_build_object('deleted', true),
      'success'
    );
    
    cleanup_count := cleanup_count + 1;
  END LOOP;
  
  RETURN cleanup_count;
END;
$ LANGUAGE plpgsql;

-- ============================================================================
-- 第九部分：生成验证报告
-- ============================================================================

-- 生成验证报告的视图
CREATE OR REPLACE VIEW migration_validation_summary AS
SELECT 
  validation_run_id,
  category,
  COUNT(*) as total_tests,
  COUNT(*) FILTER (WHERE status = 'PASS') as passed,
  COUNT(*) FILTER (WHERE status = 'FAIL') as failed,
  COUNT(*) FILTER (WHERE status = 'WARNING') as warnings,
  COUNT(*) FILTER (WHERE severity = 'CRITICAL') as critical_issues,
  COUNT(*) FILTER (WHERE severity = 'HIGH') as high_issues,
  COUNT(*) FILTER (WHERE severity = 'MEDIUM') as medium_issues,
  MAX(created_at) as last_run
FROM migration_validation_report
GROUP BY validation_run_id, category
ORDER BY last_run DESC, category;

-- 生成详细报告的函数
CREATE OR REPLACE FUNCTION generate_validation_report(run_id UUID DEFAULT NULL)
RETURNS TABLE (
  category TEXT,
  test_name TEXT,
  status TEXT,
  severity TEXT,
  description TEXT,
  recommendation TEXT
) AS $
DECLARE
  target_run_id UUID;
BEGIN
  -- 如果没有指定run_id，使用最新的
  IF run_id IS NULL THEN
    SELECT validation_run_id INTO target_run_id
    FROM migration_validation_report
    ORDER BY created_at DESC
    LIMIT 1;
  ELSE
    target_run_id := run_id;
  END IF;
  
  RETURN QUERY
  SELECT 
    mvr.category,
    mvr.test_name,
    mvr.status,
    mvr.severity,
    mvr.description,
    mvr.recommendation
  FROM migration_validation_report mvr
  WHERE mvr.validation_run_id = target_run_id
  ORDER BY 
    CASE mvr.severity 
      WHEN 'CRITICAL' THEN 1 
      WHEN 'HIGH' THEN 2 
      WHEN 'MEDIUM' THEN 3 
      WHEN 'LOW' THEN 4 
      ELSE 5 
    END,
    mvr.category,
    mvr.test_name;
END;
$ LANGUAGE plpgsql;

-- ============================================================================
-- 第十部分：执行验证和生成报告
-- ============================================================================

-- 执行完整验证
DO $
DECLARE
  run_id UUID;
  summary_rec RECORD;
BEGIN
  RAISE NOTICE '=== 开始执行数据迁移完整性验证 ===';
  
  -- 运行验证
  SELECT run_comprehensive_migration_validation() INTO run_id;
  
  RAISE NOTICE '验证运行ID: %', run_id;
  RAISE NOTICE '';
  RAISE NOTICE '=== 验证结果摘要 ===';
  
  -- 显示摘要
  FOR summary_rec IN 
    SELECT * FROM migration_validation_summary WHERE validation_run_id = run_id
  LOOP
    RAISE NOTICE '类别: % | 总测试: % | 通过: % | 失败: % | 警告: % | 严重: % | 高: % | 中: %',
      summary_rec.category,
      summary_rec.total_tests,
      summary_rec.passed,
      summary_rec.failed,
      summary_rec.warnings,
      summary_rec.critical_issues,
      summary_rec.high_issues,
      summary_rec.medium_issues;
  END LOOP;
  
  RAISE NOTICE '';
  RAISE NOTICE '=== 详细报告 ===';
  RAISE NOTICE '运行以下查询查看详细报告:';
  RAISE NOTICE 'SELECT * FROM generate_validation_report(''%'');', run_id;
  RAISE NOTICE '';
  RAISE NOTICE '=== 数据修复建议 ===';
  RAISE NOTICE '如果发现问题，可以运行以下修复函数:';
  RAISE NOTICE '- SELECT repair_negative_credit_balances(); -- 修复负积分';
  RAISE NOTICE '- SELECT repair_device_credit_inconsistency(); -- 修复设备积分不一致';
  RAISE NOTICE '- SELECT cleanup_orphaned_credit_records(); -- 清理孤立记录';
END;
$;

-- 注释：
-- 1. 此脚本提供全面的数据迁移验证功能
-- 2. 包含用户数据、设备数据、交易数据和跨表一致性验证
-- 3. 提供自动修复功能处理常见的数据问题
-- 4. 生成详细的验证报告和修复建议
-- 5. 支持重复执行，每次运行都会记录验证结果
-- 6. 建议在迁移完成后立即执行此验证脚本