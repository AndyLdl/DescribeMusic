/**
 * Payment Retry Handler Component
 * Handles payment retry logic with exponential backoff and user feedback
 */

import { useState, useCallback, useEffect } from 'react';
import { lemonsqueezyService, LemonsqueezyError, type PlanId } from '../../services/lemonsqueezyService';
import { useAuth } from '../../contexts/AuthContext';
import { useCreditToast } from '../credit/CreditToast';
import { creditErrorHandler } from '../../utils/creditErrorHandler';

interface RetryAttempt {
    attempt: number;
    timestamp: Date;
    error: string;
    planId: PlanId;
}

interface PaymentRetryHandlerProps {
    maxRetries?: number;
    baseDelay?: number; // milliseconds
    maxDelay?: number; // milliseconds
    onSuccess?: (checkoutUrl: string, planId: PlanId) => void;
    onFailure?: (error: Error, attempts: RetryAttempt[]) => void;
    onRetryAttempt?: (attempt: number, delay: number) => void;
}

export default function PaymentRetryHandler({
    maxRetries = 3,
    baseDelay = 1000,
    maxDelay = 10000,
    onSuccess,
    onFailure,
    onRetryAttempt
}: PaymentRetryHandlerProps) {
    const { user } = useAuth();
    const toast = useCreditToast();

    const [isRetrying, setIsRetrying] = useState(false);
    const [retryAttempts, setRetryAttempts] = useState<RetryAttempt[]>([]);
    const [currentDelay, setCurrentDelay] = useState(0);

    // Calculate retry delay with exponential backoff and jitter
    const calculateRetryDelay = useCallback((attempt: number): number => {
        const exponentialDelay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
        const jitter = Math.random() * 0.1 * exponentialDelay; // 10% jitter
        return Math.floor(exponentialDelay + jitter);
    }, [baseDelay, maxDelay]);

    // Retry payment with exponential backoff
    const retryPayment = useCallback(async (
        planId: PlanId,
        userInfo: any,
        context: string = 'retry'
    ): Promise<string | null> => {
        if (!user) {
            throw new Error('User not authenticated');
        }

        setIsRetrying(true);
        const attempts: RetryAttempt[] = [];

        for (let attempt = 0; attempt < maxRetries; attempt++) {
            try {
                // Show retry attempt notification
                if (attempt > 0) {
                    const delay = calculateRetryDelay(attempt - 1);
                    setCurrentDelay(delay);

                    if (onRetryAttempt) {
                        onRetryAttempt(attempt, delay);
                    }

                    toast.info(
                        `重试支付 (${attempt}/${maxRetries})`,
                        `等待 ${Math.ceil(delay / 1000)} 秒后重试...`
                    );

                    // Wait for calculated delay
                    await new Promise(resolve => setTimeout(resolve, delay));
                }

                // Attempt payment
                const checkout = await lemonsqueezyService.createCheckout(planId, {
                    ...userInfo,
                    context: `${context}-retry-${attempt}`,
                    retryAttempt: attempt
                });

                // Success!
                setIsRetrying(false);
                setRetryAttempts([]);

                if (onSuccess) {
                    onSuccess(checkout.data.attributes.url, planId);
                }

                return checkout.data.attributes.url;

            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';

                const attemptRecord: RetryAttempt = {
                    attempt: attempt + 1,
                    timestamp: new Date(),
                    error: errorMessage,
                    planId
                };

                attempts.push(attemptRecord);
                setRetryAttempts([...attempts]);

                console.error(`Payment retry attempt ${attempt + 1} failed:`, error);

                // Check if error is retryable
                const shouldRetry = creditErrorHandler.shouldRetryError(error as Error, attempt);

                if (!shouldRetry || attempt === maxRetries - 1) {
                    // Final failure
                    setIsRetrying(false);

                    const result = creditErrorHandler.handleCreditError(error as Error, {
                        operation: 'payment-retry',
                        userId: user.id
                    });

                    toast.error(
                        '支付重试失败',
                        `经过 ${attempts.length} 次重试后仍然失败: ${result.userMessage}`,
                        [
                            {
                                label: '联系客服',
                                action: () => {
                                    const subject = encodeURIComponent('支付重试失败');
                                    const body = encodeURIComponent(`
支付重试失败详情：

套餐：${planId}
重试次数：${attempts.length}
最后错误：${errorMessage}
用户ID：${user.id}
时间：${new Date().toLocaleString()}

重试历史：
${attempts.map(a => `${a.attempt}. ${a.timestamp.toLocaleTimeString()} - ${a.error}`).join('\n')}

请协助解决，谢谢！
                                    `.trim());

                                    window.open(`mailto:support@example.com?subject=${subject}&body=${body}`);
                                }
                            }
                        ]
                    );

                    if (onFailure) {
                        onFailure(error as Error, attempts);
                    }

                    throw error;
                }

                // Continue to next retry attempt
                console.log(`Will retry payment in ${calculateRetryDelay(attempt)}ms...`);
            }
        }

        return null;
    }, [user, maxRetries, calculateRetryDelay, toast, onRetryAttempt, onSuccess, onFailure]);

    // Manual retry function (for UI buttons)
    const manualRetry = useCallback(async (planId: PlanId) => {
        if (!user) {
            toast.error('请先登录', '您需要登录后才能重试支付');
            return;
        }

        const userInfo = {
            userId: user.id,
            userEmail: user.email || '',
            userName: user.user_metadata?.full_name || user.email?.split('@')[0] || ''
        };

        try {
            const checkoutUrl = await retryPayment(planId, userInfo, 'manual-retry');
            if (checkoutUrl) {
                window.location.href = checkoutUrl;
            }
        } catch (error) {
            console.error('Manual retry failed:', error);
        }
    }, [user, retryPayment, toast]);

    // Get retry status
    const getRetryStatus = useCallback(() => ({
        isRetrying,
        attempts: retryAttempts.length,
        maxRetries,
        currentDelay,
        lastError: retryAttempts[retryAttempts.length - 1]?.error || null,
        canRetry: retryAttempts.length < maxRetries && !isRetrying
    }), [isRetrying, retryAttempts, maxRetries, currentDelay]);

    // Render retry status (optional UI component)
    const renderRetryStatus = useCallback(() => {
        if (!isRetrying && retryAttempts.length === 0) {
            return null;
        }

        const status = getRetryStatus();

        return (
            <div className="bg-yellow-500/20 border border-yellow-500/30 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                    {isRetrying ? (
                        <div className="w-5 h-5 border-2 border-yellow-400/30 border-t-yellow-400 rounded-full animate-spin mt-0.5 flex-shrink-0"></div>
                    ) : (
                        <svg className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    )}

                    <div className="flex-1">
                        <h4 className="text-sm font-medium text-yellow-300">
                            {isRetrying ? '正在重试支付...' : '支付重试状态'}
                        </h4>

                        <p className="text-sm text-yellow-200 mt-1">
                            {isRetrying
                                ? `重试中... (${status.attempts}/${status.maxRetries})`
                                : `已重试 ${status.attempts} 次`
                            }
                        </p>

                        {currentDelay > 0 && (
                            <p className="text-xs text-yellow-300 mt-1">
                                等待 {Math.ceil(currentDelay / 1000)} 秒后重试
                            </p>
                        )}

                        {status.lastError && (
                            <p className="text-xs text-yellow-200 mt-2 opacity-75">
                                最后错误: {status.lastError}
                            </p>
                        )}

                        {/* Retry attempts history */}
                        {retryAttempts.length > 0 && (
                            <details className="mt-2">
                                <summary className="text-xs text-yellow-300 cursor-pointer">
                                    查看重试历史
                                </summary>
                                <div className="mt-2 space-y-1">
                                    {retryAttempts.map((attempt, index) => (
                                        <div key={index} className="text-xs text-yellow-200 opacity-75">
                                            {attempt.attempt}. {attempt.timestamp.toLocaleTimeString()} - {attempt.error}
                                        </div>
                                    ))}
                                </div>
                            </details>
                        )}
                    </div>
                </div>
            </div>
        );
    }, [isRetrying, retryAttempts, currentDelay, getRetryStatus]);

    return {
        retryPayment,
        manualRetry,
        getRetryStatus,
        renderRetryStatus,
        isRetrying,
        retryAttempts
    };
}

