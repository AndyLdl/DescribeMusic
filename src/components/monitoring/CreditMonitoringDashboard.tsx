/**
 * 积分系统监控仪表板组件
 * 显示积分消费、支付成功率和用户行为分析数据
 */

import React, { useState, useEffect } from 'react';
import {
    creditMonitoringService,
    type RealtimeMetric,
    type CreditAnomaly,
    type CreditBalanceDistribution,
    type PaymentSuccessMetric
} from '../../services/creditMonitoringService';

interface MetricCardProps {
    title: string;
    value: string | number;
    unit?: string;
    trend?: 'up' | 'down' | 'stable';
    severity?: 'normal' | 'warning' | 'critical';
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, unit, trend, severity = 'normal' }) => {
    const getSeverityColor = () => {
        switch (severity) {
            case 'warning': return 'border-yellow-500 bg-yellow-50';
            case 'critical': return 'border-red-500 bg-red-50';
            default: return 'border-gray-200 bg-white';
        }
    };

    const getTrendIcon = () => {
        switch (trend) {
            case 'up': return '↗️';
            case 'down': return '↘️';
            default: return '→';
        }
    };

    return (
        <div className={`p-4 rounded-lg border-2 ${getSeverityColor()}`}>
            <h3 className="text-sm font-medium text-gray-600 mb-1">{title}</h3>
            <div className="flex items-center justify-between">
                <span className="text-2xl font-bold text-gray-900">
                    {value} {unit && <span className="text-sm text-gray-500">{unit}</span>}
                </span>
                {trend && <span className="text-lg">{getTrendIcon()}</span>}
            </div>
        </div>
    );
};

interface AnomalyAlertProps {
    anomaly: CreditAnomaly;
    onDismiss: (anomaly: CreditAnomaly) => void;
}

const AnomalyAlert: React.FC<AnomalyAlertProps> = ({ anomaly, onDismiss }) => {
    const getSeverityColor = () => {
        switch (anomaly.severity) {
            case 'high': return 'bg-red-100 border-red-500 text-red-800';
            case 'medium': return 'bg-yellow-100 border-yellow-500 text-yellow-800';
            default: return 'bg-blue-100 border-blue-500 text-blue-800';
        }
    };

    return (
        <div className={`p-3 rounded-lg border-l-4 ${getSeverityColor()} mb-2`}>
            <div className="flex justify-between items-start">
                <div>
                    <h4 className="font-medium capitalize">
                        {anomaly.anomalyType.replace(/_/g, ' ')}
                    </h4>
                    <p className="text-sm mt-1">{anomaly.anomalyDescription}</p>
                    <p className="text-xs mt-1 opacity-75">
                        {new Date(anomaly.detectedAt).toLocaleString()}
                    </p>
                </div>
                <button
                    onClick={() => onDismiss(anomaly)}
                    className="text-gray-500 hover:text-gray-700"
                >
                    ✕
                </button>
            </div>
        </div>
    );
};

