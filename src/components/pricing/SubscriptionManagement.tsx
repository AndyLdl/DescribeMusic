/**
 * Subscription Management Component
 * 已订阅用户的订阅管理界面
 */

import { useState } from 'react';
import { useSubscription } from '../../hooks/useSubscription';
import ConfirmDialog from '../ui/ConfirmDialog';

export default function SubscriptionManagement() {
    const {
        subscription,
        isActive,
        isLoading,
        error,
        needsRenewal,
        daysUntilRenewal,
        cancelSubscription,
        getCustomerPortalUrl,
        refreshSubscription,
        formatStatus,
        canModifySubscription
    } = useSubscription();

    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [actionError, setActionError] = useState<string | null>(null);
    const [showCancelDialog, setShowCancelDialog] = useState(false);

    // 处理管理订阅
    const handleManageSubscription = async () => {
        try {
            setActionLoading('manage');
            setActionError(null);

            const portalUrl = await getCustomerPortalUrl();
            if (portalUrl) {
                window.open(portalUrl, '_blank');
            } else {
                setActionError('Unable to access customer portal');
            }
        } catch (error) {
            setActionError(error instanceof Error ? error.message : 'Unknown error');
        } finally {
            setActionLoading(null);
        }
    };

    // 处理取消订阅
    const handleCancelSubscription = () => {
        setShowCancelDialog(true);
    };

    // 确认取消订阅
    const confirmCancelSubscription = async () => {
        try {
            setActionLoading('cancel');
            setActionError(null);
            setShowCancelDialog(false);

            await cancelSubscription();

            // 显示成功消息（可以考虑用toast替代alert）
            setActionError(null);
        } catch (error) {
            setActionError(error instanceof Error ? error.message : 'Failed to cancel subscription');
        } finally {
            setActionLoading(null);
        }
    };

    // 处理刷新订阅状态
    const handleRefreshStatus = async () => {
        try {
            setActionLoading('refresh');
            setActionError(null);
            await refreshSubscription();
        } catch (error) {
            setActionError('Failed to refresh subscription status');
        } finally {
            setActionLoading(null);
        }
    };

    if (isLoading) {
        return (
            <div className="max-w-4xl mx-auto p-8 bg-slate-800/30 rounded-2xl border border-slate-700">
                <div className="flex items-center justify-center py-12">
                    <div className="w-8 h-8 border-2 border-violet-400/30 border-t-violet-400 rounded-full animate-spin"></div>
                    <span className="ml-3 text-slate-300">Loading subscription information...</span>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="max-w-4xl mx-auto p-8 bg-red-500/10 border border-red-500/30 rounded-2xl">
                <div className="flex items-start gap-4">
                    <svg className="w-6 h-6 text-red-400 mt-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                        <h3 className="text-red-300 font-medium mb-2">Subscription Error</h3>
                        <p className="text-red-200 text-sm mb-4">{error}</p>
                        <button
                            onClick={handleRefreshStatus}
                            disabled={actionLoading === 'refresh'}
                            className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg transition-colors duration-200 disabled:opacity-50"
                        >
                            {actionLoading === 'refresh' ? 'Refreshing...' : 'Retry'}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (!subscription || !isActive) {
        return null; // 不显示管理界面，让用户看到订阅选项
    }

    // 获取状态颜色
    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active':
                return 'text-green-400 bg-green-500/20 border-green-500/30';
            case 'on_trial':
                return 'text-blue-400 bg-blue-500/20 border-blue-500/30';
            case 'cancelled':
                return 'text-orange-400 bg-orange-500/20 border-orange-500/30';
            case 'past_due':
            case 'unpaid':
                return 'text-red-400 bg-red-500/20 border-red-500/30';
            default:
                return 'text-slate-400 bg-slate-500/20 border-slate-500/30';
        }
    };

    return (
        <>
            <div className="max-w-4xl mx-auto space-y-6">
                {/* 续费提醒 */}
                {needsRenewal && daysUntilRenewal && (
                    <div className="p-6 bg-orange-500/10 border border-orange-500/30 rounded-xl">
                        <div className="flex items-start gap-4">
                            <svg className="w-6 h-6 text-orange-400 mt-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <div>
                                <h3 className="text-orange-300 font-medium mb-2">Subscription Renewal Reminder</h3>
                                <p className="text-orange-200 text-sm">
                                    Your subscription will renew in {daysUntilRenewal} day{daysUntilRenewal !== 1 ? 's' : ''}.
                                    Make sure your payment method is up to date.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* 主要订阅信息 */}
                <div className="p-8 bg-gradient-to-br from-violet-500/10 to-blue-500/10 border border-violet-500/30 rounded-2xl">
                    <div className="flex items-start justify-between mb-6">
                        <div>
                            <h2 className="text-2xl font-bold text-white mb-2">Current Subscription</h2>
                            <p className="text-slate-300">Manage your subscription and billing information</p>
                        </div>
                        <div className={`px-3 py-1 rounded-full border text-sm font-medium ${getStatusColor(subscription.status)}`}>
                            {formatStatus(subscription.status)}
                        </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6 mb-8">
                        {/* 订阅详情 */}
                        <div className="space-y-4">
                            <div>
                                <h3 className="text-lg font-semibold text-white mb-3">Subscription Details</h3>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-slate-400">Plan:</span>
                                        <span className="text-white font-medium">{subscription.productName}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-400">Variant:</span>
                                        <span className="text-white">{subscription.variantName}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-400">Credits:</span>
                                        <span className="text-violet-400 font-medium">{subscription.credits.toLocaleString()}/month</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-400">Status:</span>
                                        <span className="text-white">{subscription.statusFormatted}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 计费信息 */}
                        <div className="space-y-4">
                            <div>
                                <h3 className="text-lg font-semibold text-white mb-3">Billing Information</h3>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-slate-400">Next Renewal:</span>
                                        <span className="text-white">{subscription.renewsAt.toLocaleDateString()}</span>
                                    </div>
                                    {subscription.endsAt && (
                                        <div className="flex justify-between">
                                            <span className="text-slate-400">Ends At:</span>
                                            <span className="text-orange-400">{subscription.endsAt.toLocaleDateString()}</span>
                                        </div>
                                    )}
                                    {subscription.trialEndsAt && (
                                        <div className="flex justify-between">
                                            <span className="text-slate-400">Trial Ends:</span>
                                            <span className="text-blue-400">{subscription.trialEndsAt.toLocaleDateString()}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between">
                                        <span className="text-slate-400">Payment Method:</span>
                                        <span className="text-white">
                                            {subscription.cardBrand} •••• {subscription.cardLastFour}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-400">Auto-Renewal:</span>
                                        <span className={subscription.cancelled ? 'text-orange-400' : 'text-green-400'}>
                                            {subscription.cancelled ? 'Cancelled' : 'Active'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 操作错误提示 */}
                    {actionError && (
                        <div className="mb-6 p-4 bg-red-500/20 border border-red-500/30 rounded-lg">
                            <div className="flex items-start gap-3">
                                <svg className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <div>
                                    <p className="text-red-300 font-medium">Action Failed</p>
                                    <p className="text-red-200 text-sm mt-1">{actionError}</p>
                                    <button
                                        onClick={() => setActionError(null)}
                                        className="text-red-300 hover:text-red-200 text-sm mt-2 underline"
                                    >
                                        Dismiss
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 操作按钮 */}
                    <div className="flex flex-wrap gap-4">
                        <button
                            onClick={handleManageSubscription}
                            disabled={!!actionLoading}
                            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-violet-500 to-blue-500 text-white rounded-xl font-semibold hover:from-violet-600 hover:to-blue-600 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {actionLoading === 'manage' && (
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            )}
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            {actionLoading === 'manage' ? 'Opening...' : 'Update Payment & Billing'}
                        </button>

                        <button
                            onClick={handleRefreshStatus}
                            disabled={!!actionLoading}
                            className="flex items-center gap-2 px-6 py-3 bg-slate-700 text-white rounded-xl font-semibold hover:bg-slate-600 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {actionLoading === 'refresh' && (
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            )}
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            {actionLoading === 'refresh' ? 'Refreshing...' : 'Refresh Status'}
                        </button>

                        {canModifySubscription(subscription.status) && !subscription.cancelled && (
                            <button
                                onClick={handleCancelSubscription}
                                disabled={!!actionLoading}
                                className="flex items-center gap-2 px-6 py-3 bg-red-600/20 text-red-300 border border-red-500/30 rounded-xl font-semibold hover:bg-red-600/30 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {actionLoading === 'cancel' && (
                                    <div className="w-4 h-4 border-2 border-red-300/30 border-t-red-300 rounded-full animate-spin"></div>
                                )}
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                                {actionLoading === 'cancel' ? 'Cancelling...' : 'Cancel Subscription'}
                            </button>
                        )}
                    </div>

                    {/* 取消订阅说明 */}
                    {subscription.cancelled && subscription.endsAt && (
                        <div className="mt-6 p-4 bg-orange-500/10 border border-orange-500/30 rounded-lg">
                            <div className="flex items-start gap-3">
                                <svg className="w-5 h-5 text-orange-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <div>
                                    <p className="text-orange-300 font-medium">Subscription Cancelled</p>
                                    <p className="text-orange-200 text-sm mt-1">
                                        Your subscription has been cancelled and will end on {subscription.endsAt.toLocaleDateString()}.
                                        You will retain access to premium features until then.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* 帮助信息 */}
                <div className="p-6 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                    <div className="flex items-start gap-4">
                        <svg className="w-6 h-6 text-blue-400 mt-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div>
                            <p className="text-blue-400 font-medium mb-2">Available Actions</p>
                            <ul className="text-blue-300 space-y-1 text-sm">
                                <li>• <strong>"Update Payment & Billing"</strong> - Change payment methods, update billing address, download invoices</li>
                                <li>• <strong>"Refresh Status"</strong> - Get the latest subscription information from our servers</li>
                                <li>• <strong>"Cancel Subscription"</strong> - End your subscription (remains active until period end)</li>
                                <li>• Contact support if you need assistance with your subscription</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>

            {/* 取消订阅确认对话框 */}
            <ConfirmDialog
                isOpen={showCancelDialog}
                onClose={() => setShowCancelDialog(false)}
                onConfirm={confirmCancelSubscription}
                title="Cancel Subscription"
                message="Are you sure you want to cancel your subscription? You will lose access to premium features at the end of your billing period."
                confirmText="Yes, Cancel Subscription"
                cancelText="Keep Subscription"
                type="danger"
                loading={actionLoading === 'cancel'}
            />
        </>
    );
}