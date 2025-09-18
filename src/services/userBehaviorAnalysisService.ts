/**
 * 用户行为分析服务
 * 跟踪用户从试用到付费的转换路径，分析套餐选择偏好，监控积分使用模式
 */

import { supabase } from '../lib/supabase';

// 用户转换漏斗数据类型
export interface UserConversionFunnel {
    userId: string;
    registrationDate: string;
    trialStartDate?: string;
    firstCreditUsage?: string;
    firstPaymentDate?: string;
    firstSubscriptionDate?: string;
    currentStatus: string;
    totalCreditsConsumed: number;
    totalAnalyses: number;
    totalRevenueContributed: number;
    daysToFirstUsage?: number;
    daysToFirstPayment?: number;
    daysToSubscription?: number;
    userValueSegment: string;
}

// 套餐偏好分析数据类型
export interface SubscriptionPreference {
    planName: string;
    lemonsqueezyVariantId: string;
    planCredits: number;
    totalSubscriptions: number;
    activeSubscriptions: number;
    cancelledSubscriptions: number;
    marketSharePercent: number;
    churnRatePercent: number;
    avgSubscriptionLengthDays: number;
    avgCreditsConsumedBeforeSub: number;
    avgDaysBeforeSubscription: number;
}

// 积分使用模式数据类型
export interface CreditUsagePattern {
    userType: string;
    userCount: number;
    avgAnalysesPerUser: number;
    avgCreditsConsumed: number;
    avgCreditsPerAnalysis: number;
    avgActiveDays: number;
    avgHoursBetweenUsage: number;
    peakUsageHour: number;
    peakUsageDay: number;
    heavyUsers: number;
    moderateUsers: number;
    lightUsers: number;
}

// 积分需求预测数据类型
export interface CreditDemandForecast {
    forecastDate: string;
    predictedConsumption: number;
    confidenceLevel: 'high' | 'medium' | 'low';
    userSegment: string;
}

// 用户生命周期价值数据类型
export interface UserLifetimeValue {
    userSegment: string;
    avgLifetimeDays: number;
    avgTotalRevenue: number;
    avgTotalCreditsConsumed: number;
    avgRevenuePerDay: number;
    predictedLtv: number;
}

// 用户流失风险数据类型
export interface ChurnRiskAssessment {
    userId: string;
    churnRiskScore: number;
    riskLevel: 'high' | 'medium' | 'low';
    riskFactors: string[];
    lastActivityDays: number;
    totalValue: number;
}

class UserBehaviorAnalysisService {
    /**
     * 获取用户转换漏斗数据
     */
    async getUserConversionFunnel(limit: number = 1000): Promise<UserConversionFunnel[]> {
        try {
            const { data, error } = await supabase
                .from('user_conversion_funnel')
                .select('*')
                .order('registration_date', { ascending: false })
                .limit(limit);

            if (error) throw error;

            return data.map(item => ({
                userId: item.user_id,
                registrationDate: item.registration_date,
                trialStartDate: item.trial_start_date,
                firstCreditUsage: item.first_credit_usage,
                firstPaymentDate: item.first_payment_date,
                firstSubscriptionDate: item.first_subscription_date,
                currentStatus: item.current_status,
                totalCreditsConsumed: item.total_credits_consumed,
                totalAnalyses: item.total_analyses,
                totalRevenueContributed: item.total_revenue_contributed,
                daysToFirstUsage: item.days_to_first_usage,
                daysToFirstPayment: item.days_to_first_payment,
                daysToSubscription: item.days_to_subscription,
                userValueSegment: item.user_value_segment
            }));
        } catch (error) {
            console.error('Error fetching user conversion funnel:', error);
            throw error;
        }
    }

    /**
     * 获取套餐选择偏好分析
     */
    async getSubscriptionPreferences(): Promise<SubscriptionPreference[]> {
        try {
            const { data, error } = await supabase
                .from('subscription_preference_analysis')
                .select('*')
                .order('total_subscriptions', { ascending: false });

            if (error) throw error;

            return data.map(item => ({
                planName: item.plan_name,
                lemonsqueezyVariantId: item.lemonsqueezy_variant_id,
                planCredits: item.plan_credits,
                totalSubscriptions: item.total_subscriptions,
                activeSubscriptions: item.active_subscriptions,
                cancelledSubscriptions: item.cancelled_subscriptions,
                marketSharePercent: item.market_share_percent,
                churnRatePercent: item.churn_rate_percent,
                avgSubscriptionLengthDays: item.avg_subscription_length_days,
                avgCreditsConsumedBeforeSub: item.avg_credits_consumed_before_sub,
                avgDaysBeforeSubscription: item.avg_days_before_subscription
            }));
        } catch (error) {
            console.error('Error fetching subscription preferences:', error);
            throw error;
        }
    }

