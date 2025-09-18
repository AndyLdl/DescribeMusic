/**
 * Payment Status Tracker Component
 * Tracks and displays payment status with real-time updates
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useCredit } from '../../contexts/CreditContext';
import { useCreditToast } from '../credit/CreditToast';

interface PaymentInfo {
    planId: string;
    checkoutId: string;
    checkoutUrl: string;
    timestamp: number;
    credits: number;
    userId: string;
    context: string;
}

interface PaymentStatusTrackerProps {
    onPaymentSuccess?: (credits: number, planId: string) => void;
    onPaymentFailure?: (error: string) => void;
    checkInterval?: number; // milliseconds
}

export default function PaymentStatusTracker({
    onPaymentSuccess,
    onPaymentFailure,
    checkInterval = 5000
}: PaymentStatusTrackerProps) {
    const { user } = useAuth();
    const { refreshCredits } = useCredit();
    const toast = useCreditToast();

    const [isTracking, setIsTracking] = useState(false);
    const [paymentInfo, setPaymentInfo] = useState<PaymentInfo | null>(null);
    const [checkCount, setCheckCount] = useState(0);
    const [maxChecks] = useState(60); // 5 minutes with 5-second intervals

    // Check for pending payment on mount
    useEffect(() => {
        const checkPendingPayment = () => {
            const pendingPayment = sessionStorage.getItem('pendingPayment');
            if (pendingPayment) {
                try {
                    const info: PaymentInfo = JSON.parse(pendingPayment);

                    // Check if payment is not too old (30 minutes)
                    const thirtyMinutes = 30 * 60 * 1000;
                    if (Date.now() - info.timestamp < thirtyMinutes) {
                        setPaymentInfo(info);
                        setIsTracking(true);

                        // Show tracking toast
                        toast.loading(
                            '检查支付状态',
                            '正在检查您的支付状态，请稍候...',
                            true
                        );
                    } else {
                        // Remove old payment info
                        sessionStorage.removeItem('pendingPayment');
                    }
                } catch (error) {
                    console.error('Failed to parse pending payment:', error);
                    sessionStorage.removeItem('pendingPayment');
                }
            }
        };

        // Check immediately and when user changes
        checkPendingPayment();
    }, [user, toast]);

    // Payment status checking logic
    const checkPaymentStatus = useCallback(async () => {
        if (!paymentInfo || !user) return;

        try {
            setCheckCount(prev => prev + 1);

            // Refresh credits to see if payment was processed
            const previousCredits = await refreshCredits();

            // Simple heuristic: if credits increased significantly, payment likely succeeded
            // In a real app, you'd check with your backend or Lemonsqueezy webhook status
            const creditIncrease = previousCredits - (paymentInfo.credits || 0);

            if (creditIncrease >= paymentInfo.credits * 0.8) { // Allow for some variance
                // Payment likely succeeded
                setIsTracking(false);
                sessionStorage.removeItem('pendingPayment');

                toast.paymentSuccess(
                    parseFloat((paymentInfo.credits * 0.005).toFixed(2)), // Rough price calculation
                    paymentInfo.credits
                );

                if (onPaymentSuccess) {
                    onPaymentSuccess(paymentInfo.credits, paymentInfo.planId);
                }

                return;
            }

            // Check if we've exceeded max checks
            if (checkCount >= maxChecks) {
                setIsTracking(false);

                toast.warning(
                    '支付状态检查超时',
                    '无法确认支付状态，请检查您的账户或联系客服',
                    [
                        {
                            label: '刷新页面',
                            action: () => window.location.reload()
                        },
                        {
                            label: '联系客服',
                            action: () => window.location.href = 'mailto:support@example.com'
                        }
                    ]
                );

                if (onPaymentFailure) {
                    onPaymentFailure('Payment status check timeout');
                }
            }

        } catch (error) {
            console.error('Payment status check failed:', error);

            // Don't stop tracking on single failure, but show warning after multiple failures
            if (checkCount > 5) {
                toast.warning(
                    '支付状态检查遇到问题',
                    '正在重试检查支付状态...'
                );
            }
        }
    }, [paymentInfo, user, refreshCredits, checkCount, maxChecks, toast, onPaymentSuccess, onPaymentFailure]);

    // Set up interval for checking payment status
    useEffect(() => {
        if (!isTracking || !paymentInfo) return;

        const interval = setInterval(checkPaymentStatus, checkInterval);

        return () => clearInterval(interval);
    }, [isTracking, paymentInfo, checkPaymentStatus, checkInterval]);

    // Handle manual refresh
    const handleManualRefresh = useCallback(() => {
        if (paymentInfo) {
            setCheckCount(0);
            checkPaymentStatus();
        }
    }, [paymentInfo, checkPaymentStatus]);

    // Handle cancel tracking
    const handleCancelTracking = useCallback(() => {
        setIsTracking(false);
        setPaymentInfo(null);
        sessionStorage.removeItem('pendingPayment');

        toast.info(
            '已停止支付状态检查',
            '如果您已完成支付，请刷新页面查看积分余额'
        );
    }, [toast]);

    // Don't render anything if not tracking
    if (!isTracking || !paymentInfo) {
        return null;
    }

    return (
        <div className="fixed bottom-4 right-4 z-40 max-w-sm">
            <div className="glass-pane p-4 rounded-lg border-l-4 border-blue-500">
                <div className="flex items-start space-x-3">
                    {/* Loading spinner */}
                    <div className="w-5 h-5 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin mt-0.5 flex-shrink-0"></div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium text-white">
                            检查支付状态
                        </h4>
                        <p className="text-sm text-slate-300 mt-1">
                            正在检查 {paymentInfo.credits.toLocaleString()} 积分的支付状态...
                        </p>

                        {/* Progress indicator */}
                        <div className="mt-2 flex items-center space-x-2 text-xs text-slate-400">
                            <span>检查次数: {checkCount}/{maxChecks}</span>
                            <div className="w-16 bg-slate-700 rounded-full h-1">
                                <div
                                    className="bg-blue-400 h-1 rounded-full transition-all duration-300"
                                    style={{ width: `${(checkCount / maxChecks) * 100}%` }}
                                ></div>
                            </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex space-x-2 mt-3">
                            <button
                                onClick={handleManualRefresh}
                                className="px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
                            >
                                立即检查
                            </button>
                            <button
                                onClick={handleCancelTracking}
                                className="px-2 py-1 text-xs bg-slate-600 hover:bg-slate-700 text-white rounded transition-colors"
                            >
                                停止检查
                            </button>
                        </div>
                    </div>

                    {/* Close button */}
                    <button
                        onClick={handleCancelTracking}
                        className="text-slate-400 hover:text-white transition-colors flex-shrink-0"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    );
}

