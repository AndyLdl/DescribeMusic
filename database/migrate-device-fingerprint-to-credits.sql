-- 设备指纹试用数据迁移脚本：从次数制迁移到积分制
-- 执行前请确保已经执行了用户数据迁移脚本
-- 此脚本处理未注册用户的设备指纹试用数据

-- ============================================================================
-- 第一部分：设备指纹表结构更新和数据迁移准备
-- ============================================================================

-- 记录迁移前设备指纹数据快照
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

-- 确保设备指纹表有积分相关字段（如果之前没有添加）
DO $
BEGIN
  -- 检查并添加trial_credits字段
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'device_fingerprints' AND column_name = 'trial_credits'
  ) THEN
    ALTER TABLE device_fingerprints ADD COLUMN trial_credits INTEGER DEFAULT 100;
  END IF;
  
  -- 检查并添加credits_used字段
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'device_fingerprints' AND column_name = 'credits_used'
  ) THEN
    ALTER TABLE device_fingerprints ADD COLUMN credits_used INTEGER DEFAULT 0;
  END IF;
END;
$;

-- ============================================================================
-- 第二部分：迁移设备指纹试用数据
-- ============================================================================

-- 迁移函数：将设备指纹试用次数转换为积分制
CREATE OR REPLACE FUNCTION migrate_device_fingerprint_to_credits(device_uuid UUID)
RETURNS BOOLEAN AS $
DECLARE
  device_record RECORD;
  remaining_trial_credits INTEGER;
  credits_consumed INTEGER;
  migration_success BOOLEAN := TRUE;