// Hook for using payment retry handler
export function usePaymentRetry(options: PaymentRetryHandlerProps = {}) {
    const handler = PaymentRetryHandler(options);

    return {
        ...handler,
        // Convenience method for common retry scenarios
        retryWithDefaults: async (planId: PlanId, userInfo: any) => {
            return handler.retryPayment(planId, userInfo, 'default');
        }
    };
}

// Utility function to determine if error is retryable
export function isRetryablePaymentError(error: Error): boolean {
    if (error instanceof LemonsqueezyError) {
        // Don't retry configuration errors
        const nonRetryableCodes = [
            'MISSING_API_KEY',
            'MISSING_VARIANT_ID',
            'SERVICE_NOT_CONFIGURED',
            'INVALID_PLAN_ID'
        ];

        return !nonRetryableCodes.includes(error.code);
    }

    // Retry network errors and temporary failures
    const message = error.message.toLowerCase();
    return message.includes('network') ||
        message.includes('timeout') ||
        message.includes('temporary') ||
        message.includes('unavailable') ||
        message.includes('rate limit');
}

// Utility function to get recommended retry delay
export function getRecommendedRetryDelay(attempt: number, error?: Error): number {
    const baseDelay = 1000;
    const maxDelay = 30000;

    // Longer delays for rate limiting
    if (error?.message.toLowerCase().includes('rate limit')) {
        return Math.min(baseDelay * Math.pow(3, attempt), maxDelay);
    }

    // Standard exponential backoff
    return Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
}