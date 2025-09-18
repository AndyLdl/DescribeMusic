-- 积分系统数据库函数
-- 处理积分消费、添加和月度重置等操作

-- 1. 积分消费函数
-- 处理用户积分消费，包括余额检查和交易记录
CREATE OR REPLACE FUNCTION consume_credits(
  user_uuid UUID,
  credits_amount INTEGER,
  analysis_description TEXT,
  analysis_id TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
  current_credits INTEGER;
  new_balance INTEGER;
BEGIN
  -- 参数验证
  IF user_uuid IS NULL OR credits_amount <= 0 THEN
    RETURN FALSE;
  END IF;
  
  -- 获取当前积分余额
  SELECT credits INTO current_credits 
  FROM user_credits 
  WHERE id = user_uuid;
  
  -- 如果用户积分记录不存在，创建默认记录
  IF current_credits IS NULL THEN
    INSERT INTO user_credits (id, credits, trial_credits, monthly_credits) 
    VALUES (user_uuid, 200, 0, 200); -- 新用户默认200积分
    current_credits := 200;
  END IF;
  
  -- 检查积分是否足够
  IF current_credits < credits_amount THEN
    RETURN FALSE;
  END IF;
  
  -- 计算新余额
  new_balance := current_credits - credits_amount;
  
  -- 更新用户积分
  UPDATE user_credits 
  SET credits = new_balance, updated_at = NOW()
  WHERE id = user_uuid;
  
  -- 记录交易
  INSERT INTO credit_transactions (
    user_id, transaction_type, amount, balance_after, 
    source, description, analysis_id
  ) VALUES (
    user_uuid, 'consume', -credits_amount, new_balance,
    'analysis', analysis_description, analysis_id
  );
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- 2. 设备试用积分消费函数
-- 处理未注册用户的试用积分消费
CREATE OR REPLACE FUNCTION consume_trial_credits(
  fingerprint_hash_param TEXT,
  credits_amount INTEGER,
  analysis_description TEXT,
  analysis_id TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
  device_fingerprint_uuid UUID;
  current_trial_credits INTEGER;
  current_credits_used INTEGER;
  new_credits_used INTEGER;
  remaining_credits INTEGER;
BEGIN
  -- 参数验证
  IF fingerprint_hash_param IS NULL OR credits_amount <= 0 THEN
    RETURN FALSE;
  END IF;
  
  -- 查找或创建设备指纹记录
  SELECT id, trial_credits, credits_used 
  INTO device_fingerprint_uuid, current_trial_credits, current_credits_used
  FROM device_fingerprints 
  WHERE fingerprint_hash = fingerprint_hash_param AND deleted_at IS NULL;
  
  -- 如果设备指纹不存在，创建新记录
  IF device_fingerprint_uuid IS NULL THEN
    INSERT INTO device_fingerprints (fingerprint_hash, trial_credits, credits_used, last_used_at)
    VALUES (fingerprint_hash_param, 100, 0, NOW())
    RETURNING id, trial_credits, credits_used 
    INTO device_fingerprint_uuid, current_trial_credits, current_credits_used;
  END IF;
  
  -- 计算剩余积分
  remaining_credits := current_trial_credits - current_credits_used;
  
  -- 检查积分是否足够
  IF remaining_credits < credits_amount THEN
    RETURN FALSE;
  END IF;
  
  -- 计算新的已使用积分
  new_credits_used := current_credits_used + credits_amount;
  
  -- 更新设备指纹记录
  UPDATE device_fingerprints 
  SET credits_used = new_credits_used, last_used_at = NOW()
  WHERE id = device_fingerprint_uuid;
  
  -- 记录交易
  INSERT INTO credit_transactions (
    device_fingerprint_id, transaction_type, amount, balance_after, 
    source, description, analysis_id
  ) VALUES (
    device_fingerprint_uuid, 'consume', -credits_amount, (current_trial_credits - new_credits_used),
    'analysis', analysis_description, analysis_id
  );
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- 3. 积分添加函数
-- 处理积分添加，包括购买积分、月度赠送等
CREATE OR REPLACE FUNCTION add_credits(
  user_uuid UUID,
  credits_amount INTEGER,
  credit_source TEXT,
  description TEXT DEFAULT NULL,
  payment_record_id UUID DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
  current_credits INTEGER;
  new_balance INTEGER;
BEGIN
  -- 参数验证
  IF user_uuid IS NULL OR credits_amount <= 0 THEN
    RETURN FALSE;
  END IF;
  
  -- 获取当前积分余额
  SELECT credits INTO current_credits 
  FROM user_credits 
  WHERE id = user_uuid;
  
  -- 如果用户记录不存在，创建一个
  IF current_credits IS NULL THEN
    INSERT INTO user_credits (id, credits) 
    VALUES (user_uuid, credits_amount);
    new_balance := credits_amount;
  ELSE
    -- 计算新余额
    new_balance := current_credits + credits_amount;
    
    -- 更新用户积分
    UPDATE user_credits 
    SET credits = new_balance, updated_at = NOW()
    WHERE id = user_uuid;
    
    -- 如果是购买积分，同时更新purchased_credits字段
    IF credit_source = 'purchase' THEN
      UPDATE user_credits 
      SET purchased_credits = purchased_credits + credits_amount
      WHERE id = user_uuid;
    END IF;
  END IF;
  
  -- 记录交易
  INSERT INTO credit_transactions (
    user_id, transaction_type, amount, balance_after, 
    source, description, payment_id
  ) VALUES (
    user_uuid, 'add', credits_amount, new_balance,
    credit_source, description, payment_record_id
  );
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- 4. 月度积分重置函数
-- 为所有用户添加月度积分并重置计数
CREATE OR REPLACE FUNCTION reset_monthly_credits() RETURNS INTEGER AS $$
DECLARE
  reset_count INTEGER := 0;
  user_record RECORD;
BEGIN
  -- 为所有需要重置的用户添加月度积分
  FOR user_record IN 
    SELECT id FROM user_credits 
    WHERE last_monthly_reset < CURRENT_DATE
  LOOP
    -- 添加月度积分
    PERFORM add_credits(
      user_record.id, 
      200, 
      'monthly_grant', 
      'Monthly credit grant'
    );
    
    -- 更新重置日期
    UPDATE user_credits 
    SET last_monthly_reset = CURRENT_DATE
    WHERE id = user_record.id;
    
    reset_count := reset_count + 1;
  END LOOP;
  
  RETURN reset_count;
END;
$$ LANGUAGE plpgsql;

-- 5. 积分退款函数
-- 处理分析失败时的积分退款
CREATE OR REPLACE FUNCTION refund_credits(
  user_uuid UUID,
  credits_amount INTEGER,
  refund_reason TEXT,
  original_analysis_id TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
  current_credits INTEGER;
  new_balance INTEGER;
BEGIN
  -- 参数验证
  IF user_uuid IS NULL OR credits_amount <= 0 THEN
    RETURN FALSE;
  END IF;
  
  -- 获取当前积分余额
  SELECT credits INTO current_credits 
  FROM user_credits 
  WHERE id = user_uuid;
  
  -- 如果用户记录不存在，无法退款
  IF current_credits IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- 计算新余额
  new_balance := current_credits + credits_amount;
  
  -- 更新用户积分
  UPDATE user_credits 
  SET credits = new_balance, updated_at = NOW()
  WHERE id = user_uuid;
  
  -- 记录退款交易
  INSERT INTO credit_transactions (
    user_id, transaction_type, amount, balance_after, 
    source, description, analysis_id
  ) VALUES (
    user_uuid, 'refund', credits_amount, new_balance,
    'refund', refund_reason, original_analysis_id
  );
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- 6. 设备试用积分退款函数
-- 处理试用用户分析失败时的积分退款
CREATE OR REPLACE FUNCTION refund_trial_credits(
  fingerprint_hash_param TEXT,
  credits_amount INTEGER,
  refund_reason TEXT,
  original_analysis_id TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
  device_fingerprint_uuid UUID;
  current_credits_used INTEGER;
  new_credits_used INTEGER;
  trial_credits INTEGER;
BEGIN
  -- 参数验证
  IF fingerprint_hash_param IS NULL OR credits_amount <= 0 THEN
    RETURN FALSE;
  END IF;
  
  -- 查找设备指纹记录
  SELECT id, credits_used, trial_credits 
  INTO device_fingerprint_uuid, current_credits_used, trial_credits
  FROM device_fingerprints 
  WHERE fingerprint_hash = fingerprint_hash_param AND deleted_at IS NULL;
  
  -- 如果设备指纹不存在，无法退款
  IF device_fingerprint_uuid IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- 检查退款金额是否合理
  IF current_credits_used < credits_amount THEN
    RETURN FALSE;
  END IF;
  
  -- 计算新的已使用积分
  new_credits_used := current_credits_used - credits_amount;
  
  -- 更新设备指纹记录
  UPDATE device_fingerprints 
  SET credits_used = new_credits_used, last_used_at = NOW()
  WHERE id = device_fingerprint_uuid;
  
  -- 记录退款交易
  INSERT INTO credit_transactions (
    device_fingerprint_id, transaction_type, amount, balance_after, 
    source, description, analysis_id
  ) VALUES (
    device_fingerprint_uuid, 'refund', credits_amount, (trial_credits - new_credits_used),
    'refund', refund_reason, original_analysis_id
  );
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- 7. 检查用户积分余额函数
-- 快速检查用户是否有足够积分进行分析
CREATE OR REPLACE FUNCTION check_user_credits(
  user_uuid UUID,
  required_credits INTEGER DEFAULT 1
) RETURNS BOOLEAN AS $$
DECLARE
  current_credits INTEGER;
BEGIN
  -- 参数验证
  IF user_uuid IS NULL OR required_credits <= 0 THEN
    RETURN FALSE;
  END IF;
  
  -- 获取当前积分余额
  SELECT credits INTO current_credits 
  FROM user_credits 
  WHERE id = user_uuid;
  
  -- 如果用户记录不存在，返回false
  IF current_credits IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- 检查积分是否足够
  RETURN current_credits >= required_credits;
END;
$$ LANGUAGE plpgsql;

-- 8. 检查设备试用积分函数
-- 检查设备指纹是否有足够的试用积分
CREATE OR REPLACE FUNCTION check_trial_credits(
  fingerprint_hash_param TEXT,
  required_credits INTEGER DEFAULT 1
) RETURNS BOOLEAN AS $$
DECLARE
  trial_credits INTEGER;
  credits_used INTEGER;
  remaining_credits INTEGER;
BEGIN
  -- 参数验证
  IF fingerprint_hash_param IS NULL OR required_credits <= 0 THEN
    RETURN FALSE;
  END IF;
  
  -- 获取设备试用积分信息
  SELECT df.trial_credits, df.credits_used 
  INTO trial_credits, credits_used
  FROM device_fingerprints df
  WHERE df.fingerprint_hash = fingerprint_hash_param 
  AND df.deleted_at IS NULL
  AND df.user_id IS NULL;  -- 只检查未关联用户的设备
  
  -- 如果设备指纹不存在，新设备有100积分试用
  IF trial_credits IS NULL THEN
    RETURN 100 >= required_credits;
  END IF;
  
  -- 计算剩余积分
  remaining_credits := trial_credits - COALESCE(credits_used, 0);
  
  -- 检查积分是否足够
  RETURN remaining_credits >= required_credits;
END;
$$ LANGUAGE plpgsql;

-- 9. 获取用户积分详情函数
-- 返回用户的详细积分信息
CREATE OR REPLACE FUNCTION get_user_credit_details(user_uuid UUID)
RETURNS TABLE(
  total_credits INTEGER,
  trial_credits INTEGER,
  monthly_credits INTEGER,
  purchased_credits INTEGER,
  last_monthly_reset DATE,
  subscription_status TEXT,
  subscription_expires_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    uc.credits,
    uc.trial_credits,
    uc.monthly_credits,
    uc.purchased_credits,
    uc.last_monthly_reset,
    s.status,
    s.current_period_end
  FROM user_credits uc
  LEFT JOIN subscriptions s ON s.user_id = uc.id AND s.status = 'active'
  WHERE uc.id = user_uuid;
END;
$$ LANGUAGE plpgsql;

-- 10. 清理过期交易记录函数
-- 清理超过1年的积分交易记录（保留重要记录）
CREATE OR REPLACE FUNCTION cleanup_old_credit_transactions()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- 删除超过1年的普通消费记录（保留购买和退款记录）
  DELETE FROM credit_transactions 
  WHERE created_at < NOW() - INTERVAL '1 year'
  AND source = 'analysis'
  AND transaction_type = 'consume';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- 完成积分系统数据库函数创建
-- 这些函数提供了完整的积分管理功能，包括消费、添加、退款和查询