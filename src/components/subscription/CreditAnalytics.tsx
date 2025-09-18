/**
 * CreditAnalytics Component
 * Displays credit usage analysis, predictions, and warnings
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

interface CreditTransaction {
    id: string;
    transaction_type: 'consume' | 'add' | 'refund';
    amount: number;
    balance_after: number;
    source: string;
    description: string;
    created_at: string;
}

interface UsageStats {
    totalConsumed: number;
    totalAdded: number;
    averageDaily: number;
    averageWeekly: number;
    averageMonthly: number;
    mostActiveDay: string;
    mostActiveHour: number;
    largestTransaction: number;
    transactionCount: number;
}

interface UsagePrediction {
    dailyPrediction: number;
    weeklyPrediction: number;
    monthlyPrediction: number;
    daysUntilEmpty: number;
    recommendedTopup: number;
    confidence: number;
}

interface CreditAnalyticsProps {
    creditHistory: CreditTransaction[];
    currentCredits: number;
}

export default function CreditAnalytics({ creditHistory, currentCredits }: CreditAnalyticsProps) {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [selectedPeriod, setSelectedPeriod] = useState<'7d' | '30d' | '90d'>('30d');

    // Filter transactions by selected period
    const filteredTransactions = useMemo(() => {
        const now = new Date();
        const periodDays = selectedPeriod === '7d' ? 7 : selectedPeriod === '30d' ? 30 : 90;
        const cutoffDate = new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000);

        return creditHistory.filter(transaction =>
            new Date(transaction.created_at) >= cutoffDate
        );
    }, [creditHistory, selectedPeriod]);

    // Calculate usage statistics
    const usageStats = useMemo((): UsageStats => {
        const consumeTransactions = filteredTransactions.filter(t => t.transaction_type === 'consume');
        const addTransactions = filteredTransactions.filter(t => t.transaction_type === 'add');

        const totalConsumed = consumeTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);
        const totalAdded = addTransactions.reduce((sum, t) => sum + t.amount, 0);

        const periodDays = selectedPeriod === '7d' ? 7 : selectedPeriod === '30d' ? 30 : 90;
        const averageDaily = totalConsumed / periodDays;
        const averageWeekly = averageDaily * 7;
        const averageMonthly = averageDaily * 30;

        // Find most active day and hour
        const dayCount: Record<string, number> = {};
        const hourCount: Record<number, number> = {};

        consumeTransactions.forEach(transaction => {
            const date = new Date(transaction.created_at);
            const dayName = date.toLocaleDateString('zh-CN', { weekday: 'long' });
            const hour = date.getHours();

            dayCount[dayName] = (dayCount[dayName] || 0) + Math.abs(transaction.amount);
            hourCount[hour] = (hourCount[hour] || 0) + Math.abs(transaction.amount);
        });

        const mostActiveDay = Object.keys(dayCount).reduce((a, b) =>
            dayCount[a] > dayCount[b] ? a : b, Object.keys(dayCount)[0] || '周一'
        );

        const mostActiveHour = Object.keys(hourCount).reduce((a, b) =>
            hourCount[Number(a)] > hourCount[Number(b)] ? Number(a) : Number(b),
            Object.keys(hourCount)[0] ? Number(Object.keys(hourCount)[0]) : 14
        );

        const largestTransaction = Math.max(...consumeTransactions.map(t => Math.abs(t.amount)), 0);

        return {
            totalConsumed,
            totalAdded,
            averageDaily,
            averageWeekly,
            averageMonthly,
            mostActiveDay,
            mostActiveHour,
            largestTransaction,
            transactionCount: consumeTransactions.length
        };
    }, [filteredTransactions, selectedPeriod]);

    // Calculate usage prediction
    const usagePrediction = useMemo((): UsagePrediction => {
        const { averageDaily } = usageStats;

        // Simple linear prediction based on recent usage
        const dailyPrediction = averageDaily;
        const weeklyPrediction = dailyPrediction * 7;
        const monthlyPrediction = dailyPrediction * 30;

        // Calculate days until credits run out
        const daysUntilEmpty = dailyPrediction > 0 ? Math.floor(currentCredits / dailyPrediction) : Infinity;

        // Recommend top-up amount (2 weeks worth of usage)
        const recommendedTopup = Math.ceil(dailyPrediction * 14);

        // Confidence based on transaction count and consistency
        const confidence = Math.min(95, Math.max(20, usageStats.transactionCount * 10));

        return {
            dailyPrediction,
            weeklyPrediction,
            monthlyPrediction,
            daysUntilEmpty,
            recommendedTopup,
            confidence
        };
    }, [usageStats, currentCredits]);

    // Generate daily usage chart data
    const chartData = useMemo(() => {
        const days = selectedPeriod === '7d' ? 7 : selectedPeriod === '30d' ? 30 : 90;
        const now = new Date();
        const data = [];

        for (let i = days - 1; i >= 0; i--) {
            const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
            const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
            const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

            const dayTransactions = filteredTransactions.filter(t => {
                const transactionDate = new Date(t.created_at);
                return transactionDate >= dayStart && transactionDate < dayEnd;
            });

            const consumed = dayTransactions
                .filter(t => t.transaction_type === 'consume')
                .reduce((sum, t) => sum + Math.abs(t.amount), 0);

            const added = dayTransactions
                .filter(t => t.transaction_type === 'add')
                .reduce((sum, t) => sum + t.amount, 0);

            data.push({
                date: date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }),
                consumed,
                added,
                net: added - consumed
            });
        }

        return data;
    }, [filteredTransactions, selectedPeriod]);

    // Get warning level based on current credits and usage
    const getWarningLevel = () => {
        const { daysUntilEmpty } = usagePrediction;

        if (daysUntilEmpty <= 3) return 'critical';
        if (daysUntilEmpty <= 7) return 'warning';
        if (daysUntilEmpty <= 14) return 'info';
        return 'good';
    };

    const warningLevel = getWarningLevel();

    // Format numbers for display
    const formatNumber = (num: number) => {
        if (num >= 1000) {
            return `${(num / 1000).toFixed(1)}k`;
        }
        return Math.round(num).toString();
    };

    const formatDuration = (seconds: number) => {
        const minutes = Math.floor(seconds / 60);
        if (minutes >= 60) {
            const hours = Math.floor(minutes / 60);
            return `${hours}小时${minutes % 60}分钟`;
        }
        return `${minutes}分钟`;
    };

    return (
        <div className="space-y-6">
            {/* Period Selector */}
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">积分使用分析</h3>
                <div className="flex bg-slate-800 rounded-lg p-1">
                    {[
                        { value: '7d', label: '7天' },
                        { value: '30d', label: '30天' },
                        { value: '90d', label: '90天' }
                    ].map((period) => (
                        <button
                            key={period.value}
                            onClick={() => setSelectedPeriod(period.value as any)}
                            className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${selectedPeriod === period.value
                                    ? 'bg-violet-500 text-white'
                                    : 'text-slate-400 hover:text-slate-300'
                                }`}
                        >
                            {period.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Warning/Alert Section */}
            {warningLevel !== 'good' && (
                <div className={`p-4 rounded-lg border ${warningLevel === 'critical'
                        ? 'bg-red-500/20 border-red-500/30'
                        : warningLevel === 'warning'
                            ? 'bg-yellow-500/20 border-yellow-500/30'
                            : 'bg-blue-500/20 border-blue-500/30'
                    }`}>
                    <div className="flex items-start gap-3">
                        <svg className={`w-5 h-5 mt-0.5 flex-shrink-0 ${warningLevel === 'critical' ? 'text-red-400' :
                                warningLevel === 'warning' ? 'text-yellow-400' : 'text-blue-400'
                            }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                d={warningLevel === 'critical'
                                    ? "M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                    : "M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                }
                            />
                        </svg>
                        <div>
                            <p className={`font-medium ${warningLevel === 'critical' ? 'text-red-300' :
                                    warningLevel === 'warning' ? 'text-yellow-300' : 'text-blue-300'
                                }`}>
                                {warningLevel === 'critical' ? '积分严重不足' :
                                    warningLevel === 'warning' ? '积分不足预警' : '积分提醒'}
                            </p>
                            <p className={`text-sm mt-1 ${warningLevel === 'critical' ? 'text-red-200' :
                                    warningLevel === 'warning' ? 'text-yellow-200' : 'text-blue-200'
                                }`}>
                                {warningLevel === 'critical'
                                    ? `按当前使用量，您的积分将在 ${usagePrediction.daysUntilEmpty} 天内用完。建议立即购买积分。`
                                    : warningLevel === 'warning'
                                        ? `按当前使用量，您的积分将在 ${usagePrediction.daysUntilEmpty} 天内用完。建议提前购买积分。`
                                        : `按当前使用量，您的积分将在 ${usagePrediction.daysUntilEmpty} 天内用完。`
                                }
                            </p>
                            {usagePrediction.recommendedTopup > 0 && (
                                <p className={`text-sm mt-2 ${warningLevel === 'critical' ? 'text-red-200' :
                                        warningLevel === 'warning' ? 'text-yellow-200' : 'text-blue-200'
                                    }`}>
                                    建议购买: {formatNumber(usagePrediction.recommendedTopup)} 积分
                                    (约 {formatDuration(usagePrediction.recommendedTopup)} 音频分析)
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Usage Statistics */}
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                    <div className="flex items-center gap-2 mb-2">
                        <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                        </svg>
                        <span className="text-slate-400 text-sm">总消费</span>
                    </div>
                    <div className="text-2xl font-bold text-red-400">
                        {formatNumber(usageStats.totalConsumed)}
                    </div>
                    <div className="text-slate-500 text-xs mt-1">
                        {formatDuration(usageStats.totalConsumed)}
                    </div>
                </div>

                <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                    <div className="flex items-center gap-2 mb-2">
                        <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                        </svg>
                        <span className="text-slate-400 text-sm">总获得</span>
                    </div>
                    <div className="text-2xl font-bold text-green-400">
                        {formatNumber(usageStats.totalAdded)}
                    </div>
                    <div className="text-slate-500 text-xs mt-1">
                        {formatDuration(usageStats.totalAdded)}
                    </div>
                </div>

                <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                    <div className="flex items-center gap-2 mb-2">
                        <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                        <span className="text-slate-400 text-sm">日均消费</span>
                    </div>
                    <div className="text-2xl font-bold text-blue-400">
                        {formatNumber(usageStats.averageDaily)}
                    </div>
                    <div className="text-slate-500 text-xs mt-1">
                        {formatDuration(usageStats.averageDaily)}
                    </div>
                </div>

                <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                    <div className="flex items-center gap-2 mb-2">
                        <svg className="w-4 h-4 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                        </svg>
                        <span className="text-slate-400 text-sm">使用次数</span>
                    </div>
                    <div className="text-2xl font-bold text-violet-400">
                        {usageStats.transactionCount}
                    </div>
                    <div className="text-slate-500 text-xs mt-1">
                        {selectedPeriod === '7d' ? '7天内' : selectedPeriod === '30d' ? '30天内' : '90天内'}
                    </div>
                </div>
            </div>

            {/* Usage Prediction */}
            <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700">
                <h4 className="font-semibold text-white mb-4 flex items-center gap-2">
                    <svg className="w-5 h-5 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    使用预测
                    <span className="text-slate-400 text-sm font-normal">
                        (置信度: {usagePrediction.confidence}%)
                    </span>
                </h4>

                <div className="grid md:grid-cols-3 gap-4">
                    <div className="text-center">
                        <div className="text-slate-400 text-sm mb-1">预计日消费</div>
                        <div className="text-xl font-bold text-white">
                            {formatNumber(usagePrediction.dailyPrediction)}
                        </div>
                        <div className="text-slate-500 text-xs">
                            {formatDuration(usagePrediction.dailyPrediction)}
                        </div>
                    </div>
                    <div className="text-center">
                        <div className="text-slate-400 text-sm mb-1">预计周消费</div>
                        <div className="text-xl font-bold text-white">
                            {formatNumber(usagePrediction.weeklyPrediction)}
                        </div>
                        <div className="text-slate-500 text-xs">
                            {formatDuration(usagePrediction.weeklyPrediction)}
                        </div>
                    </div>
                    <div className="text-center">
                        <div className="text-slate-400 text-sm mb-1">预计月消费</div>
                        <div className="text-xl font-bold text-white">
                            {formatNumber(usagePrediction.monthlyPrediction)}
                        </div>
                        <div className="text-slate-500 text-xs">
                            {formatDuration(usagePrediction.monthlyPrediction)}
                        </div>
                    </div>
                </div>
            </div>

            {/* Simple Usage Chart */}
            <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700">
                <h4 className="font-semibold text-white mb-4 flex items-center gap-2">
                    <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    使用趋势
                </h4>

                {chartData.length > 0 ? (
                    <div className="space-y-2">
                        {/* Chart Legend */}
                        <div className="flex items-center gap-4 text-sm">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 bg-red-400 rounded"></div>
                                <span className="text-slate-400">消费</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 bg-green-400 rounded"></div>
                                <span className="text-slate-400">获得</span>
                            </div>
                        </div>

                        {/* Simple Bar Chart */}
                        <div className="space-y-1">
                            {chartData.slice(-14).map((day, index) => {
                                const maxValue = Math.max(...chartData.map(d => Math.max(d.consumed, d.added)));
                                const consumedWidth = maxValue > 0 ? (day.consumed / maxValue) * 100 : 0;
                                const addedWidth = maxValue > 0 ? (day.added / maxValue) * 100 : 0;

                                return (
                                    <div key={index} className="flex items-center gap-2 text-xs">
                                        <div className="w-12 text-slate-400 text-right">
                                            {day.date}
                                        </div>
                                        <div className="flex-1 relative h-6 bg-slate-700/50 rounded">
                                            {day.consumed > 0 && (
                                                <div
                                                    className="absolute left-0 top-0 h-full bg-red-400/60 rounded"
                                                    style={{ width: `${consumedWidth}%` }}
                                                ></div>
                                            )}
                                            {day.added > 0 && (
                                                <div
                                                    className="absolute left-0 top-0 h-full bg-green-400/60 rounded"
                                                    style={{ width: `${addedWidth}%` }}
                                                ></div>
                                            )}
                                        </div>
                                        <div className="w-16 text-slate-400 text-right">
                                            {day.consumed > 0 && `-${formatNumber(day.consumed)}`}
                                            {day.added > 0 && `+${formatNumber(day.added)}`}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-8">
                        <div className="w-12 h-12 mx-auto mb-3 bg-slate-700 rounded-full flex items-center justify-center">
                            <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                        </div>
                        <p className="text-slate-400">暂无使用数据</p>
                    </div>
                )}
            </div>

            {/* Usage Insights */}
            <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700">
                <h4 className="font-semibold text-white mb-4 flex items-center gap-2">
                    <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    使用洞察
                </h4>

                <div className="grid md:grid-cols-2 gap-4 text-sm">
                    <div>
                        <span className="text-slate-400">最活跃的一天:</span>
                        <span className="text-white ml-2">{usageStats.mostActiveDay}</span>
                    </div>
                    <div>
                        <span className="text-slate-400">最活跃的时间:</span>
                        <span className="text-white ml-2">{usageStats.mostActiveHour}:00</span>
                    </div>
                    <div>
                        <span className="text-slate-400">最大单次消费:</span>
                        <span className="text-white ml-2">
                            {formatNumber(usageStats.largestTransaction)} 积分
                            ({formatDuration(usageStats.largestTransaction)})
                        </span>
                    </div>
                    <div>
                        <span className="text-slate-400">平均单次消费:</span>
                        <span className="text-white ml-2">
                            {usageStats.transactionCount > 0
                                ? formatNumber(usageStats.totalConsumed / usageStats.transactionCount)
                                : 0
                            } 积分
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}