/**
 * Credit Toast Notification Component
 * Provides user-friendly notifications for credit and payment operations
 */

import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';

// Toast types
export type ToastType = 'success' | 'error' | 'warning' | 'info' | 'loading';

// Toast interface
export interface Toast {
    id: string;
    type: ToastType;
    title: string;
    message: string;
    duration?: number;
    actions?: Array<{
        label: string;
        action: () => void;
        variant?: 'primary' | 'secondary';
    }>;
    persistent?: boolean;
}

// Toast context for managing toasts globally
interface ToastContextType {
    toasts: Toast[];
    addToast: (toast: Omit<Toast, 'id'>) => string;
    removeToast: (id: string) => void;
    clearToasts: () => void;
}

// Global toast state
let toastState: {
    toasts: Toast[];
    listeners: Set<(toasts: Toast[]) => void>;
} = {
    toasts: [],
    listeners: new Set()
};

// Toast manager functions
const addToast = (toast: Omit<Toast, 'id'>): string => {
    // Only generate IDs on client side to avoid hydration mismatches
    if (typeof window === 'undefined') {
        return '';
    }
    
    const id = `toast-${Date.now()}-${Math.floor(Math.random() * 1000000)}`;
    const newToast: Toast = {
        ...toast,
        id,
        duration: toast.duration ?? (toast.type === 'error' ? 8000 : 5000)
    };

    toastState.toasts = [...toastState.toasts, newToast];
    toastState.listeners.forEach(listener => listener(toastState.toasts));

    // Auto-remove toast after duration (unless persistent)
    if (!newToast.persistent && newToast.duration && newToast.duration > 0) {
        setTimeout(() => {
            removeToast(id);
        }, newToast.duration);
    }

    return id;
};

const removeToast = (id: string): void => {
    toastState.toasts = toastState.toasts.filter(toast => toast.id !== id);
    toastState.listeners.forEach(listener => listener(toastState.toasts));
};

const clearToasts = (): void => {
    toastState.toasts = [];
    toastState.listeners.forEach(listener => listener(toastState.toasts));
};

// Individual toast component
interface ToastItemProps {
    toast: Toast;
    onRemove: (id: string) => void;
}

