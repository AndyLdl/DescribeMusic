/**
 * Credit Error Handler Utility
 * Centralized error handling for credit and payment operations
 */

import { CreditError, CreditErrorType, PaymentErrorType } from '../components/credit/CreditErrorBoundary';
import { LemonsqueezyError } from '../services/lemonsqueezyService';

// Error context interface
interface ErrorContext {
    operation: string;
    userId?: string;
    amount?: number;
    timestamp: Date;
    userAgent: string;
    url: string;
}

// Error handling result
interface ErrorHandlingResult {
    shouldRetry: boolean;
    retryDelay?: number;
    userMessage: string;
    technicalMessage: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    actions: Array<{
        label: string;
        action: string;
        primary?: boolean;
    }>;
}

// Error reporting interface
interface ErrorReport {
    error: Error;
    context: ErrorContext;
    severity: string;
    timestamp: Date;
    handled: boolean;
}

/**
 * Credit Error Handler Class
 */
export class CreditErrorHandler {
    private static instance: CreditErrorHandler;
    private errorReports: ErrorReport[] = [];
    private maxReports = 100;

    private constructor() { }

    public static getInstance(): CreditErrorHandler {
        if (!CreditErrorHandler.instance) {
            CreditErrorHandler.instance = new CreditErrorHandler();
        }
        return CreditErrorHandler.instance;
    }

    /**
     * Handle credit-related errors
     */
    public handleCreditError(
        error: Error,
        context: Partial<ErrorContext> = {}
    ): ErrorHandlingResult {
        const fullContext: ErrorContext = {
            operation: 'unknown',
            timestamp: new Date(),
            userAgent: navigator.userAgent,
            url: window.location.href,
            ...context
        };

        // Log error for monitoring
        this.logError(error, fullContext);

        // Determine error type and create appropriate response
        if (error instanceof CreditError) {
            return this.handleSpecificCreditError(error, fullContext);
        }

        if (error instanceof LemonsqueezyError) {
            return this.handlePaymentError(error, fullContext);
        }

        // Handle generic errors that might be credit-related
        return this.handleGenericError(error, fullContext);
    }

    /**
     * Handle specific credit errors
     */
    private handleSpecificCreditError(
        error: CreditError,
        context: ErrorContext
    ): ErrorHandlingResult {
        switch (error.type) {
            case CreditErrorType.INSUFFICIENT_CREDITS:
                return {
                    shouldRetry: false,
                    userMessage: '您的积分余额不足以完成此操作。',
                    technicalMessage: `Insufficient credits for operation: ${context.operation}`,
                    severity: 'medium',
                    actions: [
                        { label: '购买积分', action: 'purchase', primary: true },
                        { label: '查看定价', action: 'pricing' }
                    ]
                };

            case CreditErrorType.INVALID_AMOUNT:
                return {
                    shouldRetry: false,
                    userMessage: '积分数量无效。请检查输入并重试。',
                    technicalMessage: `Invalid credit amount: ${context.amount}`,
                    severity: 'low',
                    actions: [
                        { label: '重新输入', action: 'retry', primary: true }
                    ]
                };

            case CreditErrorType.TRANSACTION_FAILED:
                return {
                    shouldRetry: error.retryable,
                    retryDelay: 2000,
                    userMessage: '积分交易失败。请稍后重试。',
                    technicalMessage: `Credit transaction failed: ${error.message}`,
                    severity: 'medium',
                    actions: [
                        { label: '重试', action: 'retry', primary: true },
                        { label: '联系客服', action: 'support' }
                    ]
                };

            case CreditErrorType.NETWORK_ERROR:
                return {
                    shouldRetry: true,
                    retryDelay: 3000,
                    userMessage: '网络连接问题。请检查网络并重试。',
                    technicalMessage: `Network error during ${context.operation}`,
                    severity: 'low',
                    actions: [
                        { label: '重试', action: 'retry', primary: true },
                        { label: '刷新页面', action: 'refresh' }
                    ]
                };

            case CreditErrorType.SERVICE_UNAVAILABLE:
                return {
                    shouldRetry: true,
                    retryDelay: 10000,
                    userMessage: '积分系统暂时不可用。请稍后重试。',
                    technicalMessage: `Credit service unavailable for ${context.operation}`,
                    severity: 'high',
                    actions: [
                        { label: '稍后重试', action: 'retry', primary: true },
                        { label: '联系客服', action: 'support' }
                    ]
                };

            default:
                return this.handleGenericError(error, context);
        }
    }

