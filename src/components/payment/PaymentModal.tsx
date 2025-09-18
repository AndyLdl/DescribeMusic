/**
 * Enhanced Payment Modal Component
 * Provides improved user experience for payment flow with loading states,
 * success/failure feedback, and retry options
 */

import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { SUBSCRIPTION_PLANS, type PlanId, lemonsqueezyService, LemonsqueezyError } from '../../services/lemonsqueezyService';
import { useAuth } from '../../contexts/AuthContext';
import { useCredit } from '../../contexts/CreditContext';
import { useCreditToast } from '../credit/CreditToast';
import { creditErrorHandler, withRetry } from '../../utils/creditErrorHandler';

// Payment states
type PaymentState =
    | 'idle'
    | 'selecting'
    | 'processing'
    | 'redirecting'
    | 'success'
    | 'failed'
    | 'cancelled';

// Payment step for progress indication
type PaymentStep =
    | 'plan-selection'
    | 'user-verification'
    | 'checkout-creation'
    | 'payment-redirect'
    | 'payment-processing'
    | 'completion';

interface PaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: (credits: number, planId: PlanId) => void;
    onError?: (error: Error) => void;
    preselectedPlan?: PlanId;
    requiredCredits?: number;
    context?: string; // Context for analytics (e.g., 'insufficient-credits', 'upgrade')
}

interface PaymentProgress {
    step: PaymentStep;
    progress: number; // 0-100
    message: string;
    canCancel: boolean;
}

