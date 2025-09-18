/**
 * Usage Limit Indicator Component
 * Displays user's usage count and limit status
 */

import React, { useState } from 'react';
import type { UsageStatus, User } from '../../lib/supabase';

interface UsageIndicatorProps {
    usageStatus: UsageStatus | null;
    user: User | null;
    onOpenLogin?: () => void;
}

export default function UsageIndicator({ usageStatus, user, onOpenLogin }: UsageIndicatorProps) {
    const [showDetails, setShowDetails] = useState(false);

    // 如果没有使用状态，不显示
    if (!usageStatus) {
        return null;
    }

    // 试用用户显示
    if (usageStatus.userType === 'trial') {
        return (
            <div className="glass-pane p-6 mb-8">
                <div className="flex items-start gap-4">
                    {/* 图标 */}
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${usageStatus.remaining > 2
                        ? 'bg-gradient-to-r from-blue-500 to-cyan-500'
                        : usageStatus.remaining > 0
                            ? 'bg-gradient-to-r from-orange-500 to-yellow-500'
                            : 'bg-gradient-to-r from-red-500 to-pink-500'
                        }`}>
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                    </div>

                    <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-lg font-semibold text-white">Free Trial</h3>
                            <span className={`text-lg font-bold ${usageStatus.remaining > 2 ? 'text-blue-400' :
                                usageStatus.remaining > 0 ? 'text-orange-400' : 'text-red-400'
                                }`}>
                                {usageStatus.remaining}/5 left
                            </span>
                        </div>

                        {/* 进度条 */}
                        <div className="w-full bg-white/10 rounded-full h-3 mb-3">
                            <div
                                className={`h-3 rounded-full transition-all duration-500 ${usageStatus.remaining > 2 ? 'bg-gradient-to-r from-blue-500 to-cyan-500' :
                                    usageStatus.remaining > 0 ? 'bg-gradient-to-r from-orange-500 to-yellow-500' :
                                        'bg-gradient-to-r from-red-500 to-pink-500'
                                    }`}
                                style={{
                                    width: `${(usageStatus.remaining / 5) * 100}%`
                                }}
                            />
                        </div>

                        {/* 状态信息 */}
                        {usageStatus.remaining > 0 ? (
                            <div className="space-y-2">
                                <p className="text-slate-300 text-sm">
                                    {usageStatus.remaining > 2
                                        ? `${usageStatus.remaining} free analyses remaining`
                                        : `Only ${usageStatus.remaining} trial uses left`
                                    }
                                </p>

                                {usageStatus.remaining <= 2 && (
                                    <div className="bg-gradient-to-r from-violet-500/10 to-blue-500/10 rounded-lg p-4 border border-violet-500/20">
                                        <div className="flex items-start gap-3">
                                            <div className="w-6 h-6 bg-gradient-to-r from-violet-500 to-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                                                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                </svg>
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-medium text-white mb-1">Sign up for more</h4>
                                                <p className="text-xs text-slate-300 mb-2">
                                                    Get 200 credits for audio analysis and save your history
                                                </p>
                                                {onOpenLogin && (
                                                    <button
                                                        onClick={onOpenLogin}
                                                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-violet-500 to-blue-500 text-white text-xs rounded-full hover:from-violet-600 hover:to-blue-600 transition-all duration-300"
                                                    >
                                                        Sign Up Now
                                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                        </svg>
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="bg-red-500/10 rounded-lg p-4 border border-red-500/20">
                                <div className="flex items-start gap-3">
                                    <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-medium text-white mb-1">Trial uses exhausted</h4>
                                        <p className="text-xs text-slate-300 mb-2">
                                            Sign up to get 200 credits for audio analysis and save your analysis history
                                        </p>
                                        {onOpenLogin && (
                                            <button
                                                onClick={onOpenLogin}
                                                className="inline-flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-violet-500 to-blue-500 text-white text-xs rounded-full hover:from-violet-600 hover:to-blue-600 transition-all duration-300"
                                            >
                                                Sign Up Now
                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                </svg>
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // 注册用户显示
    return (
        <div className="glass-pane p-6 mb-8">
            <div className="flex items-start gap-4">
                {/* 图标 */}
                <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${usageStatus.remaining > 5
                    ? 'bg-gradient-to-r from-green-500 to-emerald-500'
                    : usageStatus.remaining > 2
                        ? 'bg-gradient-to-r from-blue-500 to-cyan-500'
                        : usageStatus.remaining > 0
                            ? 'bg-gradient-to-r from-orange-500 to-yellow-500'
                            : 'bg-gradient-to-r from-red-500 to-pink-500'
                    }`}>
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                </div>

                <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                        <div>
                            <h3 className="text-lg font-semibold text-white">Monthly Usage</h3>
                            {user && (
                                <p className="text-sm text-slate-400">
                                    Welcome back, {user.email?.split('@')[0]}
                                </p>
                            )}
                        </div>
                        <div className="text-right">
                            <span className={`text-lg font-bold ${usageStatus.remaining > 5 ? 'text-green-400' :
                                usageStatus.remaining > 2 ? 'text-blue-400' :
                                    usageStatus.remaining > 0 ? 'text-orange-400' : 'text-red-400'
                                }`}>
                                {usageStatus.remaining}/{usageStatus.total}
                            </span>
                            <p className="text-xs text-slate-400">remaining</p>
                        </div>
                    </div>

                    {/* 进度条 */}
                    <div className="w-full bg-white/10 rounded-full h-3 mb-3">
                        <div
                            className={`h-3 rounded-full transition-all duration-500 ${usageStatus.remaining > 5 ? 'bg-gradient-to-r from-green-500 to-emerald-500' :
                                usageStatus.remaining > 2 ? 'bg-gradient-to-r from-blue-500 to-cyan-500' :
                                    usageStatus.remaining > 0 ? 'bg-gradient-to-r from-orange-500 to-yellow-500' :
                                        'bg-gradient-to-r from-red-500 to-pink-500'
                                }`}
                            style={{
                                width: `${(usageStatus.remaining / usageStatus.total) * 100}%`
                            }}
                        />
                    </div>

                    {/* 详细信息 */}
                    <div className="flex items-center justify-between">
                        <div className="text-sm text-slate-300">
                            {usageStatus.remaining > 0 ? (
                                usageStatus.remaining > 5
                                    ? `Plenty of analyses left this month`
                                    : usageStatus.remaining > 2
                                        ? `${usageStatus.remaining} analyses remaining this month`
                                        : `Only ${usageStatus.remaining} analyses left this month`
                            ) : (
                                'Monthly analyses exhausted'
                            )}
                        </div>

                        <button
                            onClick={() => setShowDetails(!showDetails)}
                            className="text-xs text-violet-400 hover:text-violet-300 transition-colors duration-200 flex items-center gap-1"
                        >
                            {showDetails ? 'Hide' : 'Details'}
                            <svg
                                className={`w-3 h-3 transition-transform duration-200 ${showDetails ? 'rotate-180' : ''}`}
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </button>
                    </div>

                    {/* 展开的详细信息 */}
                    {showDetails && (
                        <div className="mt-4 pt-4 border-t border-white/10 space-y-3">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span className="text-slate-400">Monthly Limit</span>
                                    <div className="text-white font-medium">{usageStatus.total} uses</div>
                                </div>
                                <div>
                                    <span className="text-slate-400">Used</span>
                                    <div className="text-white font-medium">{usageStatus.total - usageStatus.remaining} uses</div>
                                </div>
                            </div>

                            {usageStatus.resetDate && (
                                <div className="text-sm">
                                    <span className="text-slate-400">Next Reset:</span>
                                    <span className="text-white font-medium ml-1">
                                        {usageStatus.resetDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                    </span>
                                </div>
                            )}

                            {usageStatus.remaining === 0 && (
                                <div className="bg-orange-500/10 rounded-lg p-3 border border-orange-500/20">
                                    <div className="flex items-start gap-2">
                                        <svg className="w-4 h-4 text-orange-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                        </svg>
                                        <div>
                                            <p className="text-sm text-orange-300 font-medium">Monthly quota exhausted</p>
                                            <p className="text-xs text-orange-200 mt-1">
                                                Please wait for next month's reset or contact us for upgrade options
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}