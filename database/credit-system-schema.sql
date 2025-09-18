-- 积分系统数据库表结构
-- 用于音频分析应用的积分制系统和支付功能

-- 1. 用户积分表 (user_credits)
-- 存储用户积分信息，包括试用积分、月度积分和购买积分
CREATE TABLE user_credits (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  credits INTEGER DEFAULT 0 NOT NULL,
  trial_credits INTEGER DEFAULT 100 NOT NULL, -- 试用积分
  monthly_credits INTEGER DEFAULT 200 NOT NULL, -- 月度赠送积分
  purchased_credits INTEGER DEFAULT 0 NOT NULL, -- 购买积分
  last_monthly_reset DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- 约束条件
  CONSTRAINT credits_non_negative CHECK (credits >= 0),
  CONSTRAINT trial_credits_non_negative CHECK (trial_credits >= 0),
  CONSTRAINT monthly_credits_non_negative CHECK (monthly_credits >= 0),
  CONSTRAINT purchased_credits_non_negative CHECK (purchased_credits >= 0)
);

-- 2. 订阅表 (subscriptions)
-- 管理用户订阅状态和套餐信息
CREATE TABLE subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  lemonsqueezy_subscription_id TEXT UNIQUE NOT NULL,
  lemonsqueezy_variant_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'cancelled', 'expired', 'past_due')),
  plan_name TEXT NOT NULL,
  plan_credits INTEGER NOT NULL,
  current_period_start TIMESTAMP WITH TIME ZONE NOT NULL,
  current_period_end TIMESTAMP WITH TIME ZONE NOT NULL,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- 约束：每个用户只能有一个活跃订阅
  CONSTRAINT unique_active_subscription_per_user 
    EXCLUDE (user_id WITH =) WHERE (status = 'active')
);

-- 3. 积分交易表 (credit_transactions)
-- 记录所有积分相关的交易，包括消费、添加和退款
CREATE TABLE credit_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  device_fingerprint_id UUID REFERENCES device_fingerprints(id) NULL, -- 试用用户
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('consume', 'add', 'refund')),
  amount INTEGER NOT NULL, -- 正数为增加，负数为消费
  balance_after INTEGER NOT NULL,
  source TEXT NOT NULL, -- 'analysis', 'purchase', 'monthly_grant', 'trial_grant', 'refund'
  description TEXT,
  metadata JSONB DEFAULT '{}',
  analysis_id TEXT NULL, -- 关联分析记录
  payment_id UUID NULL, -- 关联支付记录
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- 约束条件
  CONSTRAINT balance_after_non_negative CHECK (balance_after >= 0)
);

-- 4. 支付记录表 (payment_records)
-- 存储所有支付相关的记录和状态
CREATE TABLE payment_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  lemonsqueezy_order_id TEXT UNIQUE NOT NULL,
  lemonsqueezy_subscription_id TEXT NULL,
  amount_usd DECIMAL(10,2) NOT NULL,
  credits_purchased INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  payment_method TEXT,
  webhook_data JSONB,
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- 约束条件
  CONSTRAINT amount_positive CHECK (amount_usd > 0),
  CONSTRAINT credits_purchased_positive CHECK (credits_purchased > 0)
);

-- 5. 扩展现有device_fingerprints表支持积分制
-- 为试用用户添加积分相关字段
ALTER TABLE device_fingerprints 
ADD COLUMN IF NOT EXISTS trial_credits INTEGER DEFAULT 100,
ADD COLUMN IF NOT EXISTS credits_used INTEGER DEFAULT 0;

-- 6. 创建索引优化查询性能

-- user_credits表索引
CREATE INDEX idx_user_credits_last_monthly_reset ON user_credits(last_monthly_reset);
CREATE INDEX idx_user_credits_updated_at ON user_credits(updated_at);

-- subscriptions表索引
CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_lemonsqueezy_id ON subscriptions(lemonsqueezy_subscription_id);
CREATE INDEX idx_subscriptions_current_period_end ON subscriptions(current_period_end);

