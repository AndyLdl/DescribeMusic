/**
 * 异常检测服务
 * 实现积分异常消费检测、支付失败和欺诈检测、系统性能和可用性监控
 */

import { supabase } from '../lib/supabase';

// 异常检测规则类型
export interface AnomalyDetectionRule {
    id: string;
    ruleName: string;
    ruleType: 'credit_consumption' | 'payment_failure' | 'fraud_detection' | 'system_performance';
    description: string;
    thresholdConfig: Record<string, any>;
    severity: 'low' | 'medium' | 'high' | 'critical';
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

// 异常检测日志类型
export interface AnomalyDetectionLog {
    id: string;
    ruleId: string;
    anomalyType: string;
    entityType: 'user' | 'payment' | 'system';
    entityId: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    anomalyData: Record<string, any>;
    thresholdValue: number;
    actualValue: number;
    detectionTime: string;
    status: 'active' | 'acknowledged' | 'resolved' | 'false_positive';
    acknowledgedBy?: string;
    acknowledgedAt?: string;
    resolvedAt?: string;
    resolutionNotes?: string;
}

// 告警通知配置类型
export interface AlertNotificationConfig {
    id: string;
    alertType: string;
    severityThreshold: 'low' | 'medium' | 'high' | 'critical';
    notificationMethod: 'email' | 'webhook' | 'sms';
    notificationTarget: string;
    isActive: boolean;
    createdAt: string;
}

// 告警通知历史类型
export interface AlertNotification {
    id: string;
    anomalyLogId: string;
    notificationMethod: string;
    notificationTarget: string;
    notificationStatus: 'pending' | 'sent' | 'failed';
    sentAt?: string;
    errorMessage?: string;
    retryCount: number;
    createdAt: string;
}

// 异常统计类型
export interface AnomalyStatistics {
    detectionDate: string;
    anomalyType: string;
    severity: string;
    anomalyCount: number;
    resolvedCount: number;
    falsePositiveCount: number;
    resolutionRatePercent: number;
    falsePositiveRatePercent: number;
    avgResolutionHours: number;
}

// 系统健康指标类型
export interface SystemHealthMetrics {
    paymentSystemStatus: 'healthy' | 'warning' | 'critical';
    creditSystemStatus: 'healthy' | 'warning' | 'critical';
    anomalySystemStatus: 'healthy' | 'warning' | 'critical';
    performanceStatus: 'healthy' | 'warning' | 'critical';
    paymentSuccessRate1h: number;
    creditTransactions1h: number;
    activeCriticalAnomalies: number;
    avgResponseTimeMs: number;
    databaseConnected: boolean;
    lastUpdated: string;
}

class AnomalyDetectionService {
    /**
     * 获取所有异常检测规则
     */
    async getDetectionRules(): Promise<AnomalyDetectionRule[]> {
        try {
            const { data, error } = await supabase
                .from('anomaly_detection_rules')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;

            return data.map(item => ({
                id: item.id,
                ruleName: item.rule_name,
                ruleType: item.rule_type,
                description: item.description,
                thresholdConfig: item.threshold_config,
                severity: item.severity,
                isActive: item.is_active,
                createdAt: item.created_at,
                updatedAt: item.updated_at
            }));
        } catch (error) {
            console.error('Error fetching detection rules:', error);
            throw error;
        }
    }

    /**
     * 创建或更新异常检测规则
     */
    async upsertDetectionRule(rule: Partial<AnomalyDetectionRule>): Promise<AnomalyDetectionRule> {
        try {
            const { data, error } = await supabase
                .from('anomaly_detection_rules')
                .upsert({
                    id: rule.id,
                    rule_name: rule.ruleName,
                    rule_type: rule.ruleType,
                    description: rule.description,
                    threshold_config: rule.thresholdConfig,
                    severity: rule.severity,
                    is_active: rule.isActive,
                    updated_at: new Date().toISOString()
                })
                .select()
                .single();

            if (error) throw error;

            return {
                id: data.id,
                ruleName: data.rule_name,
                ruleType: data.rule_type,
                description: data.description,
                thresholdConfig: data.threshold_config,
                severity: data.severity,
                isActive: data.is_active,
                createdAt: data.created_at,
                updatedAt: data.updated_at
            };
        } catch (error) {
            console.error('Error upserting detection rule:', error);
            throw error;
        }
    }

    /**
     * 执行异常检测
     */
    async runAnomalyDetection(): Promise<number> {
        try {
            const { data, error } = await supabase
                .rpc('run_anomaly_detection');

            if (error) throw error;

            return data || 0;
        } catch (error) {
            console.error('Error running anomaly detection:', error);
            throw error;
        }
    }

