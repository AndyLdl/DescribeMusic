/**
 * Data Sync Manager Component
 * Handles data synchronization failures and recovery mechanisms
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useCredit } from '../../contexts/CreditContext';
import { useCreditToast } from './CreditToast';

// Sync operation types
interface SyncOperation {
    id: string;
    type: 'credit-balance' | 'transaction-history' | 'subscription-status' | 'payment-status';
    priority: 'high' | 'medium' | 'low';
    data?: any;
    timestamp: Date;
    lastAttempt?: Date;
    attempts: number;
    maxAttempts: number;
    status: 'pending' | 'in-progress' | 'completed' | 'failed' | 'cancelled';
    error?: string;
}

// Sync conflict resolution
interface SyncConflict {
    id: string;
    type: string;
    localData: any;
    remoteData: any;
    timestamp: Date;
    resolved: boolean;
    resolution?: 'local' | 'remote' | 'merge' | 'manual';
}

interface DataSyncManagerProps {
    syncInterval?: number; // milliseconds
    maxRetries?: number;
    onSyncSuccess?: (operation: SyncOperation) => void;
    onSyncFailure?: (operation: SyncOperation, error: Error) => void;
    onConflictDetected?: (conflict: SyncConflict) => void;
    onConflictResolved?: (conflict: SyncConflict) => void;
}

export default function DataSyncManager({
    syncInterval = 60000, // 1 minute
    maxRetries = 5,
    onSyncSuccess,
    onSyncFailure,
    onConflictDetected,
    onConflictResolved
}: DataSyncManagerProps) {
    const { user } = useAuth();
    const { refreshCredits } = useCredit();
    const toast = useCreditToast();

    // State management
    const [syncQueue, setSyncQueue] = useState<SyncOperation[]>([]);
    const [conflicts, setConflicts] = useState<SyncConflict[]>([]);
    const [isSyncing, setIsSyncing] = useState(false);
    const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
    const [syncStats, setSyncStats] = useState({
        totalOperations: 0,
        successfulOperations: 0,
        failedOperations: 0,
        conflictsResolved: 0
    });

    // Refs for cleanup
    const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    // Load sync data from localStorage on mount
    useEffect(() => {
        const savedQueue = localStorage.getItem('creditSyncQueue');
        const savedConflicts = localStorage.getItem('creditSyncConflicts');
        const savedStats = localStorage.getItem('creditSyncStats');

        if (savedQueue) {
            try {
                const queue: SyncOperation[] = JSON.parse(savedQueue).map((op: any) => ({
                    ...op,
                    timestamp: new Date(op.timestamp),
                    lastAttempt: op.lastAttempt ? new Date(op.lastAttempt) : undefined
                }));
                setSyncQueue(queue);
            } catch (error) {
                console.error('Failed to load sync queue:', error);
                localStorage.removeItem('creditSyncQueue');
            }
        }

        if (savedConflicts) {
            try {
                const conflicts: SyncConflict[] = JSON.parse(savedConflicts).map((conflict: any) => ({
                    ...conflict,
                    timestamp: new Date(conflict.timestamp)
                }));
                setConflicts(conflicts);
            } catch (error) {
                console.error('Failed to load sync conflicts:', error);
                localStorage.removeItem('creditSyncConflicts');
            }
        }

        if (savedStats) {
            try {
                setSyncStats(JSON.parse(savedStats));
            } catch (error) {
                console.error('Failed to load sync stats:', error);
                localStorage.removeItem('creditSyncStats');
            }
        }
    }, []);

    // Save sync data to localStorage
    const saveSyncData = useCallback(() => {
        try {
            localStorage.setItem('creditSyncQueue', JSON.stringify(syncQueue));
            localStorage.setItem('creditSyncConflicts', JSON.stringify(conflicts));
            localStorage.setItem('creditSyncStats', JSON.stringify(syncStats));
        } catch (error) {
            console.error('Failed to save sync data:', error);
        }
    }, [syncQueue, conflicts, syncStats]);

    // Save data when state changes
    useEffect(() => {
        saveSyncData();
    }, [saveSyncData]);

    // Add operation to sync queue
    const queueSyncOperation = useCallback((
        type: SyncOperation['type'],
        priority: SyncOperation['priority'] = 'medium',
        data?: any
    ): string => {
        const operation: SyncOperation = {
            id: `sync-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            type,
            priority,
            data,
            timestamp: new Date(),
            attempts: 0,
            maxAttempts: maxRetries,
            status: 'pending'
        };

        setSyncQueue(prev => {
            // Remove duplicate operations of the same type
            const filtered = prev.filter(op => op.type !== type || op.status === 'in-progress');

            // Insert based on priority
            const newQueue = [...filtered, operation];
            newQueue.sort((a, b) => {
                const priorityOrder = { high: 3, medium: 2, low: 1 };
                return priorityOrder[b.priority] - priorityOrder[a.priority];
            });

            return newQueue;
        });

        return operation.id;
    }, [maxRetries]);

    // Execute sync operation
    const executeSyncOperation = useCallback(async (operation: SyncOperation): Promise<void> => {
        const abortController = new AbortController();
        abortControllerRef.current = abortController;

        try {
            // Update operation status
            setSyncQueue(prev => prev.map(op =>
                op.id === operation.id
                    ? { ...op, status: 'in-progress', lastAttempt: new Date(), attempts: op.attempts + 1 }
                    : op
            ));

            let result: any;

            switch (operation.type) {
                case 'credit-balance':
                    result = await syncCreditBalance(abortController.signal);
                    break;
                case 'transaction-history':
                    result = await syncTransactionHistory(operation.data, abortController.signal);
                    break;
                case 'subscription-status':
                    result = await syncSubscriptionStatus(abortController.signal);
                    break;
                case 'payment-status':
                    result = await syncPaymentStatus(operation.data, abortController.signal);
                    break;
                default:
                    throw new Error(`Unknown sync operation type: ${operation.type}`);
            }

            // Check for conflicts
            if (result.conflict) {
                const conflict: SyncConflict = {
                    id: `conflict-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                    type: operation.type,
                    localData: result.localData,
                    remoteData: result.remoteData,
                    timestamp: new Date(),
                    resolved: false
                };

                setConflicts(prev => [...prev, conflict]);

                if (onConflictDetected) {
                    onConflictDetected(conflict);
                }

                // Auto-resolve simple conflicts
                await autoResolveConflict(conflict);
            }

            // Mark operation as completed
            setSyncQueue(prev => prev.map(op =>
                op.id === operation.id
                    ? { ...op, status: 'completed' }
                    : op
            ));

            // Update stats
            setSyncStats(prev => ({
                ...prev,
                totalOperations: prev.totalOperations + 1,
                successfulOperations: prev.successfulOperations + 1
            }));

            if (onSyncSuccess) {
                onSyncSuccess(operation);
            }

        } catch (error) {
            console.error(`Sync operation ${operation.id} failed:`, error);

            const isAborted = error instanceof Error && error.name === 'AbortError';
            const shouldRetry = !isAborted && operation.attempts < operation.maxAttempts;

            if (shouldRetry) {
                // Mark for retry
                setSyncQueue(prev => prev.map(op =>
                    op.id === operation.id
                        ? { ...op, status: 'pending', error: error instanceof Error ? error.message : 'Unknown error' }
                        : op
                ));
            } else {
                // Mark as failed
                setSyncQueue(prev => prev.map(op =>
                    op.id === operation.id
                        ? { ...op, status: 'failed', error: error instanceof Error ? error.message : 'Unknown error' }
                        : op
                ));

                // Update stats
                setSyncStats(prev => ({
                    ...prev,
                    totalOperations: prev.totalOperations + 1,
                    failedOperations: prev.failedOperations + 1
                }));

                if (onSyncFailure) {
                    onSyncFailure(operation, error as Error);
                }

                // Show error toast for high priority operations
                if (operation.priority === 'high') {
                    toast.error(
                        '数据同步失败',
                        `${operation.type} 同步失败: ${error instanceof Error ? error.message : '未知错误'}`,
                        [
                            {
                                label: '重试',
                                action: () => retrySyncOperation(operation.id)
                            }
                        ]
                    );
                }
            }
        } finally {
            abortControllerRef.current = null;
        }
    }, [maxRetries, onSyncSuccess, onSyncFailure, onConflictDetected, toast]);

    // Sync credit balance
    const syncCreditBalance = useCallback(async (signal: AbortSignal) => {
        if (!user) throw new Error('User not authenticated');

        // Simulate API call with conflict detection
        const response = await fetch('/api/credits/balance', {
            signal,
            headers: { 'Authorization': `Bearer ${user.id}` }
        });

        if (!response.ok) {
            throw new Error(`Failed to sync credit balance: ${response.statusText}`);
        }

        const remoteData = await response.json();

        // Refresh local credits
        await refreshCredits();

        return { remoteData };
    }, [user, refreshCredits]);

    // Sync transaction history
    const syncTransactionHistory = useCallback(async (data: any, signal: AbortSignal) => {
        if (!user) throw new Error('User not authenticated');

        const response = await fetch('/api/credits/transactions', {
            method: 'POST',
            signal,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${user.id}`
            },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            throw new Error(`Failed to sync transaction history: ${response.statusText}`);
        }

        return await response.json();
    }, [user]);

    // Sync subscription status
    const syncSubscriptionStatus = useCallback(async (signal: AbortSignal) => {
        if (!user) throw new Error('User not authenticated');

        const response = await fetch('/api/subscriptions/status', {
            signal,
            headers: { 'Authorization': `Bearer ${user.id}` }
        });

        if (!response.ok) {
            throw new Error(`Failed to sync subscription status: ${response.statusText}`);
        }

        return await response.json();
    }, [user]);

    // Sync payment status
    const syncPaymentStatus = useCallback(async (data: any, signal: AbortSignal) => {
        const response = await fetch('/api/payments/status', {
            method: 'POST',
            signal,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            throw new Error(`Failed to sync payment status: ${response.statusText}`);
        }

        return await response.json();
    }, []);

    // Auto-resolve conflicts
    const autoResolveConflict = useCallback(async (conflict: SyncConflict) => {
        let resolution: SyncConflict['resolution'] = 'manual';

        // Simple auto-resolution rules
        switch (conflict.type) {
            case 'credit-balance':
                // Always prefer remote balance (server is authoritative)
                resolution = 'remote';
                break;
            case 'transaction-history':
                // Merge transaction histories
                resolution = 'merge';
                break;
            case 'subscription-status':
                // Prefer remote subscription status
                resolution = 'remote';
                break;
            case 'payment-status':
                // Prefer remote payment status
                resolution = 'remote';
                break;
        }

        if (resolution !== 'manual') {
            await resolveConflict(conflict.id, resolution);
        }
    }, []);

    // Resolve conflict
    const resolveConflict = useCallback(async (
        conflictId: string,
        resolution: SyncConflict['resolution']
    ) => {
        const conflict = conflicts.find(c => c.id === conflictId);
        if (!conflict) return;

        try {
            // Apply resolution
            switch (resolution) {
                case 'local':
                    // Keep local data, update remote
                    await applyLocalData(conflict);
                    break;
                case 'remote':
                    // Keep remote data, update local
                    await applyRemoteData(conflict);
                    break;
                case 'merge':
                    // Merge data
                    await mergeData(conflict);
                    break;
            }

            // Mark conflict as resolved
            setConflicts(prev => prev.map(c =>
                c.id === conflictId
                    ? { ...c, resolved: true, resolution }
                    : c
            ));

            // Update stats
            setSyncStats(prev => ({
                ...prev,
                conflictsResolved: prev.conflictsResolved + 1
            }));

            if (onConflictResolved) {
                onConflictResolved({ ...conflict, resolved: true, resolution });
            }

            toast.success(
                '数据冲突已解决',
                `${conflict.type} 冲突已通过 ${resolution} 策略解决`
            );

        } catch (error) {
            console.error('Failed to resolve conflict:', error);
            toast.error(
                '冲突解决失败',
                `无法解决 ${conflict.type} 冲突: ${error instanceof Error ? error.message : '未知错误'}`
            );
        }
    }, [conflicts, onConflictResolved, toast]);

    // Apply local data
    const applyLocalData = useCallback(async (conflict: SyncConflict) => {
        // Implementation depends on conflict type
        console.log('Applying local data for conflict:', conflict.id);
    }, []);

    // Apply remote data
    const applyRemoteData = useCallback(async (conflict: SyncConflict) => {
        // Implementation depends on conflict type
        console.log('Applying remote data for conflict:', conflict.id);

        // For credit balance, refresh local credits
        if (conflict.type === 'credit-balance') {
            await refreshCredits();
        }
    }, [refreshCredits]);

    // Merge data
    const mergeData = useCallback(async (conflict: SyncConflict) => {
        // Implementation depends on conflict type
        console.log('Merging data for conflict:', conflict.id);
    }, []);

    // Retry sync operation
    const retrySyncOperation = useCallback((operationId: string) => {
        setSyncQueue(prev => prev.map(op =>
            op.id === operationId
                ? { ...op, status: 'pending', attempts: 0, error: undefined }
                : op
        ));
    }, []);

    // Process sync queue
    const processSyncQueue = useCallback(async () => {
        if (isSyncing || !navigator.onLine) return;

        const pendingOperations = syncQueue.filter(op => op.status === 'pending');
        if (pendingOperations.length === 0) return;

        setIsSyncing(true);

        try {
            // Process operations by priority
            for (const operation of pendingOperations) {
                if (abortControllerRef.current?.signal.aborted) break;

                await executeSyncOperation(operation);

                // Small delay between operations
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        } finally {
            setIsSyncing(false);
            setLastSyncTime(new Date());
        }
    }, [isSyncing, syncQueue, executeSyncOperation]);

    // Set up periodic sync
    useEffect(() => {
        if (syncInterval > 0) {
            syncIntervalRef.current = setInterval(processSyncQueue, syncInterval);
        }

        return () => {
            if (syncIntervalRef.current) {
                clearInterval(syncIntervalRef.current);
            }
        };
    }, [processSyncQueue, syncInterval]);

    // Manual sync trigger
    const manualSync = useCallback(() => {
        processSyncQueue();
    }, [processSyncQueue]);

    // Cancel all sync operations
    const cancelAllSync = useCallback(() => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }

        setSyncQueue(prev => prev.map(op =>
            op.status === 'in-progress' || op.status === 'pending'
                ? { ...op, status: 'cancelled' }
                : op
        ));

        setIsSyncing(false);
    }, []);

    // Clear completed operations
    const clearCompletedOperations = useCallback(() => {
        setSyncQueue(prev => prev.filter(op =>
            op.status !== 'completed' && op.status !== 'failed' && op.status !== 'cancelled'
        ));
    }, []);

    // Get sync status
    const getSyncStatus = useCallback(() => {
        const pending = syncQueue.filter(op => op.status === 'pending').length;
        const inProgress = syncQueue.filter(op => op.status === 'in-progress').length;
        const failed = syncQueue.filter(op => op.status === 'failed').length;
        const unresolvedConflicts = conflicts.filter(c => !c.resolved).length;

        return {
            pending,
            inProgress,
            failed,
            unresolvedConflicts,
            isSyncing,
            lastSyncTime,
            stats: syncStats
        };
    }, [syncQueue, conflicts, isSyncing, lastSyncTime, syncStats]);

    return {
        // State
        syncQueue,
        conflicts,
        isSyncing,
        lastSyncTime,
        syncStats,

        // Methods
        queueSyncOperation,
        manualSync,
        cancelAllSync,
        clearCompletedOperations,
        resolveConflict,
        retrySyncOperation,
        getSyncStatus,

        // Utilities
        hasPendingOperations: syncQueue.some(op => op.status === 'pending'),
        hasFailedOperations: syncQueue.some(op => op.status === 'failed'),
        hasUnresolvedConflicts: conflicts.some(c => !c.resolved)
    };
}

// Hook for using data sync manager
export function useDataSyncManager(options: DataSyncManagerProps = {}) {
    return DataSyncManager(options);
}

// Utility function to determine sync priority
export function getSyncPriority(operationType: string, context?: string): SyncOperation['priority'] {
    if (operationType === 'credit-balance' || operationType === 'payment-status') {
        return 'high';
    } else if (operationType === 'subscription-status') {
        return 'medium';
    } else {
        return 'low';
    }
}

// Utility function to estimate sync time
export function estimateSyncTime(operations: SyncOperation[]): number {
    const baseTime = 1000; // 1 second per operation
    const priorityMultiplier = { high: 1, medium: 1.5, low: 2 };

    return operations.reduce((total, op) => {
        return total + (baseTime * priorityMultiplier[op.priority]);
    }, 0);
}