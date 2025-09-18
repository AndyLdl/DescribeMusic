/**
 * 认证功能测试组件
 * 用于测试Google登录和其他认证功能
 */

import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import LoginModal from './LoginModal';

export default function AuthTest() {
    const { user, signOut, loading } = useAuth();
    const [showLoginModal, setShowLoginModal] = useState(false);

    const handleSignOut = async () => {
        try {
            await signOut();
            console.log('✅ 登出成功');
        } catch (error) {
            console.error('❌ 登出失败:', error);
        }
    };

    return (
        <div className="p-8 max-w-2xl mx-auto">
            <div className="glass-pane p-6">
                <h2 className="text-2xl font-bold text-white mb-6">认证功能测试</h2>

                {loading ? (
                    <div className="flex items-center gap-3 text-slate-300">
                        <div className="w-5 h-5 border-2 border-slate-300 border-t-white rounded-full animate-spin"></div>
                        <span>正在加载用户信息...</span>
                    </div>
                ) : user ? (
                    <div className="space-y-4">
                        <div className="p-4 bg-green-500/20 border border-green-500/30 rounded-lg">
                            <h3 className="text-green-300 font-medium mb-2">✅ 已登录</h3>
                            <div className="text-sm text-green-200 space-y-1">
                                <p><strong>用户ID:</strong> {user.id}</p>
                                <p><strong>邮箱:</strong> {user.email}</p>
                                <p><strong>创建时间:</strong> {new Date(user.created_at).toLocaleString('zh-CN')}</p>
                                {user.last_sign_in_at && (
                                    <p><strong>最后登录:</strong> {new Date(user.last_sign_in_at).toLocaleString('zh-CN')}</p>
                                )}
                                {user.user_metadata && Object.keys(user.user_metadata).length > 0 && (
                                    <div>
                                        <p><strong>用户信息:</strong></p>
                                        <pre className="text-xs bg-black/20 p-2 rounded mt-1 overflow-auto">
                                            {JSON.stringify(user.user_metadata, null, 2)}
                                        </pre>
                                    </div>
                                )}
                            </div>
                        </div>

                        <button
                            onClick={handleSignOut}
                            className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 hover:border-red-500/50 text-red-300 rounded-lg transition-all duration-300"
                        >
                            登出
                        </button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="p-4 bg-slate-500/20 border border-slate-500/30 rounded-lg">
                            <h3 className="text-slate-300 font-medium mb-2">未登录</h3>
                            <p className="text-sm text-slate-400">
                                点击下方按钮测试登录功能
                            </p>
                        </div>

                        <button
                            onClick={() => setShowLoginModal(true)}
                            className="px-6 py-3 bg-gradient-to-r from-violet-500 to-blue-500 hover:from-violet-600 hover:to-blue-600 text-white rounded-lg font-medium transition-all duration-300"
                        >
                            打开登录模态框
                        </button>
                    </div>
                )}

                {/* 功能说明 */}
                <div className="mt-8 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                    <h4 className="text-blue-300 font-medium mb-2">🧪 测试功能</h4>
                    <ul className="text-sm text-blue-200 space-y-1">
                        <li>• Google OAuth 登录</li>
                        <li>• 邮箱密码登录</li>
                        <li>• 用户注册</li>
                        <li>• 密码重置</li>
                        <li>• 用户信息显示</li>
                        <li>• 登出功能</li>
                    </ul>
                </div>
            </div>

            {/* 登录模态框 */}
            {showLoginModal && (
                <LoginModal
                    isOpen={showLoginModal}
                    onClose={() => setShowLoginModal(false)}
                />
            )}
        </div>
    );
}