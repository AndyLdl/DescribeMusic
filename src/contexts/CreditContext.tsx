/**
 * Credit Context and Provider
 * Manages credit system state, operations, and integration with Supabase
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { DeviceFingerprint } from '../utils/deviceFingerprint';
import { CreditCalculator, type CreditBalance, type CreditConsumptionEstimate } from '../utils/creditCalculator';
import type { User } from '../lib/supabase';

// Subscription interface
export interface Subscription {
    id: string;
    status: 'active' | 'cancelled' | 'expired' | 'past_due';
    planId: string;
    planName: string;
    credits: number;
    currentPeriodStart: Date;
    currentPeriodEnd: Date;
    cancelAtPeriodEnd: boolean;
}

// Credit Context type definition
interface CreditContextType {
    // Credit state
    credits: number;
    creditBalance: CreditBalance | null;
    loading: boolean;
    error: string | null;

    // Subscription state
    subscription: Subscription | null;

    // Credit methods
    checkCredits: () => Promise<number>;
    consumeCredits: (amount: number, description: string, analysisId?: string) => Promise<void>;
    addCredits: (amount: number, source: string, description?: string) => Promise<void>;
    refundCredits: (amount: number, reason: string, originalAnalysisId?: string) => Promise<void>;
    refreshCredits: () => Promise<void>;

    // Credit calculation methods
    calculateCreditsForDuration: (durationSeconds: number) => number;
    estimateConsumption: (durationSeconds: number) => CreditConsumptionEstimate;

    // Trial credit methods (for non-authenticated users)
    checkTrialCredits: (requiredCredits?: number) => Promise<boolean>;
    consumeTrialCredits: (amount: number, description: string, analysisId?: string) => Promise<void>;
    refundTrialCredits: (amount: number, reason: string, originalAnalysisId?: string) => Promise<void>;
    getTrialCreditBalance: () => Promise<{ total: number; used: number; remaining: number; }>;
    migrateTrialCreditsToUser: () => Promise<void>;

    // Subscription methods (placeholder for future implementation)
    getSubscriptionStatus: () => Promise<Subscription | null>;
}

// Create Context
const CreditContext = createContext<CreditContextType | undefined>(undefined);

// Provider component props
interface CreditProviderProps {
    children: React.ReactNode;
}

// Credit Provider component
export function CreditProvider({ children }: CreditProviderProps) {
    console.log('💳 CreditProvider component rendered');

    // Get auth context
    const { user, loading: authLoading } = useAuth();

    // State management
    const [credits, setCredits] = useState<number>(0);
    const [creditBalance, setCreditBalance] = useState<CreditBalance | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [subscription, setSubscription] = useState<Subscription | null>(null);

    // Check credits for authenticated users
    const checkCredits = useCallback(async (): Promise<number> => {
        if (!user) {
            return 0;
        }

        try {
            console.log('💳 Checking credits for user:', user.email);
            setError(null); // Clear any previous errors

            // Call the database function to get user credit details
            const { data, error } = await supabase.rpc('get_user_credit_details', {
                user_uuid: user.id
            });

            if (error) {
                console.error('💳 Error checking credits:', error);

                // If user doesn't exist, try to create default record
                if (error.code === 'PGRST116' || error.message?.includes('no rows')) {
                    console.log('💳 No credit record found, creating default...');
                    await createDefaultCreditRecord(user);
                    return 200; // Default credits for new users
                }

                throw error;
            }

            const result = data?.[0];
            if (result) {
                const totalCredits = result.total_credits || 0;
                const balance: CreditBalance = {
                    total: totalCredits,
                    trial: result.trial_credits || 0,
                    monthly: result.monthly_credits || 0,
                    purchased: result.purchased_credits || 0
                };

                setCredits(totalCredits);
                setCreditBalance(balance);

                // Update subscription info if available
                if (result.subscription_status && result.subscription_expires_at) {
                    setSubscription({
                        id: 'current', // Placeholder
                        status: result.subscription_status as any,
                        planId: 'unknown',
                        planName: 'Current Plan',
                        credits: 0, // Will be updated when we have plan details
                        currentPeriodStart: new Date(),
                        currentPeriodEnd: new Date(result.subscription_expires_at),
                        cancelAtPeriodEnd: false
                    });
                } else {
                    setSubscription(null);
                }

                console.log('💳 Credits updated:', totalCredits, balance);
                return totalCredits;
            } else {
                // User doesn't have credit record yet, create one
                console.log('💳 No credit record found, creating default...');
                await createDefaultCreditRecord(user);
                return 200; // Default credits for new users
            }
        } catch (error) {
            console.error('💳 Error in checkCredits:', error);
            setError('Failed to check credits');
            return 0;
        }
    }, [user]);

    // Create default credit record for new users
    const createDefaultCreditRecord = useCallback(async (user: User): Promise<void> => {
        try {
            console.log('💳 Creating default credit record for user:', user.email);

            const { error } = await supabase.rpc('add_credits', {
                user_uuid: user.id,
                credits_amount: 200,
                credit_source: 'monthly_grant',
                description: 'Initial monthly credit grant for new user'
            });

            if (error) {
                console.error('💳 Error creating default credit record:', error);
                throw error;
            }

            // Update local state
            setCredits(200);
            setCreditBalance({
                total: 200,
                trial: 0,
                monthly: 200,
                purchased: 0
            });

            console.log('💳 Default credit record created successfully');
        } catch (error) {
            console.error('💳 Error in createDefaultCreditRecord:', error);
            throw error;
        }
    }, []);

    // Consume credits for authenticated users
    const consumeCredits = useCallback(async (
        amount: number,
        description: string,
        analysisId?: string
    ): Promise<void> => {
        if (!user) {
            throw new Error('User not authenticated');
        }

        // Validate amount
        if (amount <= 0) {
            throw new Error('Credit amount must be positive');
        }

        // Check if user has sufficient credits before attempting consumption
        if (credits < amount) {
            throw new Error(`Insufficient credits. Required: ${amount}, Available: ${credits}`);
        }

        try {
            console.log('💳 Consuming credits:', amount, 'for:', description);
            setError(null); // Clear any previous errors

            const { data, error } = await supabase.rpc('consume_credits', {
                user_uuid: user.id,
                credits_amount: amount,
                analysis_description: description,
                analysis_id: analysisId || null
            });

            if (error) {
                console.error('💳 Error consuming credits:', error);
                throw new Error(`Failed to consume credits: ${error.message}`);
            }

            if (!data) {
                throw new Error('Insufficient credits or consumption failed');
            }

            // Refresh credits after consumption
            await checkCredits();
            console.log('💳 Credits consumed successfully');
        } catch (error) {
            console.error('💳 Error in consumeCredits:', error);
            setError(error instanceof Error ? error.message : 'Failed to consume credits');
            throw error;
        }
    }, [user, credits, checkCredits]);

    // Add credits for authenticated users
    const addCredits = useCallback(async (
        amount: number,
        source: string,
        description?: string
    ): Promise<void> => {
        if (!user) {
            throw new Error('User not authenticated');
        }

        // Validate amount
        if (amount <= 0) {
            throw new Error('Credit amount must be positive');
        }

        // Validate source
        const validSources = ['purchase', 'monthly_grant', 'trial_grant', 'refund', 'bonus'];
        if (!validSources.includes(source)) {
            throw new Error(`Invalid credit source: ${source}`);
        }

        try {
            console.log('💳 Adding credits:', amount, 'from:', source);
            setError(null); // Clear any previous errors

            const { data, error } = await supabase.rpc('add_credits', {
                user_uuid: user.id,
                credits_amount: amount,
                credit_source: source,
                description: description || null
            });

            if (error) {
                console.error('💳 Error adding credits:', error);
                throw new Error(`Failed to add credits: ${error.message}`);
            }

            if (!data) {
                throw new Error('Failed to add credits - database operation returned false');
            }

            // Refresh credits after addition
            await checkCredits();
            console.log('💳 Credits added successfully');
        } catch (error) {
            console.error('💳 Error in addCredits:', error);
            setError(error instanceof Error ? error.message : 'Failed to add credits');
            throw error;
        }
    }, [user, checkCredits]);

    // Refund credits for failed analyses
    const refundCredits = useCallback(async (
        amount: number,
        reason: string,
        originalAnalysisId?: string
    ): Promise<void> => {
        if (!user) {
            throw new Error('User not authenticated');
        }

        // Validate amount
        if (amount <= 0) {
            throw new Error('Refund amount must be positive');
        }

        try {
            console.log('💳 Refunding credits:', amount, 'reason:', reason);
            setError(null); // Clear any previous errors

            const { data, error } = await supabase.rpc('refund_credits', {
                user_uuid: user.id,
                credits_amount: amount,
                refund_reason: reason,
                original_analysis_id: originalAnalysisId || null
            });

            if (error) {
                console.error('💳 Error refunding credits:', error);
                throw new Error(`Failed to refund credits: ${error.message}`);
            }

            if (!data) {
                throw new Error('Failed to refund credits - database operation returned false');
            }

            // Refresh credits after refund
            await checkCredits();
            console.log('💳 Credits refunded successfully');
        } catch (error) {
            console.error('💳 Error in refundCredits:', error);
            setError(error instanceof Error ? error.message : 'Failed to refund credits');
            throw error;
        }
    }, [user, checkCredits]);

    // Refresh credits
    const refreshCredits = useCallback(async (): Promise<void> => {
        try {
            setLoading(true);
            setError(null);

            if (user) {
                await checkCredits();
            } else {
                // For non-authenticated users, we don't store credits in state
                // They will be checked on-demand via trial credit functions
                setCredits(0);
                setCreditBalance(null);
                setSubscription(null);
            }
        } catch (error) {
            console.error('💳 Error refreshing credits:', error);
            setError('Failed to refresh credits');
        } finally {
            setLoading(false);
        }
    }, [user, checkCredits]);

    // Credit calculation methods (using CreditCalculator utility)
    const calculateCreditsForDuration = useCallback((durationSeconds: number): number => {
        return CreditCalculator.calculateCreditsForDuration(durationSeconds);
    }, []);

    const estimateConsumption = useCallback((durationSeconds: number): CreditConsumptionEstimate => {
        return CreditCalculator.estimateConsumption(durationSeconds, credits);
    }, [credits]);

    // Check trial credits for non-authenticated users
    const checkTrialCredits = useCallback(async (requiredCredits: number = 1): Promise<boolean> => {
        try {
            console.log('💳 Checking trial credits, required:', requiredCredits);

            // Validate required credits
            if (requiredCredits <= 0) {
                return true;
            }

            const fingerprint = await DeviceFingerprint.generate();
            const { data, error } = await supabase.rpc('check_trial_credits', {
                fingerprint_hash_param: fingerprint,
                required_credits: requiredCredits
            });

            if (error) {
                console.error('💳 Error checking trial credits:', error);
                // For new devices, assume they have 100 trial credits
                return requiredCredits <= 100;
            }

            const canUse = data === true;
            console.log('💳 Trial credits check result:', canUse);
            return canUse;
        } catch (error) {
            console.error('💳 Error in checkTrialCredits:', error);
            // For new devices, assume they have 100 trial credits
            return requiredCredits <= 100;
        }
    }, []);

    // Consume trial credits for non-authenticated users
    const consumeTrialCredits = useCallback(async (
        amount: number,
        description: string,
        analysisId?: string
    ): Promise<void> => {
        // Validate amount
        if (amount <= 0) {
            throw new Error('Credit amount must be positive');
        }

        try {
            console.log('💳 Consuming trial credits:', amount, 'for:', description);

            // Check if user has sufficient trial credits first
            const hasEnoughCredits = await checkTrialCredits(amount);
            if (!hasEnoughCredits) {
                throw new Error(`Insufficient trial credits. Required: ${amount} credits`);
            }

            const fingerprint = await DeviceFingerprint.generate();
            const { data, error } = await supabase.rpc('consume_trial_credits', {
                fingerprint_hash_param: fingerprint,
                credits_amount: amount,
                analysis_description: description,
                analysis_id: analysisId || null
            });

            if (error) {
                console.error('💳 Error consuming trial credits:', error);
                throw new Error(`Failed to consume trial credits: ${error.message}`);
            }

            if (!data) {
                throw new Error('Insufficient trial credits or consumption failed');
            }

            console.log('💳 Trial credits consumed successfully');
        } catch (error) {
            console.error('💳 Error in consumeTrialCredits:', error);
            throw error;
        }
    }, [checkTrialCredits]);

    // Refund trial credits for failed analyses
    const refundTrialCredits = useCallback(async (
        amount: number,
        reason: string,
        originalAnalysisId?: string
    ): Promise<void> => {
        // Validate amount
        if (amount <= 0) {
            throw new Error('Refund amount must be positive');
        }

        try {
            console.log('💳 Refunding trial credits:', amount, 'reason:', reason);

            const fingerprint = await DeviceFingerprint.generate();
            const { data, error } = await supabase.rpc('refund_trial_credits', {
                fingerprint_hash_param: fingerprint,
                credits_amount: amount,
                refund_reason: reason,
                original_analysis_id: originalAnalysisId || null
            });

            if (error) {
                console.error('💳 Error refunding trial credits:', error);
                throw new Error(`Failed to refund trial credits: ${error.message}`);
            }

            if (!data) {
                throw new Error('Failed to refund trial credits - database operation returned false');
            }

            console.log('💳 Trial credits refunded successfully');
        } catch (error) {
            console.error('💳 Error in refundTrialCredits:', error);
            throw error;
        }
    }, []);

    // Get trial credit balance for non-authenticated users
    const getTrialCreditBalance = useCallback(async (): Promise<{
        total: number;
        used: number;
        remaining: number;
    }> => {
        try {
            console.log('💳 Getting trial credit balance from database');

            const fingerprint = await DeviceFingerprint.generate();

            // 从数据库查询真实的设备积分状态
            const { data, error } = await supabase
                .from('device_fingerprints')
                .select('trial_credits, credits_used')
                .eq('fingerprint_hash', fingerprint)
                .is('deleted_at', null)  // ✅ 修复：使用 .is() 而不是 .eq() 来检查 NULL
                .is('user_id', null)
                .single();

            if (error) {
                // 如果记录不存在（PGRST116错误），说明是新设备
                if (error.code === 'PGRST116') {
                    console.log('💳 New device, no record found yet. Showing default balance.');
                    return {
                        total: 100,
                        used: 0,
                        remaining: 100
                    };
                }
                throw error;
            }

            // 返回数据库中的真实余额
            const balance = {
                total: data.trial_credits || 100,
                used: data.credits_used || 0,
                remaining: (data.trial_credits || 100) - (data.credits_used || 0)
            };

            console.log('💳 Trial credit balance from database:', balance);
            return balance;
        } catch (error) {
            console.error('💳 Error getting trial credit balance:', error);
            // Return default values on error
            return {
                total: 100,
                used: 0,
                remaining: 100
            };
        }
    }, []);

    // Migrate trial credits to user account when user registers/logs in
    const migrateTrialCreditsToUser = useCallback(async (): Promise<void> => {
        if (!user) {
            return;
        }

        try {
            console.log('💳 Migrating trial credits to user account');

            const fingerprint = await DeviceFingerprint.generate();

            // Get current trial credit balance
            const trialBalance = await getTrialCreditBalance();

            // If user has remaining trial credits, add them to their account
            if (trialBalance.remaining > 0) {
                await addCredits(
                    trialBalance.remaining,
                    'trial_grant',
                    `Migrated ${trialBalance.remaining} trial credits from device fingerprint`
                );

                console.log('💳 Migrated', trialBalance.remaining, 'trial credits to user account');

                // 标记试用积分已使用，防止重复迁移
                const migrationKey = `trial_used_${fingerprint}`;
                localStorage.setItem(migrationKey, 'true');
            }

            // Associate device fingerprint with user (this will clear trial data)
            await DeviceFingerprint.associateWithUser(user.id, fingerprint);

            console.log('💳 Trial credit migration completed');
        } catch (error) {
            console.error('💳 Error migrating trial credits:', error);
            // Don't throw error as this is not critical for user experience
        }
    }, [user, getTrialCreditBalance, addCredits]);

    // Get subscription status (placeholder for future implementation)
    const getSubscriptionStatus = useCallback(async (): Promise<Subscription | null> => {
        // This will be implemented in task 4 (Lemonsqueezy integration)
        console.log('💳 getSubscriptionStatus - not implemented yet');
        return subscription;
    }, [subscription]);

    // Initialize credits when user changes - FIXED TO USE ACTUAL DATABASE DATA
    useEffect(() => {
        if (!authLoading) {
            console.log('💳 Credit initialization with database check');
            if (user) {
                // Actually check credits from database instead of hardcoding
                checkCredits().then(actualCredits => {
                    console.log('💳 Initialized with actual credits:', actualCredits);
                }).catch(error => {
                    console.error('💳 Failed to initialize credits:', error);
                    // Fallback to default values only if database check fails
                    setCredits(200);
                    setCreditBalance({
                        total: 200,
                        trial: 0,
                        monthly: 200,
                        purchased: 0
                    });
                }).finally(() => {
                    setLoading(false);
                });
            } else {
                setCredits(0);
                setCreditBalance(null);
                setSubscription(null);
                setLoading(false);
            }
        }
    }, [user?.id, authLoading, checkCredits]);

    // TEMPORARILY DISABLED - Migrate trial credits when user logs in (only once per user)
    // This was causing infinite loops, disabled for now
    /*
    useEffect(() => {
        if (user && !authLoading) {
            const migrationKey = `trial_migrated_${user.id}`;
            const alreadyMigrated = sessionStorage.getItem(migrationKey);

            if (!alreadyMigrated) {
                console.log('💳 First time login, migrating trial credits...');
                sessionStorage.setItem(migrationKey, 'true');

                migrateTrialCreditsToUser().catch(error => {
                    console.warn('💳 Trial credit migration failed (non-critical):', error);
                    sessionStorage.removeItem(migrationKey);
                });
            } else {
                console.log('💳 Trial credits already migrated for this user');
            }
        }
    }, [user?.id, authLoading]);
    */

    // Context value
    const value: CreditContextType = {
        // Credit state
        credits,
        creditBalance,
        loading,
        error,

        // Subscription state
        subscription,

        // Credit methods
        checkCredits,
        consumeCredits,
        addCredits,
        refundCredits,
        refreshCredits,

        // Credit calculation methods
        calculateCreditsForDuration,
        estimateConsumption,

        // Trial credit methods
        checkTrialCredits,
        consumeTrialCredits,
        refundTrialCredits,
        getTrialCreditBalance,
        migrateTrialCreditsToUser,

        // Subscription methods
        getSubscriptionStatus
    };

    return (
        <CreditContext.Provider value={value}>
            {children}
        </CreditContext.Provider>
    );
}

