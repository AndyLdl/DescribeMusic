/**
 * Custom React hook for subscription status detection and management
 * Implements loading, error, and success states with automatic retry logic
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { subscriptionManager } from '../services/lemonsqueezyService';
import { useAuth } from '../contexts/AuthContext';

// Subscription status types
export interface SubscriptionStatus {
    isActive: boolean;
    status: 'active' | 'cancelled' | 'expired' | 'past_due' | 'on_trial' | 'not_found' | 'error';
    subscription?: {
        id: string;
        status: string;
        planName: string;
        variantName: string;
        userEmail: string;
        renewsAt: Date;
        endsAt?: Date;
        cancelled: boolean;
        trialEndsAt?: Date;
        urls: {
            customer_portal: string;
            update_payment_method: string;
        };
        cardBrand?: string;
        cardLastFour?: string;
    };
    error?: string;
}

// Hook state interface
interface UseSubscriptionStatusState {
    subscriptionStatus: SubscriptionStatus | null;
    loading: boolean;
    error: string | null;
    retryCount: number;
}

// Hook return interface
interface UseSubscriptionStatusReturn extends UseSubscriptionStatusState {
    refetch: () => Promise<void>;
    retry: () => Promise<void>;
    clearError: () => void;
}

// Configuration options
interface UseSubscriptionStatusOptions {
    subscriptionId?: string;
    autoFetch?: boolean;
    retryAttempts?: number;
    retryDelay?: number;
    onSuccess?: (status: SubscriptionStatus) => void;
    onError?: (error: string) => void;
}

/**
 * Custom hook for managing subscription status
 */
