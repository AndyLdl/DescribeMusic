/**
 * 统一的用户账户信息下拉框组件
 * 在首页和analyze页面中保持一致的样式和功能
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useCredit, useTrialCredit } from '../contexts/CreditContext';
import { useSubscription } from '../hooks/useSubscription';
import LoginModal from './auth/LoginModal';

interface UserAccountDropdownProps {
    className?: string;
}

export default function UserAccountDropdown({ className = '' }: UserAccountDropdownProps) {
    const { user, signOut, usageStatus } = useAuth();
    const { subscription: userSubscription, isActive: hasActiveSubscription } = useSubscription();
    const [showLoginModal, setShowLoginModal] = useState(false);
    const [showUserMenu, setShowUserMenu] = useState(false);
    const [trialCredits, setTrialCredits] = useState<number>(0);

    // 在顶层调用 hooks
    let trialCreditContext;
    try {
        trialCreditContext = useTrialCredit();
    } catch (error) {
        console.warn('Trial credit context not available:', error);
    }

    // 使用实际的积分数据
    const { credits, creditBalance, subscription, loading: creditLoading } = useCredit();

    const handleSignOut = async () => {
        try {
            console.log('Starting sign out process...');
            setShowUserMenu(false);

            // 调用 signOut，但不依赖其成功
            await signOut();
            console.log('Sign out completed');

            // 强制重定向到首页，确保用户状态清除
            setTimeout(() => {
                window.location.href = '/';
            }, 100);
        } catch (error: any) {
            console.error('Error signing out:', error);

            // 即使出错也要关闭菜单并重定向
            setShowUserMenu(false);

            // 对于会话缺失错误，不显示警告，直接重定向
            if (error?.message === 'Auth session missing!' || error?.name === 'AuthSessionMissingError') {
                console.log('Session already cleared, redirecting...');
                window.location.href = '/';
            } else {
                // 其他错误才显示警告
                alert('Sign out completed, but there was a minor issue. You will be redirected.');
                setTimeout(() => {
                    window.location.href = '/';
                }, 1000);
            }
        }
    };

    // 获取试用积分余额
    useEffect(() => {
        if (!user && trialCreditContext?.getTrialCreditBalance) {
            trialCreditContext.getTrialCreditBalance()
                .then(balance => {
                    console.log('💳 Navbar: Trial credits updated:', balance.remaining);
                    setTrialCredits(balance.remaining);
                })
                .catch(error => {
                    console.error('Failed to get trial credits in navbar:', error);
                    setTrialCredits(100); // 回退值
                });
        }
    }, [user, trialCreditContext]);

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Element;
            if (!target.closest('.user-dropdown-container')) {
                setShowUserMenu(false);
            }
        };

        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, []);

    if (user) {
        // 已登录用户的下拉菜单
        return (
            <div className={`relative user-dropdown-container flex-shrink-0 ${className}`}>
                <button
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="flex items-center gap-1.5 sm:gap-2 md:gap-3 px-2 py-1.5 sm:px-3 sm:py-2 text-sm text-white/90 hover:text-white transition-all duration-300 bg-slate-800/50 hover:bg-slate-700/50 rounded-md"
                >
                    <div className="w-7 h-7 sm:w-8 sm:h-8 bg-gradient-to-r from-violet-400 to-blue-400 rounded-full flex items-center justify-center text-white text-xs sm:text-sm font-semibold flex-shrink-0">
                        {user.email?.charAt(0).toUpperCase()}
                    </div>
                    {/* 移动端只显示数字，桌面端显示完整文本 */}
                    <div className="hidden md:block text-left min-w-0">
                        <div className="text-white text-sm font-medium truncate">
                            {creditLoading ? 'Loading...' : `${credits} Credits`}
                        </div>
                    </div>
                    {/* 移动端显示紧凑的积分数字 */}
                    <div className="md:hidden text-white text-xs font-semibold whitespace-nowrap">
                        {creditLoading ? '...' : credits}
                    </div>
                    <svg className="w-3 h-3 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </button>

                {/* User Dropdown Menu */}
                {showUserMenu && (
                    <div className={`absolute mt-2 w-72 bg-slate-800/95 backdrop-blur-md border border-slate-700 rounded-lg shadow-xl z-50 right-0`}>
                        <div className="p-4 border-b border-slate-700">
                            <div className="text-white text-sm font-medium">{user.email}</div>
                            <div className="text-slate-400 text-xs mt-1">
                                {hasActiveSubscription && userSubscription ? `${userSubscription.productName} Subscription` : 'Registered User'}
                            </div>

                            {/* Credit Balance Display */}
                            <div className="mt-3 space-y-2">
                                <div className="flex justify-between items-center">
                                    <span className="text-xs text-slate-400">Credit Balance</span>
                                    <span className="text-sm font-semibold text-green-400">
                                        {creditLoading ? '...' : credits}
                                    </span>
                                </div>

                                {creditBalance && (
                                    <div className="space-y-1">
                                        {creditBalance.monthly > 0 && (
                                            <div className="flex justify-between text-xs">
                                                <span className="text-slate-500">Monthly Credits</span>
                                                <span className="text-blue-400">{creditBalance.monthly}</span>
                                            </div>
                                        )}
                                        {creditBalance.purchased > 0 && (
                                            <div className="flex justify-between text-xs">
                                                <span className="text-slate-500">Purchased Credits</span>
                                                <span className="text-violet-400">{creditBalance.purchased}</span>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Subscription Status */}
                                {hasActiveSubscription && userSubscription && (
                                    <div className="mt-2 pt-2 border-t border-slate-700">
                                        <div className="flex justify-between text-xs">
                                            <span className="text-slate-500">Subscription Status</span>
                                            <span className={`capitalize ${userSubscription.status === 'active' ? 'text-green-400' :
                                                userSubscription.status === 'cancelled' ? 'text-red-400' :
                                                    'text-yellow-400'
                                                }`}>
                                                {userSubscription.status === 'active' ? 'Active' :
                                                    userSubscription.status === 'cancelled' ? 'Cancelled' :
                                                        userSubscription.status === 'expired' ? 'Expired' : 'Pending'}
                                            </span>
                                        </div>
                                        {userSubscription.status === 'active' && (
                                            <div className="flex justify-between text-xs mt-1">
                                                <span className="text-slate-500">Renewal Date</span>
                                                <span className="text-slate-400">
                                                    {userSubscription.renewsAt.toLocaleDateString('en-US')}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="p-2">
                            <a
                                href="/analyze"
                                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-300 hover:text-white hover:bg-slate-700/50 rounded-md transition-all duration-200"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                                </svg>
                                Analyze Audio
                            </a>
                            {/* 根据订阅状态显示不同的链接 */}
                            {hasActiveSubscription ? (
                                <a
                                    href="/pricing"
                                    className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-300 hover:text-white hover:bg-slate-700/50 rounded-md transition-all duration-200"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                    Manage Subscription
                                </a>
                            ) : (
                                <a
                                    href="/pricing"
                                    className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-300 hover:text-white hover:bg-slate-700/50 rounded-md transition-all duration-200"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                                    </svg>
                                    Purchase Credits
                                </a>
                            )}
                            <button
                                onClick={handleSignOut}
                                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-300 hover:text-white hover:bg-slate-700/50 rounded-md transition-all duration-200"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                </svg>
                                Sign Out
                            </button>
                        </div>
                    </div>
                )}
            </div>
        );
    } else {
        // 未登录用户的显示
        return (
            <div className={`flex items-center gap-3 ${className}`}>
                {/* Trial Credits Display - Clickable */}
                <a
                    href="/analyze/"
                    className="hidden sm:flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500/10 to-violet-500/10 border border-blue-500/20 hover:border-blue-500/40 rounded-lg backdrop-blur-sm transition-all duration-300 group"
                >
                    <svg className="w-4 h-4 text-blue-400 group-hover:text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                    </svg>
                    <div className="flex flex-col">
                        <span className="text-blue-400 group-hover:text-blue-300 text-sm font-semibold transition-colors">
                            {trialCredits} Credits
                        </span>
                        <span className="text-slate-400 group-hover:text-slate-300 text-xs transition-colors">
                            Click to start
                        </span>
                    </div>
                    <svg className="w-3 h-3 text-slate-400 group-hover:text-slate-300 group-hover:translate-x-0.5 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                </a>

                {/* Sign In Button - More Prominent */}
                <button
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log('🔐 Sign In button clicked in UserAccountDropdown');
                        setShowLoginModal(true);
                    }}
                    data-login-trigger
                    className="px-4 py-2 text-white bg-slate-700/50 hover:bg-slate-600/50 border border-slate-600 hover:border-slate-500 rounded-lg transition-all duration-300 text-sm font-medium backdrop-blur-sm"
                >
                    Sign In
                </button>

                {/* Login Modal */}
                {showLoginModal && (
                    <LoginModal
                        isOpen={showLoginModal}
                        onClose={() => {
                            console.log('🔐 LoginModal onClose called from UserAccountDropdown');
                            setShowLoginModal(false);
                        }}
                        defaultMode="login"
                    />
                )}
            </div>
        );
    }
}