export default function PaymentModal({
    isOpen,
    onClose,
    onSuccess,
    onError,
    preselectedPlan,
    requiredCredits,
    context = 'manual'
}: PaymentModalProps) {
    const { user } = useAuth();
    const { credits, refreshCredits } = useCredit();
    const toast = useCreditToast();

    // State management
    const [selectedPlan, setSelectedPlan] = useState<PlanId | null>(preselectedPlan || null);
    const [paymentState, setPaymentState] = useState<PaymentState>('idle');
    const [progress, setProgress] = useState<PaymentProgress>({
        step: 'plan-selection',
        progress: 0,
        message: '选择您的积分套餐',
        canCancel: true
    });
    const [error, setError] = useState<string | null>(null);
    const [retryCount, setRetryCount] = useState(0);
    const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);

    // Reset state when modal opens/closes
    useEffect(() => {
        if (isOpen) {
            setPaymentState('idle');
            setError(null);
            setRetryCount(0);
            setCheckoutUrl(null);
            setProgress({
                step: 'plan-selection',
                progress: 0,
                message: '选择您的积分套餐',
                canCancel: true
            });
            if (preselectedPlan) {
                setSelectedPlan(preselectedPlan);
            }
        }
    }, [isOpen, preselectedPlan]);

    // Handle payment initiation
    const handlePayment = useCallback(async (planId: PlanId) => {
        if (!user) {
            toast.error('请先登录', '您需要登录后才能购买积分');
            return;
        }

        try {
            setPaymentState('processing');
            setError(null);
            setSelectedPlan(planId);

            // Step 1: User verification
            setProgress({
                step: 'user-verification',
                progress: 20,
                message: '验证用户信息...',
                canCancel: true
            });

            await new Promise(resolve => setTimeout(resolve, 500));

            // Step 2: Checkout creation
            setProgress({
                step: 'checkout-creation',
                progress: 40,
                message: '创建支付会话...',
                canCancel: true
            });

            const userInfo = {
                userId: user.id,
                userEmail: user.email || '',
                userName: user.user_metadata?.full_name || user.email?.split('@')[0] || ''
            };

            // Use retry wrapper for checkout creation
            const checkout = await withRetry(
                () => lemonsqueezyService.createCheckout(planId, {
                    ...userInfo,
                    context,
                    requiredCredits: requiredCredits?.toString()
                }),
                { operation: 'create-checkout', userId: user.id },
                3
            );

            setCheckoutUrl(checkout.data.attributes.url);

            // Step 3: Payment redirect preparation
            setProgress({
                step: 'payment-redirect',
                progress: 60,
                message: '准备跳转到支付页面...',
                canCancel: true
            });

            // Store payment info for recovery
            const paymentInfo = {
                planId,
                checkoutId: checkout.data.id,
                checkoutUrl: checkout.data.attributes.url,
                timestamp: Date.now(),
                credits: SUBSCRIPTION_PLANS[planId].credits,
                userId: user.id,
                context
            };

            sessionStorage.setItem('pendingPayment', JSON.stringify(paymentInfo));

            await new Promise(resolve => setTimeout(resolve, 1000));

            // Step 4: Redirecting
            setPaymentState('redirecting');
            setProgress({
                step: 'payment-processing',
                progress: 80,
                message: '跳转到安全支付页面...',
                canCancel: false
            });

            // Show success toast
            toast.loading(
                '跳转支付页面',
                '正在跳转到安全支付页面，请完成支付...',
                true
            );

            await new Promise(resolve => setTimeout(resolve, 1500));

            // Redirect to payment
            window.location.href = checkout.data.attributes.url;

        } catch (error) {
            console.error('💳 Payment initiation failed:', error);

            setPaymentState('failed');
            setRetryCount(prev => prev + 1);

            // Handle error with credit error handler
            const result = creditErrorHandler.handleCreditError(error as Error, {
                operation: 'payment-initiation',
                userId: user.id
            });

            setError(result.userMessage);

            // Show error toast
            toast.paymentError(result.userMessage, [
                {
                    label: '重试',
                    action: () => handleRetry()
                },
                {
                    label: '联系客服',
                    action: () => handleContactSupport()
                }
            ]);

            // Call error callback
            if (onError) {
                onError(error as Error);
            }
        }
    }, [user, context, requiredCredits, toast, onError]);

    // Handle retry
    const handleRetry = useCallback(() => {
        if (selectedPlan) {
            handlePayment(selectedPlan);
        }
    }, [selectedPlan, handlePayment]);

    // Handle contact support
    const handleContactSupport = useCallback(() => {
        const subject = encodeURIComponent('支付问题咨询');
        const body = encodeURIComponent(`
我在购买积分时遇到了问题：

套餐：${selectedPlan ? SUBSCRIPTION_PLANS[selectedPlan].name : '未选择'}
错误信息：${error || '未知错误'}
用户ID：${user?.id || '未登录'}
时间：${new Date().toLocaleString()}

请协助解决，谢谢！
        `.trim());

        window.open(`mailto:support@example.com?subject=${subject}&body=${body}`);
    }, [selectedPlan, error, user]);

    // Handle modal close
    const handleClose = useCallback(() => {
        if (progress.canCancel) {
            setPaymentState('cancelled');
            onClose();
        }
    }, [progress.canCancel, onClose]);

    // Check for payment success on mount (for returning users)
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const paymentSuccess = urlParams.get('payment') === 'success';

        if (paymentSuccess && isOpen) {
            const pendingPayment = sessionStorage.getItem('pendingPayment');
            if (pendingPayment) {
                try {
                    const paymentInfo = JSON.parse(pendingPayment);
                    setPaymentState('success');
                    setProgress({
                        step: 'completion',
                        progress: 100,
                        message: '支付成功！积分正在添加到您的账户...',
                        canCancel: false
                    });

                    // Refresh credits and show success
                    setTimeout(async () => {
                        await refreshCredits();
                        toast.paymentSuccess(
                            SUBSCRIPTION_PLANS[paymentInfo.planId].price,
                            paymentInfo.credits
                        );

                        if (onSuccess) {
                            onSuccess(paymentInfo.credits, paymentInfo.planId);
                        }

                        sessionStorage.removeItem('pendingPayment');
                        onClose();
                    }, 2000);
                } catch (error) {
                    console.error('Failed to parse pending payment:', error);
                }
            }
        }
    }, [isOpen, refreshCredits, toast, onSuccess, onClose]);

    // Get recommended plan based on required credits
    const getRecommendedPlan = useCallback((): PlanId => {
        if (!requiredCredits) return 'pro';

        const plans = Object.values(SUBSCRIPTION_PLANS);
        const suitablePlan = plans.find(plan => plan.credits >= requiredCredits);
        return suitablePlan?.id as PlanId || 'premium';
    }, [requiredCredits]);

    // Render plan selection
    const renderPlanSelection = () => {
        const plansArray = Object.values(SUBSCRIPTION_PLANS);
        const recommendedPlan = getRecommendedPlan();

        return (
            <div className="space-y-4">
                <div className="text-center mb-6">
                    <h3 className="text-xl font-bold text-white mb-2">选择积分套餐</h3>
                    <p className="text-slate-300 text-sm">
                        {requiredCredits
                            ? `您需要 ${requiredCredits} 积分，当前余额 ${credits} 积分`
                            : '选择适合您的积分套餐'
                        }
                    </p>
                </div>

                <div className="space-y-3">
                    {plansArray.map((plan) => {
                        const isRecommended = plan.id === recommendedPlan;
                        const isSelected = selectedPlan === plan.id;
                        const isDisabled = paymentState === 'processing';

                        return (
                            <div
                                key={plan.id}
                                onClick={() => !isDisabled && setSelectedPlan(plan.id)}
                                className={`relative p-4 rounded-lg border cursor-pointer transition-all ${isSelected
                                        ? 'border-violet-500 bg-violet-500/10'
                                        : isRecommended
                                            ? 'border-blue-500/50 bg-blue-500/5 hover:border-blue-500'
                                            : 'border-slate-600 bg-slate-800/30 hover:border-slate-500'
                                    } ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                {isRecommended && (
                                    <div className="absolute -top-2 left-4">
                                        <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded">
                                            推荐
                                        </span>
                                    </div>
                                )}

                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-3">
                                        <div className={`w-4 h-4 rounded-full border-2 ${isSelected
                                                ? 'border-violet-500 bg-violet-500'
                                                : 'border-slate-400'
                                            }`}>
                                            {isSelected && (
                                                <div className="w-full h-full rounded-full bg-white scale-50"></div>
                                            )}
                                        </div>
                                        <div>
                                            <h4 className="font-semibold text-white">{plan.name}</h4>
                                            <p className="text-slate-400 text-sm">{plan.description}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-lg font-bold text-white">${plan.price}</div>
                                        <div className="text-sm text-violet-400">
                                            {plan.credits.toLocaleString()} 积分
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    // Render payment progress
    const renderPaymentProgress = () => (
        <div className="text-center space-y-6">
            <div className="w-16 h-16 mx-auto">
                {paymentState === 'processing' || paymentState === 'redirecting' ? (
                    <div className="w-16 h-16 border-4 border-violet-500/30 border-t-violet-500 rounded-full animate-spin"></div>
                ) : paymentState === 'success' ? (
                    <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center">
                        <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                ) : (
                    <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center">
                        <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </div>
                )}
            </div>

            <div>
                <h3 className="text-lg font-semibold text-white mb-2">
                    {paymentState === 'success' ? '支付成功！' :
                        paymentState === 'failed' ? '支付失败' :
                            progress.message}
                </h3>

                {selectedPlan && (
                    <p className="text-slate-300 text-sm mb-4">
                        {SUBSCRIPTION_PLANS[selectedPlan].name} - {SUBSCRIPTION_PLANS[selectedPlan].credits.toLocaleString()} 积分
                    </p>
                )}

                {/* Progress bar */}
                {(paymentState === 'processing' || paymentState === 'redirecting') && (
                    <div className="w-full bg-slate-700 rounded-full h-2 mb-4">
                        <div
                            className="bg-violet-500 h-2 rounded-full transition-all duration-500"
                            style={{ width: `${progress.progress}%` }}
                        ></div>
                    </div>
                )}

                {error && (
                    <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-3 mb-4">
                        <p className="text-red-300 text-sm">{error}</p>
                    </div>
                )}
            </div>
        </div>
    );

    // Don't render if not open
    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={handleClose}
            ></div>

            {/* Modal */}
            <div className="relative glass-pane max-w-md w-full p-6 rounded-xl">
                {/* Close button */}
                {progress.canCancel && (
                    <button
                        onClick={handleClose}
                        className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                )}

                {/* Content */}
                {paymentState === 'idle' || paymentState === 'selecting' ? (
                    <>
                        {renderPlanSelection()}

                        {/* Action buttons */}
                        <div className="flex space-x-3 mt-6">
                            <button
                                onClick={handleClose}
                                className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                            >
                                取消
                            </button>
                            <button
                                onClick={() => selectedPlan && handlePayment(selectedPlan)}
                                disabled={!selectedPlan}
                                className="flex-1 px-4 py-2 bg-violet-600 hover:bg-violet-700 disabled:bg-violet-600/50 text-white rounded-lg transition-colors disabled:cursor-not-allowed"
                            >
                                确认购买
                            </button>
                        </div>
                    </>
                ) : (
                    <>
                        {renderPaymentProgress()}

                        {/* Action buttons for failed state */}
                        {paymentState === 'failed' && (
                            <div className="flex space-x-3 mt-6">
                                <button
                                    onClick={handleClose}
                                    className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                                >
                                    取消
                                </button>
                                <button
                                    onClick={handleRetry}
                                    className="flex-1 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg transition-colors"
                                >
                                    重试 ({retryCount}/3)
                                </button>
                            </div>
                        )}
                    </>
                )}

                {/* Support link */}
                <div className="mt-4 text-center">
                    <button
                        onClick={handleContactSupport}
                        className="text-slate-400 hover:text-white text-sm transition-colors"
                    >
                        遇到问题？联系客服
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}

// Export convenience hook for using payment modal
export function usePaymentModal() {
    const [isOpen, setIsOpen] = useState(false);
    const [config, setConfig] = useState<Partial<PaymentModalProps>>({});

    const openModal = useCallback((modalConfig: Partial<PaymentModalProps> = {}) => {
        setConfig(modalConfig);
        setIsOpen(true);
    }, []);

    const closeModal = useCallback(() => {
        setIsOpen(false);
        setConfig({});
    }, []);

    return {
        isOpen,
        openModal,
        closeModal,
        PaymentModal: (props: Omit<PaymentModalProps, 'isOpen' | 'onClose'>) => (
            <PaymentModal
                {...props}
                {...config}
                isOpen={isOpen}
                onClose={closeModal}
            />
        )
    };
}