-- 积分系统监控和分析数据库函数
-- 用于监控积分消费、支付成功率和用户行为分析

-- 1. 积分消费率监控视图
CREATE OR REPLACE VIEW credit_consumption_metrics AS
WITH daily_stats AS (
    SELECT 
        DATE_TRUNC('day', created_at) as date,
        COUNT(*) as total_transactions,
        SUM(CASE WHEN transaction_type = 'consume' THEN ABS(amount) ELSE 0 END) as credits_consumed,
        SUM(CASE WHEN transaction_type = 'add' THEN amount ELSE 0 END) as credits_added,
        COUNT(DISTINCT user_id) as active_users,
        COUNT(DISTINCT CASE WHEN transaction_type = 'consume' THEN user_id END) as consuming_users
    FROM credit_transactions
    WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
    GROUP BY DATE_TRUNC('day', created_at)
)
SELECT 
    date,
    total_transactions,
    credits_consumed,
    credits_added,
    active_users,
    consuming_users,
    CASE WHEN consuming_users > 0 THEN credits_consumed::FLOAT / consuming_users ELSE 0 END as avg_credits_per_user,
    CASE WHEN active_users > 0 THEN consuming_users::FLOAT / active_users * 100 ELSE 0 END as consumption_rate_percent
FROM daily_stats
ORDER BY date DESC;

-- 2. 积分余额分布监控视图
CREATE OR REPLACE VIEW credit_balance_distribution AS
WITH balance_ranges AS (
    SELECT 
        CASE 
            WHEN credits = 0 THEN '0'
            WHEN credits BETWEEN 1 AND 100 THEN '1-100'
            WHEN credits BETWEEN 101 AND 500 THEN '101-500'
            WHEN credits BETWEEN 501 AND 1000 THEN '501-1000'
            WHEN credits BETWEEN 1001 AND 2000 THEN '1001-2000'
            WHEN credits BETWEEN 2001 AND 5000 THEN '2001-5000'
            ELSE '5000+'
        END as balance_range,
        COUNT(*) as user_count,
        AVG(credits) as avg_credits_in_range,
        MIN(credits) as min_credits,
        MAX(credits) as max_credits
    FROM user_credits
    GROUP BY 
        CASE 
            WHEN credits = 0 THEN '0'
            WHEN credits BETWEEN 1 AND 100 THEN '1-100'
            WHEN credits BETWEEN 101 AND 500 THEN '101-500'
            WHEN credits BETWEEN 501 AND 1000 THEN '501-1000'
            WHEN credits BETWEEN 1001 AND 2000 THEN '1001-2000'
            WHEN credits BETWEEN 2001 AND 5000 THEN '2001-5000'
            ELSE '5000+'
        END
)
SELECT 
    balance_range,
    user_count,
    ROUND(avg_credits_in_range, 2) as avg_credits_in_range,
    min_credits,
    max_credits,
    ROUND(user_count::FLOAT / SUM(user_count) OVER() * 100, 2) as percentage
FROM balance_ranges
ORDER BY 
    CASE balance_range
        WHEN '0' THEN 1
        WHEN '1-100' THEN 2
        WHEN '101-500' THEN 3
        WHEN '501-1000' THEN 4
        WHEN '1001-2000' THEN 5
        WHEN '2001-5000' THEN 6
        ELSE 7
    END;

-- 3. 支付成功率和失败原因分析视图
CREATE OR REPLACE VIEW payment_success_metrics AS
WITH payment_stats AS (
    SELECT 
        DATE_TRUNC('day', created_at) as date,
        status,
        COUNT(*) as payment_count,
        SUM(amount_usd) as total_amount,
        AVG(amount_usd) as avg_amount
    FROM payment_records
    WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
    GROUP BY DATE_TRUNC('day', created_at), status
),
daily_totals AS (
    SELECT 
        date,
        SUM(payment_count) as total_payments,
        SUM(total_amount) as total_revenue
    FROM payment_stats
    GROUP BY date
)
SELECT 
    ps.date,
    ps.status,
    ps.payment_count,
    ps.total_amount,
    ps.avg_amount,
    dt.total_payments,
    dt.total_revenue,
    ROUND(ps.payment_count::FLOAT / dt.total_payments * 100, 2) as status_percentage
