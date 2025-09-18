/**
 * 积分系统监控服务
 * 提供积分消费、支付成功率和用户行为分析的数据获取功能
 */

import { supabase } from '../lib/supabase';

// 监控指标类型定义
export interface CreditConsumptionMetric {
    date: string;
    totalTransactions: number;
    creditsConsumed: number;
    creditsAdded: number;
    activeUsers: number;
    consumingUsers: number;
    avgCreditsPerUser: number;
    consumptionRatePercent: number;
}

export interface CreditBalanceDistribution {
    balanceRange: string;
    userCount: number;
    avgCreditsInRange: number;
    minCredits: number;
    maxCredits: number;
    percentage: number;
}

export interface PaymentSuccessMetric {
    date: string;
    status: string;
    paymentCount: number;
    totalAmount: number;
    avgAmount: number;
    totalPayments: number;
    totalRevenue: number;
    statusPercentage: number;
}

export interface SubscriptionConversionMetric {
    registrationWeek: string;
    totalRegistrations: number;
    convertedToPaid: number;
    churnedUsers: number;
    conversionRatePercent: number;
    churnRatePercent: number;
    avgDaysToConversion: number;
    avgCreditsConsumed: number;
}

export interface RealtimeMetric {
    metricName: string;
    metricValue: number;
    metricUnit: string;
    lastUpdated: string;
}

export interface CreditAnomaly {
    anomalyType: string;
    userId: string;
    anomalyDescription: string;
    severity: 'low' | 'medium' | 'high';
    detectedAt: string;
}

export interface UserBehaviorMetric {
    behaviorMetric: string;
    metricValue: number;
    userSegment: string;
    analysisDate: string;
}

export interface DailyMetricsSummary {
    metricDate: string;
    totalUsers: number;
    activeUsers: number;
    newRegistrations: number;
    totalCreditsConsumed: number;
    totalCreditsAdded: number;
    totalPayments: number;
    successfulPayments: number;
    failedPayments: number;
    totalRevenue: number;
    activeSubscriptions: number;
    newSubscriptions: number;
    cancelledSubscriptions: number;
    avgCreditsPerUser: number;
    paymentSuccessRate: number;
}

class CreditMonitoringService {
    /**
     * 获取积分消费率监控数据
     */
    async getCreditConsumptionMetrics(days: number = 30): Promise<CreditConsumptionMetric[]> {
        try {
            const { data, error } = await supabase
                .from('credit_consumption_metrics')
                .select('*')
                .order('date', { ascending: false })
                .limit(days);

            if (error) throw error;

            return data.map(item => ({
                date: item.date,
                totalTransactions: item.total_transactions,
                creditsConsumed: item.credits_consumed,
                creditsAdded: item.credits_added,
                activeUsers: item.active_users,
                consumingUsers: item.consuming_users,
                avgCreditsPerUser: item.avg_credits_per_user,
                consumptionRatePercent: item.consumption_rate_percent
            }));
        } catch (error) {
            console.error('Error fetching credit consumption metrics:', error);
            throw error;
        }
    }

    /**
     * 获取积分余额分布数据
     */
    async getCreditBalanceDistribution(): Promise<CreditBalanceDistribution[]> {
        try {
            const { data, error } = await supabase
                .from('credit_balance_distribution')
                .select('*')
                .order('balance_range');

            if (error) throw error;

            return data.map(item => ({
                balanceRange: item.balance_range,
                userCount: item.user_count,
                avgCreditsInRange: item.avg_credits_in_range,
                minCredits: item.min_credits,
                maxCredits: item.max_credits,
                percentage: item.percentage
            }));
        } catch (error) {
            console.error('Error fetching credit balance distribution:', error);
            throw error;
        }
    }

    /**
     * 获取支付成功率监控数据
     */
    async getPaymentSuccessMetrics(days: number = 30): Promise<PaymentSuccessMetric[]> {
        try {
            const { data, error } = await supabase
                .from('payment_success_metrics')
                .select('*')
                .order('date', { ascending: false })
                .limit(days * 4); // 每天可能有多个状态记录

            if (error) throw error;

            return data.map(item => ({
                date: item.date,
                status: item.status,
                paymentCount: item.payment_count,
                totalAmount: item.total_amount,
                avgAmount: item.avg_amount,
                totalPayments: item.total_payments,
                totalRevenue: item.total_revenue,
                statusPercentage: item.status_percentage
            }));
        } catch (error) {
            console.error('Error fetching payment success metrics:', error);
            throw error;
        }
    }

    /**
     * 获取订阅转换率和流失率数据
     */
    async getSubscriptionConversionMetrics(weeks: number = 12): Promise<SubscriptionConversionMetric[]> {
        try {
            const { data, error } = await supabase
                .from('subscription_conversion_metrics')
                .select('*')
                .order('registration_week', { ascending: false })
                .limit(weeks);

            if (error) throw error;

            return data.map(item => ({
                registrationWeek: item.registration_week,
                totalRegistrations: item.total_registrations,
                convertedToPaid: item.converted_to_paid,
                churnedUsers: item.churned_users,
                conversionRatePercent: item.conversion_rate_percent,
                churnRatePercent: item.churn_rate_percent,
                avgDaysToConversion: item.avg_days_to_conversion,
                avgCreditsConsumed: item.avg_credits_consumed
            }));
        } catch (error) {
            console.error('Error fetching subscription conversion metrics:', error);
            throw error;
        }
    }