export function useSubscriptionStatus(options: UseSubscriptionStatusOptions = {}): UseSubscriptionStatusReturn {
    const {
        subscriptionId,
        autoFetch = true,
        retryAttempts = 3,
        retryDelay = 1000,
        onSuccess,
        onError
    } = options;

    const { user, loading: authLoading } = useAuth();

    // State management
    const [state, setState] = useState<UseSubscriptionStatusState>({
        subscriptionStatus: null,
        loading: false,
        error: null,
        retryCount: 0
    });

    // Refs for cleanup and retry logic
    const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);
    const isMountedRef = useRef(true);

    // Clear any pending timeouts on unmount
    useEffect(() => {
        return () => {
            isMountedRef.current = false;
            if (retryTimeoutRef.current) {
                clearTimeout(retryTimeoutRef.current);
            }
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, []);

    // Fetch subscription status
    const fetchSubscriptionStatus = useCallback(async (isRetry = false): Promise<void> => {
        // Don't fetch if user is not authenticated or still loading auth
        if (!user || authLoading) {
            setState(prev => ({
                ...prev,
                subscriptionStatus: {
                    isActive: false,
                    status: 'not_found'
                },
                loading: false,
                error: null
            }));
            return;
        }

        // Use provided subscriptionId or try to get from user metadata
        const subId = subscriptionId || user.app_metadata?.subscription_id;

        if (!subId) {
            setState(prev => ({
                ...prev,
                subscriptionStatus: {
                    isActive: false,
                    status: 'not_found'
                },
                loading: false,
                error: null
            }));
            return;
        }

        // Abort any previous request
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        abortControllerRef.current = new AbortController();

        setState(prev => ({
            ...prev,
            loading: true,
            error: null,
            retryCount: isRetry ? prev.retryCount + 1 : 0
        }));

        try {
            console.log('🔄 Fetching subscription status for ID:', subId);

            const statusResult = await subscriptionManager.getUserSubscriptionStatus(subId);

            // Check if component is still mounted
            if (!isMountedRef.current) return;

            const subscriptionStatus: SubscriptionStatus = {
                isActive: statusResult.isActive,
                status: statusResult.status as SubscriptionStatus['status'],
                subscription: statusResult.subscription ? {
                    id: statusResult.subscription.id,
                    status: statusResult.subscription.status,
                    planName: statusResult.subscription.variantName,
                    variantName: statusResult.subscription.variantName,
                    userEmail: statusResult.subscription.userEmail,
                    renewsAt: statusResult.subscription.renewsAt,
                    endsAt: statusResult.subscription.endsAt || undefined,
                    cancelled: statusResult.subscription.cancelled,
                    trialEndsAt: statusResult.subscription.trialEndsAt || undefined,
                    urls: statusResult.subscription.urls,
                    cardBrand: statusResult.subscription.cardBrand,
                    cardLastFour: statusResult.subscription.cardLastFour
                } : undefined,
                error: statusResult.error
            };

            setState(prev => ({
                ...prev,
                subscriptionStatus,
                loading: false,
                error: statusResult.error || null,
                retryCount: 0
            }));

            // Call success callback
            if (onSuccess && !statusResult.error) {
                onSuccess(subscriptionStatus);
            }

            // Call error callback if there's an error
            if (onError && statusResult.error) {
                onError(statusResult.error);
            }

            console.log('✅ Subscription status fetched successfully:', subscriptionStatus);

        } catch (error) {
            // Check if component is still mounted and request wasn't aborted
            if (!isMountedRef.current || abortControllerRef.current?.signal.aborted) return;

            const errorMessage = error instanceof Error ? error.message : 'Failed to fetch subscription status';

            console.error('❌ Error fetching subscription status:', error);

            setState(prev => ({
                ...prev,
                subscriptionStatus: {
                    isActive: false,
                    status: 'error',
                    error: errorMessage
                },
                loading: false,
                error: errorMessage
            }));

            // Call error callback
            if (onError) {
                onError(errorMessage);
            }

            // Attempt automatic retry if within retry limits
            if (state.retryCount < retryAttempts && !isRetry) {
                console.log(`🔄 Scheduling retry ${state.retryCount + 1}/${retryAttempts} in ${retryDelay}ms`);

                retryTimeoutRef.current = setTimeout(() => {
                    if (isMountedRef.current) {
                        fetchSubscriptionStatus(true);
                    }
                }, retryDelay * Math.pow(2, state.retryCount)); // Exponential backoff
            }
        }
    }, [user, authLoading, subscriptionId, state.retryCount, retryAttempts, retryDelay, onSuccess, onError]);

    // Auto-fetch on mount and when dependencies change
    useEffect(() => {
        if (autoFetch && !authLoading) {
            fetchSubscriptionStatus();
        }
    }, [autoFetch, authLoading, fetchSubscriptionStatus]);

    // Manual refetch function
    const refetch = useCallback(async (): Promise<void> => {
        setState(prev => ({ ...prev, retryCount: 0 }));
        await fetchSubscriptionStatus();
    }, [fetchSubscriptionStatus]);

    // Manual retry function
    const retry = useCallback(async (): Promise<void> => {
        await fetchSubscriptionStatus(true);
    }, [fetchSubscriptionStatus]);

    // Clear error function
    const clearError = useCallback((): void => {
        setState(prev => ({
            ...prev,
            error: null
        }));
    }, []);

    return {
        subscriptionStatus: state.subscriptionStatus,
        loading: state.loading,
        error: state.error,
        retryCount: state.retryCount,
        refetch,
        retry,
        clearError
    };
}

// Helper hook for checking if user has active subscription
export function useHasActiveSubscription(subscriptionId?: string): {
    hasActiveSubscription: boolean;
    loading: boolean;
    error: string | null;
} {
    const { subscriptionStatus, loading, error } = useSubscriptionStatus({
        subscriptionId,
        autoFetch: true
    });

    return {
        hasActiveSubscription: subscriptionStatus?.isActive || false,
        loading,
        error
    };
}

// Helper hook for getting subscription renewal info
export function useSubscriptionRenewal(subscriptionId?: string): {
    needsRenewalReminder: boolean;
    daysUntilRenewal: number | null;
    renewalDate: Date | null;
    loading: boolean;
    error: string | null;
} {
    const { subscriptionStatus, loading, error } = useSubscriptionStatus({
        subscriptionId,
        autoFetch: true
    });

    const needsRenewalReminder = subscriptionStatus?.subscription ? (() => {
        const renewalDate = subscriptionStatus.subscription.renewsAt;
        const now = new Date();
        const daysUntilRenewal = Math.ceil((renewalDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return daysUntilRenewal <= 7 && daysUntilRenewal > 0 && subscriptionStatus.isActive;
    })() : false;

    const daysUntilRenewal = subscriptionStatus?.subscription ? (() => {
        const renewalDate = subscriptionStatus.subscription.renewsAt;
        const now = new Date();
        return Math.ceil((renewalDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    })() : null;

    const renewalDate = subscriptionStatus?.subscription?.renewsAt || null;

    return {
        needsRenewalReminder,
        daysUntilRenewal,
        renewalDate,
        loading,
        error
    };
}

export default useSubscriptionStatus;