// Hook for using payment status tracker
export function usePaymentStatusTracker() {
    const [isEnabled, setIsEnabled] = useState(false);

    const enableTracking = useCallback(() => {
        setIsEnabled(true);
    }, []);

    const disableTracking = useCallback(() => {
        setIsEnabled(false);
    }, []);

    return {
        isEnabled,
        enableTracking,
        disableTracking,
        PaymentStatusTracker: (props: Omit<PaymentStatusTrackerProps, 'isEnabled'>) =>
            isEnabled ? <PaymentStatusTracker {...props} /> : null
    };
}

// Utility function to check if there's a pending payment
export function hasPendingPayment(): boolean {
    const pendingPayment = sessionStorage.getItem('pendingPayment');
    if (!pendingPayment) return false;

    try {
        const info: PaymentInfo = JSON.parse(pendingPayment);
        const thirtyMinutes = 30 * 60 * 1000;
        return Date.now() - info.timestamp < thirtyMinutes;
    } catch {
        return false;
    }
}

// Utility function to get pending payment info
export function getPendingPaymentInfo(): PaymentInfo | null {
    const pendingPayment = sessionStorage.getItem('pendingPayment');
    if (!pendingPayment) return null;

    try {
        return JSON.parse(pendingPayment);
    } catch {
        return null;
    }
}

// Utility function to clear pending payment
export function clearPendingPayment(): void {
    sessionStorage.removeItem('pendingPayment');
}