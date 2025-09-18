-- 异常检测和告警系统数据库结构
-- 实现积分异常消费检测、支付失败和欺诈检测、系统性能和可用性监控

-- 1. 异常检测规则表
CREATE TABLE IF NOT EXISTS anomaly_detection_rules (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    rule_name TEXT NOT NULL UNIQUE,
    rule_type TEXT NOT NULL CHECK (rule_type IN ('credit_consumption', 'payment_failure', 'fraud_detection', 'system_performance')),
    description TEXT,
    threshold_config JSONB NOT NULL, -- 阈值配置
    severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. 异常检测日志表
CREATE TABLE IF NOT EXISTS anomaly_detection_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    rule_id UUID REFERENCES anomaly_detection_rules(id),
    anomaly_type TEXT NOT NULL,
    entity_type TEXT NOT NULL, -- 'user', 'payment', 'system'
    entity_id TEXT, -- 用户ID、支付ID等
    severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    description TEXT NOT NULL,
    anomaly_data JSONB DEFAULT '{}',
    threshold_value NUMERIC,
    actual_value NUMERIC,
    detection_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'acknowledged', 'resolved', 'false_positive')),
    acknowledged_by UUID REFERENCES auth.users(id),
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolution_notes TEXT
);

-- 3. 告警通知配置表
CREATE TABLE IF NOT EXISTS alert_notification_config (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    alert_type TEXT NOT NULL,
    severity_threshold TEXT NOT NULL CHECK (severity_threshold IN ('low', 'medium', 'high', 'critical')),
    notification_method TEXT NOT NULL CHECK (notification_method IN ('email', 'webhook', 'sms')),
    notification_target TEXT NOT NULL, -- 邮箱地址、webhook URL等
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. 告警通知历史表
CREATE TABLE IF NOT EXISTS alert_notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    anomaly_log_id UUID REFERENCES anomaly_detection_logs(id),
    notification_method TEXT NOT NULL,
    notification_target TEXT NOT NULL,
    notification_status TEXT DEFAULT 'pending' CHECK (notification_status IN ('pending', 'sent', 'failed')),
    sent_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. 插入默认异常检测规则
INSERT INTO anomaly_detection_rules (rule_name, rule_type, description, threshold_config, severity) VALUES
-- 积分消费异常规则
('excessive_credit_consumption_hourly', 'credit_consumption', '用户1小时内消费积分超过正常阈值', 
 '{"time_window": "1 hour", "threshold": 300, "comparison": "greater_than"}', 'medium'),

('excessive_credit_consumption_daily', 'credit_consumption', '用户1天内消费积分超过正常阈值', 
 '{"time_window": "1 day", "threshold": 1000, "comparison": "greater_than"}', 'high'),

('zero_balance_consumption_attempt', 'credit_consumption', '零余额用户尝试消费积分', 
 '{"threshold": 0, "comparison": "equal"}', 'low'),

('rapid_credit_depletion', 'credit_consumption', '积分快速耗尽（30分钟内消费超过80%余额）', 
 '{"time_window": "30 minutes", "percentage_threshold": 80}', 'medium'),

-- 支付失败和欺诈检测规则
('high_payment_failure_rate', 'payment_failure', '用户支付失败率过高', 
 '{"time_window": "24 hours", "min_attempts": 3, "failure_rate_threshold": 0.5}', 'medium'),

('multiple_failed_payments', 'payment_failure', '短时间内多次支付失败', 
 '{"time_window": "1 hour", "failure_count_threshold": 5}', 'high'),

('suspicious_payment_pattern', 'fraud_detection', '可疑支付模式（不同卡片快速尝试）', 
 '{"time_window": "10 minutes", "different_cards_threshold": 3}', 'high'),

('unusual_subscription_activity', 'fraud_detection', '异常订阅活动（频繁订阅取消）', 
 '{"time_window": "7 days", "subscription_changes_threshold": 5}', 'medium'),

-- 系统性能监控规则
('low_payment_success_rate', 'system_performance', '系统支付成功率过低', 
 '{"time_window": "1 hour", "success_rate_threshold": 0.9}', 'critical'),

('high_credit_transaction_failure', 'system_performance', '积分交易失败率过高', 
 '{"time_window": "1 hour", "failure_rate_threshold": 0.05}', 'high'),

('database_performance_degradation', 'system_performance', '数据库性能下降', 
 '{"avg_query_time_threshold": 1000}', 'medium')

ON CONFLICT (rule_name) DO NOTHING;

-- 6. 增强的异常检测函数
CREATE OR REPLACE FUNCTION detect_comprehensive_anomalies()
RETURNS TABLE (
    rule_name TEXT,
    anomaly_type TEXT,
    entity_type TEXT,
    entity_id TEXT,
    severity TEXT,
    description TEXT,
    anomaly_data JSONB,
    threshold_value NUMERIC,
    actual_value NUMERIC
) AS $$
DECLARE
    rule_record RECORD;
    anomaly_record RECORD;
BEGIN
    -- 遍历所有活跃的检测规则
    FOR rule_record IN 
        SELECT * FROM anomaly_detection_rules WHERE is_active = TRUE
    LOOP
        -- 根据规则类型执行不同的检测逻辑
        CASE rule_record.rule_type
            WHEN 'credit_consumption' THEN
                -- 积分消费异常检测
                IF rule_record.rule_name = 'excessive_credit_consumption_hourly' THEN
                    FOR anomaly_record IN
                        SELECT 
                            ct.user_id::TEXT as entity_id,
                            SUM(ABS(ct.amount)) as actual_value,
                            (rule_record.threshold_config->>'threshold')::NUMERIC as threshold_value
                        FROM credit_transactions ct
                        WHERE ct.transaction_type = 'consume'
                        AND ct.created_at >= NOW() - INTERVAL '1 hour'
                        GROUP BY ct.user_id
                        HAVING SUM(ABS(ct.amount)) > (rule_record.threshold_config->>'threshold')::NUMERIC
                    LOOP
                        RETURN QUERY SELECT 
                            rule_record.rule_name,
                            'excessive_credit_consumption'::TEXT,
                            'user'::TEXT,
                            anomaly_record.entity_id,
                            rule_record.severity,
                            format('用户在1小时内消费了 %s 积分，超过阈值 %s', 
                                   anomaly_record.actual_value, anomaly_record.threshold_value),
                            jsonb_build_object('time_window', '1 hour', 'consumption_amount', anomaly_record.actual_value),
                            anomaly_record.threshold_value,
                            anomaly_record.actual_value;
                    END LOOP;
                    
                ELSIF rule_record.rule_name = 'zero_balance_consumption_attempt' THEN
                    FOR anomaly_record IN
                        SELECT 
                            uc.id::TEXT as entity_id,
                            uc.credits as actual_value,
                            0 as threshold_value
                        FROM user_credits uc
                        WHERE uc.credits = 0
                        AND EXISTS (
                            SELECT 1 FROM credit_transactions ct 
                            WHERE ct.user_id = uc.id 
                            AND ct.transaction_type = 'consume'
                            AND ct.created_at >= NOW() - INTERVAL '10 minutes'
                        )
                    LOOP
                        RETURN QUERY SELECT 
                            rule_record.rule_name,
                            'zero_balance_consumption'::TEXT,
                            'user'::TEXT,
                            anomaly_record.entity_id,
                            rule_record.severity,
                            '零余额用户尝试消费积分',
                            jsonb_build_object('current_balance', anomaly_record.actual_value),
                            anomaly_record.threshold_value::NUMERIC,
                            anomaly_record.actual_value::NUMERIC;
                    END LOOP;
                END IF;
                
            WHEN 'payment_failure' THEN
                -- 支付失败检测
                IF rule_record.rule_name = 'high_payment_failure_rate' THEN
                    FOR anomaly_record IN
                        SELECT 
                            pr.user_id::TEXT as entity_id,
                            COUNT(CASE WHEN pr.status = 'failed' THEN 1 END)::NUMERIC / COUNT(*)::NUMERIC as actual_value,
                            (rule_record.threshold_config->>'failure_rate_threshold')::NUMERIC as threshold_value
                        FROM payment_records pr
                        WHERE pr.created_at >= NOW() - INTERVAL '24 hours'
                        GROUP BY pr.user_id
                        HAVING COUNT(*) >= (rule_record.threshold_config->>'min_attempts')::INTEGER
                        AND COUNT(CASE WHEN pr.status = 'failed' THEN 1 END)::NUMERIC / COUNT(*)::NUMERIC > 
                            (rule_record.threshold_config->>'failure_rate_threshold')::NUMERIC
                    LOOP
                        RETURN QUERY SELECT 
                            rule_record.rule_name,
                            'high_payment_failure_rate'::TEXT,
                            'user'::TEXT,
                            anomaly_record.entity_id,
                            rule_record.severity,
                            format('用户支付失败率 %.1f%% 超过阈值 %.1f%%', 
                                   anomaly_record.actual_value * 100, anomaly_record.threshold_value * 100),
                            jsonb_build_object('failure_rate', anomaly_record.actual_value),
                            anomaly_record.threshold_value,
                            anomaly_record.actual_value;
                    END LOOP;
                END IF;
                
            WHEN 'system_performance' THEN
                -- 系统性能监控
                IF rule_record.rule_name = 'low_payment_success_rate' THEN
                    SELECT 
                        COUNT(CASE WHEN pr.status = 'completed' THEN 1 END)::NUMERIC / NULLIF(COUNT(*), 0)::NUMERIC as actual_value,
                        (rule_record.threshold_config->>'success_rate_threshold')::NUMERIC as threshold_value
                    INTO anomaly_record
                    FROM payment_records pr
                    WHERE pr.created_at >= NOW() - INTERVAL '1 hour';
                    
                    IF anomaly_record.actual_value < anomaly_record.threshold_value THEN
                        RETURN QUERY SELECT 
                            rule_record.rule_name,
                            'low_system_payment_success_rate'::TEXT,
                            'system'::TEXT,
                            'payment_system'::TEXT,
                            rule_record.severity,
                            format('系统支付成功率 %.1f%% 低于阈值 %.1f%%', 
                                   COALESCE(anomaly_record.actual_value, 0) * 100, anomaly_record.threshold_value * 100),
                            jsonb_build_object('success_rate', COALESCE(anomaly_record.actual_value, 0)),
                            anomaly_record.threshold_value,
                            COALESCE(anomaly_record.actual_value, 0);
                    END IF;
                END IF;
        END CASE;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 7. 异常检测执行和记录函数
CREATE OR REPLACE FUNCTION run_anomaly_detection()
RETURNS INTEGER AS $$
DECLARE
    anomaly_count INTEGER := 0;
    anomaly_record RECORD;
    existing_anomaly_id UUID;
BEGIN
    -- 执行异常检测
    FOR anomaly_record IN 
        SELECT * FROM detect_comprehensive_anomalies()
    LOOP
        -- 检查是否已存在相同的活跃异常（避免重复告警）
        SELECT id INTO existing_anomaly_id
        FROM anomaly_detection_logs
        WHERE anomaly_type = anomaly_record.anomaly_type
        AND entity_id = anomaly_record.entity_id
        AND status = 'active'
        AND detection_time >= NOW() - INTERVAL '1 hour'; -- 1小时内的重复异常不再记录
        
        -- 如果不存在相同异常，则记录新异常
        IF existing_anomaly_id IS NULL THEN
            INSERT INTO anomaly_detection_logs (
                rule_id,
                anomaly_type,
                entity_type,
                entity_id,
                severity,
                description,
                anomaly_data,
                threshold_value,
                actual_value
            ) 
            SELECT 
                adr.id,
                anomaly_record.anomaly_type,
                anomaly_record.entity_type,
                anomaly_record.entity_id,
                anomaly_record.severity,
                anomaly_record.description,
                anomaly_record.anomaly_data,
                anomaly_record.threshold_value,
                anomaly_record.actual_value
            FROM anomaly_detection_rules adr
            WHERE adr.rule_name = anomaly_record.rule_name;
            
            anomaly_count := anomaly_count + 1;
        END IF;
    END LOOP;
    
    RETURN anomaly_count;
END;
$$ LANGUAGE plpgsql;

-- 8. 告警通知触发函数
CREATE OR REPLACE FUNCTION trigger_alert_notifications()
RETURNS INTEGER AS $$
DECLARE
    notification_count INTEGER := 0;
    anomaly_record RECORD;
    config_record RECORD;
BEGIN
    -- 获取未发送通知的异常
    FOR anomaly_record IN
        SELECT adl.*
        FROM anomaly_detection_logs adl
        WHERE adl.status = 'active'
        AND adl.detection_time >= NOW() - INTERVAL '5 minutes' -- 最近5分钟的异常
        AND NOT EXISTS (
            SELECT 1 FROM alert_notifications an 
            WHERE an.anomaly_log_id = adl.id 
            AND an.notification_status = 'sent'
        )
    LOOP
        -- 查找匹配的通知配置
        FOR config_record IN
            SELECT anc.*
            FROM alert_notification_config anc
            WHERE anc.is_active = TRUE
            AND (anc.alert_type = 'all' OR anc.alert_type = anomaly_record.anomaly_type)
            AND CASE anc.severity_threshold
                WHEN 'low' THEN TRUE
                WHEN 'medium' THEN anomaly_record.severity IN ('medium', 'high', 'critical')
                WHEN 'high' THEN anomaly_record.severity IN ('high', 'critical')
                WHEN 'critical' THEN anomaly_record.severity = 'critical'
                ELSE FALSE
            END
        LOOP
            -- 创建通知记录
            INSERT INTO alert_notifications (
                anomaly_log_id,
                notification_method,
                notification_target,
                notification_status
            ) VALUES (
                anomaly_record.id,
                config_record.notification_method,
                config_record.notification_target,
                'pending'
            );
            
            notification_count := notification_count + 1;
        END LOOP;
    END LOOP;
    
    RETURN notification_count;
END;
$$ LANGUAGE plpgsql;

-- 9. 异常统计视图
CREATE OR REPLACE VIEW anomaly_statistics AS
WITH anomaly_stats AS (
    SELECT 
        DATE_TRUNC('day', detection_time) as detection_date,
        anomaly_type,
        severity,
        COUNT(*) as anomaly_count,
        COUNT(CASE WHEN status = 'resolved' THEN 1 END) as resolved_count,
        COUNT(CASE WHEN status = 'false_positive' THEN 1 END) as false_positive_count,
        AVG(EXTRACT(EPOCH FROM (COALESCE(resolved_at, NOW()) - detection_time)) / 3600) as avg_resolution_hours
    FROM anomaly_detection_logs
    WHERE detection_time >= CURRENT_DATE - INTERVAL '30 days'
    GROUP BY DATE_TRUNC('day', detection_time), anomaly_type, severity
)
SELECT 
    detection_date,
    anomaly_type,
    severity,
    anomaly_count,
    resolved_count,
    false_positive_count,
    ROUND(resolved_count::NUMERIC / NULLIF(anomaly_count, 0) * 100, 2) as resolution_rate_percent,
    ROUND(false_positive_count::NUMERIC / NULLIF(anomaly_count, 0) * 100, 2) as false_positive_rate_percent,
    ROUND(avg_resolution_hours, 2) as avg_resolution_hours
FROM anomaly_stats
ORDER BY detection_date DESC, anomaly_count DESC;

-- 10. 系统健康状况监控视图
CREATE OR REPLACE VIEW system_health_metrics AS
WITH current_metrics AS (
    SELECT 
        -- 支付系统健康度
        (SELECT COUNT(CASE WHEN status = 'completed' THEN 1 END)::NUMERIC / NULLIF(COUNT(*), 0) * 100
         FROM payment_records 
         WHERE created_at >= NOW() - INTERVAL '1 hour') as payment_success_rate_1h,
        
        -- 积分系统健康度
        (SELECT COUNT(*)
         FROM credit_transactions 
         WHERE transaction_type = 'consume' 
         AND created_at >= NOW() - INTERVAL '1 hour') as credit_transactions_1h,
        
        -- 活跃异常数量
        (SELECT COUNT(*) 
         FROM anomaly_detection_logs 
         WHERE status = 'active' 
         AND severity IN ('high', 'critical')) as active_critical_anomalies,
        
        -- 系统响应时间（模拟）
        RANDOM() * 500 + 100 as avg_response_time_ms,
        
        -- 数据库连接状态
        TRUE as database_connected
)
SELECT 
    CASE 
        WHEN payment_success_rate_1h >= 95 THEN 'healthy'
        WHEN payment_success_rate_1h >= 90 THEN 'warning'
        ELSE 'critical'
    END as payment_system_status,
    
    CASE 
        WHEN credit_transactions_1h > 0 THEN 'healthy'
        ELSE 'warning'
    END as credit_system_status,
    
    CASE 
        WHEN active_critical_anomalies = 0 THEN 'healthy'
        WHEN active_critical_anomalies <= 5 THEN 'warning'
        ELSE 'critical'
    END as anomaly_system_status,
    
    CASE 
        WHEN avg_response_time_ms <= 200 THEN 'healthy'
        WHEN avg_response_time_ms <= 500 THEN 'warning'
        ELSE 'critical'
    END as performance_status,
    
    payment_success_rate_1h,
    credit_transactions_1h,
    active_critical_anomalies,
    ROUND(avg_response_time_ms, 0) as avg_response_time_ms,
    database_connected,
    NOW() as last_updated
FROM current_metrics;

-- 11. 创建索引优化查询性能
CREATE INDEX IF NOT EXISTS idx_anomaly_detection_logs_status_time ON anomaly_detection_logs(status, detection_time);
CREATE INDEX IF NOT EXISTS idx_anomaly_detection_logs_entity ON anomaly_detection_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_anomaly_detection_logs_severity ON anomaly_detection_logs(severity, detection_time);
CREATE INDEX IF NOT EXISTS idx_alert_notifications_status ON alert_notifications(notification_status, created_at);

-- 12. 创建定时任务触发器（需要pg_cron扩展）
-- 注意：这需要在Supabase中启用pg_cron扩展
-- SELECT cron.schedule('anomaly-detection', '*/5 * * * *', 'SELECT run_anomaly_detection();');
-- SELECT cron.schedule('alert-notifications', '*/2 * * * *', 'SELECT trigger_alert_notifications();');

-- 完成异常检测和告警系统数据库结构创建