    /**
     * 获取异常检测日志
     */
    async getAnomalyLogs(
        limit: number = 100,
        status?: string,
        severity?: string,
        entityType?: string
    ): Promise<AnomalyDetectionLog[]> {
        try {
            let query = supabase
                .from('anomaly_detection_logs')
                .select('*')
                .order('detection_time', { ascending: false })
                .limit(limit);

            if (status) {
                query = query.eq('status', status);
            }
            if (severity) {
                query = query.eq('severity', severity);
            }
            if (entityType) {
                query = query.eq('entity_type', entityType);
            }

            const { data, error } = await query;

            if (error) throw error;

            return data.map(item => ({
                id: item.id,
                ruleId: item.rule_id,
                anomalyType: item.anomaly_type,
                entityType: item.entity_type,
                entityId: item.entity_id,
                severity: item.severity,
                description: item.description,
                anomalyData: item.anomaly_data,
                thresholdValue: item.threshold_value,
                actualValue: item.actual_value,
                detectionTime: item.detection_time,
                status: item.status,
                acknowledgedBy: item.acknowledged_by,
                acknowledgedAt: item.acknowledged_at,
                resolvedAt: item.resolved_at,
                resolutionNotes: item.resolution_notes
            }));
        } catch (error) {
            console.error('Error fetching anomaly logs:', error);
            throw error;
        }
    }

    /**
     * 确认异常
     */
    async acknowledgeAnomaly(anomalyId: string, userId: string, notes?: string): Promise<void> {
        try {
            const { error } = await supabase
                .from('anomaly_detection_logs')
                .update({
                    status: 'acknowledged',
                    acknowledged_by: userId,
                    acknowledged_at: new Date().toISOString(),
                    resolution_notes: notes
                })
                .eq('id', anomalyId);

            if (error) throw error;
        } catch (error) {
            console.error('Error acknowledging anomaly:', error);
            throw error;
        }
    }

    /**
     * 解决异常
     */
    async resolveAnomaly(anomalyId: string, resolutionNotes: string): Promise<void> {
        try {
            const { error } = await supabase
                .from('anomaly_detection_logs')
                .update({
                    status: 'resolved',
                    resolved_at: new Date().toISOString(),
                    resolution_notes: resolutionNotes
                })
                .eq('id', anomalyId);

            if (error) throw error;
        } catch (error) {
            console.error('Error resolving anomaly:', error);
            throw error;
        }
    }

    /**
     * 标记为误报
     */
    async markAsFalsePositive(anomalyId: string, notes: string): Promise<void> {
        try {
            const { error } = await supabase
                .from('anomaly_detection_logs')
                .update({
                    status: 'false_positive',
                    resolved_at: new Date().toISOString(),
                    resolution_notes: notes
                })
                .eq('id', anomalyId);

            if (error) throw error;
        } catch (error) {
            console.error('Error marking anomaly as false positive:', error);
            throw error;
        }
    }

    /**
     * 获取告警通知配置
     */
    async getNotificationConfigs(): Promise<AlertNotificationConfig[]> {
        try {
            const { data, error } = await supabase
                .from('alert_notification_config')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;

            return data.map(item => ({
                id: item.id,
                alertType: item.alert_type,
                severityThreshold: item.severity_threshold,
                notificationMethod: item.notification_method,
                notificationTarget: item.notification_target,
                isActive: item.is_active,
                createdAt: item.created_at
            }));
        } catch (error) {
            console.error('Error fetching notification configs:', error);
            throw error;
        }
    }

    /**
     * 创建或更新告警通知配置
     */
    async upsertNotificationConfig(config: Partial<AlertNotificationConfig>): Promise<AlertNotificationConfig> {
        try {
            const { data, error } = await supabase
                .from('alert_notification_config')
                .upsert({
                    id: config.id,
                    alert_type: config.alertType,
                    severity_threshold: config.severityThreshold,
                    notification_method: config.notificationMethod,
                    notification_target: config.notificationTarget,
                    is_active: config.isActive
                })
                .select()
                .single();

            if (error) throw error;

            return {
                id: data.id,
                alertType: data.alert_type,
                severityThreshold: data.severity_threshold,
                notificationMethod: data.notification_method,
                notificationTarget: data.notification_target,
                isActive: data.is_active,
                createdAt: data.created_at
            };
        } catch (error) {
            console.error('Error upserting notification config:', error);
            throw error;
        }
    }

    /**
     * 触发告警通知
     */
    async triggerAlertNotifications(): Promise<number> {
        try {
            const { data, error } = await supabase
                .rpc('trigger_alert_notifications');

            if (error) throw error;

            return data || 0;
        } catch (error) {
            console.error('Error triggering alert notifications:', error);
            throw error;
        }
    }

    /**
     * 获取告警通知历史
     */
    async getNotificationHistory(limit: number = 100): Promise<AlertNotification[]> {
        try {
            const { data, error } = await supabase
                .from('alert_notifications')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(limit);

            if (error) throw error;

            return data.map(item => ({
                id: item.id,
                anomalyLogId: item.anomaly_log_id,
                notificationMethod: item.notification_method,
                notificationTarget: item.notification_target,
                notificationStatus: item.notification_status,
                sentAt: item.sent_at,
                errorMessage: item.error_message,
                retryCount: item.retry_count,
                createdAt: item.created_at
            }));
        } catch (error) {
            console.error('Error fetching notification history:', error);
            throw error;
        }
    }