    /**
     * 获取积分使用模式分析
     */
    async getCreditUsagePatterns(): Promise<CreditUsagePattern[]> {
        try {
            const { data, error } = await supabase
                .from('credit_usage_patterns')
                .select('*')
                .order('user_count', { ascending: false });

            if (error) throw error;

            return data.map(item => ({
                userType: item.user_type,
                userCount: item.user_count,
                avgAnalysesPerUser: item.avg_analyses_per_user,
                avgCreditsConsumed: item.avg_credits_consumed,
                avgCreditsPerAnalysis: item.avg_credits_per_analysis,
                avgActiveDays: item.avg_active_days,
                avgHoursBetweenUsage: item.avg_hours_between_usage,
                peakUsageHour: item.peak_usage_hour,
                peakUsageDay: item.peak_usage_day,
                heavyUsers: item.heavy_users,
                moderateUsers: item.moderate_users,
                lightUsers: item.light_users
            }));
        } catch (error) {
            console.error('Error fetching credit usage patterns:', error);
            throw error;
        }
    }

    /**
     * 预测积分需求
     */
    async predictCreditDemand(forecastDays: number = 30): Promise<CreditDemandForecast[]> {
        try {
            const { data, error } = await supabase
                .rpc('predict_credit_demand', { forecast_days: forecastDays });

            if (error) throw error;

            return data.map((item: any) => ({
                forecastDate: item.forecast_date,
                predictedConsumption: item.predicted_consumption,
                confidenceLevel: item.confidence_level,
                userSegment: item.user_segment
            }));
        } catch (error) {
            console.error('Error predicting credit demand:', error);
            throw error;
        }
    }

    /**
     * 计算用户生命周期价值
     */
    async calculateUserLifetimeValue(): Promise<UserLifetimeValue[]> {
        try {
            const { data, error } = await supabase
                .rpc('calculate_user_lifetime_value');

            if (error) throw error;

            return data.map((item: any) => ({
                userSegment: item.user_segment,
                avgLifetimeDays: item.avg_lifetime_days,
                avgTotalRevenue: item.avg_total_revenue,
                avgTotalCreditsConsumed: item.avg_total_credits_consumed,
                avgRevenuePerDay: item.avg_revenue_per_day,
                predictedLtv: item.predicted_ltv
            }));
        } catch (error) {
            console.error('Error calculating user lifetime value:', error);
            throw error;
        }
    }

    /**
     * 评估用户流失风险
     */
    async assessChurnRisk(): Promise<ChurnRiskAssessment[]> {
        try {
            const { data, error } = await supabase
                .rpc('assess_churn_risk');

            if (error) throw error;

            return data.map((item: any) => ({
                userId: item.user_id,
                churnRiskScore: item.churn_risk_score,
                riskLevel: item.risk_level,
                riskFactors: item.risk_factors,
                lastActivityDays: item.last_activity_days,
                totalValue: item.total_value
            }));
        } catch (error) {
            console.error('Error assessing churn risk:', error);
            throw error;
        }
    }

    /**
     * 获取转换漏斗统计
     */
    async getConversionFunnelStats(): Promise<{
        totalUsers: number;
        trialUsers: number;
        activeUsers: number;
        payingUsers: number;
        subscribers: number;
        trialToActiveRate: number;
        activeToPayingRate: number;
        payingToSubscriberRate: number;
    }> {
        try {
            const funnelData = await this.getUserConversionFunnel();

            const totalUsers = funnelData.length;
            const trialUsers = funnelData.filter(u => u.trialStartDate).length;
            const activeUsers = funnelData.filter(u => u.firstCreditUsage).length;
            const payingUsers = funnelData.filter(u => u.firstPaymentDate).length;
            const subscribers = funnelData.filter(u => u.firstSubscriptionDate).length;

            return {
                totalUsers,
                trialUsers,
                activeUsers,
                payingUsers,
                subscribers,
                trialToActiveRate: trialUsers > 0 ? (activeUsers / trialUsers) * 100 : 0,
                activeToPayingRate: activeUsers > 0 ? (payingUsers / activeUsers) * 100 : 0,
                payingToSubscriberRate: payingUsers > 0 ? (subscribers / payingUsers) * 100 : 0
            };
        } catch (error) {
            console.error('Error calculating conversion funnel stats:', error);
            throw error;
        }
    }

    /**
     * 获取用户价值分布
     */
    async getUserValueDistribution(): Promise<{
        segment: string;
        count: number;
        percentage: number;
        avgRevenue: number;
        avgCreditsConsumed: number;
    }[]> {
        try {
            const funnelData = await this.getUserConversionFunnel();
            const totalUsers = funnelData.length;

            const distribution = new Map<string, {
                count: number;
                totalRevenue: number;
                totalCredits: number;
            }>();

            funnelData.forEach(user => {
                const existing = distribution.get(user.userValueSegment) || {
                    count: 0,
                    totalRevenue: 0,
                    totalCredits: 0
                };

                existing.count++;
                existing.totalRevenue += user.totalRevenueContributed;
                existing.totalCredits += user.totalCreditsConsumed;

                distribution.set(user.userValueSegment, existing);
            });

            return Array.from(distribution.entries()).map(([segment, data]) => ({
                segment,
                count: data.count,
                percentage: (data.count / totalUsers) * 100,
                avgRevenue: data.count > 0 ? data.totalRevenue / data.count : 0,
                avgCreditsConsumed: data.count > 0 ? data.totalCredits / data.count : 0
            })).sort((a, b) => b.count - a.count);
        } catch (error) {
            console.error('Error calculating user value distribution:', error);
            throw error;
        }
    }

