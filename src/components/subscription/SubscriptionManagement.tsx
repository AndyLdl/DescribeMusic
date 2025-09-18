/**
 * SubscriptionManagement Component
 * Handles subscription upgrades, downgrades, cancellation, and renewal management
 */

import React, { useState, useCallback } from 'react';
import { subscriptionManager, SUBSCRIPTION_PLANS, type PlanId, lemonsqueezyService } from '../../services/lemonsqueezyService';
import { useAuth } from '../../contexts/AuthContext';
import { useCredit } from '../../contexts/CreditContext';

interface SubscriptionManagementProps {
    subscriptionDetails: {
        id: string;
        status: 'active' | 'cancelled' | 'expired' | 'past_due' | 'on_trial';
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
    } | null;
    onSubscriptionUpdate: () => void;
}

interface PlanUpgradeOption {
    planId: PlanId;
    plan: typeof SUBSCRIPTION_PLANS[PlanId];
    isUpgrade: boolean;
    isDowngrade: boolean;
    isCurrent: boolean;
    creditsDifference: number;
    priceDifference: number;
}

export default function SubscriptionManagement({
    subscriptionDetails,
    onSubscriptionUpdate
}: SubscriptionManagementProps) {
    const { user } = useAuth();
    const { refreshCredits } = useCredit();

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showUpgradeOptions, setShowUpgradeOptions] = useState(false);
    const [showCancelConfirm, setShowCancelConfirm] = useState(false);
    const [selectedUpgradePlan, setSelectedUpgradePlan] = useState<PlanId | null>(null);

    // Get current plan information
    const getCurrentPlan = useCallback(() => {
        if (!subscriptionDetails) return null;

        // Try to match by variant name or product name
        const currentPlan = Object.values(SUBSCRIPTION_PLANS).find(plan =>
            subscriptionDetails.variantName.includes(plan.name) ||
            subscriptionDetails.productName.includes(plan.name)
        );

        return currentPlan ? Object.keys(SUBSCRIPTION_PLANS).find(
            key => SUBSCRIPTION_PLANS[key as PlanId] === currentPlan
        ) as PlanId : null;
    }, [subscriptionDetails]);

    // Get upgrade/downgrade options
    const getUpgradeOptions = useCallback((): PlanUpgradeOption[] => {
        const currentPlanId = getCurrentPlan();
        if (!currentPlanId) return [];

        const currentPlan = SUBSCRIPTION_PLANS[currentPlanId];

        return Object.entries(SUBSCRIPTION_PLANS).map(([planId, plan]) => {
            const isUpgrade = plan.price > currentPlan.price;
            const isDowngrade = plan.price < currentPlan.price;
            const isCurrent = planId === currentPlanId;
            const creditsDifference = plan.credits - currentPlan.credits;
            const priceDifference = plan.price - currentPlan.price;

            return {
                planId: planId as PlanId,
                plan,
                isUpgrade,
                isDowngrade,
                isCurrent,
                creditsDifference,
                priceDifference
            };
        }).filter(option => !option.isCurrent);
    }, [getCurrentPlan]);

    // Handle subscription upgrade/downgrade
    const handlePlanChange = async (newPlanId: PlanId) => {
        if (!user || !subscriptionDetails) return;

        try {
            setLoading(true);
            setError(null);

            // For plan changes, we need to create a new checkout
            // The old subscription will be cancelled automatically by Lemonsqueezy
            const userInfo = {
                userId: user.id,
                userEmail: user.email || '',
                userName: user.user_metadata?.full_name || user.email?.split('@')[0] || ''
            };

            const checkout = await lemonsqueezyService.createCheckout(newPlanId, {
                ...userInfo,
                upgrade_from: subscriptionDetails.id,
                change_type: 'plan_change'
            });

            // Store the plan change info
            sessionStorage.setItem('planChange', JSON.stringify({
                fromPlan: getCurrentPlan(),
                toPlan: newPlanId,
                checkoutId: checkout.data.id,
                timestamp: Date.now()
            }));

            // Redirect to checkout
            window.location.href = checkout.data.attributes.url;

        } catch (error) {
            console.error('Error changing plan:', error);
            setError(error instanceof Error ? error.message : '更改套餐失败');
        } finally {
            setLoading(false);
        }
    };

    // Handle subscription cancellation
    const handleCancelSubscription = async () => {
        if (!subscriptionDetails) return;

        try {
            setLoading(true);
            setError(null);

            const result = await subscriptionManager.cancelUserSubscription(subscriptionDetails.id);

            if (result.success) {
                await refreshCredits();
                onSubscriptionUpdate();
                setShowCancelConfirm(false);
                alert('订阅已成功取消，将在当前周期结束时停止续费');
            } else {
                throw new Error(result.error || '取消订阅失败');
            }
        } catch (error) {
            console.error('Error cancelling subscription:', error);
            setError(error instanceof Error ? error.message : '取消订阅失败');
        } finally {
            setLoading(false);
        }
    };

    // Handle customer portal redirect
    const handleManagePayment = async () => {
        if (!subscriptionDetails) return;

        try {
            const portalUrl = await subscriptionManager.getCustomerPortalUrl(subscriptionDetails.id);
            if (portalUrl) {
                window.open(portalUrl, '_blank');
            } else {
                setError('无法获取管理链接');
            }
        } catch (error) {
            console.error('Error getting customer portal URL:', error);
            setError('获取管理链接失败');
        }
    };

    // Calculate days until renewal
    const getDaysUntilRenewal = () => {
        if (!subscriptionDetails) return null;
        const now = new Date();
        const renewalDate = subscriptionDetails.renewsAt;
        const diffTime = renewalDate.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    };

    // Format date for display
    const formatDate = (date: Date) => {
        return new Intl.DateTimeFormat('zh-CN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        }).format(date);
    };

    const upgradeOptions = getUpgradeOptions();
    const daysUntilRenewal = getDaysUntilRenewal();
    const currentPlanId = getCurrentPlan();

    return (
        <div className="space-y-6">
            {error && (
                <div className="p-4 bg-red-500/20 border border-red-500/30 rounded-lg">
                    <div className="flex items-start gap-3">
                        <svg className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div>
                            <p className="text-red-300 font-medium">错误</p>
                            <p className="text-red-200 text-sm mt-1">{error}</p>
                            <button
                                onClick={() => setError(null)}
                                className="text-red-300 hover:text-red-200 text-sm mt-2 underline"
                            >
                                关闭
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {subscriptionDetails ? (
                <div className="space-y-6">
                    {/* Current Subscription Info */}
                    <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
                        <h4 className="font-semibold text-white mb-4">当前订阅</h4>
                        <div className="grid md:grid-cols-2 gap-4 text-sm">
                            <div>
                                <span className="text-slate-400">套餐:</span>
                                <span className="text-white ml-2">{subscriptionDetails.variantName}</span>
                            </div>
                            <div>
                                <span className="text-slate-400">状态:</span>
                                <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${subscriptionDetails.status === 'active'
                                        ? 'bg-green-500/20 text-green-400'
                                        : subscriptionDetails.status === 'cancelled'
                                            ? 'bg-red-500/20 text-red-400'
                                            : 'bg-yellow-500/20 text-yellow-400'
                                    }`}>
                                    {subscriptionManager.formatSubscriptionStatus(subscriptionDetails.status)}
                                </span>
                            </div>
                            <div>
                                <span className="text-slate-400">下次续费:</span>
                                <span className="text-white ml-2">{formatDate(subscriptionDetails.renewsAt)}</span>
                            </div>
                            <div>
                                <span className="text-slate-400">支付方式:</span>
                                <span className="text-white ml-2">
                                    {subscriptionDetails.cardBrand} ****{subscriptionDetails.cardLastFour}
                                </span>
                            </div>
                        </div>

                        {/* Renewal Reminder */}
                        {daysUntilRenewal && daysUntilRenewal <= 7 && daysUntilRenewal > 0 && !subscriptionDetails.cancelled && (
                            <div className="mt-4 p-3 bg-yellow-500/20 border border-yellow-500/30 rounded-lg">
                                <div className="flex items-start gap-3">
                                    <svg className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                    </svg>
                                    <div>
                                        <p className="text-yellow-400 font-medium">续费提醒</p>
                                        <p className="text-yellow-300 text-sm mt-1">
                                            您的订阅将在 {daysUntilRenewal} 天后自动续费。如需更改，请及时处理。
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Cancellation Notice */}
                        {subscriptionDetails.cancelled && subscriptionDetails.endsAt && (
                            <div className="mt-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg">
                                <div className="flex items-start gap-3">
                                    <svg className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <div>
                                        <p className="text-red-400 font-medium">订阅已取消</p>
                                        <p className="text-red-300 text-sm mt-1">
                                            您的订阅将在 {formatDate(subscriptionDetails.endsAt)} 到期，之后将不再续费。
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Management Actions */}
                    <div className="space-y-4">
                        {/* Upgrade/Downgrade Options */}
                        {!subscriptionDetails.cancelled && subscriptionManager.canModifySubscription(subscriptionDetails.status) && (
                            <div>
                                <button
                                    onClick={() => setShowUpgradeOptions(!showUpgradeOptions)}
                                    className="w-full p-4 bg-violet-500/20 hover:bg-violet-500/30 border border-violet-500/30 rounded-lg text-violet-300 font-medium transition-colors"
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                                            </svg>
                                            更改套餐
                                        </div>
                                        <svg className={`w-5 h-5 transition-transform ${showUpgradeOptions ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </div>
                                </button>

                                {showUpgradeOptions && (
                                    <div className="mt-4 space-y-3">
                                        {upgradeOptions.map((option) => (
                                            <div key={option.planId} className="bg-slate-800/30 rounded-lg p-4 border border-slate-700">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-3 mb-2">
                                                            <h5 className="font-semibold text-white">{option.plan.name}</h5>
                                                            {option.isUpgrade && (
                                                                <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full">
                                                                    升级
                                                                </span>
                                                            )}
                                                            {option.isDowngrade && (
                                                                <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded-full">
                                                                    降级
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="text-slate-400 text-sm mb-2">{option.plan.description}</p>
                                                        <div className="flex items-center gap-4 text-sm">
                                                            <span className="text-slate-300">
                                                                ${option.plan.price}/月
                                                            </span>
                                                            <span className="text-slate-300">
                                                                {option.plan.credits.toLocaleString()} 积分
                                                            </span>
                                                            {option.creditsDifference !== 0 && (
                                                                <span className={`${option.creditsDifference > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                                    {option.creditsDifference > 0 ? '+' : ''}{option.creditsDifference.toLocaleString()} 积分
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => {
                                                            setSelectedUpgradePlan(option.planId);
                                                            handlePlanChange(option.planId);
                                                        }}
                                                        disabled={loading && selectedUpgradePlan === option.planId}
                                                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${option.isUpgrade
                                                                ? 'bg-green-500/20 hover:bg-green-500/30 text-green-400 border border-green-500/30'
                                                                : 'bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border border-blue-500/30'
                                                            } disabled:opacity-50`}
                                                    >
                                                        {loading && selectedUpgradePlan === option.planId ? (
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin"></div>
                                                                处理中...
                                                            </div>
                                                        ) : (
                                                            option.isUpgrade ? '升级' : '降级'
                                                        )}
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Manage Payment Method */}
                        <button
                            onClick={handleManagePayment}
                            className="w-full p-4 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 rounded-lg text-blue-300 font-medium transition-colors"
                        >
                            <div className="flex items-center justify-center gap-2">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                                </svg>
                                管理支付方式
                            </div>
                            <p className="text-blue-400 text-sm mt-1">
                                更新信用卡信息或查看账单历史
                            </p>
                        </button>

                        {/* Cancel Subscription */}
                        {!subscriptionDetails.cancelled && subscriptionManager.canModifySubscription(subscriptionDetails.status) && (
                            <button
                                onClick={() => setShowCancelConfirm(true)}
                                className="w-full p-4 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 rounded-lg text-red-300 font-medium transition-colors"
                            >
                                <div className="flex items-center justify-center gap-2">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                    取消订阅
                                </div>
                                <p className="text-red-400 text-sm mt-1">
                                    取消后将在当前周期结束时停止续费
                                </p>
                            </button>
                        )}
                    </div>
                </div>
            ) : (
                <div className="text-center py-12">
                    <div className="w-16 h-16 mx-auto mb-4 bg-slate-800 rounded-full flex items-center justify-center">
                        <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                    </div>
                    <p className="text-slate-400 mb-4">您当前没有活跃的订阅</p>
                    <p className="text-slate-500 text-sm mb-6">
                        购买订阅套餐来获得更多积分和优先支持
                    </p>
                    <button
                        onClick={() => window.location.href = '/pricing'}
                        className="px-6 py-3 bg-violet-500 hover:bg-violet-600 text-white rounded-lg font-medium transition-colors"
                    >
                        查看订阅套餐
                    </button>
                </div>
            )}

            {/* Cancel Confirmation Modal */}
            {showCancelConfirm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-slate-800 rounded-xl p-6 max-w-md w-full border border-slate-700">
                        <h3 className="text-lg font-semibold text-white mb-4">确认取消订阅</h3>
                        <div className="space-y-3 mb-6">
                            <p className="text-slate-300">
                                取消订阅后，您将在当前计费周期结束时停止续费。
                            </p>
                            <div className="bg-slate-700/50 rounded-lg p-3">
                                <p className="text-slate-400 text-sm">
                                    • 您仍可以使用剩余的积分
                                </p>
                                <p className="text-slate-400 text-sm">
                                    • 订阅将在 {subscriptionDetails && formatDate(subscriptionDetails.renewsAt)} 到期
                                </p>
                                <p className="text-slate-400 text-sm">
                                    • 您可以随时重新订阅
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowCancelConfirm(false)}
                                className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                            >
                                保留订阅
                            </button>
                            <button
                                onClick={handleCancelSubscription}
                                disabled={loading}
                                className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {loading && (
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                )}
                                {loading ? '处理中...' : '确认取消'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}