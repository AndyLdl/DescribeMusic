-- 用户行为分析数据库视图和函数
-- 跟踪用户从试用到付费的转换路径，分析套餐选择偏好，监控积分使用模式

-- 1. 用户转换路径分析视图
CREATE OR REPLACE VIEW user_conversion_funnel AS
WITH user_journey_stages AS (
    SELECT 
        u.id as user_id,
        u.created_at as registration_date,
        -- 试用阶段
        CASE WHEN df.id IS NOT NULL THEN df.created_at END as trial_start_date,
        -- 首次积分消费
        MIN(CASE WHEN ct.transaction_type = 'consume' THEN ct.created_at END) as first_credit_usage,
        -- 首次付费
        MIN(pr.created_at) as first_payment_date,
        -- 首次订阅
        MIN(s.created_at) as first_subscription_date,
        -- 用户状态
        CASE 
            WHEN s.status = 'active' THEN 'active_subscriber'
            WHEN pr.status = 'completed' THEN 'past_purchaser'
            WHEN ct.transaction_type = 'consume' THEN 'trial_user_active'
            WHEN uc.id IS NOT NULL THEN 'registered_inactive'
            WHEN df.id IS NOT NULL THEN 'trial_user_inactive'
            ELSE 'unknown'
        END as current_status,
        -- 积分使用统计
        COALESCE(SUM(CASE WHEN ct.transaction_type = 'consume' THEN ABS(ct.amount) ELSE 0 END), 0) as total_credits_consumed,
        COUNT(CASE WHEN ct.transaction_type = 'consume' THEN 1 END) as total_analyses,
        -- 收入贡献
        COALESCE(SUM(CASE WHEN pr.status = 'completed' THEN pr.amount_usd ELSE 0 END), 0) as total_revenue_contributed
    FROM auth.users u
    LEFT JOIN user_credits uc ON u.id = uc.id
    LEFT JOIN device_fingerprints df ON u.id = df.user_id
    LEFT JOIN credit_transactions ct ON u.id = ct.user_id
    LEFT JOIN payment_records pr ON u.id = pr.user_id
    LEFT JOIN subscriptions s ON u.id = s.user_id AND s.status = 'active'
    WHERE u.created_at >= CURRENT_DATE - INTERVAL '180 days' -- 最近6个月
    GROUP BY u.id, u.created_at, df.id, df.created_at, s.status, uc.id
)
SELECT 
    user_id,
    registration_date,
    trial_start_date,
    first_credit_usage,
    first_payment_date,
    first_subscription_date,
    current_status,
    total_credits_consumed,
    total_analyses,
    total_revenue_contributed,
    -- 转换时间计算
    CASE WHEN first_credit_usage IS NOT NULL 
         THEN EXTRACT(EPOCH FROM (first_credit_usage - registration_date)) / 86400 
         ELSE NULL END as days_to_first_usage,
    CASE WHEN first_payment_date IS NOT NULL 
         THEN EXTRACT(EPOCH FROM (first_payment_date - registration_date)) / 86400 
         ELSE NULL END as days_to_first_payment,
    CASE WHEN first_subscription_date IS NOT NULL 
         THEN EXTRACT(EPOCH FROM (first_subscription_date - registration_date)) / 86400 
         ELSE NULL END as days_to_subscription,
    -- 用户价值分级
    CASE 
        WHEN total_revenue_contributed > 100 THEN 'high_value'
        WHEN total_revenue_contributed > 20 THEN 'medium_value'
        WHEN total_revenue_contributed > 0 THEN 'low_value'
        WHEN total_credits_consumed > 500 THEN 'high_engagement'
        WHEN total_credits_consumed > 100 THEN 'medium_engagement'
        ELSE 'low_engagement'
    END as user_value_segment
FROM user_journey_stages
ORDER BY registration_date DESC;

