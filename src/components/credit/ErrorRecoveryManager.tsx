/**
 * Error Recovery Manager Component
 * Handles comprehensive error recovery for credit and payment systems
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useCredit } from '../../contexts/CreditContext';
import { useCreditToast } from './CreditToast';
import { creditErrorHandler } from '../../utils/creditErrorHandler';

// Recovery strategy types
type RecoveryStrategy =
    | 'retry'
    | 'fallback'
    | 'cache'
    | 'offline'
    | 'manual'
    | 'ignore';

// Recovery action
interface RecoveryAction {
    id: string;
    type: RecoveryStrategy;
    description: string;
    execute: () => Promise<void>;
    canExecute: boolean;
    priority: number;
}

// Error recovery state
interface ErrorRecoveryState {
    id: string;
    error: Error;
    context: string;
    timestamp: Date;
    attempts: number;
    maxAttempts: number;
    status: 'pending' | 'in-progress' | 'recovered' | 'failed' | 'abandoned';
    strategy?: RecoveryStrategy;
    actions: RecoveryAction[];
    lastAttempt?: Date;
    recoveryData?: any;
}

interface ErrorRecoveryManagerProps {
    maxRecoveryAttempts?: number;
    recoveryTimeout?: number; // milliseconds
    onRecoverySuccess?: (state: ErrorRecoveryState) => void;
    onRecoveryFailure?: (state: ErrorRecoveryState) => void;
    onRecoveryAbandoned?: (state: ErrorRecoveryState) => void;
    enableAutoRecovery?: boolean;
    autoRecoveryDelay?: number; // milliseconds
}

export default function ErrorRecoveryManager({
    maxRecoveryAttempts = 3,
    recoveryTimeout = 30000,
    onRecoverySuccess,
    onRecoveryFailure,
    onRecoveryAbandoned,
    enableAutoRecovery = true,
    autoRecoveryDelay = 5000
}: ErrorRecoveryManagerProps) {
    const { user, refreshAuth } = useAuth();
    const { refreshCredits } = useCredit();
    const toast = useCreditToast();

    // State management
    const [recoveryStates, setRecoveryStates] = useState<ErrorRecoveryState[]>([]);
    const [isRecovering, setIsRecovering] = useState(false);
    const [recoveryStats, setRecoveryStats] = useState({
        totalErrors: 0,
        recoveredErrors: 0,
        failedRecoveries: 0,
        abandonedRecoveries: 0
    });

    // Refs for cleanup
    const timeoutRefs = useRef<Map<string, NodeJS.Timeout>>(new Map());
    const abortControllers = useRef<Map<string, AbortController>>(new Map());

    // Load recovery states from localStorage on mount
    useEffect(() => {
        const savedStates = localStorage.getItem('creditErrorRecoveryStates');
        const savedStats = localStorage.getItem('creditRecoveryStats');

        if (savedStates) {
            try {
                const states: ErrorRecoveryState[] = JSON.parse(savedStates).map((state: any) => ({
                    ...state,
                    timestamp: new Date(state.timestamp),
                    lastAttempt: state.lastAttempt ? new Date(state.lastAttempt) : undefined,
                    error: new Error(state.error.message) // Reconstruct error object
                }));
                setRecoveryStates(states);
            } catch (error) {
                console.error('Failed to load recovery states:', error);
                localStorage.removeItem('creditErrorRecoveryStates');
            }
        }

        if (savedStats) {
            try {
                setRecoveryStats(JSON.parse(savedStats));
            } catch (error) {
                console.error('Failed to load recovery stats:', error);
                localStorage.removeItem('creditRecoveryStats');
            }
        }
    }, []);

    // Save recovery data to localStorage
    const saveRecoveryData = useCallback(() => {
        try {
            const statesToSave = recoveryStates.map(state => ({
                ...state,
                error: { message: state.error.message, name: state.error.name }
            }));
            localStorage.setItem('creditErrorRecoveryStates', JSON.stringify(statesToSave));
            localStorage.setItem('creditRecoveryStats', JSON.stringify(recoveryStats));
        } catch (error) {
            console.error('Failed to save recovery data:', error);
        }
    }, [recoveryStates, recoveryStats]);

    // Save data when state changes
    useEffect(() => {
        saveRecoveryData();
    }, [saveRecoveryData]);

    // Create recovery actions based on error type
    const createRecoveryActions = useCallback((error: Error, context: string): RecoveryAction[] => {
        const actions: RecoveryAction[] = [];

        // Retry action
        actions.push({
            id: 'retry',
            type: 'retry',
            description: '重试操作',
            execute: async () => {
                // Implementation depends on context
                await retryOperation(context);
            },
            canExecute: true,
            priority: 1
        });

        // Refresh auth action (for auth errors)
        if (error.message.includes('auth') || error.message.includes('unauthorized')) {
            actions.push({
                id: 'refresh-auth',
                type: 'fallback',
                description: '刷新身份验证',
                execute: async () => {
                    await refreshAuth();
                },
                canExecute: !!user,
                priority: 2
            });
        }

        // Refresh credits action (for credit errors)
        if (error.message.includes('credit') || context.includes('credit')) {
            actions.push({
                id: 'refresh-credits',
                type: 'fallback',
                description: '刷新积分余额',
                execute: async () => {
                    await refreshCredits();
                },
                canExecute: !!user,
                priority: 2
            });
        }

        // Cache fallback action
        actions.push({
            id: 'use-cache',
            type: 'cache',
            description: '使用缓存数据',
            execute: async () => {
                await useCachedData(context);
            },
            canExecute: hasCachedData(context),
            priority: 3
        });

        // Offline mode action
        if (error.message.includes('network') || !navigator.onLine) {
            actions.push({
                id: 'offline-mode',
                type: 'offline',
                description: '切换到离线模式',
                execute: async () => {
                    await enableOfflineMode(context);
                },
                canExecute: true,
                priority: 4
            });
        }

        // Manual intervention action
        actions.push({
            id: 'manual-intervention',
            type: 'manual',
            description: '需要手动处理',
            execute: async () => {
                await requestManualIntervention(context, error);
            },
            canExecute: true,
            priority: 5
        });

        return actions.sort((a, b) => a.priority - b.priority);
    }, [user, refreshAuth, refreshCredits]);

    // Start error recovery
    const startRecovery = useCallback((
        error: Error,
        context: string,
        recoveryData?: any
    ): string => {
        const recoveryId = `recovery-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        const recoveryState: ErrorRecoveryState = {
            id: recoveryId,
            error,
            context,
            timestamp: new Date(),
            attempts: 0,
            maxAttempts: maxRecoveryAttempts,
            status: 'pending',
            actions: createRecoveryActions(error, context),
            recoveryData
        };

        setRecoveryStates(prev => [...prev, recoveryState]);

        // Update stats
        setRecoveryStats(prev => ({
            ...prev,
            totalErrors: prev.totalErrors + 1
        }));

        // Set recovery timeout
        const timeoutId = setTimeout(() => {
            abandonRecovery(recoveryId, 'timeout');
        }, recoveryTimeout);

        timeoutRefs.current.set(recoveryId, timeoutId);

        // Start auto recovery if enabled
        if (enableAutoRecovery) {
            setTimeout(() => {
                executeAutoRecovery(recoveryId);
            }, autoRecoveryDelay);
        }

        // Show recovery notification
        toast.warning(
            '检测到错误',
            `正在尝试恢复: ${context}`,
            [
                {
                    label: '查看详情',
                    action: () => showRecoveryDetails(recoveryId)
                },
                {
                    label: '手动恢复',
                    action: () => showRecoveryOptions(recoveryId)
                }
            ]
        );

        return recoveryId;
    }, [maxRecoveryAttempts, recoveryTimeout, enableAutoRecovery, autoRecoveryDelay, createRecoveryActions, toast]);

    // Execute auto recovery
    const executeAutoRecovery = useCallback(async (recoveryId: string) => {
        const state = recoveryStates.find(s => s.id === recoveryId);
        if (!state || state.status !== 'pending') return;

        // Find the best recovery action
        const bestAction = state.actions.find(action => action.canExecute);
        if (!bestAction) {
            abandonRecovery(recoveryId, 'no-viable-actions');
            return;
        }

        await executeRecoveryAction(recoveryId, bestAction.id);
    }, [recoveryStates]);

    // Execute recovery action
    const executeRecoveryAction = useCallback(async (
        recoveryId: string,
        actionId: string
    ) => {
        const state = recoveryStates.find(s => s.id === recoveryId);
        if (!state) return;

        const action = state.actions.find(a => a.id === actionId);
        if (!action || !action.canExecute) return;

        // Update state to in-progress
        setRecoveryStates(prev => prev.map(s =>
            s.id === recoveryId
                ? {
                    ...s,
                    status: 'in-progress',
                    strategy: action.type,
                    attempts: s.attempts + 1,
                    lastAttempt: new Date()
                }
                : s
        ));

        setIsRecovering(true);

        try {
            // Create abort controller for this recovery
            const abortController = new AbortController();
            abortControllers.current.set(recoveryId, abortController);

            // Execute recovery action
            await action.execute();

            // Mark as recovered
            setRecoveryStates(prev => prev.map(s =>
                s.id === recoveryId
                    ? { ...s, status: 'recovered' }
                    : s
            ));

            // Update stats
            setRecoveryStats(prev => ({
                ...prev,
                recoveredErrors: prev.recoveredErrors + 1
            }));

            // Clear timeout
            const timeoutId = timeoutRefs.current.get(recoveryId);
            if (timeoutId) {
                clearTimeout(timeoutId);
                timeoutRefs.current.delete(recoveryId);
            }

            // Show success notification
            toast.success(
                '错误已恢复',
                `${state.context} 已成功恢复`
            );

            if (onRecoverySuccess) {
                onRecoverySuccess(state);
            }

        } catch (recoveryError) {
            console.error(`Recovery action ${actionId} failed:`, recoveryError);

            const shouldRetry = state.attempts < state.maxAttempts;

            if (shouldRetry) {
                // Mark as pending for retry
                setRecoveryStates(prev => prev.map(s =>
                    s.id === recoveryId
                        ? { ...s, status: 'pending' }
                        : s
                ));

                // Retry with next action or same action after delay
                setTimeout(() => {
                    const nextAction = state.actions.find(a =>
                        a.id !== actionId && a.canExecute
                    ) || action;

                    executeRecoveryAction(recoveryId, nextAction.id);
                }, 2000);
            } else {
                // Mark as failed
                setRecoveryStates(prev => prev.map(s =>
                    s.id === recoveryId
                        ? { ...s, status: 'failed' }
                        : s
                ));

                // Update stats
                setRecoveryStats(prev => ({
                    ...prev,
                    failedRecoveries: prev.failedRecoveries + 1
                }));

                toast.error(
                    '恢复失败',
                    `${state.context} 恢复失败，请手动处理`
                );

                if (onRecoveryFailure) {
                    onRecoveryFailure(state);
                }
            }
        } finally {
            setIsRecovering(false);
            abortControllers.current.delete(recoveryId);
        }
    }, [recoveryStates, maxRecoveryAttempts, toast, onRecoverySuccess, onRecoveryFailure]);

    // Abandon recovery
    const abandonRecovery = useCallback((recoveryId: string, reason: string) => {
        setRecoveryStates(prev => prev.map(s =>
            s.id === recoveryId
                ? { ...s, status: 'abandoned' }
                : s
        ));

        // Update stats
        setRecoveryStats(prev => ({
            ...prev,
            abandonedRecoveries: prev.abandonedRecoveries + 1
        }));

        // Clear timeout
        const timeoutId = timeoutRefs.current.get(recoveryId);
        if (timeoutId) {
            clearTimeout(timeoutId);
            timeoutRefs.current.delete(recoveryId);
        }

        // Abort any ongoing recovery
        const abortController = abortControllers.current.get(recoveryId);
        if (abortController) {
            abortController.abort();
            abortControllers.current.delete(recoveryId);
        }

        const state = recoveryStates.find(s => s.id === recoveryId);
        if (state && onRecoveryAbandoned) {
            onRecoveryAbandoned(state);
        }

        toast.info(
            '恢复已放弃',
            `${reason === 'timeout' ? '恢复超时' : '恢复已取消'}`
        );
    }, [recoveryStates, onRecoveryAbandoned, toast]);

    // Recovery operation implementations
    const retryOperation = useCallback(async (context: string) => {
        // Implementation depends on context
        console.log('Retrying operation:', context);

        // Simulate retry
        await new Promise(resolve => setTimeout(resolve, 1000));

        // For demo purposes, randomly succeed or fail
        if (Math.random() > 0.3) {
            throw new Error('Retry failed');
        }
    }, []);

    const useCachedData = useCallback(async (context: string) => {
        console.log('Using cached data for:', context);

        // Implementation would load cached data
        const cachedData = localStorage.getItem(`cache-${context}`);
        if (!cachedData) {
            throw new Error('No cached data available');
        }

        return JSON.parse(cachedData);
    }, []);

    const hasCachedData = useCallback((context: string): boolean => {
        return !!localStorage.getItem(`cache-${context}`);
    }, []);

    const enableOfflineMode = useCallback(async (context: string) => {
        console.log('Enabling offline mode for:', context);

        // Implementation would enable offline functionality
        localStorage.setItem('offlineMode', 'true');

        toast.info(
            '离线模式已启用',
            '部分功能将在网络恢复后同步'
        );
    }, [toast]);

    const requestManualIntervention = useCallback(async (context: string, error: Error) => {
        console.log('Requesting manual intervention for:', context, error);

        // Implementation would notify support or show manual recovery UI
        const subject = encodeURIComponent('系统错误需要手动处理');
        const body = encodeURIComponent(`
错误详情：
上下文：${context}
错误信息：${error.message}
时间：${new Date().toLocaleString()}
用户ID：${user?.id || '未登录'}

请协助处理此错误。
        `.trim());

        window.open(`mailto:support@example.com?subject=${subject}&body=${body}`);
    }, [user]);

    // Show recovery details
    const showRecoveryDetails = useCallback((recoveryId: string) => {
        const state = recoveryStates.find(s => s.id === recoveryId);
        if (!state) return;

        toast.info(
            '恢复详情',
            `错误: ${state.error.message}\n上下文: ${state.context}\n尝试次数: ${state.attempts}/${state.maxAttempts}`,
            [
                {
                    label: '重试',
                    action: () => {
                        const bestAction = state.actions.find(a => a.canExecute);
                        if (bestAction) {
                            executeRecoveryAction(recoveryId, bestAction.id);
                        }
                    }
                },
                {
                    label: '放弃',
                    action: () => abandonRecovery(recoveryId, 'user-cancelled')
                }
            ]
        );
    }, [recoveryStates, toast, executeRecoveryAction, abandonRecovery]);

    // Show recovery options
    const showRecoveryOptions = useCallback((recoveryId: string) => {
        const state = recoveryStates.find(s => s.id === recoveryId);
        if (!state) return;

        const availableActions = state.actions.filter(a => a.canExecute);

        toast.info(
            '选择恢复方式',
            `可用的恢复选项: ${availableActions.map(a => a.description).join(', ')}`,
            availableActions.map(action => ({
                label: action.description,
                action: () => executeRecoveryAction(recoveryId, action.id)
            }))
        );
    }, [recoveryStates, toast, executeRecoveryAction]);

    // Clear completed recoveries
    const clearCompletedRecoveries = useCallback(() => {
        setRecoveryStates(prev => prev.filter(s =>
            s.status !== 'recovered' && s.status !== 'failed' && s.status !== 'abandoned'
        ));
    }, []);

    // Get recovery status
    const getRecoveryStatus = useCallback(() => {
        const pending = recoveryStates.filter(s => s.status === 'pending').length;
        const inProgress = recoveryStates.filter(s => s.status === 'in-progress').length;
        const recovered = recoveryStates.filter(s => s.status === 'recovered').length;
        const failed = recoveryStates.filter(s => s.status === 'failed').length;
        const abandoned = recoveryStates.filter(s => s.status === 'abandoned').length;

        return {
            pending,
            inProgress,
            recovered,
            failed,
            abandoned,
            total: recoveryStates.length,
            isRecovering,
            stats: recoveryStats
        };
    }, [recoveryStates, isRecovering, recoveryStats]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            // Clear all timeouts
            timeoutRefs.current.forEach(timeout => clearTimeout(timeout));
            timeoutRefs.current.clear();

            // Abort all ongoing recoveries
            abortControllers.current.forEach(controller => controller.abort());
            abortControllers.current.clear();
        };
    }, []);

    return {
        // State
        recoveryStates,
        isRecovering,
        recoveryStats,

        // Methods
        startRecovery,
        executeRecoveryAction,
        abandonRecovery,
        clearCompletedRecoveries,
        getRecoveryStatus,
        showRecoveryDetails,
        showRecoveryOptions,

        // Utilities
        hasPendingRecoveries: recoveryStates.some(s => s.status === 'pending'),
        hasActiveRecoveries: recoveryStates.some(s => s.status === 'in-progress'),
        hasFailedRecoveries: recoveryStates.some(s => s.status === 'failed')
    };
}

// Hook for using error recovery manager
export function useErrorRecoveryManager(options: ErrorRecoveryManagerProps = {}) {
    return ErrorRecoveryManager(options);
}

// Utility function to determine if error is recoverable
export function isRecoverableError(error: Error): boolean {
    const message = error.message.toLowerCase();

    // Non-recoverable errors
    const nonRecoverablePatterns = [
        'invalid credentials',
        'access denied',
        'forbidden',
        'not found',
        'invalid request'
    ];

    return !nonRecoverablePatterns.some(pattern => message.includes(pattern));
}

// Utility function to get recovery priority
export function getRecoveryPriority(error: Error, context: string): number {
    if (context.includes('payment') || context.includes('critical')) {
        return 1; // High priority
    } else if (context.includes('credit') || context.includes('auth')) {
        return 2; // Medium priority
    } else {
        return 3; // Low priority
    }
}