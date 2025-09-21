/**
 * Authentication Context and Provider - STABLE VERSION
 * 修复无限循环问题的稳定版本
 */

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { DeviceFingerprint } from '../utils/deviceFingerprint';
import type {
    User,
    Session,
    AuthResponse,
    UsageStatus,
    DeviceUsageStatus
} from '../lib/supabase';

// Authentication Context type definition
interface AuthContextType {
    // Authentication state
    user: User | null;
    session: Session | null;
    loading: boolean;

    // Usage limit state
    usageStatus: UsageStatus | null;
    deviceFingerprint: string | null;

    // Authentication methods
    signUp: (email: string, password: string) => Promise<AuthResponse>;
    signIn: (email: string, password: string) => Promise<AuthResponse>;
    signInWithGoogle: () => Promise<AuthResponse>;
    signOut: () => Promise<void>;
    resetPassword: (email: string) => Promise<void>;

    // Usage limit methods
    checkUsageLimit: () => Promise<UsageStatus>;
    consumeUsage: () => Promise<void>;
    refreshUsageStatus: () => Promise<void>;

    // Device fingerprint methods
    getDeviceFingerprint: () => Promise<string>;
    clearDeviceCache: () => void;
}

// Create Context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Provider component props
interface AuthProviderProps {
    children: React.ReactNode;
}