-- credit_transactions表索引
CREATE INDEX idx_credit_transactions_user_id ON credit_transactions(user_id);
CREATE INDEX idx_credit_transactions_device_fingerprint ON credit_transactions(device_fingerprint_id);
CREATE INDEX idx_credit_transactions_created_at ON credit_transactions(created_at);
CREATE INDEX idx_credit_transactions_type ON credit_transactions(transaction_type);
CREATE INDEX idx_credit_transactions_source ON credit_transactions(source);
CREATE INDEX idx_credit_transactions_analysis_id ON credit_transactions(analysis_id);

-- payment_records表索引
CREATE INDEX idx_payment_records_user_id ON payment_records(user_id);
CREATE INDEX idx_payment_records_status ON payment_records(status);
CREATE INDEX idx_payment_records_lemonsqueezy_order ON payment_records(lemonsqueezy_order_id);
CREATE INDEX idx_payment_records_created_at ON payment_records(created_at);

-- device_fingerprints表新字段索引
CREATE INDEX idx_device_fingerprints_trial_credits ON device_fingerprints(trial_credits);
CREATE INDEX idx_device_fingerprints_credits_used ON device_fingerprints(credits_used);

-- 7. 创建触发器自动更新时间戳

-- 更新user_credits的updated_at字段
CREATE TRIGGER update_user_credits_updated_at 
  BEFORE UPDATE ON user_credits 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 更新subscriptions的updated_at字段
CREATE TRIGGER update_subscriptions_updated_at 
  BEFORE UPDATE ON subscriptions 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 8. 创建积分系统统计视图

-- 用户积分统计视图
CREATE OR REPLACE VIEW user_credit_stats AS
SELECT 
    uc.id as user_id,
    uc.credits as total_credits,
    uc.trial_credits,
    uc.monthly_credits,
    uc.purchased_credits,
    uc.last_monthly_reset,
    -- 订阅信息
    s.status as subscription_status,
    s.plan_name,
    s.current_period_end as subscription_expires_at,
    -- 本月积分消费
    COALESCE((
        SELECT SUM(ABS(amount)) 
        FROM credit_transactions ct 
        WHERE ct.user_id = uc.id 
        AND ct.transaction_type = 'consume'
        AND ct.created_at >= DATE_TRUNC('month', CURRENT_DATE)
    ), 0) as this_month_consumed,
    -- 总积分消费
    COALESCE((
        SELECT SUM(ABS(amount)) 
        FROM credit_transactions ct 
        WHERE ct.user_id = uc.id 
        AND ct.transaction_type = 'consume'
    ), 0) as total_consumed,
    -- 最近一次分析时间
    (
        SELECT MAX(created_at) 
        FROM credit_transactions ct 
        WHERE ct.user_id = uc.id 
        AND ct.transaction_type = 'consume'
    ) as last_analysis_at
FROM user_credits uc
LEFT JOIN subscriptions s ON s.user_id = uc.id AND s.status = 'active'
ORDER BY uc.updated_at DESC;

-- 设备试用积分统计视图
CREATE OR REPLACE VIEW device_credit_stats AS
SELECT 
    df.id,
    df.fingerprint_hash,
    df.trial_credits,
    df.credits_used,
    (df.trial_credits - df.credits_used) as remaining_credits,
    df.created_at,
    df.last_used_at,
    df.user_id,
    -- 是否已关联用户
    CASE WHEN df.user_id IS NOT NULL THEN true ELSE false END as is_registered,
    -- 最近一次积分消费
    (
        SELECT MAX(created_at) 
        FROM credit_transactions ct 
        WHERE ct.device_fingerprint_id = df.id 
        AND ct.transaction_type = 'consume'
    ) as last_credit_usage_at
FROM device_fingerprints df
WHERE df.deleted_at IS NULL
ORDER BY df.last_used_at DESC;

-- 积分交易统计视图
CREATE OR REPLACE VIEW credit_transaction_summary AS
SELECT 
    DATE_TRUNC('day', created_at) as transaction_date,
    transaction_type,
    source,
    COUNT(*) as transaction_count,
    SUM(ABS(amount)) as total_amount,
    AVG(ABS(amount)) as avg_amount
FROM credit_transactions
GROUP BY DATE_TRUNC('day', created_at), transaction_type, source
ORDER BY transaction_date DESC, transaction_type, source;

-- 完成积分系统数据库表结构创建
-- 请在Supabase控制台的SQL编辑器中执行此脚本