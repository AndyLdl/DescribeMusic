/**
 * SubscriptionModal Component
 * Manages user subscription status, credit usage, and subscription operations
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useCredit } from '../../contexts/CreditContext';
import { subscriptionManager, SUBSCRIPTION_PLANS, type PlanId } from '../../services/lemonsqueezyService';
import { supabase } from '../../lib/supabase';
import SubscriptionManagement from './SubscriptionManagement';
import CreditAnalytics from './CreditAnalytics';

interface SubscriptionModalProps {
    isOpen: boolean;
    onClose: () => void;
}

interface SubscriptionDetails {
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
}

interface CreditTransaction {
    id: string;
    transaction_type: 'consume' | 'add' | 'refund';
    amount: number;
    balance_after: number;
    source: string;
    description: string;
    created_at: string;
}

export default function SubscriptionModal({ isOpen, onClose }: SubscriptionModalProps) {
    const { user } = useAuth();
    const { credits, creditBalance, subscription, refreshCredits } = useCredit();

    // State management
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [subscriptionDetails, setSubscriptionDetails] = useState<SubscriptionDetails | null>(null);
    const [creditHistory, setCreditHistory] = useState<CreditTransaction[]>([]);
    const [activeTab, setActiveTab] = useState<'overview' | 'history' | 'manage'>('overview');


    // Load subscription details and credit history
    const loadSubscriptionData = useCallback(async () => {
        if (!user || !isOpen) return;

        try {
            setLoading(true);
            setError(null);

            // Load subscription details from database
            const { data: subData, error: subError } = await supabase
                .from('subscriptions')
                .select('*')
                .eq('user_id', user.id)
                .eq('status', 'active')
                .single();

            if (subError && subError.code !== 'PGRST116') {
                console.error('Error loading subscription:', subError);
            }

            // If we have a subscription, get details from Lemonsqueezy
            if (subData) {
                const statusResult = await subscriptionManager.getUserSubscriptionStatus(
                    subData.lemonsqueezy_subscription_id
                );

                if (statusResult.subscription) {
                    setSubscriptionDetails(statusResult.subscription);
                }
            }

            // Load credit transaction history
            const { data: historyData, error: historyError } = await supabase
                .from('credit_transactions')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(50);

            if (historyError) {
                console.error('Error loading credit history:', historyError);
            } else {
                setCreditHistory(historyData || []);
            }

        } catch (error) {
            console.error('Error loading subscription data:', error);
            setError('加载订阅信息失败');
        } finally {
            setLoading(false);
        }
    }, [user, isOpen]);

    // Load data when modal opens
    useEffect(() => {
        if (isOpen) {
            loadSubscriptionData();
        }
    }, [isOpen, loadSubscriptionData]);



    // Format date for display
    const formatDate = (date: Date) => {
        return new Intl.DateTimeFormat('zh-CN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }).format(date);
    };

    // Format transaction amount
    const formatTransactionAmount = (transaction: CreditTransaction) => {
        const isPositive = transaction.transaction_type === 'add' || transaction.transaction_type === 'refund';
        return `${isPositive ? '+' : '-'}${Math.abs(transaction.amount)}`;
    };

    // Get transaction color
    const getTransactionColor = (transaction: CreditTransaction) => {
        switch (transaction.transaction_type) {
            case 'add':
            case 'refund':
                return 'text-green-400';
            case 'consume':
                return 'text-red-400';
            default:
                return 'text-slate-400';
        }
    };



    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-900 rounded-2xl border border-slate-700 w-full max-w-4xl max-h-[90vh] overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-700">
                    <h2 className="text-2xl font-bold text-white">订阅管理</h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
                    >
                        <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Tab Navigation */}
                <div className="flex border-b border-slate-700">
                    {[
                        { id: 'overview', label: '概览', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
                        { id: 'history', label: '使用分析', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
                        { id: 'manage', label: '管理订阅', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z' }
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors ${activeTab === tab.id
                                ? 'text-violet-400 border-b-2 border-violet-400'
                                : 'text-slate-400 hover:text-slate-300'
                                }`}
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.icon} />
                            </svg>
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto max-h-[60vh]">
                    {loading && (
                        <div className="flex items-center justify-center py-12">
                            <div className="w-8 h-8 border-2 border-violet-400/30 border-t-violet-400 rounded-full animate-spin"></div>
                        </div>
                    )}

                    {error && (
                        <div className="mb-6 p-4 bg-red-500/20 border border-red-500/30 rounded-lg">
                            <div className="flex items-start gap-3">
                                <svg className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <div>
                                    <p className="text-red-300 font-medium">错误</p>
                                    <p className="text-red-200 text-sm mt-1">{error}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {!loading && activeTab === 'overview' && (
                        <div className="space-y-6">
                            {/* Current Credits */}
                            <div className="grid md:grid-cols-2 gap-6">
                                <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                                            <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                                            </svg>
                                        </div>
                                        <h3 className="text-lg font-semibold text-white">当前积分</h3>
                                    </div>
                                    <div className="text-3xl font-bold text-green-400 mb-2">
                                        {credits.toLocaleString()}
                                    </div>
                                    <p className="text-slate-400 text-sm">
                                        约 {Math.floor(credits / 60)} 分钟音频分析
                                    </p>

                                    {creditBalance && (
                                        <div className="mt-4 space-y-2 text-sm">
                                            <div className="flex justify-between">
                                                <span className="text-slate-400">试用积分:</span>
                                                <span className="text-slate-300">{creditBalance.trial}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-slate-400">月度积分:</span>
                                                <span className="text-slate-300">{creditBalance.monthly}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-slate-400">购买积分:</span>
                                                <span className="text-slate-300">{creditBalance.purchased}</span>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Subscription Status */}
                                <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="w-10 h-10 bg-violet-500/20 rounded-lg flex items-center justify-center">
                                            <svg className="w-5 h-5 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                        </div>
                                        <h3 className="text-lg font-semibold text-white">订阅状态</h3>
                                    </div>

                                    {subscriptionDetails ? (
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-2">
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${subscriptionDetails.status === 'active'
                                                    ? 'bg-green-500/20 text-green-400'
                                                    : subscriptionDetails.status === 'cancelled'
                                                        ? 'bg-red-500/20 text-red-400'
                                                        : 'bg-yellow-500/20 text-yellow-400'
                                                    }`}>
                                                    {subscriptionManager.formatSubscriptionStatus(subscriptionDetails.status)}
                                                </span>
                                            </div>
                                            <div className="text-sm text-slate-400">
                                                <p>套餐: {subscriptionDetails.variantName}</p>
                                                <p>下次续费: {formatDate(subscriptionDetails.renewsAt)}</p>
                                                {subscriptionDetails.cancelled && subscriptionDetails.endsAt && (
                                                    <p className="text-red-400">到期时间: {formatDate(subscriptionDetails.endsAt)}</p>
                                                )}
                                            </div>


                                        </div>
                                    ) : (
                                        <div className="text-slate-400">
                                            <p className="mb-2">暂无活跃订阅</p>
                                            <p className="text-sm">您正在使用免费的月度积分</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {!loading && activeTab === 'history' && (
                        <div className="space-y-6">
                            {/* Credit Analytics */}
                            <CreditAnalytics
                                creditHistory={creditHistory}
                                currentCredits={credits}
                            />

                            {/* Transaction History */}
                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold text-white">交易记录</h3>

                                {creditHistory.length === 0 ? (
                                    <div className="text-center py-12">
                                        <div className="w-16 h-16 mx-auto mb-4 bg-slate-800 rounded-full flex items-center justify-center">
                                            <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                            </svg>
                                        </div>
                                        <p className="text-slate-400">暂无交易记录</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3 max-h-96 overflow-y-auto">
                                        {creditHistory.slice(0, 20).map((transaction) => (
                                            <div key={transaction.id} className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-3 mb-1">
                                                            <span className={`font-semibold ${getTransactionColor(transaction)}`}>
                                                                {formatTransactionAmount(transaction)} 积分
                                                            </span>
                                                            <span className="text-slate-400 text-sm">
                                                                {transaction.source === 'analysis' ? '音频分析' :
                                                                    transaction.source === 'purchase' ? '购买积分' :
                                                                        transaction.source === 'monthly_grant' ? '月度赠送' :
                                                                            transaction.source === 'trial_grant' ? '试用赠送' :
                                                                                transaction.source === 'refund' ? '退款' : transaction.source}
                                                            </span>
                                                        </div>
                                                        <p className="text-slate-300 text-sm">{transaction.description}</p>
                                                        <p className="text-slate-500 text-xs mt-1">
                                                            余额: {transaction.balance_after} 积分
                                                        </p>
                                                    </div>
                                                    <div className="text-right text-slate-400 text-sm">
                                                        {new Date(transaction.created_at).toLocaleDateString('zh-CN', {
                                                            month: 'short',
                                                            day: 'numeric',
                                                            hour: '2-digit',
                                                            minute: '2-digit'
                                                        })}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                        {creditHistory.length > 20 && (
                                            <div className="text-center py-4">
                                                <p className="text-slate-400 text-sm">
                                                    显示最近 20 条记录，共 {creditHistory.length} 条
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {!loading && activeTab === 'manage' && (
                        <div className="space-y-6">
                            <h3 className="text-lg font-semibold text-white mb-4">管理订阅</h3>
                            <SubscriptionManagement
                                subscriptionDetails={subscriptionDetails}
                                onSubscriptionUpdate={loadSubscriptionData}
                            />
                        </div>
                    )}
                </div>


            </div>
        </div>
    );
}