    /**
     * 获取用户行为趋势
     */
    async getUserBehaviorTrends(days: number = 30): Promise<{
        date: string;
        newRegistrations: number;
        firstTimeUsers: number;
        returningUsers: number;
        conversions: number;
    }[]> {
        try {
            const funnelData = await this.getUserConversionFunnel();

            // 按日期分组统计
            const trends = new Map<string, {
                newRegistrations: number;
                firstTimeUsers: number;
                returningUsers: number;
                conversions: number;
            }>();

            // 初始化最近N天的数据
            for (let i = 0; i < days; i++) {
                const date = new Date();
                date.setDate(date.getDate() - i);
                const dateStr = date.toISOString().split('T')[0];

                trends.set(dateStr, {
                    newRegistrations: 0,
                    firstTimeUsers: 0,
                    returningUsers: 0,
                    conversions: 0
                });
            }

            // 统计数据
            funnelData.forEach(user => {
                const regDate = user.registrationDate.split('T')[0];
                const firstUsageDate = user.firstCreditUsage?.split('T')[0];
                const firstPaymentDate = user.firstPaymentDate?.split('T')[0];

                if (trends.has(regDate)) {
                    trends.get(regDate)!.newRegistrations++;
                }

                if (firstUsageDate && trends.has(firstUsageDate)) {
                    trends.get(firstUsageDate)!.firstTimeUsers++;
                }

                if (firstPaymentDate && trends.has(firstPaymentDate)) {
                    trends.get(firstPaymentDate)!.conversions++;
                }
            });

            return Array.from(trends.entries())
                .map(([date, data]) => ({ date, ...data }))
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        } catch (error) {
            console.error('Error calculating user behavior trends:', error);
            throw error;
        }
    }

    /**
     * 获取高风险流失用户列表
     */
    async getHighRiskChurnUsers(limit: number = 50): Promise<ChurnRiskAssessment[]> {
        try {
            const churnRisks = await this.assessChurnRisk();

            return churnRisks
                .filter(user => user.riskLevel === 'high')
                .sort((a, b) => b.churnRiskScore - a.churnRiskScore)
                .slice(0, limit);
        } catch (error) {
            console.error('Error fetching high risk churn users:', error);
            throw error;
        }
    }

    /**
     * 分析用户转换时间
     */
    async analyzeConversionTiming(): Promise<{
        avgDaysToFirstUsage: number;
        avgDaysToFirstPayment: number;
        avgDaysToSubscription: number;
        medianDaysToFirstUsage: number;
        medianDaysToFirstPayment: number;
        medianDaysToSubscription: number;
    }> {
        try {
            const funnelData = await this.getUserConversionFunnel();

            const firstUsageTimes = funnelData
                .filter(u => u.daysToFirstUsage !== null && u.daysToFirstUsage !== undefined)
                .map(u => u.daysToFirstUsage!)
                .sort((a, b) => a - b);

            const firstPaymentTimes = funnelData
                .filter(u => u.daysToFirstPayment !== null && u.daysToFirstPayment !== undefined)
                .map(u => u.daysToFirstPayment!)
                .sort((a, b) => a - b);

            const subscriptionTimes = funnelData
                .filter(u => u.daysToSubscription !== null && u.daysToSubscription !== undefined)
                .map(u => u.daysToSubscription!)
                .sort((a, b) => a - b);

            const getMedian = (arr: number[]): number => {
                if (arr.length === 0) return 0;
                const mid = Math.floor(arr.length / 2);
                return arr.length % 2 === 0 ? (arr[mid - 1] + arr[mid]) / 2 : arr[mid];
            };

            const getAverage = (arr: number[]): number => {
                return arr.length > 0 ? arr.reduce((sum, val) => sum + val, 0) / arr.length : 0;
            };

            return {
                avgDaysToFirstUsage: getAverage(firstUsageTimes),
                avgDaysToFirstPayment: getAverage(firstPaymentTimes),
                avgDaysToSubscription: getAverage(subscriptionTimes),
                medianDaysToFirstUsage: getMedian(firstUsageTimes),
                medianDaysToFirstPayment: getMedian(firstPaymentTimes),
                medianDaysToSubscription: getMedian(subscriptionTimes)
            };
        } catch (error) {
            console.error('Error analyzing conversion timing:', error);
            throw error;
        }
    }
}

// 导出单例实例
export const userBehaviorAnalysisService = new UserBehaviorAnalysisService();
export default userBehaviorAnalysisService;