-- 2. 套餐选择偏好分析视图
CREATE OR REPLACE VIEW subscription_preference_analysis AS
WITH subscription_stats AS (
    SELECT 
        s.plan_name,
        s.lemonsqueezy_variant_id,
        s.plan_credits,
        COUNT(*) as total_subscriptions,
        COUNT(CASE WHEN s.status = 'active' THEN 1 END) as active_subscriptions,
        COUNT(CASE WHEN s.status = 'cancelled' THEN 1 END) as cancelled_subscriptions,
        AVG(EXTRACT(EPOCH FROM (s.current_period_end - s.current_period_start)) / 86400) as avg_subscription_length_days,
        -- 用户特征分析
        AVG(CASE WHEN uc.total_consumed > 0 THEN uc.total_consumed ELSE NULL END) as avg_credits_consumed_before_sub,
        AVG(CASE WHEN uc.days_since_registration > 0 THEN uc.days_since_registration ELSE NULL END) as avg_days_before_subscription
    FROM subscriptions s
    LEFT JOIN (
        SELECT 
            ct.user_id,
            SUM(CASE WHEN ct.transaction_type = 'consume' AND ct.created_at < s.created_at THEN ABS(ct.amount) ELSE 0 END) as total_consumed,
            EXTRACT(EPOCH FROM (s.created_at - u.created_at)) / 86400 as days_since_registration
        FROM credit_transactions ct
        JOIN auth.users u ON ct.user_id = u.id
        JOIN subscriptions s ON ct.user_id = s.user_id
        GROUP BY ct.user_id, s.created_at, u.created_at
    ) uc ON s.user_id = uc.user_id
    WHERE s.created_at >= CURRENT_DATE - INTERVAL '90 days'
    GROUP BY s.plan_name, s.lemonsqueezy_variant_id, s.plan_credits
),
total_subs AS (
    SELECT SUM(total_subscriptions) as grand_total FROM subscription_stats
)
SELECT 
    ss.plan_name,
    ss.lemonsqueezy_variant_id,
    ss.plan_credits,
    ss.total_subscriptions,
    ss.active_subscriptions,
    ss.cancelled_subscriptions,
    ROUND(ss.total_subscriptions::FLOAT / ts.grand_total * 100, 2) as market_share_percent,
    ROUND(ss.cancelled_subscriptions::FLOAT / NULLIF(ss.total_subscriptions, 0) * 100, 2) as churn_rate_percent,
    ROUND(ss.avg_subscription_length_days, 1) as avg_subscription_length_days,
    ROUND(ss.avg_credits_consumed_before_sub, 0) as avg_credits_consumed_before_sub,
    ROUND(ss.avg_days_before_subscription, 1) as avg_days_before_subscription
FROM subscription_stats ss
CROSS JOIN total_subs ts
ORDER BY ss.total_subscriptions DESC;

-- 3. 积分使用模式分析视图
CREATE OR REPLACE VIEW credit_usage_patterns AS
WITH user_usage_patterns AS (
    SELECT 
        ct.user_id,
        -- 使用频率分析
        COUNT(CASE WHEN ct.transaction_type = 'consume' THEN 1 END) as total_analyses,
        MIN(CASE WHEN ct.transaction_type = 'consume' THEN ct.created_at END) as first_usage_date,
        MAX(CASE WHEN ct.transaction_type = 'consume' THEN ct.created_at END) as last_usage_date,
        -- 使用量分析
        SUM(CASE WHEN ct.transaction_type = 'consume' THEN ABS(ct.amount) ELSE 0 END) as total_credits_consumed,
        AVG(CASE WHEN ct.transaction_type = 'consume' THEN ABS(ct.amount) ELSE NULL END) as avg_credits_per_analysis,
        -- 时间模式分析
        MODE() WITHIN GROUP (ORDER BY EXTRACT(HOUR FROM ct.created_at)) as most_active_hour,
        MODE() WITHIN GROUP (ORDER BY EXTRACT(DOW FROM ct.created_at)) as most_active_day_of_week,
        -- 使用间隔分析
        AVG(
            CASE WHEN LAG(ct.created_at) OVER (PARTITION BY ct.user_id ORDER BY ct.created_at) IS NOT NULL
                 THEN EXTRACT(EPOCH FROM (ct.created_at - LAG(ct.created_at) OVER (PARTITION BY ct.user_id ORDER BY ct.created_at))) / 3600
                 ELSE NULL END
        ) as avg_hours_between_usage,
        -- 用户类型
        CASE 
            WHEN s.status = 'active' THEN 'subscriber'
            WHEN pr.status = 'completed' THEN 'purchaser'
            ELSE 'trial_user'
        END as user_type
    FROM credit_transactions ct
    LEFT JOIN subscriptions s ON ct.user_id = s.user_id AND s.status = 'active'
    LEFT JOIN payment_records pr ON ct.user_id = pr.user_id AND pr.status = 'completed'
    WHERE ct.transaction_type = 'consume'
    AND ct.created_at >= CURRENT_DATE - INTERVAL '60 days'
    GROUP BY ct.user_id, s.status, pr.status
)
SELECT 
    user_type,
    COUNT(*) as user_count,
    -- 使用频率统计
    ROUND(AVG(total_analyses), 1) as avg_analyses_per_user,
    ROUND(AVG(total_credits_consumed), 0) as avg_credits_consumed,
    ROUND(AVG(avg_credits_per_analysis), 1) as avg_credits_per_analysis,
    -- 活跃度统计
    ROUND(AVG(EXTRACT(EPOCH FROM (last_usage_date - first_usage_date)) / 86400), 1) as avg_active_days,
    ROUND(AVG(avg_hours_between_usage), 1) as avg_hours_between_usage,
    -- 时间偏好统计
    MODE() WITHIN GROUP (ORDER BY most_active_hour) as peak_usage_hour,
    MODE() WITHIN GROUP (ORDER BY most_active_day_of_week) as peak_usage_day,
    -- 使用模式分类
    COUNT(CASE WHEN total_analyses >= 50 THEN 1 END) as heavy_users,
    COUNT(CASE WHEN total_analyses BETWEEN 10 AND 49 THEN 1 END) as moderate_users,
    COUNT(CASE WHEN total_analyses < 10 THEN 1 END) as light_users