FROM payment_stats ps
JOIN daily_totals dt ON ps.date = dt.date
ORDER BY ps.date DESC, ps.status;

-- 4. 订阅转换率和流失率跟踪视图
CREATE OR REPLACE VIEW subscription_conversion_metrics AS
WITH user_journey AS (
    SELECT 
        u.id as user_id,
        u.created_at as registration_date,
        uc.created_at as credit_account_created,
        MIN(s.created_at) as first_subscription_date,
        COUNT(DISTINCT s.id) as total_subscriptions,
        MAX(CASE WHEN s.status = 'active' THEN s.created_at END) as latest_active_subscription,
        MAX(CASE WHEN s.status = 'cancelled' THEN s.updated_at END) as latest_cancellation,
        -- 首次积分消费时间
        MIN(CASE WHEN ct.transaction_type = 'consume' THEN ct.created_at END) as first_credit_usage,
        -- 总积分消费
        SUM(CASE WHEN ct.transaction_type = 'consume' THEN ABS(ct.amount) ELSE 0 END) as total_credits_consumed
    FROM auth.users u
    LEFT JOIN user_credits uc ON u.id = uc.id
    LEFT JOIN subscriptions s ON u.id = s.user_id
    LEFT JOIN credit_transactions ct ON u.id = ct.user_id
    WHERE u.created_at >= CURRENT_DATE - INTERVAL '90 days'
    GROUP BY u.id, u.created_at, uc.created_at
)
SELECT 
    DATE_TRUNC('week', registration_date) as registration_week,
    COUNT(*) as total_registrations,
    COUNT(first_subscription_date) as converted_to_paid,
    COUNT(CASE WHEN first_subscription_date IS NOT NULL AND latest_cancellation IS NOT NULL THEN 1 END) as churned_users,
    -- 转换率
    ROUND(COUNT(first_subscription_date)::FLOAT / COUNT(*) * 100, 2) as conversion_rate_percent,
    -- 流失率（在转换用户中）
    ROUND(
        COUNT(CASE WHEN first_subscription_date IS NOT NULL AND latest_cancellation IS NOT NULL THEN 1 END)::FLOAT / 
        NULLIF(COUNT(first_subscription_date), 0) * 100, 2
    ) as churn_rate_percent,
    -- 平均转换时间（天）
    ROUND(AVG(EXTRACT(EPOCH FROM (first_subscription_date - registration_date)) / 86400), 1) as avg_days_to_conversion,
    -- 平均积分消费
    ROUND(AVG(total_credits_consumed), 0) as avg_credits_consumed
FROM user_journey
GROUP BY DATE_TRUNC('week', registration_date)
ORDER BY registration_week DESC;