const CreditMonitoringDashboard: React.FC = () => {
    const [realtimeMetrics, setRealtimeMetrics] = useState<RealtimeMetric[]>([]);
    const [anomalies, setAnomalies] = useState<CreditAnomaly[]>([]);
    const [balanceDistribution, setBalanceDistribution] = useState<CreditBalanceDistribution[]>([]);
    const [paymentMetrics, setPaymentMetrics] = useState<PaymentSuccessMetric[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);

    // 加载监控数据
    const loadMonitoringData = async () => {
        try {
            setError(null);

            const [
                realtimeData,
                anomaliesData,
                balanceData,
                paymentData
            ] = await Promise.all([
                creditMonitoringService.getRealtimeMetrics(),
                creditMonitoringService.detectCreditAnomalies(),
                creditMonitoringService.getCreditBalanceDistribution(),
                creditMonitoringService.getPaymentSuccessMetrics(7) // 最近7天
            ]);

            setRealtimeMetrics(realtimeData);
            setAnomalies(anomaliesData);
            setBalanceDistribution(balanceData);
            setPaymentMetrics(paymentData);
        } catch (err) {
            console.error('Error loading monitoring data:', err);
            setError('加载监控数据失败');
        } finally {
            setLoading(false);
        }
    };

    // 组件挂载时加载数据并设置自动刷新
    useEffect(() => {
        loadMonitoringData();

        // 每30秒自动刷新实时指标
        const interval = setInterval(() => {
            creditMonitoringService.getRealtimeMetrics()
                .then(setRealtimeMetrics)
                .catch(console.error);
        }, 30000);

        setRefreshInterval(interval);

        return () => {
            if (interval) clearInterval(interval);
        };
    }, []);

    // 清理定时器
    useEffect(() => {
        return () => {
            if (refreshInterval) clearInterval(refreshInterval);
        };
    }, [refreshInterval]);

    // 处理异常告警的关闭
    const handleDismissAnomaly = (anomaly: CreditAnomaly) => {
        setAnomalies(prev => prev.filter(a =>
            a.userId !== anomaly.userId ||
            a.anomalyType !== anomaly.anomalyType ||
            a.detectedAt !== anomaly.detectedAt
        ));
    };

    // 计算支付成功率
    const calculatePaymentSuccessRate = () => {
        if (paymentMetrics.length === 0) return 0;

        const totalPayments = paymentMetrics.reduce((sum, metric) => sum + metric.paymentCount, 0);
        const successfulPayments = paymentMetrics
            .filter(metric => metric.status === 'completed')
            .reduce((sum, metric) => sum + metric.paymentCount, 0);

        return totalPayments > 0 ? (successfulPayments / totalPayments * 100).toFixed(1) : 0;
    };

    // 获取指标值的辅助函数
    const getMetricValue = (metricName: string): string => {
        const metric = realtimeMetrics.find(m => m.metricName === metricName);
        return metric ? metric.metricValue.toString() : '0';
    };

    const getMetricUnit = (metricName: string): string => {
        const metric = realtimeMetrics.find(m => m.metricName === metricName);
        return metric ? metric.metricUnit : '';
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-2 text-gray-600">加载监控数据中...</span>
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
                    onClick={loadMonitoringData}
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
                <h1 className="text-2xl font-bold text-gray-900">积分系统监控</h1>
                <button
                    onClick={loadMonitoringData}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                    刷新数据
                </button>
            </div>

            {/* 异常告警区域 */}
            {anomalies.length > 0 && (
                <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">
                        异常告警 ({anomalies.length})
                    </h2>
                    <div className="space-y-2">
                        {anomalies.map((anomaly, index) => (
                            <AnomalyAlert
                                key={`${anomaly.userId}-${anomaly.anomalyType}-${index}`}
                                anomaly={anomaly}
                                onDismiss={handleDismissAnomaly}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* 实时指标卡片 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                <MetricCard
                    title="活跃用户"
                    value={getMetricValue('total_active_users')}
                    unit={getMetricUnit('total_active_users')}
                />
                <MetricCard
                    title="系统总积分"
                    value={parseInt(getMetricValue('total_credits_in_system')).toLocaleString()}
                    unit={getMetricUnit('total_credits_in_system')}
                />
                <MetricCard
                    title="今日消费积分"
                    value={parseInt(getMetricValue('credits_consumed_today')).toLocaleString()}
                    unit={getMetricUnit('credits_consumed_today')}
                />
                <MetricCard
                    title="活跃订阅"
                    value={getMetricValue('active_subscriptions')}
                    unit={getMetricUnit('active_subscriptions')}
                />
                <MetricCard
                    title="今日收入"
                    value={`$${parseFloat(getMetricValue('revenue_today')).toFixed(2)}`}
                    unit={getMetricUnit('revenue_today')}
                />
                <MetricCard
                    title="支付成功率"
                    value={`${getMetricValue('payment_success_rate_today')}%`}
                    severity={parseFloat(getMetricValue('payment_success_rate_today')) < 90 ? 'warning' : 'normal'}
                />
            </div>

            {/* 积分余额分布 */}
            <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">积分余额分布</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {balanceDistribution.map((distribution) => (
                        <div key={distribution.balanceRange} className="text-center p-4 bg-gray-50 rounded-lg">
                            <div className="text-2xl font-bold text-blue-600">
                                {distribution.userCount}
                            </div>
                            <div className="text-sm text-gray-600 mt-1">
                                {distribution.balanceRange} 积分
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                                {distribution.percentage}% 用户
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* 支付状态概览 */}
            <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                    支付状态概览 (最近7天)
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {['completed', 'failed', 'pending'].map((status) => {
                        const statusMetrics = paymentMetrics.filter(m => m.status === status);
                        const totalCount = statusMetrics.reduce((sum, m) => sum + m.paymentCount, 0);
                        const totalAmount = statusMetrics.reduce((sum, m) => sum + m.totalAmount, 0);

                        const getStatusColor = (status: string) => {
                            switch (status) {
                                case 'completed': return 'text-green-600 bg-green-50';
                                case 'failed': return 'text-red-600 bg-red-50';
                                case 'pending': return 'text-yellow-600 bg-yellow-50';
                                default: return 'text-gray-600 bg-gray-50';
                            }
                        };

                        const getStatusLabel = (status: string) => {
                            switch (status) {
                                case 'completed': return '成功';
                                case 'failed': return '失败';
                                case 'pending': return '待处理';
                                default: return status;
                            }
                        };

                        return (
                            <div key={status} className={`p-4 rounded-lg ${getStatusColor(status)}`}>
                                <div className="text-lg font-semibold">
                                    {getStatusLabel(status)}
                                </div>
                                <div className="text-2xl font-bold mt-1">
                                    {totalCount}
                                </div>
                                <div className="text-sm mt-1">
                                    ${totalAmount.toFixed(2)}
                                </div>
                            </div>
                        );
                    })}

                    <div className="p-4 rounded-lg bg-blue-50 text-blue-600">
                        <div className="text-lg font-semibold">总成功率</div>
                        <div className="text-2xl font-bold mt-1">
                            {calculatePaymentSuccessRate()}%
                        </div>
                        <div className="text-sm mt-1">
                            整体表现
                        </div>
                    </div>
                </div>
            </div>

            {/* 数据更新时间 */}
            <div className="text-center text-sm text-gray-500">
                最后更新: {new Date().toLocaleString()}
                <br />
                数据每30秒自动刷新
            </div>
        </div>
    );
};

export default CreditMonitoringDashboard;