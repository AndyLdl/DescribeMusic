/**
 * Credit Error Boundary Component
 * Specialized error boundary for credit and payment-related errors
 */

import { Component, type ErrorInfo, type ReactNode } from 'react';
import { LemonsqueezyError } from '../../services/lemonsqueezyService';

// Credit-specific error types
export enum CreditErrorType {
    INSUFFICIENT_CREDITS = 'INSUFFICIENT_CREDITS',
    INVALID_AMOUNT = 'INVALID_AMOUNT',
    TRANSACTION_FAILED = 'TRANSACTION_FAILED',
    PAYMENT_FAILED = 'PAYMENT_FAILED',
    SUBSCRIPTION_ERROR = 'SUBSCRIPTION_ERROR',
    NETWORK_ERROR = 'NETWORK_ERROR',
    SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE'
}

// Payment-specific error types
export enum PaymentErrorType {
    LEMONSQUEEZY_ERROR = 'LEMONSQUEEZY_ERROR',
    WEBHOOK_VERIFICATION_FAILED = 'WEBHOOK_VERIFICATION_FAILED',
    DUPLICATE_PAYMENT = 'DUPLICATE_PAYMENT',
    INVALID_SUBSCRIPTION = 'INVALID_SUBSCRIPTION',
    CHECKOUT_CREATION_FAILED = 'CHECKOUT_CREATION_FAILED',
    MISSING_CONFIGURATION = 'MISSING_CONFIGURATION'
}

// Custom error class for credit-related errors
export class CreditError extends Error {
    constructor(
        message: string,
        public type: CreditErrorType,
        public code?: string,
        public retryable: boolean = false
    ) {
        super(message);
        this.name = 'CreditError';
    }
}

// Error action interface
interface ErrorAction {
    label: string;
    action: () => void;
    primary?: boolean;
    variant?: 'primary' | 'secondary' | 'danger';
}

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
    onError?: (error: Error, errorInfo: ErrorInfo) => void;
    onRetry?: () => void;
    onPurchaseCredits?: () => void;
    onContactSupport?: () => void;
}

interface State {
    hasError: boolean;
    error?: Error;
    errorInfo?: ErrorInfo;
    errorType?: CreditErrorType | PaymentErrorType;
    retryCount: number;
}

export default class CreditErrorBoundary extends Component<Props, State> {
    private maxRetries = 3;

    constructor(props: Props) {
        super(props);
        this.state = {
            hasError: false,
            retryCount: 0
        };
    }

    static getDerivedStateFromError(error: Error): Partial<State> {
        // Determine error type
        let errorType: CreditErrorType | PaymentErrorType | undefined;

        if (error instanceof CreditError) {
            errorType = error.type;
        } else if (error instanceof LemonsqueezyError) {
            errorType = PaymentErrorType.LEMONSQUEEZY_ERROR;
        } else if (error.message.includes('Insufficient credits')) {
            errorType = CreditErrorType.INSUFFICIENT_CREDITS;
        } else if (error.message.includes('payment') || error.message.includes('checkout')) {
            errorType = PaymentErrorType.CHECKOUT_CREATION_FAILED;
        } else if (error.message.includes('network') || error.message.includes('fetch')) {
            errorType = CreditErrorType.NETWORK_ERROR;
        } else {
            errorType = CreditErrorType.TRANSACTION_FAILED;
        }

        return {
            hasError: true,
            error,
            errorType
        };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('CreditErrorBoundary caught an error:', error, errorInfo);

        this.setState({
            error,
            errorInfo
        });

        // Call custom error handler if provided
        if (this.props.onError) {
            this.props.onError(error, errorInfo);
        }

        // Send error to monitoring service
        this.reportError(error, errorInfo);
    }

    private reportError = (error: Error, errorInfo: ErrorInfo) => {
        // In a real app, send to monitoring service like Sentry
        console.error('Credit system error reported:', {
            error: error.message,
            stack: error.stack,
            componentStack: errorInfo.componentStack,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            url: window.location.href
        });
    };

    private handleRetry = () => {
        const { retryCount } = this.state;

        if (retryCount < this.maxRetries) {
            this.setState({
                hasError: false,
                error: undefined,
                errorInfo: undefined,
                errorType: undefined,
                retryCount: retryCount + 1
            });

            if (this.props.onRetry) {
                this.props.onRetry();
            }
        }
    };

