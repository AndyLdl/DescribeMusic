/**
 * 用户菜单组件
 * 显示用户信息和账户操作
 */

import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';

interface UserMenuProps {
    onOpenLogin: () => void;
}

export default function UserMenu({ onOpenLogin }: UserMenuProps) {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const { user, signOut, usageStatus, loading } = useAuth();

    // 点击外部关闭菜单
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    // 处理登出
    const handleSignOut = async () => {
        try {
            await signOut();
            setIsOpen(false);
        } catch (error) {
            console.error('Sign out error:', error);
        }
    };

    // 如果正在加载，显示加载状态
    if (loading) {
        return (
            <div className="w-8 h-8 bg-white/10 rounded-full animate-pulse"></div>
        );
    }

    // 如果未登录，显示登录按钮
    if (!user) {
        return (
            <button
                onClick={onOpenLogin}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-violet-500 to-blue-500 rounded-full hover:from-violet-600 hover:to-blue-600 transition-all duration-300 group overflow-hidden shadow-lg hover:shadow-violet-500/25"
            >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                登录
            </button>
        );
    }

    // 已登录用户菜单
    return (
        <div className="relative" ref={menuRef}>
            {/* 用户头像按钮 */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-3 p-2 rounded-full hover:bg-white/5 transition-colors duration-300 group"
            >
                {/* 头像 */}
                <div className="w-8 h-8 bg-gradient-to-r from-violet-500 to-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-medium">
                        {user.email?.charAt(0).toUpperCase() || 'U'}
                    </span>
                </div>

                {/* 用户信息（桌面端显示） */}
                <div className="hidden md:block text-left">
                    <div className="text-sm font-medium text-white">
                        {user.email?.split('@')[0] || 'User'}
                    </div>
                    {usageStatus && (
                        <div className="text-xs text-slate-400">
                            {usageStatus.userType === 'registered'
                                ? `剩余 ${usageStatus.remaining}/${usageStatus.total} 次`
                                : `试用 ${usageStatus.remaining}/5 次`
                            }
                        </div>
                    )}
                </div>

                {/* 下拉箭头 */}
                <svg
                    className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {/* 下拉菜单 */}
            {isOpen && (
                <div className="absolute right-0 top-full mt-2 w-64 bg-slate-800/95 backdrop-blur-md border border-slate-700 rounded-lg shadow-xl z-50">
                    <div className="p-4 border-b border-slate-700">
                        {/* 用户信息 */}
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 bg-gradient-to-r from-violet-500 to-blue-500 rounded-full flex items-center justify-center">
                                <span className="text-white font-medium">
                                    {user.email?.charAt(0).toUpperCase() || 'U'}
                                </span>
                            </div>
                            <div>
                                <div className="text-sm font-medium text-white">
                                    {user.email?.split('@')[0] || 'User'}
                                </div>
                                <div className="text-xs text-slate-400">
                                    {user.email}
                                </div>
                            </div>
                        </div>

                        {/* 使用状态 */}
                        {usageStatus && (
                            <div className="bg-white/5 rounded-lg p-3">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm text-slate-300">
                                        {usageStatus.userType === 'registered' ? '本月使用情况' : '试用情况'}
                                    </span>
                                    <span className={`text-sm font-medium ${usageStatus.remaining > 2 ? 'text-green-400' :
                                            usageStatus.remaining > 0 ? 'text-orange-400' : 'text-red-400'
                                        }`}>
                                        {usageStatus.remaining}/{usageStatus.total}
                                    </span>
                                </div>

                                {/* 进度条 */}
                                <div className="w-full bg-white/10 rounded-full h-2">
                                    <div
                                        className={`h-2 rounded-full transition-all duration-300 ${usageStatus.remaining > 2 ? 'bg-green-400' :
                                                usageStatus.remaining > 0 ? 'bg-orange-400' : 'bg-red-400'
                                            }`}
                                        style={{
                                            width: `${(usageStatus.remaining / usageStatus.total) * 100}%`
                                        }}
                                    />
                                </div>

                                {usageStatus.resetDate && (
                                    <div className="text-xs text-slate-400 mt-1">
                                        下次重置：{usageStatus.resetDate.getMonth() + 1}月{usageStatus.resetDate.getDate()}日
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* 菜单项 */}
                    <div className="p-2">
                        <button
                            onClick={() => {
                                setIsOpen(false);
                                // 这里可以添加账户设置功能
                                console.log('Open account settings');
                            }}
                            className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-300 hover:text-white hover:bg-slate-700/50 rounded-md transition-all duration-200"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            账户设置
                        </button>

                        <button
                            onClick={() => {
                                setIsOpen(false);
                                // 这里可以添加帮助功能
                                window.open('/docs/supabase-setup.md', '_blank');
                            }}
                            className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-300 hover:text-white hover:bg-slate-700/50 rounded-md transition-all duration-200"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            帮助中心
                        </button>

                        <div className="border-t border-slate-700 my-2"></div>

                        <button
                            onClick={handleSignOut}
                            className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-md transition-all duration-200"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                            退出登录
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}