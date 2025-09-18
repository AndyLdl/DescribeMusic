/**
 * Custom Confirm Dialog Component
 * 自定义确认对话框组件
 */

import { useState, useEffect } from 'react';

interface ConfirmDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    type?: 'danger' | 'warning' | 'info';
    loading?: boolean;
}

export default function ConfirmDialog({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    type = 'danger',
    loading = false
}: ConfirmDialogProps) {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setIsVisible(true);
            // 防止背景滚动
            document.body.style.overflow = 'hidden';
        } else {
            // 延迟隐藏以显示关闭动画
            const timer = setTimeout(() => setIsVisible(false), 150);
            document.body.style.overflow = 'unset';
            return () => clearTimeout(timer);
        }

        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    const handleBackdropClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            onClose();
        }
        if (e.key === 'Enter' && !loading) {
            onConfirm();
        }
    };

    const getTypeStyles = () => {
        switch (type) {
            case 'danger':
                return {
                    icon: (
                        <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                    ),
                    iconBg: 'bg-red-500/20',
                    confirmButton: 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
                };
            case 'warning':
                return {
                    icon: (
                        <svg className="w-6 h-6 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    ),
                    iconBg: 'bg-orange-500/20',
                    confirmButton: 'bg-orange-600 hover:bg-orange-700 focus:ring-orange-500'
                };
            case 'info':
                return {
                    icon: (
                        <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    ),
                    iconBg: 'bg-blue-500/20',
                    confirmButton: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
                };
        }
    };

    const typeStyles = getTypeStyles();

    if (!isVisible) return null;

    return (
        <div
            className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-150 ${isOpen ? 'opacity-100' : 'opacity-0'
                }`}
            onClick={handleBackdropClick}
            onKeyDown={handleKeyDown}
            tabIndex={-1}
        >
            {/* 背景遮罩 */}
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

            {/* 对话框 */}
            <div
                className={`relative w-full max-w-md transform transition-all duration-150 ${isOpen ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
                    }`}
            >
                <div className="bg-slate-800 rounded-2xl shadow-2xl border border-slate-700 overflow-hidden">
                    {/* 头部 */}
                    <div className="p-6 pb-4">
                        <div className="flex items-start gap-4">
                            {/* 图标 */}
                            <div className={`flex-shrink-0 w-12 h-12 rounded-full ${typeStyles.iconBg} flex items-center justify-center`}>
                                {typeStyles.icon}
                            </div>

                            {/* 内容 */}
                            <div className="flex-1 min-w-0">
                                <h3 className="text-lg font-semibold text-white mb-2">
                                    {title}
                                </h3>
                                <p className="text-slate-300 text-sm leading-relaxed">
                                    {message}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* 按钮区域 */}
                    <div className="px-6 py-4 bg-slate-900/50 flex gap-3 justify-end">
                        <button
                            onClick={onClose}
                            disabled={loading}
                            className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {cancelText}
                        </button>

                        <button
                            onClick={onConfirm}
                            disabled={loading}
                            className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 ${typeStyles.confirmButton} flex items-center gap-2`}
                        >
                            {loading && (
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            )}
                            {confirmText}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}