-- 5. 实时监控指标函数
CREATE OR REPLACE FUNCTION get_realtime_credit_metrics()
RETURNS TABLE (
    metric_name TEXT,
    metric_value NUMERIC,
    metric_unit TEXT,
    last_updated TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        'total_active_users'::TEXT,
        COUNT(DISTINCT uc.id)::NUMERIC,
        'users'::TEXT,
        NOW()
    FROM user_credits uc
    WHERE uc.updated_at >= CURRENT_DATE - INTERVAL '7 days'
    
    UNION ALL
    
    SELECT 
        'total_credits_in_system'::TEXT,
        SUM(uc.credits)::NUMERIC,
        'credits'::TEXT,
        NOW()
    FROM user_credits uc
    
    UNION ALL
    
    SELECT 
        'credits_consumed_today'::TEXT,
        COALESCE(SUM(ABS(ct.amount)), 0)::NUMERIC,
        'credits'::TEXT,
        NOW()
    FROM credit_transactions ct
    WHERE ct.transaction_type = 'consume'
    AND ct.created_at >= CURRENT_DATE
    
    UNION ALL
    
    SELECT 
        'active_subscriptions'::TEXT,
        COUNT(*)::NUMERIC,
        'subscriptions'::TEXT,
        NOW()
    FROM subscriptions s
    WHERE s.status = 'active'
    
    UNION ALL
    
    SELECT 
        'revenue_today'::TEXT,
        COALESCE(SUM(pr.amount_usd), 0)::NUMERIC,
        'USD'::TEXT,
        NOW()
    FROM payment_records pr
    WHERE pr.status = 'completed'
    AND pr.created_at >= CURRENT_DATE
    
    UNION ALL
    
    SELECT 
        'payment_success_rate_today'::TEXT,
        CASE 
            WHEN COUNT(*) > 0 THEN 
                ROUND(COUNT(CASE WHEN pr.status = 'completed' THEN 1 END)::FLOAT / COUNT(*) * 100, 2)
            ELSE 0
        END::NUMERIC,
        'percent'::TEXT,
        NOW()
    FROM payment_records pr
    WHERE pr.created_at >= CURRENT_DATE;
END;
$$ LANGUAGE plpgsql;

-- 6. 异常检测函数
CREATE OR REPLACE FUNCTION detect_credit_anomalies()
RETURNS TABLE (
    anomaly_type TEXT,
    user_id UUID,
    anomaly_description TEXT,
    severity TEXT,
    detected_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    -- 检测异常大量积分消费
    RETURN QUERY
    SELECT 
        'excessive_credit_consumption'::TEXT,
        ct.user_id,
        'User consumed ' || SUM(ABS(ct.amount)) || ' credits in the last hour'::TEXT,
        CASE 
            WHEN SUM(ABS(ct.amount)) > 1000 THEN 'high'
            WHEN SUM(ABS(ct.amount)) > 500 THEN 'medium'
            ELSE 'low'
        END::TEXT,
        NOW()
    FROM credit_transactions ct
    WHERE ct.transaction_type = 'consume'
    AND ct.created_at >= NOW() - INTERVAL '1 hour'
    GROUP BY ct.user_id
    HAVING SUM(ABS(ct.amount)) > 300 -- 超过5分钟音频的异常消费
    
    UNION ALL
    
    -- 检测支付失败率异常
    SELECT 
        'high_payment_failure_rate'::TEXT,
        pr.user_id,
        'User has ' || COUNT(CASE WHEN pr.status = 'failed' THEN 1 END) || ' failed payments out of ' || COUNT(*) || ' attempts in the last 24 hours'::TEXT,
        'medium'::TEXT,
        NOW()
    FROM payment_records pr
    WHERE pr.created_at >= NOW() - INTERVAL '24 hours'
    GROUP BY pr.user_id
    HAVING COUNT(*) >= 3 
    AND COUNT(CASE WHEN pr.status = 'failed' THEN 1 END)::FLOAT / COUNT(*) > 0.5
    
    UNION ALL
    
    -- 检测零余额但仍在尝试消费的用户
    SELECT 
        'zero_balance_consumption_attempt'::TEXT,
        uc.id,
        'User with zero credits attempted to consume credits'::TEXT,
        'low'::TEXT,
        NOW()
    FROM user_credits uc
    WHERE uc.credits = 0
    AND EXISTS (
        SELECT 1 FROM credit_transactions ct 
        WHERE ct.user_id = uc.id 
        AND ct.transaction_type = 'consume'
        AND ct.created_at >= NOW() - INTERVAL '10 minutes'
    );
END;
$$ LANGUAGE plpgsql;

-- 7. 用户行为分析函数
CREATE OR REPLACE FUNCTION analyze_user_behavior(days_back INTEGER DEFAULT 30)
RETURNS TABLE (
    behavior_metric TEXT,
    metric_value NUMERIC,
    user_segment TEXT,
    analysis_date DATE
) AS $$
BEGIN
    RETURN QUERY
    -- 分析不同用户群体的积分使用模式
    WITH user_segments AS (
        SELECT 
            uc.id as user_id,
            CASE 
                WHEN s.status = 'active' THEN 'paid_subscriber'
                WHEN uc.purchased_credits > 0 THEN 'past_purchaser'
                WHEN uc.credits > uc.trial_credits THEN 'registered_user'
                ELSE 'trial_user'
            END as segment,
            uc.credits,
            COALESCE((
                SELECT SUM(ABS(amount)) 
                FROM credit_transactions ct 
                WHERE ct.user_id = uc.id 
                AND ct.transaction_type = 'consume'
                AND ct.created_at >= CURRENT_DATE - INTERVAL '1 day' * days_back
            ), 0) as credits_consumed_period
        FROM user_credits uc
        LEFT JOIN subscriptions s ON s.user_id = uc.id AND s.status = 'active'
    )
    SELECT 
        'avg_credits_consumed'::TEXT,
        ROUND(AVG(credits_consumed_period), 2),
        segment,
        CURRENT_DATE
    FROM user_segments
    GROUP BY segment
    
    UNION ALL
    
    SELECT 
        'avg_credit_balance'::TEXT,
        ROUND(AVG(credits), 2),
        segment,
        CURRENT_DATE
    FROM user_segments
    GROUP BY segment
    
    UNION ALL
    
    SELECT 
        'user_count'::TEXT,
        COUNT(*)::NUMERIC,
        segment,
        CURRENT_DATE
    FROM user_segments
    GROUP BY segment;
END;
$$ LANGUAGE plpgsql;

-- 8. 创建监控数据汇总表（用于历史数据存储）
CREATE TABLE IF NOT EXISTS credit_system_metrics_daily (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    metric_date DATE NOT NULL,
    total_users INTEGER DEFAULT 0,
    active_users INTEGER DEFAULT 0,
    new_registrations INTEGER DEFAULT 0,
    total_credits_consumed INTEGER DEFAULT 0,
    total_credits_added INTEGER DEFAULT 0,
    total_payments INTEGER DEFAULT 0,
    successful_payments INTEGER DEFAULT 0,
    failed_payments INTEGER DEFAULT 0,
    total_revenue DECIMAL(10,2) DEFAULT 0,
    active_subscriptions INTEGER DEFAULT 0,
    new_subscriptions INTEGER DEFAULT 0,
    cancelled_subscriptions INTEGER DEFAULT 0,
    avg_credits_per_user DECIMAL(10,2) DEFAULT 0,
    payment_success_rate DECIMAL(5,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT unique_metric_date UNIQUE (metric_date)
);

-- 9. 自动汇总每日指标的函数
CREATE OR REPLACE FUNCTION aggregate_daily_metrics(target_date DATE DEFAULT CURRENT_DATE - INTERVAL '1 day')
RETURNS VOID AS $$
DECLARE
    metrics_record RECORD;
BEGIN
    -- 计算指定日期的各项指标
    SELECT 
        -- 用户指标
        (SELECT COUNT(*) FROM user_credits WHERE created_at::DATE <= target_date) as total_users,
        (SELECT COUNT(DISTINCT user_id) FROM credit_transactions 
         WHERE created_at::DATE = target_date) as active_users,
        (SELECT COUNT(*) FROM user_credits WHERE created_at::DATE = target_date) as new_registrations,
        
        -- 积分指标
        (SELECT COALESCE(SUM(ABS(amount)), 0) FROM credit_transactions 
         WHERE transaction_type = 'consume' AND created_at::DATE = target_date) as total_credits_consumed,
        (SELECT COALESCE(SUM(amount), 0) FROM credit_transactions 
         WHERE transaction_type = 'add' AND created_at::DATE = target_date) as total_credits_added,
        
        -- 支付指标
        (SELECT COUNT(*) FROM payment_records WHERE created_at::DATE = target_date) as total_payments,
        (SELECT COUNT(*) FROM payment_records 
         WHERE status = 'completed' AND created_at::DATE = target_date) as successful_payments,
        (SELECT COUNT(*) FROM payment_records 
         WHERE status = 'failed' AND created_at::DATE = target_date) as failed_payments,
        (SELECT COALESCE(SUM(amount_usd), 0) FROM payment_records 
         WHERE status = 'completed' AND created_at::DATE = target_date) as total_revenue,
        
        -- 订阅指标
        (SELECT COUNT(*) FROM subscriptions WHERE status = 'active' 
         AND created_at::DATE <= target_date 
         AND (updated_at::DATE > target_date OR status = 'active')) as active_subscriptions,
        (SELECT COUNT(*) FROM subscriptions WHERE created_at::DATE = target_date) as new_subscriptions,
        (SELECT COUNT(*) FROM subscriptions 
         WHERE status = 'cancelled' AND updated_at::DATE = target_date) as cancelled_subscriptions
    INTO metrics_record;
    
    -- 计算衍生指标
    INSERT INTO credit_system_metrics_daily (
        metric_date,
        total_users,
        active_users,
        new_registrations,
        total_credits_consumed,
        total_credits_added,
        total_payments,
        successful_payments,
        failed_payments,
        total_revenue,
        active_subscriptions,
        new_subscriptions,
        cancelled_subscriptions,
        avg_credits_per_user,
        payment_success_rate
    ) VALUES (
        target_date,
        metrics_record.total_users,
        metrics_record.active_users,
        metrics_record.new_registrations,
        metrics_record.total_credits_consumed,
        metrics_record.total_credits_added,
        metrics_record.total_payments,
        metrics_record.successful_payments,
        metrics_record.failed_payments,
        metrics_record.total_revenue,
        metrics_record.active_subscriptions,
        metrics_record.new_subscriptions,
        metrics_record.cancelled_subscriptions,
        CASE WHEN metrics_record.active_users > 0 
             THEN metrics_record.total_credits_consumed::DECIMAL / metrics_record.active_users 
             ELSE 0 END,
        CASE WHEN metrics_record.total_payments > 0 
             THEN metrics_record.successful_payments::DECIMAL / metrics_record.total_payments * 100 
             ELSE 0 END
    )
    ON CONFLICT (metric_date) 
    DO UPDATE SET
        total_users = EXCLUDED.total_users,
        active_users = EXCLUDED.active_users,
        new_registrations = EXCLUDED.new_registrations,
        total_credits_consumed = EXCLUDED.total_credits_consumed,
        total_credits_added = EXCLUDED.total_credits_added,
        total_payments = EXCLUDED.total_payments,
        successful_payments = EXCLUDED.successful_payments,
        failed_payments = EXCLUDED.failed_payments,
        total_revenue = EXCLUDED.total_revenue,
        active_subscriptions = EXCLUDED.active_subscriptions,
        new_subscriptions = EXCLUDED.new_subscriptions,
        cancelled_subscriptions = EXCLUDED.cancelled_subscriptions,
        avg_credits_per_user = EXCLUDED.avg_credits_per_user,
        payment_success_rate = EXCLUDED.payment_success_rate;
END;
$$ LANGUAGE plpgsql;

-- 10. 创建索引优化监控查询性能
CREATE INDEX IF NOT EXISTS idx_credit_transactions_created_at_type ON credit_transactions(created_at, transaction_type);
CREATE INDEX IF NOT EXISTS idx_payment_records_created_at_status ON payment_records(created_at, status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_created_at_status ON subscriptions(created_at, status);
CREATE INDEX IF NOT EXISTS idx_credit_system_metrics_daily_date ON credit_system_metrics_daily(metric_date);

-- 完成积分系统监控数据库结构创建