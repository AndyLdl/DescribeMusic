/**
 * 异常检测仪表板组件
 * 显示异常检测、告警管理和系统健康状况
 */

import React, { useState, useEffect } from 'react';
import {
    anomalyDetectionService,
    type AnomalyDetectionLog,
    type SystemHealthMetrics,
    type AnomalyStatistics
} from '../../services/anomalyDetectionService';

interface SystemHealthCardProps {
    title: string;
    status: 'healthy' | 'warning' | 'critical';
    value?: string | number;
    description?: string;
}

const SystemHealthCard: React.FC<SystemHealthCardProps> = ({ title, status, value, description }) => {
    const getStatusColor = () => {
        switch (status) {
            case 'healthy': return 'border-green-500 bg-green-50 text-green-800';
            case 'warning': return 'border-yellow-500 bg-yellow-50 text-yellow-800';
            case 'critical': return 'border-red-500 bg-red-50 text-red-800';
            default: return 'border-gray-200 bg-gray-50 text-gray-800';
        }
    };

    const getStatusIcon = () => {
        switch (status) {
            case 'healthy': return '✅';
            case 'warning': return '⚠️';
            case 'critical': return '🚨';
            default: return '❓';
        }
    };

    const getStatusLabel = () => {
        switch (status) {
            case 'healthy': return '正常';
            case 'warning': return '警告';
            case 'critical': return '严重';
            default: return '未知';
        }
    };

    return (
        <div className={`p-4 rounded-lg border-2 ${getStatusColor()}`}>
            <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium">{title}</h3>
                <span className="text-lg">{getStatusIcon()}</span>
            </div>
            <div className="text-sm font-semibold mb-1">{getStatusLabel()}</div>
            {value && (
                <div className="text-lg font-bold">{value}</div>
            )}
            {description && (
                <div className="text-xs mt-1 opacity-75">{description}</div>
            )}
        </div>
    );
};

interface AnomalyLogTableProps {
    anomalies: AnomalyDetectionLog[];
    onAcknowledge: (anomalyId: string) => void;
    onResolve: (anomalyId: string, notes: string) => void;
    onMarkFalsePositive: (anomalyId: string, notes: string) => void;
}

