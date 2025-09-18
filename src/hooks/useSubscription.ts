/**
 * Subscription management hook
 * 用于管理用户订阅状态的自定义Hook
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { subscriptionManager } from '../services/lemonsqueezyService';
import { supabase } from '../lib/supabase';

export interface UserSubscription {
    id: string;
    status: 'active' | 'on_trial' | 'paused' | 'past_due' | 'unpaid' | 'cancelled' | 'expired';
    statusFormatted: string;
    productName: string;
    variantName: string;
    renewsAt: Date;
    endsAt: Date | null;
    cancelled: boolean;
    trialEndsAt: Date | null;
    urls: {
        update_payment_method: string;
        customer_portal: string;
    };
    cardBrand: string;
    cardLastFour: string;
    credits: number;
}

export interface SubscriptionState {
    subscription: UserSubscription | null;
    isActive: boolean;
    isLoading: boolean;
    error: string | null;
    canSubscribe: boolean;
    needsRenewal: boolean;
    daysUntilRenewal: number | null;
}

export function useSubscription() {
    const { user } = useAuth();
    const [state, setState] = useState<SubscriptionState>({
        subscription: null,
        isActive: false,
        isLoading: true,
        error: null,
        canSubscribe: true,
        needsRenewal: false,
        daysUntilRenewal: null
    });

    // 从数据库获取用户订阅信息
    const fetchUserSubscription = useCallback(async () => {
        if (!user) {
            setState(prev => ({
                ...prev,
                subscription: null,
                isActive: false,
                isLoading: false,
                canSubscribe: true,
                needsRenewal: false,
                daysUntilRenewal: null
            }));
            return;
        }

        try {
            setState(prev => ({ ...prev, isLoading: true, error: null }));

            // 从Supabase获取用户订阅信息
            const { data: subscription, error: subscriptionError } = await supabase
                .from('subscriptions')
                .select('*')
                .eq('user_id', user.id)
                .in('status', ['active', 'on_trial'])
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            if (subscriptionError && subscriptionError.code !== 'PGRST116') {
                console.log('No active subscription found:', subscriptionError.message);
                // 如果没有找到活跃订阅，不算错误
                setState(prev => ({
                    ...prev,
                    subscription: null,
                    isActive: false,
                    isLoading: false,
                    canSubscribe: true,
                    needsRenewal: false,
                    daysUntilRenewal: null
                }));
                return;
            }

            // 如果用户没有订阅记录
            if (!subscription) {
                console.log('No subscription found for user:', user.id);
                setState(prev => ({
                    ...prev,
                    subscription: null,
                    isActive: false,
                    isLoading: false,
                    canSubscribe: true,
                    needsRenewal: false,
                    daysUntilRenewal: null
                }));
                return;
            }

            console.log('Found subscription:', subscription);

            // 直接使用数据库中的订阅信息，构建UserSubscription对象
            const userSubscription: UserSubscription = {
                id: subscription.lemonsqueezy_subscription_id,
                status: subscription.status as any,
                statusFormatted: subscription.status,
                productName: subscription.plan_name || 'Unknown Plan',
                variantName: subscription.variant_name || subscription.plan_name || 'Unknown Variant',
                renewsAt: new Date(subscription.current_period_end || subscription.created_at),
                endsAt: subscription.ends_at ? new Date(subscription.ends_at) : null,
                cancelled: subscription.cancel_at_period_end || false,
                trialEndsAt: subscription.trial_ends_at ? new Date(subscription.trial_ends_at) : null,
                urls: {
                    update_payment_method: subscription.update_payment_method_url || '',
                    customer_portal: subscription.customer_portal_url || ''
                },
                cardBrand: subscription.card_brand || '',
                cardLastFour: subscription.card_last_four || '',
                credits: subscription.credits_per_month || 0
            };

            // 计算续费提醒
            const now = new Date();
            const renewalDate = userSubscription.renewsAt;
            const daysUntilRenewal = Math.ceil((renewalDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            const needsRenewal = daysUntilRenewal <= 7 && daysUntilRenewal > 0;

            const isActive = ['active', 'on_trial'].includes(subscription.status);

            setState(prev => ({
                ...prev,
                subscription: userSubscription,
                isActive,
                isLoading: false,
                canSubscribe: !isActive,
                needsRenewal,
                daysUntilRenewal: daysUntilRenewal > 0 ? daysUntilRenewal : null,
                error: null
            }));

        } catch (error) {
            console.error('Error fetching subscription:', error);
            setState(prev => ({
                ...prev,
                isLoading: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            }));
        }
    }, [user]);

    // 取消订阅
    const cancelSubscription = useCallback(async () => {
        if (!state.subscription || !user) {
            throw new Error('No active subscription to cancel');
        }

        try {
            console.log('🚫 Starting subscription cancellation for:', state.subscription.id);

            // 1. 首先调用Lemonsqueezy API取消订阅
            const result = await subscriptionManager.cancelUserSubscription(state.subscription.id);

            if (!result.success) {
                throw new Error(result.error || 'Failed to cancel subscription with Lemonsqueezy');
            }

            console.log('✅ Lemonsqueezy subscription cancelled successfully');

            // 2. 更新本地数据库状态
            const { error: dbError } = await supabase
                .from('subscriptions')
                .update({
                    status: 'cancelled',
                    cancel_at_period_end: true,
                    updated_at: new Date().toISOString()
                })
                .eq('user_id', user.id)
                .eq('lemonsqueezy_subscription_id', state.subscription.id);

            if (dbError) {
                console.warn('⚠️ Failed to update local database, but Lemonsqueezy cancellation succeeded:', dbError);
                // 不抛出错误，因为主要的取消操作已经成功
            } else {
                console.log('✅ Local database updated successfully');
            }

            // 3. 刷新订阅状态
            await fetchUserSubscription();

            return {
                success: true,
                subscription: {
                    id: state.subscription.id,
                    status: 'cancelled',
                    cancelled: true,
                    endsAt: state.subscription.renewsAt
                }
            };
        } catch (error) {
            console.error('❌ Error canceling subscription:', error);
            throw error;
        }
    }, [state.subscription, user, fetchUserSubscription]);

    // 获取客户门户URL
    const getCustomerPortalUrl = useCallback(async (): Promise<string | null> => {
        if (!state.subscription || !user) {
            return null;
        }

        try {
            console.log('🔗 Getting customer portal URL for subscription:', state.subscription.id);

            // 1. 首先尝试使用数据库中存储的URL（如果存在且未过期）
            if (state.subscription.urls.customer_portal) {
                console.log('✅ Using stored customer portal URL');
                return state.subscription.urls.customer_portal;
            }

            // 2. 从数据库获取Lemonsqueezy订阅ID
            const { data: subscription } = await supabase
                .from('subscriptions')
                .select('lemonsqueezy_subscription_id, customer_portal_url')
                .eq('user_id', user.id)
                .in('status', ['active', 'on_trial'])
                .single();

            if (!subscription?.lemonsqueezy_subscription_id) {
                console.warn('⚠️ No Lemonsqueezy subscription ID found');
                return `https://app.lemonsqueezy.com/my-orders`;
            }

            // 3. 从Lemonsqueezy API获取最新的订阅信息和客户门户URL
            try {
                const subscriptionData = await subscriptionManager.getUserSubscriptionStatus(
                    subscription.lemonsqueezy_subscription_id
                );

                if (subscriptionData.subscription?.urls?.customer_portal) {
                    console.log('✅ Got fresh customer portal URL from Lemonsqueezy API');

                    // 更新数据库中的URL
                    await supabase
                        .from('subscriptions')
                        .update({
                            customer_portal_url: subscriptionData.subscription.urls.customer_portal,
                            updated_at: new Date().toISOString()
                        })
                        .eq('user_id', user.id)
                        .eq('lemonsqueezy_subscription_id', subscription.lemonsqueezy_subscription_id);

                    return subscriptionData.subscription.urls.customer_portal;
                }
            } catch (apiError) {
                console.warn('⚠️ Failed to get URL from Lemonsqueezy API, using fallback:', apiError);
            }

            // 4. 如果数据库中有存储的URL，使用它
            if (subscription.customer_portal_url) {
                console.log('✅ Using database stored customer portal URL');
                return subscription.customer_portal_url;
            }

            // 5. 最后的回退选项
            console.log('⚠️ Using fallback customer portal URL');
            return `https://app.lemonsqueezy.com/my-orders`;

        } catch (error) {
            console.error('❌ Error getting customer portal URL:', error);
            return `https://app.lemonsqueezy.com/my-orders`;
        }
    }, [state.subscription, user]);

    // 同步订阅状态到本地数据库
    const syncSubscriptionStatus = useCallback(async () => {
        if (!user || !state.subscription) {
            return;
        }

        try {
            const result = await subscriptionManager.syncSubscriptionStatus(
                state.subscription.id,
                user.id
            );

            if (result.success && result.subscriptionData) {
                // 更新Supabase中的订阅信息
                const { error } = await supabase
                    .from('subscriptions')
                    .update({
                        status: result.subscriptionData.status,
                        plan_name: result.subscriptionData.plan_name,
                        current_period_start: result.subscriptionData.current_period_start?.toISOString(),
                        current_period_end: result.subscriptionData.current_period_end?.toISOString(),
                        cancel_at_period_end: result.subscriptionData.cancel_at_period_end,
                        updated_at: new Date().toISOString()
                    })
                    .eq('user_id', user.id)
                    .eq('lemonsqueezy_subscription_id', state.subscription.id);

                if (error) {
                    console.error('Error updating subscription in database:', error);
                }
            }
        } catch (error) {
            console.error('Error syncing subscription status:', error);
        }
    }, [user, state.subscription]);

    // 刷新订阅状态
    const refreshSubscription = useCallback(async () => {
        await fetchUserSubscription();
    }, [fetchUserSubscription]);

    // 初始化时获取订阅信息
    useEffect(() => {
        fetchUserSubscription();
    }, [fetchUserSubscription]);

    // 格式化订阅状态显示
    const formatStatus = useCallback((status: string): string => {
        return subscriptionManager.formatSubscriptionStatus(status);
    }, []);

    // 检查是否可以修改订阅
    const canModifySubscription = useCallback((status: string): boolean => {
        return subscriptionManager.canModifySubscription(status);
    }, []);

    return {
        ...state,
        cancelSubscription,
        getCustomerPortalUrl,
        syncSubscriptionStatus,
        refreshSubscription,
        formatStatus,
        canModifySubscription
    };
}