    /**
     * Handle payment-related errors
     */
    private handlePaymentError(
        error: LemonsqueezyError,
        context: ErrorContext
    ): ErrorHandlingResult {
        switch (error.code) {
            case 'MISSING_API_KEY':
            case 'MISSING_VARIANT_ID':
            case 'SERVICE_NOT_CONFIGURED':
                return {
                    shouldRetry: false,
                    userMessage: '支付系统配置错误。请联系客服。',
                    technicalMessage: `Payment configuration error: ${error.code}`,
                    severity: 'critical',
                    actions: [
                        { label: '联系客服', action: 'support', primary: true },
                        { label: '返回首页', action: 'home' }
                    ]
                };

            case 'CHECKOUT_CREATION_FAILED':
                return {
                    shouldRetry: true,
                    retryDelay: 3000,
                    userMessage: '创建支付会话失败。请重试。',
                    technicalMessage: `Checkout creation failed: ${error.message}`,
                    severity: 'medium',
                    actions: [
                        { label: '重试支付', action: 'retry', primary: true },
                        { label: '选择其他套餐', action: 'plans' }
                    ]
                };

            case 'INVALID_RESPONSE':
                return {
                    shouldRetry: true,
                    retryDelay: 2000,
                    userMessage: '支付服务响应异常。请重试。',
                    technicalMessage: `Invalid payment response: ${error.message}`,
                    severity: 'medium',
                    actions: [
                        { label: '重试', action: 'retry', primary: true },
                        { label: '联系客服', action: 'support' }
                    ]
                };

            default:
                return {
                    shouldRetry: false,
                    userMessage: '支付处理失败。请联系客服。',
                    technicalMessage: `Payment error: ${error.message}`,
                    severity: 'high',
                    actions: [
                        { label: '联系客服', action: 'support', primary: true },
                        { label: '重试', action: 'retry' }
                    ]
                };
        }
    }

    /**
     * Handle generic errors
     */
    private handleGenericError(
        error: Error,
        context: ErrorContext
    ): ErrorHandlingResult {
        // Check error message for common patterns
        const message = error.message.toLowerCase();

        if (message.includes('insufficient') || message.includes('not enough')) {
            return {
                shouldRetry: false,
                userMessage: '积分不足。请购买更多积分。',
                technicalMessage: `Insufficient credits: ${error.message}`,
                severity: 'medium',
                actions: [
                    { label: '购买积分', action: 'purchase', primary: true }
                ]
            };
        }

        if (message.includes('network') || message.includes('fetch') || message.includes('timeout')) {
            return {
                shouldRetry: true,
                retryDelay: 3000,
                userMessage: '网络连接问题。请重试。',
                technicalMessage: `Network error: ${error.message}`,
                severity: 'low',
                actions: [
                    { label: '重试', action: 'retry', primary: true }
                ]
            };
        }

        if (message.includes('unauthorized') || message.includes('authentication')) {
            return {
                shouldRetry: false,
                userMessage: '身份验证失败。请重新登录。',
                technicalMessage: `Authentication error: ${error.message}`,
                severity: 'medium',
                actions: [
                    { label: '重新登录', action: 'login', primary: true }
                ]
            };
        }

        // Default generic error handling
        return {
            shouldRetry: true,
            retryDelay: 2000,
            userMessage: '操作失败。请重试或联系客服。',
            technicalMessage: `Generic error: ${error.message}`,
            severity: 'medium',
            actions: [
                { label: '重试', action: 'retry', primary: true },
                { label: '联系客服', action: 'support' }
            ]
        };
    }

    /**
     * Log error for monitoring and debugging
     */
    private logError(error: Error, context: ErrorContext): void {
        const report: ErrorReport = {
            error,
            context,
            severity: this.getErrorSeverity(error),
            timestamp: new Date(),
            handled: true
        };

        // Add to local reports (for debugging)
        this.errorReports.unshift(report);
        if (this.errorReports.length > this.maxReports) {
            this.errorReports.pop();
        }

        // Log to console in development
        if (process.env.NODE_ENV === 'development') {
            console.group('🚨 Credit Error Handler');
            console.error('Error:', error);
            console.log('Context:', context);
            console.log('Report:', report);
            console.groupEnd();
        }

        // In production, send to monitoring service
        if (process.env.NODE_ENV === 'production') {
            this.sendToMonitoring(report);
        }
    }