// Authentication Provider component
export function AuthProvider({ children }: AuthProviderProps) {
    console.log('🔐 AuthProvider component rendered');

    React.useEffect(() => {
        console.log('🔐 AuthProvider mounted');
        return () => {
            console.log('🔐 AuthProvider unmounted');
        };
    }, []);

    // State management
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);
    const [usageStatus, setUsageStatus] = useState<UsageStatus | null>(null);
    const [deviceFingerprint, setDeviceFingerprint] = useState<string | null>(null);

    // 使用 ref 来避免重复订阅
    const subscriptionRef = useRef<any>(null);
    const initializedRef = useRef(false);

    // Get device fingerprint
    const getDeviceFingerprint = useCallback(async (): Promise<string> => {
        if (deviceFingerprint) {
            return deviceFingerprint;
        }

        try {
            const fingerprint = await DeviceFingerprint.generate();
            setDeviceFingerprint(fingerprint);
            return fingerprint;
        } catch (error) {
            console.error('Error generating device fingerprint:', error);
            const fallbackFingerprint = `fallback_${Date.now()}_${Math.random()}`;
            setDeviceFingerprint(fallbackFingerprint);
            return fallbackFingerprint;
        }
    }, [deviceFingerprint]);

    // Check usage limits - 简化版本
    const checkUsageLimit = useCallback(async (): Promise<UsageStatus> => {
        console.log('🔐 Checking usage limit (simplified)');

        if (user) {
            return {
                allowed: true,
                remaining: 999,
                total: 999,
                requiresAuth: false,
                userType: 'registered',
                message: '已登录用户 - 无限制使用'
            };
        } else {
            return {
                allowed: true,
                remaining: 100,
                total: 100,
                requiresAuth: false,
                userType: 'trial',
                message: 'Trial Mode - 100 Credits'
            };
        }
    }, [user]);

    // 消费使用次数 - 简化版本
    const consumeUsage = useCallback(async (): Promise<void> => {
        console.log('🔐 Consume usage (simplified)');
    }, []);

    // 刷新使用状态
    const refreshUsageStatus = useCallback(async (): Promise<void> => {
        try {
            const status = await checkUsageLimit();
            setUsageStatus(status);
        } catch (error) {
            console.error('Error refreshing usage status:', error);
        }
    }, [checkUsageLimit]);

    // 用户注册
    const signUp = useCallback(async (email: string, password: string): Promise<AuthResponse> => {
        try {
            // 不要在注册时改变全局 loading 状态，避免触发整个应用重新渲染
            // setLoading(true);

            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        registered_at: new Date().toISOString(),
                    },
                    emailRedirectTo: typeof window !== 'undefined' ? `${window.location.origin}/analyze` : undefined
                }
            });

            if (error) {
                return { data: { user: null, session: null }, error };
            }

            if (data.user) {
                console.log('🔐 User registered successfully:', data.user.email);
                console.log('🔐 Email confirmation required - user will need to check email');
            }

            return { data, error: null };
        } catch (error: any) {
            return {
                data: { user: null, session: null },
                error: error
            };
        } finally {
            // 不要在注册时改变全局 loading 状态
            // setLoading(false);
        }
    }, []);

    // 用户登录
    const signIn = useCallback(async (email: string, password: string): Promise<AuthResponse> => {
        try {
            setLoading(true);

            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password
            });

            if (error) {
                return { data: { user: null, session: null }, error };
            }

            // 🔧 登录成功后立即更新状态，不等待事件
            if (data.session && data.user) {
                console.log('🔐 Login successful, updating state immediately');
                setSession(data.session as any);
                setUser(data.user as any);
                setUsageStatus({
                    allowed: true,
                    remaining: 999,
                    total: 999,
                    requiresAuth: false,
                    userType: 'registered',
                    message: 'Registered user'
                });
            }

            return { data, error: null };
        } catch (error: any) {
            return {
                data: { user: null, session: null },
                error: error
            };
        } finally {
            setLoading(false);
        }
    }, []);

    // Google登录
    const signInWithGoogle = useCallback(async (): Promise<AuthResponse> => {
        try {
            setLoading(true);

            const { data, error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/analyze` : undefined,
                    queryParams: {
                        access_type: 'offline',
                        prompt: 'consent',
                    },
                }
            });

            if (error) {
                return { data: { user: null, session: null }, error };
            }

            // OAuth登录会重定向，所以这里不需要立即更新状态
            console.log('🔐 Google OAuth initiated, redirecting...');
            return { data, error: null };
        } catch (error: any) {
            return {
                data: { user: null, session: null },
                error: error
            };
        } finally {
            setLoading(false);
        }
    }, []);

    // 用户登出
    const signOut = useCallback(async (): Promise<void> => {
        try {
            setLoading(true);

            // 先清除本地状态，避免会话错误
            console.log('🔐 Clearing local state before signOut');
            setSession(null);
            setUser(null);
            setUsageStatus({
                allowed: true,
                remaining: 100,
                total: 100,
                requiresAuth: false,
                userType: 'trial',
                message: 'Trial mode'
            });

            // 尝试服务端登出，但不依赖其成功
            try {
                const { error } = await supabase.auth.signOut();
                if (error && error.message !== 'Auth session missing!') {
                    console.warn('🔐 SignOut warning:', error.message);
                }
            } catch (signOutError: any) {
                // 忽略会话缺失错误，这在生产环境中很常见
                if (signOutError.message !== 'Auth session missing!') {
                    console.warn('🔐 SignOut error (non-critical):', signOutError.message);
                }
            }

            console.log('🔐 Logout completed, state cleared');
        } catch (error) {
            console.error('🔐 Critical error in signOut:', error);
            // 即使出错也要清除本地状态
            setSession(null);
            setUser(null);
            setUsageStatus({
                allowed: true,
                remaining: 100,
                total: 100,
                requiresAuth: false,
                userType: 'trial',
                message: 'Trial mode'
            });
        } finally {
            setLoading(false);
        }
    }, []);

    // 重置密码
    const resetPassword = useCallback(async (email: string): Promise<void> => {
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/analyze?reset=true`
            });
            if (error) throw error;
        } catch (error) {
            console.error('Error resetting password:', error);
            throw error;
        }
    }, []);

    // 清除设备缓存
    const clearDeviceCache = useCallback((): void => {
        DeviceFingerprint.clearCache();
        setDeviceFingerprint(null);
    }, []);

    // 初始化认证状态 - 只运行一次
    useEffect(() => {
        if (initializedRef.current) return;
        initializedRef.current = true;

        console.log('🔐 Initializing auth (one time only)');

        let mounted = true;

        const initializeAuth = async () => {
            try {
                console.log('🔐 Getting initial session...');

                // 移除超时保护，让 Supabase 自然处理会话恢复
                const { data: { session }, error } = await supabase.auth.getSession();

                console.log('🔐 Session check result:', {
                    hasSession: !!session,
                    userEmail: session?.user?.email,
                    error: error?.message,
                    expiresAt: session?.expires_at ? new Date(session.expires_at * 1000) : null,
                    isExpired: session?.expires_at ? session.expires_at * 1000 < Date.now() : null
                });

                if (error) {
                    console.error('🔐 Session error:', error);
                } else {
                    console.log('🔐 Initial session:', session?.user?.email || 'no session');
                }

                if (mounted) {
                    console.log('🔐 Updating state with session data...');

                    // 类型安全的状态更新
                    setSession(session as any);
                    setUser(session?.user as any ?? null);

                    // 设置初始使用状态
                    const initialStatus = {
                        allowed: true,
                        remaining: session ? 999 : 100,
                        total: session ? 999 : 100,
                        requiresAuth: false,
                        userType: session ? 'registered' as const : 'trial' as const,
                        message: session ? 'Registered user' : 'Trial mode'
                    };
                    setUsageStatus(initialStatus);

                    console.log('🔐 State updated - user:', session?.user?.email || 'no user');
                    console.log('🔐 Setting loading to false');
                    setLoading(false);

                    // 如果有会话，记录登录状态
                    if (session?.user) {
                        console.log('🔐 ✅ User session restored:', session.user.email);

                        // 检查令牌是否即将过期，如果是则主动刷新
                        if (session.expires_at && session.expires_at * 1000 - Date.now() < 60000) {
                            console.log('🔐 Token expiring soon, refreshing...');
                            supabase.auth.refreshSession();
                        }
                    } else {
                        console.log('🔐 ❌ No existing session found');
                    }
                } else {
                    console.log('🔐 Component unmounted, skipping state update');
                }

                // 设置认证状态监听器 - 只设置一次
                if (!subscriptionRef.current && mounted) {
                    console.log('🔐 Setting up auth state listener (one time only)');

                    const { data: { subscription } } = supabase.auth.onAuthStateChange(
                        (event, session) => {
                            if (!mounted) return;

                            console.log('🔐 Auth event:', event, session?.user?.email || 'no user');
                            console.log('🔐 Auth event details:', {
                                event,
                                hasSession: !!session,
                                hasUser: !!session?.user,
                                emailConfirmed: session?.user?.email_confirmed_at
                            });

                            // 处理所有重要的认证事件
                            if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
                                if (session && session.user) {
                                    console.log('🔐 Updating session for event:', event);
                                    setSession(session as any);
                                    setUser(session.user as any);
                                    setUsageStatus({
                                        allowed: true,
                                        remaining: 999,
                                        total: 999,
                                        requiresAuth: false,
                                        userType: 'registered',
                                        message: 'Registered user'
                                    });
                                }
                            } else if (event === 'SIGNED_OUT') {
                                console.log('🔐 Clearing user session');
                                setSession(null);
                                setUser(null);
                                setUsageStatus({
                                    allowed: true,
                                    remaining: 100,
                                    total: 100,
                                    requiresAuth: false,
                                    userType: 'trial',
                                    message: 'Trial mode'
                                });
                            }
                        }
                    );

                    subscriptionRef.current = subscription;
                }
            } catch (error) {
                console.error('🔐 Error initializing auth:', error);
                if (mounted) {
                    setLoading(false);
                }
            }
        };

        initializeAuth();

        return () => {
            mounted = false;
            if (subscriptionRef.current) {
                subscriptionRef.current.unsubscribe();
                subscriptionRef.current = null;
            }
        };
    }, []); // 空依赖数组，只运行一次

    // 🔧 调试：检查状态变化
    console.log('🔍 AuthContext - user:', user?.email || 'no user');
    console.log('🔍 AuthContext - loading:', loading);

    // Context值
    const value: AuthContextType = {
        user,
        session,
        loading,
        usageStatus,
        deviceFingerprint,
        signUp,
        signIn,
        signInWithGoogle,
        signOut,
        resetPassword,
        checkUsageLimit,
        consumeUsage,
        refreshUsageStatus,
        getDeviceFingerprint,
        clearDeviceCache
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

// 自定义Hook使用认证Context
export function useAuth(): AuthContextType {
    const context = useContext(AuthContext);

    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }

    return context;
}

// 自定义Hook检查是否已认证
export function useRequireAuth(): AuthContextType {
    const auth = useAuth();

    if (!auth.user && !auth.loading) {
        throw new Error('This component requires authentication');
    }

    return auth;
}

// 自定义Hook获取使用状态
export function useUsageStatus(): {
    usageStatus: UsageStatus | null;
    canAnalyze: boolean;
    needsAuth: boolean;
    refreshUsage: () => Promise<void>;
} {
    const { usageStatus, refreshUsageStatus } = useAuth();

    return {
        usageStatus,
        canAnalyze: usageStatus?.allowed ?? false,
        needsAuth: usageStatus?.requiresAuth ?? false,
        refreshUsage: refreshUsageStatus
    };
}

// 导出Context（用于测试）
export { AuthContext };