    private handlePurchaseCredits = () => {
        if (this.props.onPurchaseCredits) {
            this.props.onPurchaseCredits();
        } else {
            // Default behavior: redirect to pricing page
            window.location.href = '/pricing';
        }
    };

    private handleContactSupport = () => {
        if (this.props.onContactSupport) {
            this.props.onContactSupport();
        } else {
            // Default behavior: open email client
            window.location.href = 'mailto:support@example.com?subject=Credit System Error&body=I encountered an error with the credit system. Please help.';
        }
    };

    private getErrorContent = () => {
        const { error, errorType, retryCount } = this.state;

        if (!error || !errorType) {
            return this.getGenericErrorContent();
        }

        switch (errorType) {
            case CreditErrorType.INSUFFICIENT_CREDITS:
                return this.getInsufficientCreditsContent();

            case PaymentErrorType.LEMONSQUEEZY_ERROR:
            case PaymentErrorType.CHECKOUT_CREATION_FAILED:
                return this.getPaymentErrorContent();

            case CreditErrorType.NETWORK_ERROR:
                return this.getNetworkErrorContent();

            case CreditErrorType.SERVICE_UNAVAILABLE:
                return this.getServiceUnavailableContent();

            case PaymentErrorType.MISSING_CONFIGURATION:
                return this.getConfigurationErrorContent();

            default:
                return this.getGenericErrorContent();
        }
    };

    private getInsufficientCreditsContent = () => ({
        icon: (
            <svg className="w-8 h-8 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
            </svg>
        ),
        title: '积分不足',
        description: '您的积分余额不足以完成此操作。请购买更多积分或等待下月积分重置。',
        actions: [
            {
                label: '购买积分',
                action: this.handlePurchaseCredits,
                primary: true,
                variant: 'primary' as const
            },
            {
                label: '查看定价',
                action: () => window.location.href = '/pricing',
                variant: 'secondary' as const
            }
        ]
    });

    private getPaymentErrorContent = () => ({
        icon: (
            <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
        ),
        title: '支付处理失败',
        description: '支付系统暂时不可用或您的支付信息有误。请稍后重试或联系客服。',
        actions: [
            {
                label: '重试支付',
                action: this.handleRetry,
                primary: true,
                variant: 'primary' as const
            },
            {
                label: '联系客服',
                action: this.handleContactSupport,
                variant: 'secondary' as const
            }
        ]
    });

    private getNetworkErrorContent = () => ({
        icon: (
            <svg className="w-8 h-8 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
            </svg>
        ),
        title: '网络连接问题',
        description: '无法连接到服务器。请检查您的网络连接并重试。',
        actions: [
            {
                label: '重试',
                action: this.handleRetry,
                primary: true,
                variant: 'primary' as const
            },
            {
                label: '刷新页面',
                action: () => window.location.reload(),
                variant: 'secondary' as const
            }
        ]
    });

    private getServiceUnavailableContent = () => ({
        icon: (
            <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
        ),
        title: '服务暂时不可用',
        description: '积分系统正在维护中。请稍后再试或联系客服了解更多信息。',
        actions: [
            {
                label: '稍后重试',
                action: this.handleRetry,
                primary: true,
                variant: 'primary' as const
            },
            {
                label: '联系客服',
                action: this.handleContactSupport,
                variant: 'secondary' as const
            }
        ]
    });

    private getConfigurationErrorContent = () => ({
        icon: (
            <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
        ),
        title: '系统配置错误',
        description: '支付系统配置有误。请联系管理员或稍后重试。',
        actions: [
            {
                label: '联系客服',
                action: this.handleContactSupport,
                primary: true,
                variant: 'primary' as const
            },
            {
                label: '返回首页',
                action: () => window.location.href = '/',
                variant: 'secondary' as const
            }
        ]
    });

    private getGenericErrorContent = () => ({
        icon: (
            <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
        ),
        title: '操作失败',
        description: '积分系统遇到了一个意外错误。请重试或联系客服。',
        actions: [
            {
                label: '重试',
                action: this.handleRetry,
                primary: true,
                variant: 'primary' as const
            },
            {
                label: '联系客服',
                action: this.handleContactSupport,
                variant: 'secondary' as const
            }
        ]
    });

