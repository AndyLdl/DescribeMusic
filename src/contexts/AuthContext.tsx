/**
 * Authentication Context and Provider
 * Manages user authentication state, sessions, and usage limits
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
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

    // State management
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);
    const [usageStatus, setUsageStatus] = useState<UsageStatus | null>(null);
    const [deviceFingerprint, setDeviceFingerprint] = useState<string | null>(null);

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
            // Return a timestamp-based fallback fingerprint
            const fallbackFingerprint = `fallback_${Date.now()}_${Math.random()}`;
            setDeviceFingerprint(fallbackFingerprint);
            return fallbackFingerprint;
        }
    }, [deviceFingerprint]);

    // Check usage limits
    const checkUsageLimit = useCallback(async (currentUser?: User | null): Promise<UsageStatus> => {
        try {
            // Use passed user parameter, or current user if none passed
            const userToCheck = currentUser !== undefined ? currentUser : user;

            console.log('🔐 Checking usage limit for user:', userToCheck?.email || 'no user');

            if (userToCheck) {
                console.log('🔐 User is logged in, checking database status');

                try {
                    // 恢复数据库调用
                    const { data, error } = await supabase.rpc('check_user_monthly_limit', {
                        user_uuid: userToCheck.id
                    });

                    if (error) {
                        console.error('🔐 Error checking user monthly limit:', error);

                        // 尝试创建用户记录
                        console.log('🔐 Attempting to create user profile...');
                        try {
                            // 使用 service_role 密钥创建 Supabase 客户端
                            const serviceRoleClient = createClient(
                                'https://fsmgroeytsburlgmoxcj.supabase.co',
                                'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZzbWdyb2V5dHNidXJsZ21veGNqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzkzNTAyNCwiZXhwIjoyMDczNTExMDI0fQ.8JxrVYEz37KmRdh69Yi-Nch2H9cgyPuVqGiotsdx4NA'
                            );

                            // 直接插入用户记录
                            const { data: insertData, error: insertError } = await serviceRoleClient
                                .from('user_profiles')
                                .insert({
                                    id: userToCheck.id,
                                    monthly_limit: 10,
                                    current_month_usage: 0,
                                    total_analyses: 0,
                                    last_reset_date: new Date().toISOString().split('T')[0]
                                });

                            if (insertError && insertError.code !== '23505') { // 忽略重复键错误
                                console.error('🔐 Failed to insert user profile:', insertError);
                            } else {
                                console.log('🔐 User profile created/exists, retrying usage check...');

                                // 重新检查使用限制
                                const { data: retryData, error: retryError } = await supabase.rpc('check_user_monthly_limit', {
                                    user_uuid: userToCheck.id
                                });

                                if (!retryError && retryData?.[0]) {
                                    const result = retryData[0];
                                    console.log('🔐 Retry result:', result);
                                    return {
                                        allowed: result.can_analyze ?? true,
                                        remaining: result.remaining_analyses ?? 10,
                                        total: result.monthly_limit ?? 10,
                                        resetDate: result.reset_date ? new Date(result.reset_date) : undefined,
                                        requiresAuth: false,
                                        userType: 'registered',
                                        message: `已登录用户 - 本月剩余 ${result.remaining_analyses ?? 10} 次分析`
                                    };
                                }
                            }
                        } catch (createError) {
                            console.error('🔐 Error creating user profile:', createError);
                        }

                        // 如果创建失败，返回默认状态
                        return {
                            allowed: true,
                            remaining: 10,
                            total: 10,
                            requiresAuth: false,
                            userType: 'registered',
                            message: 'Unable to check usage limit - using default'
                        };
                    }

                    const result = data?.[0];
                    console.log('🔐 Database result:', result);

                    const status: UsageStatus = {
                        allowed: result?.can_analyze ?? true,
                        remaining: result?.remaining_analyses ?? 10,
                        total: result?.monthly_limit ?? 10,
                        resetDate: result?.reset_date ? new Date(result.reset_date) : undefined,
                        requiresAuth: false,
                        userType: 'registered'
                    };

                    if (!status.allowed) {
                        status.message = `您本月的 ${status.total} 次分析额度已用完，下月 ${status.resetDate?.getDate()} 号重置`;
                    } else {
                        status.message = `已登录用户 - 本月剩余 ${status.remaining} 次分析`;
                    }

                    console.log('🔐 Returning database status:', status);
                    return status;

                } catch (dbError) {
                    console.error('🔐 Database call failed:', dbError);
                    // 数据库调用失败时返回默认状态，允许使用
                    return {
                        allowed: true,
                        remaining: 10,
                        total: 10,
                        requiresAuth: false,
                        userType: 'registered',
                        message: 'Database error - using default permissions'
                    };
                }
            } else {
                // 未登录用户：检查设备试用限制
                const fingerprint = await getDeviceFingerprint();
                const deviceStatus: DeviceUsageStatus = await DeviceFingerprint.getTrialUsage(fingerprint);

                const status: UsageStatus = {
                    allowed: deviceStatus.canAnalyze,
                    remaining: deviceStatus.remainingTrials,
                    total: 5,
                    requiresAuth: !deviceStatus.canAnalyze,
                    userType: 'trial'
                };

                if (!status.allowed) {
                    status.message = '免费试用次数已用完，请注册账户获得每月 10 次分析机会';
                } else if (status.remaining <= 2) {
                    status.message = `试用次数即将用完，注册账户可获得每月 10 次分析机会`;
                }

                return status;
            }
        } catch (error) {
            console.error('Error checking usage limit:', error);
            // 出错时返回保守的默认值
            return {
                allowed: false,
                remaining: 0,
                total: user ? 10 : 5,
                requiresAuth: true,
                userType: user ? 'registered' : 'trial',
                message: '无法检查使用限制，请稍后重试'
            };
        }
    }, [user, getDeviceFingerprint]);

    // 消费使用次数
    const consumeUsage = useCallback(async (): Promise<void> => {
        try {
            // 使用次数的实际消费会在云函数中处理
            // 这里只是更新本地状态
            await refreshUsageStatus();
        } catch (error) {
            console.error('Error consuming usage:', error);
        }
    }, []);

    // 刷新使用状态
    const refreshUsageStatus = useCallback(async (): Promise<void> => {
        try {
            const status = await checkUsageLimit(user);
            setUsageStatus(status);
        } catch (error) {
            console.error('Error refreshing usage status:', error);
        }
    }, [checkUsageLimit, user]);

    // 用户注册
    const signUp = useCallback(async (email: string, password: string): Promise<AuthResponse> => {
        try {
            setLoading(true);

            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    // 设置用户元数据
                    data: {
                        registered_at: new Date().toISOString(),
                    },
                    // 设置邮箱确认重定向URL
                    emailRedirectTo: typeof window !== 'undefined' ? `${window.location.origin}/analyze` : undefined
                }
            });

            if (error) {
                return { data: { user: null, session: null }, error };
            }

            // 如果注册成功，创建用户配置并处理其他设置
            if (data.user) {
                console.log('🔐 User registered successfully, creating profile...');

                // 立即尝试创建用户配置，不使用延迟
                try {
                    // 使用服务端函数创建用户配置
                    const { data: rpcData, error: rpcError } = await supabase.rpc('create_user_profile', {
                        user_uuid: data.user.id
                    });

                    if (rpcError) {
                        console.error('🔐 Failed to create user profile via RPC:', rpcError);
                    } else if (rpcData === true) {
                        console.log('🔐 User profile created successfully via RPC');
                    } else {
                        console.warn('🔐 RPC returned unexpected result:', rpcData);
                    }
                } catch (profileError) {
                    console.error('🔐 Error creating user profile:', profileError);
                }

                try {
                    const fingerprint = await getDeviceFingerprint();
                    await DeviceFingerprint.associateWithUser(data.user.id, fingerprint);
                } catch (fingerprintError) {
                    console.warn('Failed to associate device fingerprint:', fingerprintError);
                    // 不阻断注册流程
                }

                // 迁移匿名历史记录到用户账户
                try {
                    const { HistoryStorage } = await import('../utils/historyStorage');
                    const migratedCount = await HistoryStorage.migrateAnonymousHistoryToUser(data.user.id);
                    if (migratedCount > 0) {
                        console.log(`Successfully migrated ${migratedCount} history records to new user account`);
                    }
                } catch (historyError) {
                    console.warn('Failed to migrate history records:', historyError);
                    // 不阻断注册流程
                }
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
    }, [getDeviceFingerprint]);

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

            // 如果登录成功，尝试关联设备指纹并迁移历史记录
            if (data.user) {
                try {
                    const fingerprint = await getDeviceFingerprint();
                    await DeviceFingerprint.associateWithUser(data.user.id, fingerprint);
                } catch (fingerprintError) {
                    console.warn('Failed to associate device fingerprint:', fingerprintError);
                    // 不阻断登录流程
                }

                // 迁移匿名历史记录到用户账户（如果有的话）
                try {
                    const { HistoryStorage } = await import('../utils/historyStorage');
                    const migratedCount = await HistoryStorage.migrateAnonymousHistoryToUser(data.user.id);
                    if (migratedCount > 0) {
                        console.log(`Successfully migrated ${migratedCount} history records to user account`);
                    }
                } catch (historyError) {
                    console.warn('Failed to migrate history records:', historyError);
                    // 不阻断登录流程
                }
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
    }, [getDeviceFingerprint]);

    // 用户登出
    const signOut = useCallback(async (): Promise<void> => {
        try {
            console.log('🔐 Setting loading to true...');
            setLoading(true);

            console.log('🔐 Calling supabase.auth.signOut()...');

            try {
                // 尝试正常退出
                const { error } = await supabase.auth.signOut();

                if (error) {
                    console.error('🔐 Supabase signOut error:', error);
                    throw error;
                }

                console.log('🔐 Supabase signOut successful');

            } catch (error) {
                console.error('🔐 Supabase signOut failed, trying alternative method:', error);

                // 如果正常退出失败，尝试强制清除会话
                try {
                    // 清除本地存储中的会话数据
                    Object.keys(localStorage).forEach(key => {
                        if (key.startsWith('sb-')) {
                            localStorage.removeItem(key);
                        }
                    });

                    Object.keys(sessionStorage).forEach(key => {
                        if (key.startsWith('sb-')) {
                            sessionStorage.removeItem(key);
                        }
                    });

                    console.log('🔐 Cleared local storage manually');
                } catch (storageError) {
                    console.error('🔐 Failed to clear local storage:', storageError);
                }
            }

            console.log('🔐 Clearing local state...');
            // 清除本地状态
            setUser(null);
            setSession(null);
            setUsageStatus(null);

            console.log('🔐 Skipping manual usage status refresh (will be handled by auth state listener)...');
            // 刷新使用状态（切换到试用模式）
            // await refreshUsageStatus(); // 暂时注释掉，让认证状态监听器处理

            console.log('🔐 SignOut completed successfully');
        } catch (error) {
            console.error('🔐 Error in signOut:', error);
            throw error;
        } finally {
            console.log('🔐 Setting loading to false...');
            setLoading(false);
        }
    }, [refreshUsageStatus]);

    // 重置密码
    const resetPassword = useCallback(async (email: string): Promise<void> => {
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/analyze?reset=true`
            });

            if (error) {
                throw error;
            }
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

    // 初始化认证状态
    useEffect(() => {
        console.log('🔐 AuthProvider useEffect triggered');
        let mounted = true;

        // 获取初始会话
        const initializeAuth = async () => {
            try {
                console.log('🔐 Starting auth initialization with timeout protection...');

                // 设置默认状态，防止卡住
                const defaultState = () => {
                    if (mounted) {
                        setSession(null);
                        setUser(null);
                        setUsageStatus({
                            allowed: true,
                            remaining: 5,
                            total: 5,
                            requiresAuth: false,
                            userType: 'trial',
                            message: 'Trial mode - 5 free analyses'
                        });
                        setLoading(false);
                        console.log('🔐 Set to default state');
                    }
                };

                // 2秒超时保护
                const timeoutId = setTimeout(defaultState, 2000);

                try {
                    console.log('🔐 Attempting to get session...');
                    const { data: { session }, error } = await supabase.auth.getSession();

                    clearTimeout(timeoutId);

                    if (error) {
                        console.error('🔐 Session error:', error);
                        defaultState();
                        return;
                    }

                    console.log('🔐 Session retrieved successfully:', session?.user?.email || 'no session');

                    if (mounted) {
                        setSession(session);
                        setUser(session?.user ?? null);

                        // 设置基本的使用状态
                        setUsageStatus({
                            allowed: true,
                            remaining: session ? 10 : 5,
                            total: session ? 10 : 5,
                            requiresAuth: false,
                            userType: session ? 'registered' : 'trial',
                            message: session ? 'Registered user' : 'Trial mode'
                        });

                        console.log('🔐 Auth initialization completed successfully');
                        setLoading(false);
                    }
                } catch (error) {
                    console.error('🔐 Auth initialization error:', error);
                    clearTimeout(timeoutId);
                    defaultState();
                }
            } catch (error) {
                console.error('🔐 Error initializing auth:', error);
                if (mounted) {
                    console.log('🔐 Setting loading to false due to error');
                    setLoading(false);
                }
            }
        };

        initializeAuth();

        // 监听认证状态变化
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                if (!mounted) return;

                console.log('🔐 Auth state changed:', event, session?.user?.email);
                console.log('🔐 Session:', session);
                console.log('🔐 User:', session?.user);

                setSession(session);
                setUser(session?.user ?? null);

                // 当认证状态变化时，刷新使用状态
                if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
                    console.log('🔐 Refreshing usage status after auth change...');

                    // 设置默认使用状态，防止卡住
                    const defaultUsageStatus = {
                        allowed: true,
                        remaining: session ? 10 : 5,
                        total: session ? 10 : 5,
                        requiresAuth: false,
                        userType: session ? 'registered' as const : 'trial' as const,
                        message: session ? 'Registered user' : 'Trial mode'
                    };

                    // 立即设置默认状态
                    setUsageStatus(defaultUsageStatus);
                    console.log('🔐 Usage status set to default:', defaultUsageStatus);

                    // 在后台尝试获取真实状态（不阻塞UI）
                    checkUsageLimit(session?.user ?? null).then(status => {
                        setUsageStatus(status);
                        console.log('🔐 Usage status updated from server:', status);
                    }).catch(error => {
                        console.error('🔐 Error refreshing usage status (keeping default):', error);
                    });
                }

                setLoading(false);
            }
        );

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
    }, []); // 移除依赖，避免无限循环

    // 定期刷新使用状态（每5分钟）
    useEffect(() => {
        const interval = setInterval(() => {
            if (!loading) {
                refreshUsageStatus();
            }
        }, 5 * 60 * 1000); // 5分钟

        return () => clearInterval(interval);
    }, [loading, refreshUsageStatus]);

    // Context值
    const value: AuthContextType = {
        // 认证状态
        user,
        session,
        loading,

        // 使用限制状态
        usageStatus,
        deviceFingerprint,

        // 认证方法
        signUp,
        signIn,
        signOut,
        resetPassword,

        // 使用限制方法
        checkUsageLimit,
        consumeUsage,
        refreshUsageStatus,

        // 设备指纹方法
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