    /**
     * 获取实时监控指标
     */
    async getRealtimeMetrics(): Promise<RealtimeMetric[]> {
        try {
            const { data, error } = await supabase
                .rpc('get_realtime_credit_metrics');

            if (error) throw error;

            return data.map((item: any) => ({
                metricName: item.metric_name,
                metricValue: item.metric_value,
                metricUnit: item.metric_unit,
                lastUpdated: item.last_updated
            }));
        } catch (error) {
            console.error('Error fetching realtime metrics:', error);
            throw error;
        }
    }

    /**
     * 检测积分系统异常
     */
    async detectCreditAnomalies(): Promise<CreditAnomaly[]> {
        try {
            const { data, error } = await supabase
                .rpc('detect_credit_anomalies');

            if (error) throw error;

            return data.map((item: any) => ({
                anomalyType: item.anomaly_type,
                userId: item.user_id,
                anomalyDescription: item.anomaly_description,
                severity: item.severity,
                detectedAt: item.detected_at
            }));
        } catch (error) {
            console.error('Error detecting credit anomalies:', error);
            throw error;
        }
    }

    /**
     * 分析用户行为
     */
    async analyzeUserBehavior(daysBack: number = 30): Promise<UserBehaviorMetric[]> {
        try {
            const { data, error } = await supabase
                .rpc('analyze_user_behavior', { days_back: daysBack });

            if (error) throw error;

            return data.map((item: any) => ({
                behaviorMetric: item.behavior_metric,
                metricValue: item.metric_value,
                userSegment: item.user_segment,
                analysisDate: item.analysis_date
            }));
        } catch (error) {
            console.error('Error analyzing user behavior:', error);
            throw error;
        }
    }

    /**
     * 获取每日指标汇总
     */
    async getDailyMetricsSummary(days: number = 30): Promise<DailyMetricsSummary[]> {
        try {
            const { data, error } = await supabase
                .from('credit_system_metrics_daily')
                .select('*')
                .order('metric_date', { ascending: false })
                .limit(days);

            if (error) throw error;

            return data.map(item => ({
                metricDate: item.metric_date,
                totalUsers: item.total_users,
                activeUsers: item.active_users,
                newRegistrations: item.new_registrations,
                totalCreditsConsumed: item.total_credits_consumed,
                totalCreditsAdded: item.total_credits_added,
                totalPayments: item.total_payments,
                successfulPayments: item.successful_payments,
                failedPayments: item.failed_payments,
                totalRevenue: item.total_revenue,
                activeSubscriptions: item.active_subscriptions,
                newSubscriptions: item.new_subscriptions,
                cancelledSubscriptions: item.cancelled_subscriptions,
                avgCreditsPerUser: item.avg_credits_per_user,
                paymentSuccessRate: item.payment_success_rate
            }));
        } catch (error) {
            console.error('Error fetching daily metrics summary:', error);
            throw error;
        }
    }

    /**
     * 手动触发每日指标汇总
     */
    async aggregateDailyMetrics(targetDate?: string): Promise<void> {
        try {
            const { error } = await supabase
                .rpc('aggregate_daily_metrics', {
                    target_date: targetDate || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0]
                });

            if (error) throw error;
        } catch (error) {
            console.error('Error aggregating daily metrics:', error);
            throw error;
        }
    }

    /**
     * 获取支付成功率趋势
     */
    async getPaymentSuccessRateTrend(days: number = 30): Promise<{ date: string; successRate: number }[]> {
        try {
            const metrics = await this.getPaymentSuccessMetrics(days);

            // 按日期分组并计算每日成功率
            const dailyRates = new Map<string, { successful: number; total: number }>();

            metrics.forEach(metric => {
                const existing = dailyRates.get(metric.date) || { successful: 0, total: 0 };

                if (metric.status === 'completed') {
                    existing.successful += metric.paymentCount;
                }
                existing.total += metric.paymentCount;

                dailyRates.set(metric.date, existing);
            });

            return Array.from(dailyRates.entries()).map(([date, rates]) => ({
                date,
                successRate: rates.total > 0 ? (rates.successful / rates.total) * 100 : 0
            })).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        } catch (error) {
            console.error('Error calculating payment success rate trend:', error);
            throw error;
        }
    }

    /**
     * 获取积分消费趋势
     */
    async getCreditConsumptionTrend(days: number = 30): Promise<{ date: string; creditsConsumed: number; activeUsers: number }[]> {
        try {
            const metrics = await this.getCreditConsumptionMetrics(days);

            return metrics.map(metric => ({
                date: metric.date,
                creditsConsumed: metric.creditsConsumed,
                activeUsers: metric.activeUsers
            }));
        } catch (error) {
            console.error('Error fetching credit consumption trend:', error);
            throw error;
        }
    }

    /**
     * 获取用户增长趋势
     */
    async getUserGrowthTrend(days: number = 30): Promise<{ date: string; newUsers: number; totalUsers: number }[]> {
        try {
            const dailyMetrics = await this.getDailyMetricsSummary(days);

            return dailyMetrics.map(metric => ({
                date: metric.metricDate,
                newUsers: metric.newRegistrations,
                totalUsers: metric.totalUsers
            }));
        } catch (error) {
            console.error('Error fetching user growth trend:', error);
            throw error;
        }
    }
}

// 导出单例实例
export const creditMonitoringService = new CreditMonitoringService();
export default creditMonitoringService;