FROM user_usage_patterns
GROUP BY user_type
ORDER BY user_count DESC;

-- 4. 积分需求预测函数
CREATE OR REPLACE FUNCTION predict_credit_demand(forecast_days INTEGER DEFAULT 30)
RETURNS TABLE (
    forecast_date DATE,
    predicted_consumption INTEGER,
    confidence_level TEXT,
    user_segment TEXT
) AS $$
DECLARE
    historical_data RECORD;
    growth_rate FLOAT;
    seasonal_factor FLOAT;
BEGIN
    -- 基于历史数据预测积分需求
    FOR user_segment IN SELECT DISTINCT 
        CASE 
            WHEN s.status = 'active' THEN 'subscribers'
            WHEN pr.status = 'completed' THEN 'purchasers'
            ELSE 'trial_users'
        END as segment
    FROM credit_transactions ct
    LEFT JOIN subscriptions s ON ct.user_id = s.user_id AND s.status = 'active'
    LEFT JOIN payment_records pr ON ct.user_id = pr.user_id AND pr.status = 'completed'
    WHERE ct.transaction_type = 'consume'
    LOOP
        -- 计算历史趋势
        SELECT 
            AVG(daily_consumption) as avg_daily,
            STDDEV(daily_consumption) as std_dev,
            (MAX(daily_consumption) - MIN(daily_consumption)) / NULLIF(MIN(daily_consumption), 0) as volatility
        INTO historical_data
        FROM (
            SELECT 
                DATE_TRUNC('day', ct.created_at) as date,
                SUM(ABS(ct.amount)) as daily_consumption
            FROM credit_transactions ct
            LEFT JOIN subscriptions s ON ct.user_id = s.user_id AND s.status = 'active'
            LEFT JOIN payment_records pr ON ct.user_id = pr.user_id AND pr.status = 'completed'
            WHERE ct.transaction_type = 'consume'
            AND ct.created_at >= CURRENT_DATE - INTERVAL '30 days'
            AND CASE 
                WHEN user_segment = 'subscribers' THEN s.status = 'active'
                WHEN user_segment = 'purchasers' THEN pr.status = 'completed' AND s.status IS NULL
                ELSE s.status IS NULL AND pr.status IS NULL
            END
            GROUP BY DATE_TRUNC('day', ct.created_at)
        ) daily_stats;
        
        -- 生成预测数据
        FOR i IN 1..forecast_days LOOP
            -- 简单的线性趋势预测，实际应用中可以使用更复杂的模型
            growth_rate := 1.0 + (RANDOM() - 0.5) * 0.1; -- ±5% 随机波动
            seasonal_factor := 1.0 + 0.2 * SIN(2 * PI() * i / 7); -- 周期性因子
            
            RETURN QUERY SELECT 
                (CURRENT_DATE + i)::DATE,
                (historical_data.avg_daily * growth_rate * seasonal_factor)::INTEGER,
                CASE 
                    WHEN historical_data.volatility < 0.2 THEN 'high'
                    WHEN historical_data.volatility < 0.5 THEN 'medium'
                    ELSE 'low'
                END,
                user_segment;
        END LOOP;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 5. 用户生命周期价值分析函数
