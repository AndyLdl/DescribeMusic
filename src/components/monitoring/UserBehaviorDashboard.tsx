/**
 * 用户行为分析仪表板组件
 * 显示用户转换路径、套餐偏好和积分使用模式分析
 */

import React, { useState, useEffect } from 'react';
import {
    userBehaviorAnalysisService,
    type SubscriptionPreference,
    type CreditUsagePattern,
    type ChurnRiskAssessment,
    type UserLifetimeValue
} from '../../services/userBehaviorAnalysisService';

interface ConversionFunnelStatsProps {
    stats: {
        totalUsers: number;
        trialUsers: number;
        activeUsers: number;
        payingUsers: number;
        subscribers: number;
        trialToActiveRate: number;
        activeToPayingRate: number;
        payingToSubscriberRate: number;
    };
}

const ConversionFunnelStats: React.FC<ConversionFunnelStatsProps> = ({ stats }) => {
    const funnelSteps = [
        { label: '注册用户', count: stats.totalUsers, rate: 100 },
        { label: '试用用户', count: stats.trialUsers, rate: (stats.trialUsers / stats.totalUsers) * 100 },
        { label: '活跃用户', count: stats.activeUsers, rate: stats.trialToActiveRate },
        { label: '付费用户', count: stats.payingUsers, rate: stats.activeToPayingRate },
        { label: '订阅用户', count: stats.subscribers, rate: stats.payingToSubscriberRate }
    ];

    return (
        <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">用户转换漏斗</h3>
            <div className="space-y-4">
                {funnelSteps.map((step, index) => (
                    <div key={step.label} className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium ${index === 0 ? 'bg-blue-500' :
                                    index === 1 ? 'bg-green-500' :
                                        index === 2 ? 'bg-yellow-500' :
                                            index === 3 ? 'bg-orange-500' : 'bg-red-500'
                                }`}>
                                {index + 1}
                            </div>
                            <span className="font-medium text-gray-900">{step.label}</span>
                        </div>
                        <div className="text-right">
                            <div className="text-lg font-bold text-gray-900">{step.count.toLocaleString()}</div>
                            <div className="text-sm text-gray-500">{step.rate.toFixed(1)}%</div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

interface SubscriptionPreferenceChartProps {
    preferences: SubscriptionPreference[];
}

const SubscriptionPreferenceChart: React.FC<SubscriptionPreferenceChartProps> = ({ preferences }) => {
    return (
        <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">套餐选择偏好</h3>
            <div className="space-y-4">
                {preferences.map((pref, index) => (
                    <div key={pref.lemonsqueezyVariantId} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                            <div>
                                <h4 className="font-medium text-gray-900">{pref.planName}</h4>
                                <p className="text-sm text-gray-600">{pref.planCredits} 积分</p>
                            </div>
                            <div className="text-right">
                                <div className="text-lg font-bold text-blue-600">
                                    {pref.marketSharePercent}%
                                </div>
                                <div className="text-sm text-gray-500">市场份额</div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3">
                            <div className="text-center">
                                <div className="text-lg font-semibold text-gray-900">
                                    {pref.totalSubscriptions}
                                </div>
                                <div className="text-xs text-gray-500">总订阅</div>
                            </div>
                            <div className="text-center">
                                <div className="text-lg font-semibold text-green-600">
                                    {pref.activeSubscriptions}
                                </div>
                                <div className="text-xs text-gray-500">活跃订阅</div>
                            </div>
                            <div className="text-center">
                                <div className="text-lg font-semibold text-red-600">
                                    {pref.churnRatePercent}%
                                </div>
                                <div className="text-xs text-gray-500">流失率</div>
                            </div>
                            <div className="text-center">
                                <div className="text-lg font-semibold text-gray-900">
                                    {pref.avgDaysBeforeSubscription}
                                </div>
                                <div className="text-xs text-gray-500">平均转换天数</div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

interface UsagePatternAnalysisProps {
    patterns: CreditUsagePattern[];
}

const UsagePatternAnalysis: React.FC<UsagePatternAnalysisProps> = ({ patterns }) => {
    const getHourLabel = (hour: number): string => {
        return `${hour}:00`;
    };

    const getDayLabel = (day: number): string => {
        const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
        return days[day] || `第${day}天`;
    };

    return (
        <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">积分使用模式分析</h3>
            <div className="space-y-6">
                {patterns.map((pattern) => (
                    <div key={pattern.userType} className="border rounded-lg p-4">
                        <div className="flex justify-between items-center mb-4">
                            <h4 className="font-medium text-gray-900 capitalize">
                                {pattern.userType.replace('_', ' ')} ({pattern.userCount} 用户)
                            </h4>
                            <div className="text-sm text-gray-500">
                                高频: {pattern.heavyUsers} | 中频: {pattern.moderateUsers} | 低频: {pattern.lightUsers}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="text-center p-3 bg-blue-50 rounded">
                                <div className="text-lg font-bold text-blue-600">
                                    {pattern.avgAnalysesPerUser}
                                </div>
                                <div className="text-xs text-gray-600">平均分析次数</div>
                            </div>
                            <div className="text-center p-3 bg-green-50 rounded">
                                <div className="text-lg font-bold text-green-600">
                                    {pattern.avgCreditsConsumed}
                                </div>
                                <div className="text-xs text-gray-600">平均积分消费</div>
                            </div>
                            <div className="text-center p-3 bg-yellow-50 rounded">
                                <div className="text-lg font-bold text-yellow-600">
                                    {getHourLabel(pattern.peakUsageHour)}
                                </div>
                                <div className="text-xs text-gray-600">高峰使用时间</div>
                            </div>
                            <div className="text-center p-3 bg-purple-50 rounded">
                                <div className="text-lg font-bold text-purple-600">
                                    {getDayLabel(pattern.peakUsageDay)}
                                </div>
                                <div className="text-xs text-gray-600">高峰使用日</div>
                            </div>
                        </div>

                        <div className="mt-3 grid grid-cols-2 gap-4">
                            <div className="text-center">
                                <div className="text-sm font-medium text-gray-700">
                                    平均活跃天数: {pattern.avgActiveDays} 天
                                </div>
                            </div>
                            <div className="text-center">
                                <div className="text-sm font-medium text-gray-700">
                                    使用间隔: {pattern.avgHoursBetweenUsage} 小时
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

interface ChurnRiskTableProps {
    churnRisks: ChurnRiskAssessment[];
}

const ChurnRiskTable: React.FC<ChurnRiskTableProps> = ({ churnRisks }) => {
    const getRiskColor = (level: string) => {
        switch (level) {
            case 'high': return 'bg-red-100 text-red-800';
            case 'medium': return 'bg-yellow-100 text-yellow-800';
            default: return 'bg-green-100 text-green-800';
        }
    };

    const getRiskLabel = (level: string) => {
        switch (level) {
            case 'high': return '高风险';
            case 'medium': return '中风险';
            default: return '低风险';
        }
    };

    return (
        <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
                高风险流失用户 ({churnRisks.length})
            </h3>
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                用户ID
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                风险等级
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                风险评分
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                最后活跃
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                用户价值
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                风险因素
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {churnRisks.slice(0, 10).map((risk) => (
                            <tr key={risk.userId}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                                    {risk.userId.substring(0, 8)}...
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRiskColor(risk.riskLevel)}`}>
                                        {getRiskLabel(risk.riskLevel)}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    {risk.churnRiskScore.toFixed(0)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    {risk.lastActivityDays} 天前
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    ${risk.totalValue.toFixed(2)}
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-900">
                                    <div className="flex flex-wrap gap-1">
                                        {risk.riskFactors.map((factor, index) => (
                                            <span key={index} className="inline-flex px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
                                                {factor.replace(/_/g, ' ')}
                                            </span>
                                        ))}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const UserBehaviorDashboard: React.FC = () => {
    const [conversionStats, setConversionStats] = useState<any>(null);
    const [subscriptionPreferences, setSubscriptionPreferences] = useState<SubscriptionPreference[]>([]);
    const [usagePatterns, setUsagePatterns] = useState<CreditUsagePattern[]>([]);
    const [churnRisks, setChurnRisks] = useState<ChurnRiskAssessment[]>([]);
    const [lifetimeValues, setLifetimeValues] = useState<UserLifetimeValue[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadBehaviorData = async () => {
        try {
            setError(null);
            setLoading(true);

            const [
                conversionData,
                preferencesData,
                patternsData,
                churnData,
                ltvData
            ] = await Promise.all([
                userBehaviorAnalysisService.getConversionFunnelStats(),
                userBehaviorAnalysisService.getSubscriptionPreferences(),
                userBehaviorAnalysisService.getCreditUsagePatterns(),
                userBehaviorAnalysisService.getHighRiskChurnUsers(20),
                userBehaviorAnalysisService.calculateUserLifetimeValue()
            ]);

            setConversionStats(conversionData);
            setSubscriptionPreferences(preferencesData);
            setUsagePatterns(patternsData);
            setChurnRisks(churnData);
            setLifetimeValues(ltvData);
        } catch (err) {
            console.error('Error loading behavior data:', err);
            setError('加载用户行为数据失败');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadBehaviorData();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-2 text-gray-600">加载用户行为数据中...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center">
                    <span className="text-red-600 mr-2">⚠️</span>
                    <span className="text-red-800">{error}</span>
                </div>
                <button
                    onClick={loadBehaviorData}
                    className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                >
                    重试
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* 页面标题 */}
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-900">用户行为分析</h1>
                <button
                    onClick={loadBehaviorData}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                    刷新数据
                </button>
            </div>

            {/* 用户生命周期价值概览 */}
            {lifetimeValues.length > 0 && (
                <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">用户生命周期价值</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {lifetimeValues.map((ltv) => (
                            <div key={ltv.userSegment} className="text-center p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg">
                                <h3 className="font-medium text-gray-900 mb-2 capitalize">
                                    {ltv.userSegment.replace('_', ' ')}
                                </h3>
                                <div className="text-2xl font-bold text-blue-600 mb-1">
                                    ${ltv.predictedLtv.toFixed(0)}
                                </div>
                                <div className="text-sm text-gray-600">预测LTV</div>
                                <div className="mt-2 text-xs text-gray-500">
                                    平均收入: ${ltv.avgTotalRevenue.toFixed(2)}
                                    <br />
                                    平均生命周期: {ltv.avgLifetimeDays} 天
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* 转换漏斗和套餐偏好 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {conversionStats && <ConversionFunnelStats stats={conversionStats} />}
                {subscriptionPreferences.length > 0 && (
                    <SubscriptionPreferenceChart preferences={subscriptionPreferences} />
                )}
            </div>

            {/* 积分使用模式分析 */}
            {usagePatterns.length > 0 && (
                <UsagePatternAnalysis patterns={usagePatterns} />
            )}

            {/* 高风险流失用户 */}
            {churnRisks.length > 0 && (
                <ChurnRiskTable churnRisks={churnRisks} />
            )}

            {/* 数据更新时间 */}
            <div className="text-center text-sm text-gray-500">
                最后更新: {new Date().toLocaleString()}
            </div>
        </div>
    );
};

export default UserBehaviorDashboard;