    private renderActionButton = (action: ErrorAction, index: number) => {
        const baseClasses = "px-6 py-3 font-medium rounded-lg transition-colors";

        let variantClasses = "";
        switch (action.variant) {
            case 'primary':
                variantClasses = "bg-violet-600 hover:bg-violet-700 text-white";
                break;
            case 'danger':
                variantClasses = "bg-red-600 hover:bg-red-700 text-white";
                break;
            case 'secondary':
            default:
                variantClasses = "bg-white/10 hover:bg-white/20 text-white";
                break;
        }

        return (
            <button
                key={index}
                onClick={action.action}
                className={`${baseClasses} ${variantClasses} ${action.primary ? 'w-full' : 'w-full'}`}
            >
                {action.label}
            </button>
        );
    };

    render() {
        if (this.state.hasError) {
            // If custom fallback is provided, use it
            if (this.props.fallback) {
                return this.props.fallback;
            }

            const content = this.getErrorContent();
            const { retryCount } = this.state;
            const canRetry = retryCount < this.maxRetries;

            return (
                <div className="min-h-screen bg-dark-bg flex items-center justify-center p-4">
                    <div className="glass-pane max-w-md w-full p-8 text-center">
                        {/* Error icon */}
                        <div className="w-16 h-16 mx-auto mb-6 bg-red-500/20 rounded-full flex items-center justify-center">
                            {content.icon}
                        </div>

                        {/* Error title */}
                        <h2 className="text-xl font-bold text-white mb-4">
                            {content.title}
                        </h2>

                        {/* Error description */}
                        <p className="text-slate-300 mb-6">
                            {content.description}
                        </p>

                        {/* Retry count indicator */}
                        {retryCount > 0 && (
                            <div className="mb-4 text-sm text-slate-400">
                                重试次数: {retryCount}/{this.maxRetries}
                            </div>
                        )}

                        {/* Error details (development) */}
                        {process.env.NODE_ENV === 'development' && this.state.error && (
                            <details className="mb-6 text-left">
                                <summary className="text-sm text-slate-400 cursor-pointer mb-2">
                                    错误详情 (开发模式)
                                </summary>
                                <div className="bg-black/20 rounded-lg p-4 text-xs text-slate-300 font-mono">
                                    <div className="mb-2">
                                        <strong>错误类型:</strong> {this.state.errorType}
                                    </div>
                                    <div className="mb-2">
                                        <strong>错误信息:</strong> {this.state.error.message}
                                    </div>
                                    <div className="mb-2">
                                        <strong>错误堆栈:</strong>
                                        <pre className="mt-1 whitespace-pre-wrap">
                                            {this.state.error.stack}
                                        </pre>
                                    </div>
                                    {this.state.errorInfo && (
                                        <div>
                                            <strong>组件堆栈:</strong>
                                            <pre className="mt-1 whitespace-pre-wrap">
                                                {this.state.errorInfo.componentStack}
                                            </pre>
                                        </div>
                                    )}
                                </div>
                            </details>
                        )}

                        {/* Action buttons */}
                        <div className="space-y-3">
                            {content.actions
                                .filter(action => {
                                    // Filter out retry action if max retries reached
                                    if (action.label.includes('重试') && !canRetry) {
                                        return false;
                                    }
                                    return true;
                                })
                                .map((action, index) => this.renderActionButton(action, index))
                            }

                            {/* Always show homepage link as fallback */}
                            <button
                                onClick={() => window.location.href = '/'}
                                className="w-full px-6 py-3 text-slate-400 hover:text-white transition-colors"
                            >
                                返回首页
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

// Utility function to create credit errors
export function createCreditError(
    type: CreditErrorType,
    message: string,
    code?: string,
    retryable: boolean = false
): CreditError {
    return new CreditError(message, type, code, retryable);
}

// Utility function to check if error is credit-related
export function isCreditError(error: Error): error is CreditError {
    return error instanceof CreditError;
}

// Utility function to check if error is payment-related
export function isPaymentError(error: Error): boolean {
    return error instanceof LemonsqueezyError ||
        error.message.includes('payment') ||
        error.message.includes('checkout') ||
        error.message.includes('lemonsqueezy');
}

// Utility function to get error severity
export function getErrorSeverity(error: Error): 'low' | 'medium' | 'high' | 'critical' {
    if (error instanceof CreditError) {
        switch (error.type) {
            case CreditErrorType.INSUFFICIENT_CREDITS:
                return 'medium';
            case CreditErrorType.NETWORK_ERROR:
                return 'low';
            case CreditErrorType.SERVICE_UNAVAILABLE:
                return 'high';
            default:
                return 'medium';
        }
    }

    if (error instanceof LemonsqueezyError) {
        return 'high';
    }

    return 'medium';
}