    /**
     * Get error severity
     */
    private getErrorSeverity(error: Error): string {
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
            if (error.code === 'MISSING_API_KEY' || error.code === 'SERVICE_NOT_CONFIGURED') {
                return 'critical';
            }
            return 'high';
        }

        return 'medium';
    }

    /**
     * Send error report to monitoring service
     */
    private sendToMonitoring(report: ErrorReport): void {
        // In a real application, send to services like Sentry, LogRocket, etc.
        try {
            // Example: Sentry integration
            // Sentry.captureException(report.error, {
            //     tags: {
            //         operation: report.context.operation,
            //         severity: report.severity
            //     },
            //     extra: report.context
            // });

            // For now, just log to console
            console.error('Error report sent to monitoring:', report);
        } catch (monitoringError) {
            console.error('Failed to send error report to monitoring:', monitoringError);
        }
    }

    /**
     * Get recent error reports (for debugging)
     */
    public getRecentErrors(): ErrorReport[] {
        return [...this.errorReports];
    }

    /**
     * Clear error reports
     */
    public clearReports(): void {
        this.errorReports = [];
    }

    /**
     * Check if error should be retried
     */
    public shouldRetryError(error: Error, attemptCount: number = 0): boolean {
        const maxAttempts = 3;

        if (attemptCount >= maxAttempts) {
            return false;
        }

        if (error instanceof CreditError) {
            return error.retryable;
        }

        if (error instanceof LemonsqueezyError) {
            // Don't retry configuration errors
            if (['MISSING_API_KEY', 'SERVICE_NOT_CONFIGURED'].includes(error.code)) {
                return false;
            }
            return true;
        }

        // Retry network errors and temporary failures
        const message = error.message.toLowerCase();
        return message.includes('network') ||
            message.includes('timeout') ||
            message.includes('temporary') ||
            message.includes('unavailable');
    }

    /**
     * Get retry delay for error
     */
    public getRetryDelay(error: Error, attemptCount: number = 0): number {
        const baseDelay = 1000; // 1 second
        const maxDelay = 30000; // 30 seconds

        // Exponential backoff
        const delay = Math.min(baseDelay * Math.pow(2, attemptCount), maxDelay);

        // Add some jitter to prevent thundering herd
        const jitter = Math.random() * 0.1 * delay;

        return delay + jitter;
    }
}

// Export singleton instance
export const creditErrorHandler = CreditErrorHandler.getInstance();

// Utility functions for common error handling patterns

/**
 * Wrap async credit operations with error handling
 */
export async function withCreditErrorHandling<T>(
    operation: () => Promise<T>,
    context: Partial<ErrorContext> = {}
): Promise<T> {
    try {
        return await operation();
    } catch (error) {
        const result = creditErrorHandler.handleCreditError(error as Error, context);

        // Re-throw with additional context
        const enhancedError = error as Error;
        (enhancedError as any).handlingResult = result;
        throw enhancedError;
    }
}

/**
 * Create a retry wrapper for credit operations
 */
export async function withRetry<T>(
    operation: () => Promise<T>,
    context: Partial<ErrorContext> = {},
    maxAttempts: number = 3
): Promise<T> {
    let lastError: Error;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        try {
            return await operation();
        } catch (error) {
            lastError = error as Error;

            const shouldRetry = creditErrorHandler.shouldRetryError(lastError, attempt);

            if (!shouldRetry || attempt === maxAttempts - 1) {
                throw lastError;
            }

            const delay = creditErrorHandler.getRetryDelay(lastError, attempt);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }

    throw lastError!;
}

/**
 * Create user-friendly error messages
 */
export function getUserFriendlyErrorMessage(error: Error): string {
    const result = creditErrorHandler.handleCreditError(error);
    return result.userMessage;
}

/**
 * Check if error is retryable
 */
export function isRetryableError(error: Error): boolean {
    return creditErrorHandler.shouldRetryError(error);
}

/**
 * Create credit error with proper typing
 */
export function createCreditError(
    type: CreditErrorType,
    message: string,
    retryable: boolean = false
): CreditError {
    return new CreditError(message, type, undefined, retryable);
}