    /**
     * 获取异常统计
     */
    async getAnomalyStatistics(days: number = 30): Promise<AnomalyStatistics[]> {
        try {
            const { data, error } = await supabase
                .from('anomaly_statistics')
                .select('*')
                .order('detection_date', { ascending: false })
                .limit(days);

            if (error) throw error;

            return data.map(item => ({
                detectionDate: item.detection_date,
                anomalyType: item.anomaly_type,
                severity: item.severity,
                anomalyCount: item.anomaly_count,
                resolvedCount: item.resolved_count,
                falsePositiveCount: item.false_positive_count,
                resolutionRatePercent: item.resolution_rate_percent,
                falsePositiveRatePercent: item.false_positive_rate_percent,
                avgResolutionHours: item.avg_resolution_hours
            }));
        } catch (error) {
            console.error('Error fetching anomaly statistics:', error);
            throw error;
        }
    }

    /**
     * 获取系统健康指标
     */
    async getSystemHealthMetrics(): Promise<SystemHealthMetrics> {
        try {
            const { data, error } = await supabase
                .from('system_health_metrics')
                .select('*')
                .single();

            if (error) throw error;

            return {
                paymentSystemStatus: data.payment_system_status,
                creditSystemStatus: data.credit_system_status,
                anomalySystemStatus: data.anomaly_system_status,
                performanceStatus: data.performance_status,
                paymentSuccessRate1h: data.payment_success_rate_1h,
                creditTransactions1h: data.credit_transactions_1h,
                activeCriticalAnomalies: data.active_critical_anomalies,
                avgResponseTimeMs: data.avg_response_time_ms,
                databaseConnected: data.database_connected,
                lastUpdated: data.last_updated
            };
        } catch (error) {
            console.error('Error fetching system health metrics:', error);
            throw error;
        }
    }

    /**
     * 获取活跃异常摘要
     */
    async getActiveAnomaliesSummary(): Promise<{
        total: number;
        bySeverity: Record<string, number>;
        byType: Record<string, number>;
        recent: AnomalyDetectionLog[];
    }> {
        try {
            const activeAnomalies = await this.getAnomalyLogs(1000, 'active');

            const bySeverity = activeAnomalies.reduce((acc, anomaly) => {
                acc[anomaly.severity] = (acc[anomaly.severity] || 0) + 1;
                return acc;
            }, {} as Record<string, number>);

            const byType = activeAnomalies.reduce((acc, anomaly) => {
                acc[anomaly.anomalyType] = (acc[anomaly.anomalyType] || 0) + 1;
                return acc;
            }, {} as Record<string, number>);

            return {
                total: activeAnomalies.length,
                bySeverity,
                byType,
                recent: activeAnomalies.slice(0, 10)
            };
        } catch (error) {
            console.error('Error fetching active anomalies summary:', error);
            throw error;
        }
    }

    /**
     * 批量处理异常
     */
    async batchProcessAnomalies(
        anomalyIds: string[],
        action: 'acknowledge' | 'resolve' | 'false_positive',
        userId: string,
        notes?: string
    ): Promise<void> {
        try {
            const updates: any = {
                status: action === 'acknowledge' ? 'acknowledged' :
                    action === 'resolve' ? 'resolved' : 'false_positive'
            };

            if (action === 'acknowledge') {
                updates.acknowledged_by = userId;
                updates.acknowledged_at = new Date().toISOString();
            } else {
                updates.resolved_at = new Date().toISOString();
            }

            if (notes) {
                updates.resolution_notes = notes;
            }

            const { error } = await supabase
                .from('anomaly_detection_logs')
                .update(updates)
                .in('id', anomalyIds);

            if (error) throw error;
        } catch (error) {
            console.error('Error batch processing anomalies:', error);
            throw error;
        }
    }

    /**
     * 获取异常趋势
     */
    async getAnomalyTrends(days: number = 30): Promise<{
        date: string;
        totalAnomalies: number;
        criticalAnomalies: number;
        resolvedAnomalies: number;
        falsePositives: number;
    }[]> {
        try {
            const statistics = await this.getAnomalyStatistics(days);

            // 按日期分组统计
            const trendMap = new Map<string, {
                totalAnomalies: number;
                criticalAnomalies: number;
                resolvedAnomalies: number;
                falsePositives: number;
            }>();

            statistics.forEach(stat => {
                const existing = trendMap.get(stat.detectionDate) || {
                    totalAnomalies: 0,
                    criticalAnomalies: 0,
                    resolvedAnomalies: 0,
                    falsePositives: 0
                };

                existing.totalAnomalies += stat.anomalyCount;
                existing.resolvedAnomalies += stat.resolvedCount;
                existing.falsePositives += stat.falsePositiveCount;

                if (stat.severity === 'critical') {
                    existing.criticalAnomalies += stat.anomalyCount;
                }

                trendMap.set(stat.detectionDate, existing);
            });

            return Array.from(trendMap.entries())
                .map(([date, data]) => ({ date, ...data }))
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        } catch (error) {
            console.error('Error fetching anomaly trends:', error);
            throw error;
        }
    }
}

// 导出单例实例
export const anomalyDetectionService = new AnomalyDetectionService();
export default anomalyDetectionService;