function ToastItem({ toast, onRemove }: ToastItemProps) {
    const [isVisible, setIsVisible] = useState(false);
    const [isRemoving, setIsRemoving] = useState(false);

    useEffect(() => {
        // Trigger entrance animation
        const timer = setTimeout(() => setIsVisible(true), 10);
        return () => clearTimeout(timer);
    }, []);

    const handleRemove = useCallback(() => {
        setIsRemoving(true);
        setTimeout(() => {
            onRemove(toast.id);
        }, 300); // Match exit animation duration
    }, [toast.id, onRemove]);

    const getToastIcon = () => {
        switch (toast.type) {
            case 'success':
                return (
                    <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                );
            case 'error':
                return (
                    <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                );
            case 'warning':
                return (
                    <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                );
            case 'info':
                return (
                    <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                );
            case 'loading':
                return (
                    <svg className="w-5 h-5 text-blue-400 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                );
            default:
                return null;
        }
    };

    const getToastStyles = () => {
        const baseStyles = "glass-pane p-4 rounded-lg shadow-lg border-l-4 transition-all duration-300 ease-in-out";

        let colorStyles = "";
        switch (toast.type) {
            case 'success':
                colorStyles = "border-green-400 bg-green-900/20";
                break;
            case 'error':
                colorStyles = "border-red-400 bg-red-900/20";
                break;
            case 'warning':
                colorStyles = "border-yellow-400 bg-yellow-900/20";
                break;
            case 'info':
                colorStyles = "border-blue-400 bg-blue-900/20";
                break;
            case 'loading':
                colorStyles = "border-blue-400 bg-blue-900/20";
                break;
            default:
                colorStyles = "border-slate-400 bg-slate-900/20";
        }

        const visibilityStyles = isVisible && !isRemoving
            ? "translate-x-0 opacity-100"
            : "translate-x-full opacity-0";

        return `${baseStyles} ${colorStyles} ${visibilityStyles}`;
    };

    return (
        <div className={getToastStyles()}>
            <div className="flex items-start space-x-3">
                {/* Icon */}
                <div className="flex-shrink-0 mt-0.5">
                    {getToastIcon()}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-white">
                        {toast.title}
                    </h4>
                    <p className="text-sm text-slate-300 mt-1">
                        {toast.message}
                    </p>

                    {/* Actions */}
                    {toast.actions && toast.actions.length > 0 && (
                        <div className="flex space-x-2 mt-3">
                            {toast.actions.map((action, index) => (
                                <button
                                    key={index}
                                    onClick={action.action}
                                    className={`px-3 py-1 text-xs font-medium rounded transition-colors ${action.variant === 'primary'
                                            ? 'bg-violet-600 hover:bg-violet-700 text-white'
                                            : 'bg-white/10 hover:bg-white/20 text-white'
                                        }`}
                                >
                                    {action.label}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Close button */}
                {!toast.persistent && (
                    <button
                        onClick={handleRemove}
                        className="flex-shrink-0 text-slate-400 hover:text-white transition-colors"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                )}
            </div>
        </div>
    );
}

// Toast container component
export function CreditToastContainer() {
    const [toasts, setToasts] = useState<Toast[]>([]);

    useEffect(() => {
        const listener = (newToasts: Toast[]) => {
            setToasts(newToasts);
        };

        toastState.listeners.add(listener);
        setToasts(toastState.toasts);

        return () => {
            toastState.listeners.delete(listener);
        };
    }, []);

    if (toasts.length === 0) {
        return null;
    }

    return createPortal(
        <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm w-full">
            {toasts.map(toast => (
                <ToastItem
                    key={toast.id}
                    toast={toast}
                    onRemove={removeToast}
                />
            ))}
        </div>,
        document.body
    );
}

// Hook for using toasts
export function useCreditToast() {
    return {
        addToast,
        removeToast,
        clearToasts,

        // Convenience methods for different toast types
        success: (title: string, message: string, actions?: Toast['actions']) =>
            addToast({ type: 'success', title, message, actions }),

        error: (title: string, message: string, actions?: Toast['actions']) =>
            addToast({ type: 'error', title, message, actions, duration: 8000 }),

        warning: (title: string, message: string, actions?: Toast['actions']) =>
            addToast({ type: 'warning', title, message, actions }),

        info: (title: string, message: string, actions?: Toast['actions']) =>
            addToast({ type: 'info', title, message, actions }),

        loading: (title: string, message: string, persistent: boolean = true) =>
            addToast({ type: 'loading', title, message, persistent }),

        // Credit-specific convenience methods
        creditSuccess: (amount: number, operation: string = '操作') =>
            addToast({
                type: 'success',
                title: '积分操作成功',
                message: `${operation}成功，${operation.includes('消费') ? '消费' : '获得'} ${amount} 积分`
            }),

        creditError: (message: string, actions?: Toast['actions']) =>
            addToast({
                type: 'error',
                title: '积分操作失败',
                message,
                actions,
                duration: 8000
            }),

        paymentSuccess: (amount: number, credits: number) =>
            addToast({
                type: 'success',
                title: '支付成功',
                message: `支付 $${amount} 成功，已获得 ${credits} 积分`
            }),

        paymentError: (message: string, actions?: Toast['actions']) =>
            addToast({
                type: 'error',
                title: '支付失败',
                message,
                actions: actions || [
                    { label: '重试', action: () => window.location.reload() },
                    { label: '联系客服', action: () => window.location.href = 'mailto:support@example.com' }
                ],
                duration: 10000
            }),

        insufficientCredits: (required: number, available: number, onPurchase?: () => void) =>
            addToast({
                type: 'warning',
                title: '积分不足',
                message: `需要 ${required} 积分，当前余额 ${available} 积分`,
                actions: onPurchase ? [
                    { label: '购买积分', action: onPurchase, variant: 'primary' },
                    { label: '查看定价', action: () => window.location.href = '/pricing' }
                ] : [
                    { label: '查看定价', action: () => window.location.href = '/pricing', variant: 'primary' }
                ],
                duration: 8000
            }),

        networkError: (operation: string = '操作') =>
            addToast({
                type: 'error',
                title: '网络错误',
                message: `${operation}失败，请检查网络连接`,
                actions: [
                    { label: '重试', action: () => window.location.reload(), variant: 'primary' }
                ],
                duration: 6000
            })
    };
}

// Export toast functions for direct use
export { addToast, removeToast, clearToasts };