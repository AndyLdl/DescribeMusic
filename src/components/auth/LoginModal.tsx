/**
 * Login/Register Modal Component
 * Provides user authentication interface
 */

import React, { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import GoogleSignInButton from './GoogleSignInButton';

// Form validation schemas
const loginSchema = z.object({
    email: z.string().email('Please enter a valid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters')
});

const registerSchema = z.object({
    email: z.string().email('Please enter a valid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"]
});

const resetSchema = z.object({
    email: z.string().email('Please enter a valid email address')
});

type LoginFormData = z.infer<typeof loginSchema>;
type RegisterFormData = z.infer<typeof registerSchema>;
type ResetFormData = z.infer<typeof resetSchema>;

interface LoginModalProps {
    isOpen: boolean;
    onClose: () => void;
    defaultMode?: 'login' | 'register';
}

type AuthMode = 'login' | 'register' | 'reset';

export default function LoginModal({ isOpen, onClose, defaultMode = 'login' }: LoginModalProps) {
    const [mode, setMode] = useState<AuthMode>(defaultMode);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [waitingForEmailConfirmation, setWaitingForEmailConfirmation] = useState(false);
    const authSubscriptionRef = useRef<{ unsubscribe: () => void } | null>(null);

    const { signIn, signUp, resetPassword, user } = useAuth();

    // 登录表单
    const loginForm = useForm<LoginFormData>({
        mode: 'onSubmit',
        reValidateMode: 'onChange',
        resolver: async (data) => {
            try {
                loginSchema.parse(data);
                return { values: data, errors: {} };
            } catch (error: any) {
                return {
                    values: {},
                    errors: error.errors.reduce((acc: any, err: any) => {
                        acc[err.path[0]] = { type: err.code, message: err.message };
                        return acc;
                    }, {})
                };
            }
        }
    });

    // 注册表单
    const registerForm = useForm<RegisterFormData>({
        mode: 'onSubmit',
        reValidateMode: 'onChange'
    });

    // 重置密码表单
    const resetForm = useForm<ResetFormData>({
        mode: 'onSubmit',
        reValidateMode: 'onChange'
    });

    // Reset state when modal opens/closes
    useEffect(() => {
        if (isOpen) {
            setMode(defaultMode);
            setMessage(null);
            setWaitingForEmailConfirmation(false);
            loginForm.reset();
            registerForm.reset();
            resetForm.reset();
        }
    }, [isOpen, defaultMode, loginForm, registerForm, resetForm]);

    // 监听邮箱确认状态
    useEffect(() => {
        if (!waitingForEmailConfirmation || !isOpen) return;

        console.log('🔐 Setting up email confirmation listener');
        
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (event, session) => {
                console.log('🔐 Auth event in LoginModal:', event, {
                    hasSession: !!session,
                    hasUser: !!session?.user,
                    emailConfirmed: !!session?.user?.email_confirmed_at
                });

                // 当用户确认邮箱后，关闭弹窗
                if (event === 'SIGNED_IN' && session?.user?.email_confirmed_at) {
                    console.log('🔐 Email confirmed! Closing modal');
                    setWaitingForEmailConfirmation(false);
                    setMessage({
                        type: 'success',
                        text: 'Email confirmed successfully! Your account has been activated.'
                    });
                    // 延迟关闭，让用户看到成功消息
                    setTimeout(() => {
                        onClose();
                    }, 2000);
                }
            }
        );

        authSubscriptionRef.current = subscription;

        return () => {
            if (authSubscriptionRef.current) {
                authSubscriptionRef.current.unsubscribe();
                authSubscriptionRef.current = null;
            }
        };
    }, [waitingForEmailConfirmation, isOpen, onClose]);

    // 检查用户是否已经确认邮箱（如果用户在其他标签页确认了）
    useEffect(() => {
        if (waitingForEmailConfirmation && user?.email_confirmed_at) {
            console.log('🔐 User email already confirmed, closing modal');
            setWaitingForEmailConfirmation(false);
            setMessage({
                type: 'success',
                text: 'Email confirmed successfully! Your account has been activated.'
            });
            setTimeout(() => {
                onClose();
            }, 2000);
        }
    }, [user, waitingForEmailConfirmation, onClose]);

    // Handle login
    const handleLogin = async (data: LoginFormData) => {
        setLoading(true);
        setMessage(null);

        try {
            const { error } = await signIn(data.email, data.password);

            if (error) {
                const errorMsg = getErrorMessage(error.message);
                
                // 如果是邮箱未确认错误，显示详细提示
                if (errorMsg === 'EMAIL_NOT_CONFIRMED') {
                    setMessage({
                        type: 'error',
                        text: 'EMAIL_NOT_CONFIRMED_DETAILED' // 特殊标记，用于显示详细UI
                    });
                } else {
                    setMessage({
                        type: 'error',
                        text: errorMsg
                    });
                }
            } else {
                setMessage({
                    type: 'success',
                    text: 'Login successful!'
                });
                setTimeout(() => {
                    onClose();
                }, 1000);
            }
        } catch (error: any) {
            console.error('Login error:', error);
            setMessage({
                type: 'error',
                text: `Login failed: ${error.message || 'Please try again later'}`
            });
        } finally {
            setLoading(false);
        }
    };

    // Handle registration
    const handleRegister = async (data: RegisterFormData) => {
        console.log('🔐 Registration started with data:', { email: data.email, passwordLength: data.password?.length });
        console.log('🔐 Current modal state - mode:', mode, 'isOpen:', isOpen);

        // 手动验证
        try {
            registerSchema.parse(data);
        } catch (validationError: any) {
            console.log('🔐 Validation error:', validationError.errors);
            setMessage({
                type: 'error',
                text: validationError.errors[0]?.message || 'Please check your input'
            });
            return;
        }

        setLoading(true);
        setMessage(null);

        try {
            console.log('🔐 Calling signUp...');
            const { error } = await signUp(data.email, data.password);
            console.log('🔐 SignUp result:', { error: error?.message });

            if (error) {
                console.log('🔐 Registration error:', error.message);
                setMessage({
                    type: 'error',
                    text: getErrorMessage(error.message)
                });
            } else {
                console.log('🔐 Registration successful, showing success message');
                setWaitingForEmailConfirmation(true);
                setMessage({
                    type: 'success',
                    text: 'Registration successful! Please check your email and click the confirmation link to complete your account activation.'
                });
                // 不自动关闭弹窗，等待用户确认邮箱
            }
        } catch (error: any) {
            console.log('🔐 Registration exception:', error);
            setMessage({
                type: 'error',
                text: 'Registration failed, please try again later'
            });
        } finally {
            console.log('🔐 Registration finished, setting loading to false');
            setLoading(false);
        }
    };

    // Handle password reset
    const handleReset = async (data: ResetFormData) => {
        setLoading(true);
        setMessage(null);

        try {
            await resetPassword(data.email);
            setMessage({
                type: 'success',
                text: 'Password reset email sent, please check your inbox.'
            });
            setTimeout(() => {
                setMode('login');
            }, 2000);
        } catch (error: any) {
            setMessage({
                type: 'error',
                text: 'Failed to send reset email, please try again later'
            });
        } finally {
            setLoading(false);
        }
    };

    // Error message localization
    const getErrorMessage = (error: string): string => {
        const errorLower = error.toLowerCase();
        
        // 邮箱未确认的各种可能错误格式
        if (errorLower.includes('email not confirmed') || 
            errorLower.includes('email_not_confirmed') ||
            errorLower.includes('email confirmation') ||
            errorLower.includes('confirm your email') ||
            errorLower.includes('unconfirmed email')) {
            return 'EMAIL_NOT_CONFIRMED'; // 特殊标记，用于显示详细消息
        }
        
        if (errorLower.includes('invalid login credentials') || 
            errorLower.includes('invalid credentials') ||
            errorLower.includes('wrong password') ||
            errorLower.includes('incorrect password')) {
            return 'Invalid email or password';
        }
        if (errorLower.includes('user already registered') || 
            errorLower.includes('email already registered')) {
            return 'This email is already registered';
        }
        if (errorLower.includes('password should be at least') || 
            errorLower.includes('password must be at least')) {
            return 'Password must be at least 6 characters';
        }
        if (errorLower.includes('unable to validate email') || 
            errorLower.includes('invalid email')) {
            return 'Invalid email address format';
        }
        return error || 'Operation failed, please try again later';
    };

    // Don't render if modal is not open
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div 
                className="glass-pane w-full max-w-md mx-auto max-h-[90vh] flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Modal header */}
                <div className="flex items-center justify-between p-4 border-b border-white/10 flex-shrink-0">
                    <h2 className="text-lg font-bold text-white">
                        {mode === 'login' && 'Sign In'}
                        {mode === 'register' && 'Sign Up'}
                        {mode === 'reset' && 'Reset Password'}
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-white/5"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Modal content - scrollable */}
                <div className="p-4 overflow-y-auto flex-1 min-h-0">
                    {/* Message alert */}
                    {message && (
                        <div className={`mb-3 p-3 rounded-lg text-sm ${message.type === 'success'
                            ? 'bg-green-500/20 text-green-300 border border-green-500/30'
                            : 'bg-red-500/20 text-red-300 border border-red-500/30'
                            }`}>
                            <div className="flex items-start gap-3">
                                {message.type === 'success' ? (
                                    <svg className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                ) : (
                                    <svg className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                )}
                                <div className="flex-1">
                                    {message.text === 'EMAIL_NOT_CONFIRMED_DETAILED' ? (
                                        <div>
                                            <p className="font-medium mb-2">Email not confirmed</p>
                                            <div className="text-xs text-red-300/80 space-y-1.5">
                                                <p>• Your account exists but the email address hasn't been confirmed yet</p>
                                                <p>• Please check your email inbox (including spam folder) for the confirmation link</p>
                                                <p>• Click the confirmation link to activate your account, then try logging in again</p>
                                                <p>• If you didn't receive the email, you may need to register again or contact support</p>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <p className="font-medium">{message.text}</p>
                                            {message.type === 'success' && mode === 'register' && waitingForEmailConfirmation && (
                                                <div className="mt-2 text-xs text-green-400/80">
                                                    <p>• Check your email inbox (including spam folder)</p>
                                                    <p>• Click the confirmation link to activate your account</p>
                                                    <p>• This window will close automatically after confirmation</p>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Google Sign In - 只在登录和注册模式显示 */}
                    {(mode === 'login' || mode === 'register') && (
                        <div className="mb-4">
                            <GoogleSignInButton
                                onSuccess={() => {
                                    setMessage({
                                        type: 'success',
                                        text: 'Redirecting to Google sign in...'
                                    });
                                }}
                                onError={(error) => {
                                    setMessage({
                                        type: 'error',
                                        text: error
                                    });
                                }}
                                disabled={loading}
                            />

                            {/* 分隔线 */}
                            <div className="flex items-center my-4">
                                <div className="flex-1 border-t border-white/10"></div>
                                <span className="px-4 text-sm text-slate-400">or</span>
                                <div className="flex-1 border-t border-white/10"></div>
                            </div>
                        </div>
                    )}

                    {/* Login form */}
                    {mode === 'login' && (
                        <form 
                            onSubmit={async (e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                
                                // 手动获取表单数据
                                const formData = loginForm.getValues();
                                
                                // 额外的空值检查
                                if (!formData.email || !formData.password) {
                                    await loginForm.trigger();
                                    return false;
                                }
                                
                                // 手动验证
                                const isValid = await loginForm.trigger();
                                
                                if (isValid) {
                                    await handleLogin(formData);
                                }
                                
                                return false;
                            }}
                            action="javascript:void(0);"
                            className="space-y-3"
                        >
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                                    Email Address
                                </label>
                                <input
                                    type="email"
                                    autoComplete="email"
                                    {...loginForm.register('email')}
                                    className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-400 text-sm"
                                    placeholder="Enter your email address"
                                    disabled={loading}
                                />
                                {loginForm.formState.errors.email && (
                                    <p className="mt-1 text-sm text-red-400">
                                        {loginForm.formState.errors.email.message}
                                    </p>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                                    Password
                                </label>
                                <input
                                    type="password"
                                    autoComplete="current-password"
                                    {...loginForm.register('password')}
                                    className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-400 text-sm"
                                    placeholder="Enter your password"
                                    disabled={loading}
                                />
                                {loginForm.formState.errors.password && (
                                    <p className="mt-1 text-sm text-red-400">
                                        {loginForm.formState.errors.password.message}
                                    </p>
                                )}
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                onClick={(e) => {
                                    e.stopPropagation();
                                }}
                                className="w-full py-2.5 bg-gradient-to-r from-violet-500 to-blue-500 text-white rounded-lg font-medium hover:from-violet-600 hover:to-blue-600 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
                            >
                                {loading && (
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                )}
                                {loading ? 'Signing in...' : 'Sign In'}
                            </button>
                        </form>
                    )}

                    {/* Registration form */}
                    {mode === 'register' && (
                        <form onSubmit={(e) => {
                            e.preventDefault();
                            registerForm.handleSubmit(handleRegister)(e);
                        }} className="space-y-3">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                                    Email Address
                                </label>
                                <input
                                    type="email"
                                    autoComplete="email"
                                    {...registerForm.register('email')}
                                    className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-400 text-sm"
                                    placeholder="Enter your email address"
                                    disabled={loading}
                                />
                                {registerForm.formState.errors.email && (
                                    <p className="mt-1 text-sm text-red-400">
                                        {registerForm.formState.errors.email.message}
                                    </p>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                                    Password
                                </label>
                                <input
                                    type="password"
                                    autoComplete="new-password"
                                    {...registerForm.register('password')}
                                    className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-400 text-sm"
                                    placeholder="Enter password (at least 6 characters)"
                                    disabled={loading}
                                />
                                {registerForm.formState.errors.password && (
                                    <p className="mt-1 text-sm text-red-400">
                                        {registerForm.formState.errors.password.message}
                                    </p>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                                    Confirm Password
                                </label>
                                <input
                                    type="password"
                                    autoComplete="new-password"
                                    {...registerForm.register('confirmPassword')}
                                    className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-400 text-sm"
                                    placeholder="Enter password again"
                                    disabled={loading}
                                />
                                {registerForm.formState.errors.confirmPassword && (
                                    <p className="mt-1 text-sm text-red-400">
                                        {registerForm.formState.errors.confirmPassword.message}
                                    </p>
                                )}
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-2.5 bg-gradient-to-r from-violet-500 to-blue-500 text-white rounded-lg font-medium hover:from-violet-600 hover:to-blue-600 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
                            >
                                {loading && (
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                )}
                                {loading ? 'Signing up...' : 'Sign Up'}
                            </button>
                        </form>
                    )}

                    {/* Password reset form */}
                    {mode === 'reset' && (
                        <form onSubmit={(e) => {
                            e.preventDefault();
                            resetForm.handleSubmit(handleReset)(e);
                        }} className="space-y-3">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                                    Email Address
                                </label>
                                <input
                                    type="email"
                                    {...resetForm.register('email')}
                                    className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-400 text-sm"
                                    placeholder="Enter your registered email address"
                                    disabled={loading}
                                />
                                {resetForm.formState.errors.email && (
                                    <p className="mt-1 text-sm text-red-400">
                                        {resetForm.formState.errors.email.message}
                                    </p>
                                )}
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-2.5 bg-gradient-to-r from-violet-500 to-blue-500 text-white rounded-lg font-medium hover:from-violet-600 hover:to-blue-600 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
                            >
                                {loading && (
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                )}
                                {loading ? 'Sending...' : 'Send Reset Email'}
                            </button>
                        </form>
                    )}

                    {/* Mode switching */}
                    <div className="mt-4 pt-4 border-t border-white/10">
                        {mode === 'login' && (
                            <div className="text-center space-y-2">
                                <p className="text-slate-400 text-sm">
                                    Don't have an account?
                                    <button
                                        onClick={() => setMode('register')}
                                        className="text-violet-400 hover:text-violet-300 ml-1 font-medium"
                                    >
                                        Sign up now
                                    </button>
                                </p>
                                <p className="text-slate-400 text-sm">
                                    Forgot password?
                                    <button
                                        onClick={() => setMode('reset')}
                                        className="text-violet-400 hover:text-violet-300 ml-1 font-medium"
                                    >
                                        Reset password
                                    </button>
                                </p>
                            </div>
                        )}

                        {mode === 'register' && (
                            <div className="text-center">
                                <p className="text-slate-400 text-sm">
                                    Already have an account?
                                    <button
                                        onClick={() => setMode('login')}
                                        className="text-violet-400 hover:text-violet-300 ml-1 font-medium"
                                    >
                                        Sign in now
                                    </button>
                                </p>
                            </div>
                        )}

                        {mode === 'reset' && (
                            <div className="text-center">
                                <p className="text-slate-400 text-sm">
                                    Remember your password?
                                    <button
                                        onClick={() => setMode('login')}
                                        className="text-violet-400 hover:text-violet-300 ml-1 font-medium"
                                    >
                                        Back to sign in
                                    </button>
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Registration benefits */}
                    {mode === 'register' && (
                        <div className="mt-3 p-3 bg-gradient-to-r from-violet-500/10 to-blue-500/10 rounded-lg border border-violet-500/20">
                            <div className="flex items-start gap-2">
                                <div className="w-5 h-5 bg-gradient-to-r from-violet-500 to-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                                    <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                                <div>
                                    <h4 className="text-xs font-medium text-white mb-0.5">Sign up for exclusive benefits</h4>
                                    <ul className="text-xs text-slate-300 space-y-0.5">
                                        <li>• Get 200 credits for audio analysis</li>
                                        <li>• Save analysis history</li>
                                        <li>• Early access to new features</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}