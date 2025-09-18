/**
 * Login/Register Modal Component
 * Provides user authentication interface
 */

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useAuth } from '../../contexts/AuthContext';
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

    const { signIn, signUp, resetPassword } = useAuth();

    // 登录表单
    const loginForm = useForm<LoginFormData>();

    // 注册表单
    const registerForm = useForm<RegisterFormData>();

    // 重置密码表单
    const resetForm = useForm<ResetFormData>();

    // Reset state when modal opens/closes
    useEffect(() => {
        if (isOpen) {
            setMode(defaultMode);
            setMessage(null);
            loginForm.reset();
            registerForm.reset();
            resetForm.reset();
        }
    }, [isOpen, defaultMode, loginForm, registerForm, resetForm]);

    // Handle login
    const handleLogin = async (data: LoginFormData) => {
        setLoading(true);
        setMessage(null);

        try {
            const { error } = await signIn(data.email, data.password);

            if (error) {
                setMessage({
                    type: 'error',
                    text: getErrorMessage(error.message)
                });
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
                setMessage({
                    type: 'success',
                    text: 'Registration successful! Please check your email for the confirmation link to complete your account setup.'
                });
                console.log('🔐 Setting timeout to close modal in 4 seconds');
                // 延迟4秒后自动关闭弹窗，给用户足够时间阅读确认信息
                setTimeout(() => {
                    console.log('🔐 Timeout reached, closing modal');
                    onClose();
                }, 1000);
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
        if (error.includes('Invalid login credentials')) {
            return 'Invalid email or password';
        }
        if (error.includes('Email not confirmed')) {
            return 'Please confirm your email address first';
        }
        if (error.includes('User already registered')) {
            return 'This email is already registered';
        }
        if (error.includes('Password should be at least 6 characters')) {
            return 'Password must be at least 6 characters';
        }
        if (error.includes('Unable to validate email address')) {
            return 'Invalid email address format';
        }
        return error || 'Operation failed, please try again later';
    };

    // Don't render if modal is not open
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="glass-pane w-full max-w-md mx-auto">
                {/* Modal header */}
                <div className="flex items-center justify-between p-6 border-b border-white/10">
                    <h2 className="text-xl font-bold text-white">
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

                {/* Modal content */}
                <div className="p-6">
                    {/* Message alert */}
                    {message && (
                        <div className={`mb-4 p-4 rounded-lg text-sm ${message.type === 'success'
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
                                <div>
                                    <p className="font-medium">{message.text}</p>
                                    {message.type === 'success' && mode === 'register' && (
                                        <div className="mt-2 text-xs text-green-400/80">
                                            <p>• Check your email inbox (including spam folder)</p>
                                            <p>• Click the confirmation link to activate your account</p>
                                            <p>• You can close this window and return after confirming</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Google Sign In - 只在登录和注册模式显示 */}
                    {(mode === 'login' || mode === 'register') && (
                        <div className="mb-6">
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
                            <div className="flex items-center my-6">
                                <div className="flex-1 border-t border-white/10"></div>
                                <span className="px-4 text-sm text-slate-400">or</span>
                                <div className="flex-1 border-t border-white/10"></div>
                            </div>
                        </div>
                    )}

                    {/* Login form */}
                    {mode === 'login' && (
                        <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">
                                    Email Address
                                </label>
                                <input
                                    type="email"
                                    autoComplete="email"
                                    {...loginForm.register('email')}
                                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-400"
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
                                <label className="block text-sm font-medium text-slate-300 mb-2">
                                    Password
                                </label>
                                <input
                                    type="password"
                                    autoComplete="current-password"
                                    {...loginForm.register('password')}
                                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-400"
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
                                className="w-full py-3 bg-gradient-to-r from-violet-500 to-blue-500 text-white rounded-lg font-medium hover:from-violet-600 hover:to-blue-600 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
                        }} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">
                                    Email Address
                                </label>
                                <input
                                    type="email"
                                    autoComplete="email"
                                    {...registerForm.register('email')}
                                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-400"
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
                                <label className="block text-sm font-medium text-slate-300 mb-2">
                                    Password
                                </label>
                                <input
                                    type="password"
                                    autoComplete="new-password"
                                    {...registerForm.register('password')}
                                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-400"
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
                                <label className="block text-sm font-medium text-slate-300 mb-2">
                                    Confirm Password
                                </label>
                                <input
                                    type="password"
                                    autoComplete="new-password"
                                    {...registerForm.register('confirmPassword')}
                                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-400"
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
                                className="w-full py-3 bg-gradient-to-r from-violet-500 to-blue-500 text-white rounded-lg font-medium hover:from-violet-600 hover:to-blue-600 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
                        <form onSubmit={resetForm.handleSubmit(handleReset)} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">
                                    Email Address
                                </label>
                                <input
                                    type="email"
                                    {...resetForm.register('email')}
                                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-400"
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
                                className="w-full py-3 bg-gradient-to-r from-violet-500 to-blue-500 text-white rounded-lg font-medium hover:from-violet-600 hover:to-blue-600 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {loading && (
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                )}
                                {loading ? 'Sending...' : 'Send Reset Email'}
                            </button>
                        </form>
                    )}

                    {/* Mode switching */}
                    <div className="mt-6 pt-6 border-t border-white/10">
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
                        <div className="mt-4 p-4 bg-gradient-to-r from-violet-500/10 to-blue-500/10 rounded-lg border border-violet-500/20">
                            <div className="flex items-start gap-3">
                                <div className="w-6 h-6 bg-gradient-to-r from-violet-500 to-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                                <div>
                                    <h4 className="text-sm font-medium text-white mb-1">Sign up for exclusive benefits</h4>
                                    <ul className="text-xs text-slate-300 space-y-1">
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