const AnomalyLogTable: React.FC<AnomalyLogTableProps> = ({
    anomalies,
    onAcknowledge,
    onResolve,
    onMarkFalsePositive
}) => {
    const [selectedAnomalies, setSelectedAnomalies] = useState<Set<string>>(new Set());
    const [actionNotes, setActionNotes] = useState('');
    const [showActionModal, setShowActionModal] = useState(false);
    const [pendingAction, setPendingAction] = useState<{
        type: 'resolve' | 'false_positive';
        anomalyId: string;
    } | null>(null);

    const getSeverityColor = (severity: string) => {
        switch (severity) {
            case 'critical': return 'bg-red-100 text-red-800';
            case 'high': return 'bg-orange-100 text-orange-800';
            case 'medium': return 'bg-yellow-100 text-yellow-800';
            case 'low': return 'bg-blue-100 text-blue-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active': return 'bg-red-100 text-red-800';
            case 'acknowledged': return 'bg-yellow-100 text-yellow-800';
            case 'resolved': return 'bg-green-100 text-green-800';
            case 'false_positive': return 'bg-gray-100 text-gray-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const handleAction = (type: 'resolve' | 'false_positive', anomalyId: string) => {
        setPendingAction({ type, anomalyId });
        setShowActionModal(true);
    };

    const executeAction = () => {
        if (!pendingAction) return;

        if (pendingAction.type === 'resolve') {
            onResolve(pendingAction.anomalyId, actionNotes);
        } else {
            onMarkFalsePositive(pendingAction.anomalyId, actionNotes);
        }

        setShowActionModal(false);
        setPendingAction(null);
        setActionNotes('');
    };

    return (
        <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">
                    异常检测日志 ({anomalies.length})
                </h3>
            </div>

            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                时间
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                类型
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                严重程度
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                状态
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                描述
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                实际值/阈值
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                操作
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {anomalies.map((anomaly) => (
                            <tr key={anomaly.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    {new Date(anomaly.detectionTime).toLocaleString()}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    <div className="font-medium">{anomaly.anomalyType}</div>
                                    <div className="text-xs text-gray-500">{anomaly.entityType}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getSeverityColor(anomaly.severity)}`}>
                                        {anomaly.severity}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(anomaly.status)}`}>
                                        {anomaly.status}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-900 max-w-xs">
                                    <div className="truncate" title={anomaly.description}>
                                        {anomaly.description}
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    <div className="font-medium text-red-600">{anomaly.actualValue}</div>
                                    <div className="text-xs text-gray-500">阈值: {anomaly.thresholdValue}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                                    {anomaly.status === 'active' && (
                                        <>
                                            <button
                                                onClick={() => onAcknowledge(anomaly.id)}
                                                className="text-blue-600 hover:text-blue-900"
                                            >
                                                确认
                                            </button>
                                            <button
                                                onClick={() => handleAction('resolve', anomaly.id)}
                                                className="text-green-600 hover:text-green-900"
                                            >
                                                解决
                                            </button>
                                            <button
                                                onClick={() => handleAction('false_positive', anomaly.id)}
                                                className="text-gray-600 hover:text-gray-900"
                                            >
                                                误报
                                            </button>
                                        </>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* 操作确认模态框 */}
            {showActionModal && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
                    <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
                        <div className="mt-3">
                            <h3 className="text-lg font-medium text-gray-900 mb-4">
                                {pendingAction?.type === 'resolve' ? '解决异常' : '标记为误报'}
                            </h3>
                            <textarea
                                value={actionNotes}
                                onChange={(e) => setActionNotes(e.target.value)}
                                placeholder="请输入备注..."
                                className="w-full p-3 border border-gray-300 rounded-md resize-none"
                                rows={4}
                            />
                            <div className="flex justify-end space-x-3 mt-4">
                                <button
                                    onClick={() => setShowActionModal(false)}
                                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                                >
                                    取消
                                </button>
                                <button
                                    onClick={executeAction}
                                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                                >
                                    确认
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const AnomalyDetectionDashboard: React.FC = () => {
    const [systemHealth, setSystemHealth] = useState<SystemHealthMetrics | null>(null);
    const [activeAnomalies, setActiveAnomalies] = useState<AnomalyDetectionLog[]>([]);
    const [anomalyStats, setAnomalyStats] = useState<AnomalyStatistics[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [autoRefresh, setAutoRefresh] = useState(true);

    const loadDashboardData = async () => {
        try {
            setError(null);

            const [healthData, anomaliesData, statsData] = await Promise.all([
                anomalyDetectionService.getSystemHealthMetrics(),
                anomalyDetectionService.getAnomalyLogs(50, 'active'),
                anomalyDetectionService.getAnomalyStatistics(7)
            ]);

            setSystemHealth(healthData);
            setActiveAnomalies(anomaliesData);
            setAnomalyStats(statsData);
        } catch (err) {
            console.error('Error loading dashboard data:', err);
            setError('加载异常检测数据失败');
        } finally {
            setLoading(false);
        }
    };

    const handleAcknowledgeAnomaly = async (anomalyId: string) => {
        try {
            await anomalyDetectionService.acknowledgeAnomaly(anomalyId, 'current-user-id');
            await loadDashboardData(); // 刷新数据
        } catch (error) {
            console.error('Error acknowledging anomaly:', error);
        }
    };

    const handleResolveAnomaly = async (anomalyId: string, notes: string) => {
        try {
            await anomalyDetectionService.resolveAnomaly(anomalyId, notes);
            await loadDashboardData(); // 刷新数据
        } catch (error) {
            console.error('Error resolving anomaly:', error);
        }
    };

    const handleMarkFalsePositive = async (anomalyId: string, notes: string) => {
        try {
            await anomalyDetectionService.markAsFalsePositive(anomalyId, notes);
            await loadDashboardData(); // 刷新数据
        } catch (error) {
            console.error('Error marking as false positive:', error);
        }
    };

    const runDetection = async () => {
        try {
            const detectedCount = await anomalyDetectionService.runAnomalyDetection();
            console.log(`检测到 ${detectedCount} 个新异常`);
            await loadDashboardData(); // 刷新数据
        } catch (error) {
            console.error('Error running detection:', error);
        }
    };

    useEffect(() => {
        loadDashboardData();
    }, []);

    // 自动刷新
    useEffect(() => {
        if (!autoRefresh) return;

        const interval = setInterval(() => {
            loadDashboardData();
        }, 30000); // 30秒刷新一次

        return () => clearInterval(interval);
    }, [autoRefresh]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-2 text-gray-600">加载异常检测数据中...</span>
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
                    onClick={loadDashboardData}
                    className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                >
                    重试
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* 页面标题和控制 */}
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-900">异常检测与告警</h1>
                <div className="flex items-center space-x-4">
                    <label className="flex items-center">
                        <input
                            type="checkbox"
                            checked={autoRefresh}
                            onChange={(e) => setAutoRefresh(e.target.checked)}
                            className="mr-2"
                        />
                        <span className="text-sm text-gray-600">自动刷新</span>
                    </label>
                    <button
                        onClick={runDetection}
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                        执行检测
                    </button>
                    <button
                        onClick={loadDashboardData}
                        className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                    >
                        刷新数据
                    </button>
                </div>
            </div>

            {/* 系统健康状况 */}
            {systemHealth && (
                <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">系统健康状况</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <SystemHealthCard
                            title="支付系统"
                            status={systemHealth.paymentSystemStatus}
                            value={`${systemHealth.paymentSuccessRate1h?.toFixed(1)}%`}
                            description="1小时成功率"
                        />
                        <SystemHealthCard
                            title="积分系统"
                            status={systemHealth.creditSystemStatus}
                            value={systemHealth.creditTransactions1h}
                            description="1小时交易数"
                        />
                        <SystemHealthCard
                            title="异常监控"
                            status={systemHealth.anomalySystemStatus}
                            value={systemHealth.activeCriticalAnomalies}
                            description="严重异常数量"
                        />
                        <SystemHealthCard
                            title="系统性能"
                            status={systemHealth.performanceStatus}
                            value={`${systemHealth.avgResponseTimeMs}ms`}
                            description="平均响应时间"
                        />
                    </div>
                    <div className="mt-4 text-sm text-gray-500 text-center">
                        最后更新: {new Date(systemHealth.lastUpdated).toLocaleString()}
                    </div>
                </div>
            )}

            {/* 异常统计概览 */}
            {anomalyStats.length > 0 && (
                <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">异常统计 (最近7天)</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="text-center p-4 bg-red-50 rounded-lg">
                            <div className="text-2xl font-bold text-red-600">
                                {anomalyStats.reduce((sum, stat) => sum + stat.anomalyCount, 0)}
                            </div>
                            <div className="text-sm text-gray-600">总异常数</div>
                        </div>
                        <div className="text-center p-4 bg-green-50 rounded-lg">
                            <div className="text-2xl font-bold text-green-600">
                                {anomalyStats.reduce((sum, stat) => sum + stat.resolvedCount, 0)}
                            </div>
                            <div className="text-sm text-gray-600">已解决</div>
                        </div>
                        <div className="text-center p-4 bg-yellow-50 rounded-lg">
                            <div className="text-2xl font-bold text-yellow-600">
                                {anomalyStats.reduce((sum, stat) => sum + stat.falsePositiveCount, 0)}
                            </div>
                            <div className="text-sm text-gray-600">误报数</div>
                        </div>
                    </div>
                </div>
            )}

            {/* 活跃异常列表 */}
            <AnomalyLogTable
                anomalies={activeAnomalies}
                onAcknowledge={handleAcknowledgeAnomaly}
                onResolve={handleResolveAnomaly}
                onMarkFalsePositive={handleMarkFalsePositive}
            />

            {/* 数据更新时间 */}
            <div className="text-center text-sm text-gray-500">
                {autoRefresh ? '数据每30秒自动刷新' : '自动刷新已关闭'}
            </div>
        </div>
    );
};

export default AnomalyDetectionDashboard;