// Custom Hook to use Credit Context
export function useCredit(): CreditContextType {
    const context = useContext(CreditContext);

    if (context === undefined) {
        throw new Error('useCredit must be used within a CreditProvider');
    }

    return context;
}

// Custom Hook to check if user has sufficient credits
export function useCreditCheck(): {
    hasCredits: (requiredCredits: number) => boolean;
    canAfford: (durationSeconds: number) => boolean;
    getEstimate: (durationSeconds: number) => CreditConsumptionEstimate;
} {
    const { credits, calculateCreditsForDuration, estimateConsumption } = useCredit();

    return {
        hasCredits: (requiredCredits: number) => credits >= requiredCredits,
        canAfford: (durationSeconds: number) => {
            const required = calculateCreditsForDuration(durationSeconds);
            return credits >= required;
        },
        getEstimate: estimateConsumption
    };
}

// Custom Hook for trial users
export function useTrialCredit(): {
    checkTrialCredits: (requiredCredits?: number) => Promise<boolean>;
    consumeTrialCredits: (amount: number, description: string, analysisId?: string) => Promise<void>;
    refundTrialCredits: (amount: number, reason: string, originalAnalysisId?: string) => Promise<void>;
    getTrialCreditBalance: () => Promise<{ total: number; used: number; remaining: number; }>;
    calculateCreditsForDuration: (durationSeconds: number) => number;
} {
    const {
        checkTrialCredits,
        consumeTrialCredits,
        refundTrialCredits,
        getTrialCreditBalance,
        calculateCreditsForDuration
    } = useCredit();

    return {
        checkTrialCredits,
        consumeTrialCredits,
        refundTrialCredits,
        getTrialCreditBalance,
        calculateCreditsForDuration
    };
}

// Export Context (for testing)
export { CreditContext };