CREATE OR REPLACE FUNCTION calculate_user_lifetime_value()
RETURNS TABLE (
    user_segment TEXT,
    avg_lifetime_days NUMERIC,
    avg_total_revenue NUMERIC,
    avg_total_credits_consumed NUMERIC,
    avg_revenue_per_day NUMERIC,
    predicted_ltv NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    WITH user_metrics AS (
        SELECT 
            u.id as user_id,
            u.created_at as registration_date,
            COALESCE(MAX(ct.created_at), u.created_at) as last_activity_date,
            COALESCE(SUM(CASE WHEN pr.status = 'completed' THEN pr.amount_usd ELSE 0 END), 0) as total_revenue,
            COALESCE(SUM(CASE WHEN ct.transaction_type = 'consume' THEN ABS(ct.amount) ELSE 0 END), 0) as total_credits_consumed,
            COUNT(CASE WHEN ct.transaction_type = 'consume' THEN 1 END) as total_analyses,
            CASE 
                WHEN s.status = 'active' THEN 'active_subscriber'
                WHEN MAX(pr.created_at) IS NOT NULL THEN 'past_purchaser'
                WHEN MAX(ct.created_at) IS NOT NULL THEN 'trial_user_active'
                ELSE 'inactive_user'
            END as segment
        FROM auth.users u
        LEFT JOIN credit_transactions ct ON u.id = ct.user_id
        LEFT JOIN payment_records pr ON u.id = pr.user_id
        LEFT JOIN subscriptions s ON u.id = s.user_id AND s.status = 'active'
        WHERE u.created_at >= CURRENT_DATE - INTERVAL '365 days'
        GROUP BY u.id, u.created_at, s.status
    )
    SELECT 
        um.segment,
        ROUND(AVG(EXTRACT(EPOCH FROM (um.last_activity_date - um.registration_date)) / 86400), 1),
        ROUND(AVG(um.total_revenue), 2),
        ROUND(AVG(um.total_credits_consumed), 0),
        ROUND(AVG(
            CASE WHEN EXTRACT(EPOCH FROM (um.last_activity_date - um.registration_date)) / 86400 > 0
                 THEN um.total_revenue / (EXTRACT(EPOCH FROM (um.last_activity_date - um.registration_date)) / 86400)
                 ELSE 0 END
        ), 4),
        -- 简单的LTV预测：基于当前收入趋势
        ROUND(AVG(um.total_revenue) * 1.5, 2) -- 假设用户生命周期还有50%的增长空间
    FROM user_metrics um
    GROUP BY um.segment
    ORDER BY AVG(um.total_revenue) DESC;
END;
$$ LANGUAGE plpgsql;

-- 6. 用户流失风险评估函数
CREATE OR REPLACE FUNCTION assess_churn_risk()
RETURNS TABLE (
    user_id UUID,
    churn_risk_score NUMERIC,
    risk_level TEXT,
    risk_factors TEXT[],
    last_activity_days INTEGER,
    total_value NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    WITH user_activity AS (
        SELECT 
            u.id,
            u.created_at as registration_date,
            COALESCE(MAX(ct.created_at), u.created_at) as last_activity,
            COALESCE(SUM(CASE WHEN pr.status = 'completed' THEN pr.amount_usd ELSE 0 END), 0) as total_revenue,
            COALESCE(SUM(CASE WHEN ct.transaction_type = 'consume' THEN ABS(ct.amount) ELSE 0 END), 0) as total_credits_consumed,
            COUNT(CASE WHEN ct.transaction_type = 'consume' AND ct.created_at >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as recent_analyses,
            COUNT(CASE WHEN ct.transaction_type = 'consume' AND ct.created_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as monthly_analyses,
            s.status as subscription_status,
            s.current_period_end as subscription_end_date
        FROM auth.users u
        LEFT JOIN credit_transactions ct ON u.id = ct.user_id
        LEFT JOIN payment_records pr ON u.id = pr.user_id
        LEFT JOIN subscriptions s ON u.id = s.user_id AND s.status IN ('active', 'cancelled')
        WHERE u.created_at <= CURRENT_DATE - INTERVAL '7 days' -- 至少注册7天
        GROUP BY u.id, u.created_at, s.status, s.current_period_end
    )
    SELECT 
        ua.id,
        -- 流失风险评分 (0-100)
        LEAST(100, GREATEST(0, 
            (EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - ua.last_activity)) / 86400 * 2) + -- 不活跃天数权重
            (CASE WHEN ua.recent_analyses = 0 THEN 20 ELSE 0 END) + -- 近期无活动
            (CASE WHEN ua.monthly_analyses < 3 THEN 15 ELSE 0 END) + -- 月度活动低
            (CASE WHEN ua.subscription_status = 'cancelled' THEN 30 ELSE 0 END) + -- 已取消订阅
            (CASE WHEN ua.subscription_end_date < CURRENT_DATE + INTERVAL '7 days' THEN 25 ELSE 0 END) -- 订阅即将到期
        ))::NUMERIC as risk_score,
        -- 风险等级
        CASE 
            WHEN LEAST(100, GREATEST(0, 
                (EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - ua.last_activity)) / 86400 * 2) +
                (CASE WHEN ua.recent_analyses = 0 THEN 20 ELSE 0 END) +
                (CASE WHEN ua.monthly_analyses < 3 THEN 15 ELSE 0 END) +
                (CASE WHEN ua.subscription_status = 'cancelled' THEN 30 ELSE 0 END) +
                (CASE WHEN ua.subscription_end_date < CURRENT_DATE + INTERVAL '7 days' THEN 25 ELSE 0 END)
            )) >= 70 THEN 'high'
            WHEN LEAST(100, GREATEST(0, 
                (EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - ua.last_activity)) / 86400 * 2) +
                (CASE WHEN ua.recent_analyses = 0 THEN 20 ELSE 0 END) +
                (CASE WHEN ua.monthly_analyses < 3 THEN 15 ELSE 0 END) +
                (CASE WHEN ua.subscription_status = 'cancelled' THEN 30 ELSE 0 END) +
                (CASE WHEN ua.subscription_end_date < CURRENT_DATE + INTERVAL '7 days' THEN 25 ELSE 0 END)
            )) >= 40 THEN 'medium'
            ELSE 'low'
        END,
        -- 风险因素
        ARRAY_REMOVE(ARRAY[
            CASE WHEN EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - ua.last_activity)) / 86400 > 14 THEN 'inactive_14_days' END,
            CASE WHEN ua.recent_analyses = 0 THEN 'no_recent_activity' END,
            CASE WHEN ua.monthly_analyses < 3 THEN 'low_monthly_usage' END,
            CASE WHEN ua.subscription_status = 'cancelled' THEN 'cancelled_subscription' END,
            CASE WHEN ua.subscription_end_date < CURRENT_DATE + INTERVAL '7 days' THEN 'subscription_expiring' END
        ], NULL),
        EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - ua.last_activity)) / 86400,
        ua.total_revenue + (ua.total_credits_consumed * 0.01) -- 假设每积分价值0.01美元
    FROM user_activity ua
    WHERE LEAST(100, GREATEST(0, 
        (EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - ua.last_activity)) / 86400 * 2) +
        (CASE WHEN ua.recent_analyses = 0 THEN 20 ELSE 0 END) +
        (CASE WHEN ua.monthly_analyses < 3 THEN 15 ELSE 0 END) +
        (CASE WHEN ua.subscription_status = 'cancelled' THEN 30 ELSE 0 END) +
        (CASE WHEN ua.subscription_end_date < CURRENT_DATE + INTERVAL '7 days' THEN 25 ELSE 0 END)
    )) > 30 -- 只返回中高风险用户
    ORDER BY risk_score DESC;
END;
$$ LANGUAGE plpgsql;

-- 7. 创建索引优化查询性能
CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_type_date ON credit_transactions(user_id, transaction_type, created_at);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status_created ON subscriptions(status, created_at);
CREATE INDEX IF NOT EXISTS idx_payment_records_user_status ON payment_records(user_id, status);

-- 完成用户行为分析数据库结构创建