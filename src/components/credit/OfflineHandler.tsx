/**
 * Offline Handler Component
 * Handles offline scenarios and provides offline support for credit operations
 */

import { useState, useEffect, useCallback } from 'react';
import { useCreditToast } from './CreditToast';

// Offline operation types
interface OfflineOperation {
    id: string;
    type: 'credit-consumption' | 'credit-addition' | 'payment-initiation';
    data: any;
    timestamp: Date;
    retryCount: number;
    maxRetries: number;
}

// Network status
interface NetworkStatus {
    isOnline: boolean;
    connectionType?: string;
    effectiveType?: string;
    downlink?: number;
    rtt?: number;
}

interface OfflineHandlerProps {
    onOnlineStatusChange?: (isOnline: boolean) => void;
    onOperationQueued?: (operation: OfflineOperation) => void;
    onOperationSynced?: (operation: OfflineOperation) => void;
    onSyncError?: (operation: OfflineOperation, error: Error) => void;
    maxQueueSize?: number;
    syncInterval?: number; // milliseconds
}

export default function OfflineHandler({
    onOnlineStatusChange,
    onOperationQueued,
    onOperationSynced,
    onSyncError,
    maxQueueSize = 50,
    syncInterval = 30000
}: OfflineHandlerProps) {
    const toast = useCreditToast();

    // State management
    const [networkStatus, setNetworkStatus] = useState<NetworkStatus>({
        isOnline: navigator.onLine
    });
    const [offlineQueue, setOfflineQueue] = useState<OfflineOperation[]>([]);
    const [isSyncing, setIsSyncing] = useState(false);
    const [lastSyncAttempt, setLastSyncAttempt] = useState<Date | null>(null);

    // Load offline queue from localStorage on mount
    useEffect(() => {
        const savedQueue = localStorage.getItem('creditOfflineQueue');
        if (savedQueue) {
            try {
                const queue: OfflineOperation[] = JSON.parse(savedQueue).map((op: any) => ({
                    ...op,
                    timestamp: new Date(op.timestamp)
                }));
                setOfflineQueue(queue);
            } catch (error) {
                console.error('Failed to load offline queue:', error);
                localStorage.removeItem('creditOfflineQueue');
            }
        }
    }, []);

    // Save offline queue to localStorage
    const saveOfflineQueue = useCallback((queue: OfflineOperation[]) => {
        try {
            localStorage.setItem('creditOfflineQueue', JSON.stringify(queue));
        } catch (error) {
            console.error('Failed to save offline queue:', error);
        }
    }, []);

    // Update network status
    const updateNetworkStatus = useCallback(() => {
        const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;

        const status: NetworkStatus = {
            isOnline: navigator.onLine,
            connectionType: connection?.type,
            effectiveType: connection?.effectiveType,
            downlink: connection?.downlink,
            rtt: connection?.rtt
        };

        setNetworkStatus(status);

        if (onOnlineStatusChange) {
            onOnlineStatusChange(status.isOnline);
        }

        return status;
    }, [onOnlineStatusChange]);

    // Handle online/offline events
    useEffect(() => {
        const handleOnline = () => {
            const status = updateNetworkStatus();

            toast.success(
                '网络已连接',
                '正在同步离线操作...'
            );

            // Trigger sync when coming back online
            if (offlineQueue.length > 0) {
                syncOfflineOperations();
            }
        };

        const handleOffline = () => {
            updateNetworkStatus();

            toast.warning(
                '网络已断开',
                '操作将在网络恢复后自动同步',
                [
                    {
                        label: '查看离线队列',
                        action: () => showOfflineQueue()
                    }
                ]
            );
        };

        const handleConnectionChange = () => {
            updateNetworkStatus();
        };

        // Add event listeners
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
        if (connection) {
            connection.addEventListener('change', handleConnectionChange);
        }

        // Initial status check
        updateNetworkStatus();

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);

            if (connection) {
                connection.removeEventListener('change', handleConnectionChange);
            }
        };
    }, [updateNetworkStatus, toast, offlineQueue.length]);

    // Queue operation for offline sync
    const queueOperation = useCallback((
        type: OfflineOperation['type'],
        data: any,
        maxRetries: number = 3
    ): string => {
        const operation: OfflineOperation = {
            id: `offline-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            type,
            data,
            timestamp: new Date(),
            retryCount: 0,
            maxRetries
        };

        setOfflineQueue(prev => {
            const newQueue = [...prev, operation];

            // Limit queue size
            if (newQueue.length > maxQueueSize) {
                newQueue.splice(0, newQueue.length - maxQueueSize);
                toast.warning(
                    '离线队列已满',
                    '最旧的操作已被移除'
                );
            }

            saveOfflineQueue(newQueue);
            return newQueue;
        });

        if (onOperationQueued) {
            onOperationQueued(operation);
        }

        toast.info(
            '操作已离线保存',
            '将在网络恢复后自动同步'
        );

        return operation.id;
    }, [maxQueueSize, saveOfflineQueue, onOperationQueued, toast]);

    // Sync offline operations
    const syncOfflineOperations = useCallback(async () => {
        if (isSyncing || !networkStatus.isOnline || offlineQueue.length === 0) {
            return;
        }

        setIsSyncing(true);
        setLastSyncAttempt(new Date());

        const successfulOperations: string[] = [];
        const failedOperations: OfflineOperation[] = [];

        for (const operation of offlineQueue) {
            try {
                await syncSingleOperation(operation);
                successfulOperations.push(operation.id);

                if (onOperationSynced) {
                    onOperationSynced(operation);
                }
            } catch (error) {
                console.error(`Failed to sync operation ${operation.id}:`, error);

                // Increment retry count
                const updatedOperation = {
                    ...operation,
                    retryCount: operation.retryCount + 1
                };

                if (updatedOperation.retryCount >= updatedOperation.maxRetries) {
                    // Max retries reached, remove from queue
                    successfulOperations.push(operation.id);

                    if (onSyncError) {
                        onSyncError(updatedOperation, error as Error);
                    }

                    toast.error(
                        '离线操作同步失败',
                        `操作 ${operation.type} 已达到最大重试次数`
                    );
                } else {
                    // Keep for retry
                    failedOperations.push(updatedOperation);
                }
            }
        }

        // Update queue - remove successful operations, keep failed ones for retry
        setOfflineQueue(prev => {
            const newQueue = prev
                .filter(op => !successfulOperations.includes(op.id))
                .map(op => {
                    const failed = failedOperations.find(f => f.id === op.id);
                    return failed || op;
                });

            saveOfflineQueue(newQueue);
            return newQueue;
        });

        setIsSyncing(false);

        // Show sync results
        if (successfulOperations.length > 0) {
            toast.success(
                '离线操作同步完成',
                `成功同步 ${successfulOperations.length} 个操作`
            );
        }

        if (failedOperations.length > 0) {
            toast.warning(
                '部分操作同步失败',
                `${failedOperations.length} 个操作将稍后重试`
            );
        }
    }, [isSyncing, networkStatus.isOnline, offlineQueue, saveOfflineQueue, onOperationSynced, onSyncError, toast]);

    // Sync single operation
    const syncSingleOperation = useCallback(async (operation: OfflineOperation) => {
        switch (operation.type) {
            case 'credit-consumption':
                // Implement credit consumption sync
                await syncCreditConsumption(operation.data);
                break;
            case 'credit-addition':
                // Implement credit addition sync
                await syncCreditAddition(operation.data);
                break;
            case 'payment-initiation':
                // Implement payment initiation sync
                await syncPaymentInitiation(operation.data);
                break;
            default:
                throw new Error(`Unknown operation type: ${operation.type}`);
        }
    }, []);

    // Sync credit consumption
    const syncCreditConsumption = useCallback(async (data: any) => {
        // This would typically call your credit consumption API
        // For now, we'll simulate the operation
        const response = await fetch('/api/credits/consume', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            throw new Error(`Credit consumption sync failed: ${response.statusText}`);
        }

        return response.json();
    }, []);

    // Sync credit addition
    const syncCreditAddition = useCallback(async (data: any) => {
        // This would typically call your credit addition API
        const response = await fetch('/api/credits/add', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            throw new Error(`Credit addition sync failed: ${response.statusText}`);
        }

        return response.json();
    }, []);

    // Sync payment initiation
    const syncPaymentInitiation = useCallback(async (data: any) => {
        // This would typically recreate the payment session
        const response = await fetch('/api/payments/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            throw new Error(`Payment initiation sync failed: ${response.statusText}`);
        }

        return response.json();
    }, []);

    // Show offline queue
    const showOfflineQueue = useCallback(() => {
        if (offlineQueue.length === 0) {
            toast.info('离线队列为空', '没有待同步的操作');
            return;
        }

        const queueSummary = offlineQueue.reduce((acc, op) => {
            acc[op.type] = (acc[op.type] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        const summaryText = Object.entries(queueSummary)
            .map(([type, count]) => `${type}: ${count}`)
            .join(', ');

        toast.info(
            `离线队列 (${offlineQueue.length})`,
            summaryText,
            [
                {
                    label: '立即同步',
                    action: () => syncOfflineOperations()
                },
                {
                    label: '清空队列',
                    action: () => clearOfflineQueue()
                }
            ]
        );
    }, [offlineQueue, toast, syncOfflineOperations]);

    // Clear offline queue
    const clearOfflineQueue = useCallback(() => {
        setOfflineQueue([]);
        localStorage.removeItem('creditOfflineQueue');
        toast.success('离线队列已清空', '所有待同步操作已移除');
    }, [toast]);

    // Manual sync trigger
    const manualSync = useCallback(() => {
        if (!networkStatus.isOnline) {
            toast.warning('网络未连接', '请检查网络连接后重试');
            return;
        }

        syncOfflineOperations();
    }, [networkStatus.isOnline, syncOfflineOperations, toast]);

    // Set up periodic sync
    useEffect(() => {
        if (!networkStatus.isOnline || offlineQueue.length === 0) {
            return;
        }

        const interval = setInterval(() => {
            syncOfflineOperations();
        }, syncInterval);

        return () => clearInterval(interval);
    }, [networkStatus.isOnline, offlineQueue.length, syncOfflineOperations, syncInterval]);

    // Get connection quality
    const getConnectionQuality = useCallback((): 'excellent' | 'good' | 'poor' | 'offline' => {
        if (!networkStatus.isOnline) return 'offline';

        const { effectiveType, rtt, downlink } = networkStatus;

        if (effectiveType === '4g' && (rtt || 0) < 100 && (downlink || 0) > 10) {
            return 'excellent';
        } else if (effectiveType === '3g' || ((rtt || 0) < 300 && (downlink || 0) > 1)) {
            return 'good';
        } else {
            return 'poor';
        }
    }, [networkStatus]);

    // Render network status indicator
    const renderNetworkStatus = useCallback(() => {
        const quality = getConnectionQuality();

        const statusConfig = {
            excellent: { color: 'text-green-400', icon: '📶', label: '网络良好' },
            good: { color: 'text-yellow-400', icon: '📶', label: '网络一般' },
            poor: { color: 'text-orange-400', icon: '📶', label: '网络较差' },
            offline: { color: 'text-red-400', icon: '📵', label: '离线' }
        };

        const config = statusConfig[quality];

        return (
            <div className={`flex items-center space-x-2 text-sm ${config.color}`}>
                <span>{config.icon}</span>
                <span>{config.label}</span>
                {offlineQueue.length > 0 && (
                    <span className="bg-yellow-500/20 text-yellow-300 px-2 py-1 rounded text-xs">
                        {offlineQueue.length} 待同步
                    </span>
                )}
            </div>
        );
    }, [getConnectionQuality, offlineQueue.length]);

    return {
        // State
        networkStatus,
        offlineQueue,
        isSyncing,
        lastSyncAttempt,

        // Methods
        queueOperation,
        syncOfflineOperations,
        manualSync,
        showOfflineQueue,
        clearOfflineQueue,
        getConnectionQuality,
        renderNetworkStatus,

        // Utilities
        isOnline: networkStatus.isOnline,
        hasOfflineOperations: offlineQueue.length > 0,
        canSync: networkStatus.isOnline && !isSyncing && offlineQueue.length > 0
    };
}

// Hook for using offline handler
export function useOfflineHandler(options: OfflineHandlerProps = {}) {
    return OfflineHandler(options);
}

// Utility function to check if operation should be queued offline
export function shouldQueueOffline(error: Error): boolean {
    const message = error.message.toLowerCase();
    return message.includes('network') ||
        message.includes('offline') ||
        message.includes('connection') ||
        message.includes('timeout') ||
        !navigator.onLine;
}

// Utility function to get offline storage usage
export function getOfflineStorageUsage(): { used: number; available: number; percentage: number } {
    try {
        const queue = localStorage.getItem('creditOfflineQueue');
        const used = queue ? new Blob([queue]).size : 0;
        const available = 5 * 1024 * 1024; // Assume 5MB localStorage limit
        const percentage = (used / available) * 100;

        return { used, available, percentage };
    } catch {
        return { used: 0, available: 0, percentage: 0 };
    }
}