BEGIN
  -- 获取设备指纹当前数据
  SELECT * INTO device_record
  FROM device_fingerprints
  WHERE id = device_uuid AND deleted_at IS NULL;
  
  IF NOT FOUND THEN
    INSERT INTO migration_log (migration_type, table_name, record_id, status, error_message)
    VALUES ('device_migration', 'device_fingerprints', device_uuid, 'failed', 'Device fingerprint not found');
    RETURN FALSE;
  END IF;
  
  -- 计算已消费的积分（每次试用等价于180积分）
  credits_consumed := device_record.trial_usage * 180;
  
  -- 计算剩余试用积分
  remaining_trial_credits := GREATEST(0, 100 - credits_consumed);
  
  BEGIN
    -- 更新设备指纹记录
    UPDATE device_fingerprints SET
      trial_credits = remaining_trial_credits,
      credits_used = credits_consumed,
      last_used_at = COALESCE(last_used_at, NOW())
    WHERE id = device_uuid;
    
    -- 如果设备有积分消费记录，创建积分交易记录
    IF credits_consumed > 0 THEN
      INSERT INTO credit_transactions (
        device_fingerprint_id,
        user_id,
        transaction_type,
        amount,
        balance_after,
        source,
        description,
        metadata
      ) VALUES (
        device_uuid,
        device_record.user_id, -- 如果已关联用户
        'consume',
        -credits_consumed,
        remaining_trial_credits,
        'migration',
        'Migrated trial usage from usage-based system to credit system',
        jsonb_build_object(
          'original_trial_usage', device_record.trial_usage,
          'credits_per_usage', 180,
          'remaining_trial_credits', remaining_trial_credits
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
      'device_migration',
      'device_fingerprints',
      device_uuid,
      jsonb_build_object(
        'trial_usage', device_record.trial_usage,
        'original_trial_credits', COALESCE(device_record.trial_credits, 100),
        'original_credits_used', COALESCE(device_record.credits_used, 0)
      ),
      jsonb_build_object(
        'trial_credits', remaining_trial_credits,
        'credits_used', credits_consumed
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
      'device_migration',
      'device_fingerprints',
      device_uuid,
      'failed',
      SQLERRM
    );
  END;
  
  RETURN migration_success;
END;
$ LANGUAGE plpgsql;

-- 执行设备指纹数据迁移
DO $
DECLARE
  device_record RECORD;
  migration_count INTEGER := 0;
  success_count INTEGER := 0;
  failed_count INTEGER := 0;
  skipped_count INTEGER := 0;
BEGIN
  RAISE NOTICE '开始迁移设备指纹试用数据到积分制...';
  
  FOR device_record IN 
    SELECT id, trial_usage, trial_credits, credits_used 
    FROM device_fingerprints 
    WHERE deleted_at IS NULL
  LOOP
    migration_count := migration_count + 1;
    
    -- 检查是否已经迁移过（避免重复迁移）
    IF device_record.trial_credits IS NOT NULL AND device_record.credits_used IS NOT NULL THEN
      -- 如果数据看起来已经是积分制格式，跳过
      IF device_record.credits_used = device_record.trial_usage * 180 THEN
        skipped_count := skipped_count + 1;
        INSERT INTO migration_log (
          migration_type, table_name, record_id, status, error_message
        ) VALUES (
          'device_migration', 'device_fingerprints', device_record.id, 'skipped', 'Already migrated'
        );
        CONTINUE;
      END IF;
    END IF;
    
    IF migrate_device_fingerprint_to_credits(device_record.id) THEN
      success_count := success_count + 1;
    ELSE
      failed_count := failed_count + 1;
    END IF;
    
    -- 每100个设备输出一次进度
    IF migration_count % 100 = 0 THEN
      RAISE NOTICE '已处理 % 个设备，成功 %，失败 %，跳过 %', migration_count, success_count, failed_count, skipped_count;
    END IF;
  END LOOP;
  
  RAISE NOTICE '设备指纹数据迁移完成！总计: %，成功: %，失败: %，跳过: %', migration_count, success_count, failed_count, skipped_count;
END;
$;

-- ============================================================================
-- 第三部分：创建向后兼容的函数
-- ============================================================================

-- 创建兼容性函数：检查设备是否可以进行试用分析（基于积分）
CREATE OR REPLACE FUNCTION can_device_analyze_compat(fingerprint_hash_param TEXT)
RETURNS boolean AS $
DECLARE
  remaining_credits INTEGER;
BEGIN
  SELECT (trial_credits - credits_used) INTO remaining_credits
  FROM device_fingerprints 
  WHERE fingerprint_hash = fingerprint_hash_param 
  AND deleted_at IS NULL
  AND user_id IS NULL;  -- 只检查未关联用户的设备
  
  -- 如果设备指纹不存在，可以分析（新设备，有100积分试用）
  IF NOT FOUND THEN
    RETURN true;
  END IF;
  
  -- 检查是否有剩余积分
  RETURN remaining_credits > 0;
END;
$ LANGUAGE plpgsql;

-- 更新现有的记录分析使用函数，支持积分制
CREATE OR REPLACE FUNCTION record_analysis_usage_credits(
    user_uuid UUID DEFAULT NULL,
    fingerprint_hash_param TEXT DEFAULT NULL,
    credits_consumed INTEGER DEFAULT 180, -- 默认3分钟音频消费
    file_name_param TEXT DEFAULT NULL,
    file_size_param BIGINT DEFAULT NULL,
    file_format_param TEXT DEFAULT NULL,
    processing_time_param INTEGER DEFAULT NULL,
    success_param BOOLEAN DEFAULT TRUE,
    error_message_param TEXT DEFAULT NULL,
    analysis_result_id_param TEXT DEFAULT NULL,
    result_summary_param JSONB DEFAULT '{}'
)
RETURNS UUID AS $
DECLARE
    device_fingerprint_uuid UUID;
    usage_log_id UUID;
    current_credits INTEGER;
    new_balance INTEGER;
BEGIN
    -- 如果提供了设备指纹，查找或创建设备指纹记录
    IF fingerprint_hash_param IS NOT NULL THEN
        SELECT id, (trial_credits - credits_used) INTO device_fingerprint_uuid, current_credits
        FROM device_fingerprints 
        WHERE fingerprint_hash = fingerprint_hash_param AND deleted_at IS NULL;
        
        -- 如果设备指纹不存在，创建新记录
        IF NOT FOUND THEN
            INSERT INTO device_fingerprints (
                fingerprint_hash, 
                trial_usage, 
                trial_credits, 
                credits_used, 
                last_used_at
            )
            VALUES (fingerprint_hash_param, 0, 100, 0, NOW())
            RETURNING id INTO device_fingerprint_uuid;
            current_credits := 100;
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
    
    -- 如果分析成功，更新积分使用
    IF success_param THEN
        IF user_uuid IS NOT NULL THEN
            -- 用户积分消费
            UPDATE user_credits 
            SET credits = credits - credits_consumed
            WHERE id = user_uuid;
            
            -- 记录积分交易
            INSERT INTO credit_transactions (
                user_id, transaction_type, amount, balance_after, source, description, analysis_id
            ) VALUES (
                user_uuid, 'consume', -credits_consumed, 
                (SELECT credits FROM user_credits WHERE id = user_uuid),
                'analysis', 'Audio analysis credit consumption', analysis_result_id_param
            );
            
        ELSIF device_fingerprint_uuid IS NOT NULL THEN
            -- 设备试用积分消费
            new_balance := GREATEST(0, current_credits - credits_consumed);
            
            UPDATE device_fingerprints 
            SET 
                trial_usage = trial_usage + 1,
                credits_used = credits_used + credits_consumed
            WHERE id = device_fingerprint_uuid;
            
            -- 记录积分交易
            INSERT INTO credit_transactions (
                device_fingerprint_id, transaction_type, amount, balance_after, 
                source, description, analysis_id
            ) VALUES (
                device_fingerprint_uuid, 'consume', -credits_consumed, new_balance,
                'analysis', 'Trial audio analysis credit consumption', analysis_result_id_param
            );
        END IF;
    END IF;
    
    RETURN usage_log_id;
END;
$ LANGUAGE plpgsql;

-- ============================================================================
-- 第四部分：数据完整性验证
-- ============================================================================

-- 验证设备指纹迁移结果的函数
CREATE OR REPLACE FUNCTION validate_device_fingerprint_migration()
RETURNS TABLE (
  validation_type TEXT,
  expected_count INTEGER,
  actual_count INTEGER,
  status TEXT,
  details TEXT
) AS $
DECLARE
  original_device_count INTEGER;
  migrated_device_count INTEGER;
  negative_credits_count INTEGER;
  inconsistent_data_count INTEGER;
BEGIN
  -- 获取原始设备数量
  SELECT record_count INTO original_device_count
  FROM pre_migration_snapshot 
  WHERE table_name = 'device_fingerprints_pre_credit';
  
  -- 获取迁移后的设备数量
  SELECT COUNT(*) INTO migrated_device_count
  FROM device_fingerprints
  WHERE deleted_at IS NULL;
  
  -- 验证设备数量
  RETURN QUERY SELECT 
    'device_count'::TEXT,
    original_device_count,
    migrated_device_count,
    CASE WHEN original_device_count = migrated_device_count THEN 'PASS' ELSE 'FAIL' END,
    format('Original: %s, Current: %s', original_device_count, migrated_device_count);
  
  -- 验证没有负积分
  SELECT COUNT(*) INTO negative_credits_count
  FROM device_fingerprints 
  WHERE (trial_credits - credits_used) < 0 AND deleted_at IS NULL;
  
  RETURN QUERY SELECT 
    'negative_credits_check'::TEXT,
    0,
    negative_credits_count,
    CASE WHEN negative_credits_count = 0 THEN 'PASS' ELSE 'FAIL' END,
    format('Devices with negative remaining credits: %s', negative_credits_count);
  
  -- 验证数据一致性（credits_used应该等于trial_usage * 180）
  SELECT COUNT(*) INTO inconsistent_data_count
  FROM device_fingerprints 
  WHERE credits_used != trial_usage * 180 AND deleted_at IS NULL;
  
  RETURN QUERY SELECT 
    'data_consistency_check'::TEXT,
    0,
    inconsistent_data_count,
    CASE WHEN inconsistent_data_count = 0 THEN 'PASS' ELSE 'FAIL' END,
    format('Devices with inconsistent credit/usage data: %s', inconsistent_data_count);
  
  -- 验证迁移日志
  RETURN QUERY SELECT 
    'migration_log_device_success_rate'::TEXT,
    original_device_count,
    (SELECT COUNT(*) FROM migration_log WHERE migration_type = 'device_migration' AND status IN ('success', 'skipped')),
    CASE WHEN (SELECT COUNT(*) FROM migration_log WHERE migration_type = 'device_migration' AND status IN ('success', 'skipped')) >= original_device_count THEN 'PASS' ELSE 'FAIL' END,
    format('Successful/Skipped migrations: %s/%s', 
      (SELECT COUNT(*) FROM migration_log WHERE migration_type = 'device_migration' AND status IN ('success', 'skipped')),
      original_device_count);
END;
$ LANGUAGE plpgsql;

-- 执行验证
SELECT * FROM validate_device_fingerprint_migration();

-- ============================================================================
-- 第五部分：创建索引和优化
-- ============================================================================

-- 确保新字段有适当的索引
CREATE INDEX IF NOT EXISTS idx_device_fingerprints_trial_credits ON device_fingerprints(trial_credits);
CREATE INDEX IF NOT EXISTS idx_device_fingerprints_credits_used ON device_fingerprints(credits_used);
CREATE INDEX IF NOT EXISTS idx_device_fingerprints_remaining_credits ON device_fingerprints((trial_credits - credits_used));

-- 更新统计信息
ANALYZE device_fingerprints;

-- ============================================================================
-- 第六部分：输出迁移摘要
-- ============================================================================

DO $
DECLARE
  summary_record RECORD;
BEGIN
  RAISE NOTICE '=== 设备指纹试用数据迁移摘要 ===';
  
  FOR summary_record IN 
    SELECT 
      COUNT(*) as total_devices,
      COUNT(*) FILTER (WHERE user_id IS NULL) as unregistered_devices,
      COUNT(*) FILTER (WHERE user_id IS NOT NULL) as registered_devices,
      SUM(trial_credits) as total_trial_credits,
      SUM(credits_used) as total_credits_used,
      SUM(trial_credits - credits_used) as total_remaining_credits,
      AVG(trial_credits - credits_used) as avg_remaining_credits
    FROM device_fingerprints
    WHERE deleted_at IS NULL
  LOOP
    RAISE NOTICE '设备总数: %', summary_record.total_devices;
    RAISE NOTICE '未注册设备: %', summary_record.unregistered_devices;
    RAISE NOTICE '已注册设备: %', summary_record.registered_devices;
    RAISE NOTICE '试用积分总量: %', summary_record.total_trial_credits;
    RAISE NOTICE '已使用积分: %', summary_record.total_credits_used;
    RAISE NOTICE '剩余积分总量: %', summary_record.total_remaining_credits;
    RAISE NOTICE '平均剩余积分: %', ROUND(summary_record.avg_remaining_credits, 2);
  END LOOP;
  
  -- 显示迁移统计
  FOR summary_record IN
    SELECT 
      migration_type,
      status,
      COUNT(*) as count
    FROM migration_log 
    WHERE migration_type = 'device_migration'
    GROUP BY migration_type, status
    ORDER BY status
  LOOP
    RAISE NOTICE '迁移状态 %: % 个设备', summary_record.status, summary_record.count;
  END LOOP;
  
  RAISE NOTICE '=== 设备指纹迁移完成 ===';
END;
$;

-- 注释：
-- 1. 此脚本将设备指纹的试用次数数据迁移到积分制系统
-- 2. 每次试用使用转换为180积分消费（基于3分钟平均音频时长）
-- 3. 保持向后兼容性，现有代码可以继续工作
-- 4. 包含完整的验证和日志记录机制
-- 5. 支持重复执行，会跳过已经迁移的记录
-- 6. 建议在测试环境中先执行并验证结果