/**
 * PricingSection Component
 * Monthly subscription pricing with free plan
 */

import { useState } from 'react';
import { SUBSCRIPTION_PLANS, FREE_PLAN, type PlanId, LemonsqueezyService, LemonsqueezyError } from '../../services/lemonsqueezyService';
import { useAuth } from '../../contexts/AuthContext';
import { useCredit } from '../../contexts/CreditContext';
import { useSubscription } from '../../hooks/useSubscription';
import { isLemonsqueezyConfigured } from '../../config/lemonsqueezy';
import SubscriptionManagement from './SubscriptionManagement';

export default function PricingSection() {
    const { user } = useAuth();
    const { credits } = useCredit();
    const { isActive: hasActiveSubscription, isLoading: subscriptionLoading } = useSubscription();
    const [selectedPlan, setSelectedPlan] = useState<PlanId | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'redirecting' | 'success' | 'failed'>('idle');


    const handleFreePlanSelect = () => {
        if (!user) {
            setError('Please log in first to use the free trial');
            return;
        }
        // 跳转到分析页面，免费用户可以直接使用
        window.location.href = '/analyze?plan=free';
    };

    const handlePlanSelect = async (planId: PlanId) => {
        try {
            setLoading(true);
            setError(null);
            setSelectedPlan(planId);
            setPaymentStatus('processing');

            console.log('💳 Starting subscription process for plan:', planId);

            // 检查 Lemonsqueezy 配置
            if (!isLemonsqueezyConfigured()) {
                throw new Error('Payment service is temporarily unavailable, please try again later');
            }

            // 获取服务实例
            const currentService = LemonsqueezyService.getInstance();

            // Validate user authentication
            if (!user) {
                throw new Error('Please log in first before subscribing to a plan');
            }

            // Prepare user information for checkout
            const userInfo = {
                userId: user.id,
                userEmail: user.email || '',
                userName: user.user_metadata?.full_name || user.email?.split('@')[0] || ''
            };

            console.log('💳 Creating subscription checkout with user info:', userInfo);

            // Create checkout session
            const checkout = await currentService.createCheckout(planId, userInfo);

            console.log('💳 Checkout created successfully:', checkout);

            if (!checkout?.data?.attributes?.url) {
                throw new Error('Checkout session creation failed: missing payment link');
            }

            // Update status to redirecting
            setPaymentStatus('redirecting');

            // Store checkout info in sessionStorage for potential recovery
            const plan = SUBSCRIPTION_PLANS[planId];
            sessionStorage.setItem('pendingPayment', JSON.stringify({
                planId,
                checkoutId: checkout.data.id,
                timestamp: Date.now(),
                credits: plan.credits,
                type: 'subscription'
            }));

            // Small delay to show redirecting status
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Redirect to payment page
            window.location.href = checkout.data.attributes.url;

        } catch (error) {
            console.error('💳 Subscription initiation failed:', error);

            setPaymentStatus('failed');

            let errorMessage = 'Subscription initialization failed, please try again later';

            if (error instanceof LemonsqueezyError) {
                switch (error.code) {
                    case 'MISSING_API_KEY':
                    case 'MISSING_VARIANT_ID':
                    case 'SERVICE_NOT_CONFIGURED':
                        errorMessage = 'Payment service configuration error, please contact customer service';
                        break;
                    case 'INVALID_PLAN_ID':
                        errorMessage = 'Selected plan is invalid, please choose again';
                        break;
                    case 'CHECKOUT_CREATION_FAILED':
                        errorMessage = 'Failed to create payment session, please try again later';
                        break;
                    default:
                        errorMessage = error.message || 'Payment service is temporarily unavailable';
                }
            } else if (error instanceof Error) {
                errorMessage = error.message;
            }

            setError(errorMessage);
        } finally {
            setLoading(false);
            setSelectedPlan(null);
        }
    };

    // Convert SUBSCRIPTION_PLANS object to array for easier iteration
    const plansArray = Object.values(SUBSCRIPTION_PLANS);

    // Calculate value metrics for each plan
    const getValueMetrics = (plan: typeof plansArray[0]) => {
        const pricePerCredit = plan.price / plan.credits;
        const minutesOfAnalysis = Math.floor(plan.credits / 60);
        const pricePerMinute = plan.price / minutesOfAnalysis;

        return {
            pricePerCredit: pricePerCredit.toFixed(4),
            minutesOfAnalysis,
            pricePerMinute: pricePerMinute.toFixed(2)
        };
    };

    // Calculate free plan metrics
    const getFreeMetrics = () => {
        const minutesOfAnalysis = Math.floor(FREE_PLAN.credits / 60);
        return {
            minutesOfAnalysis,
            credits: FREE_PLAN.credits
        };
    };

    // 如果正在加载订阅状态，显示加载状态
    if (subscriptionLoading) {
        return (
            <div className="relative bg-gradient-to-b py-20">
                <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-center py-20">
                        <div className="w-8 h-8 border-2 border-violet-400/30 border-t-violet-400 rounded-full animate-spin"></div>
                        <span className="ml-3 text-slate-300">Loading subscription information...</span>
                    </div>
                </div>
            </div>
        );
    }

    // 如果用户已有活跃订阅，显示订阅管理界面
    if (user && hasActiveSubscription) {
        return (
            <div className="relative bg-gradient-to-b py-20">
                {/* Decorative background elements */}
                <div className="absolute inset-0 overflow-hidden">
                    <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-violet-500/10 rounded-full blur-3xl"></div>
                    <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl"></div>
                </div>

                <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    {/* Header */}
                    <div className="text-center mb-16">
                        <h1 className="text-5xl lg:text-6xl font-bold text-white mb-6 tracking-tight">
                            Subscription Management
                        </h1>
                        <p className="text-xl text-slate-300 leading-relaxed mb-8 max-w-3xl mx-auto">
                            Manage your active subscription, view billing information, and update your plan settings.
                        </p>

                        {/* Current Credits Display */}
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800/50 rounded-full border border-slate-700 mb-8">
                            <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                            </svg>
                            <span className="text-slate-300">Current Credits:</span>
                            <span className="text-green-400 font-semibold">{credits.toLocaleString()}</span>
                        </div>
                    </div>

                    {/* Subscription Management Component */}
                    <SubscriptionManagement />


                </div>
            </div>
        );
    }

    return (
        <div className="relative bg-gradient-to-b py-20">
            {/* Decorative background elements */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-violet-500/10 rounded-full blur-3xl"></div>
                <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl"></div>
            </div>

            <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="text-center mb-16">
                    <h1 className="text-5xl lg:text-6xl font-bold text-white mb-6 tracking-tight">
                        Choose Your Subscription Plan
                    </h1>
                    <p className="text-xl text-slate-300 leading-relaxed mb-8 max-w-3xl mx-auto">
                        Start with a free trial or choose a monthly subscription plan that fits your needs. Professional AI audio analysis service, pay monthly, cancel anytime.
                    </p>

                    {/* Current Credits Display */}
                    {user && (
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800/50 rounded-full border border-slate-700 mb-8">
                            <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                            </svg>
                            <span className="text-slate-300">Current Credits:</span>
                            <span className="text-green-400 font-semibold">{credits.toLocaleString()}</span>
                        </div>
                    )}
                </div>

                {/* 全屏Loading遮罩 */}
                {(paymentStatus === 'processing' || paymentStatus === 'redirecting') && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                        <div className="bg-slate-800 rounded-2xl p-8 shadow-2xl border border-slate-700 max-w-md mx-4">
                            <div className="flex items-center gap-4">
                                <div className="w-8 h-8 border-2 border-violet-400/30 border-t-violet-400 rounded-full animate-spin flex-shrink-0"></div>
                                <div>
                                    <h3 className="text-white font-semibold mb-1">
                                        {paymentStatus === 'processing' ? 'Processing Subscription' : 'Redirecting to Payment'}
                                    </h3>
                                    <p className="text-slate-300 text-sm">
                                        {paymentStatus === 'processing'
                                            ? 'Creating your subscription session...'
                                            : 'Redirecting to secure payment page...'
                                        }
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Toast风格的错误提示 */}
                {error && (
                    <div className="fixed top-4 right-4 z-50 max-w-md">
                        <div className="bg-red-500/90 backdrop-blur-sm text-white p-4 rounded-xl shadow-2xl border border-red-400/30">
                            <div className="flex items-start gap-3">
                                <svg className="w-5 h-5 text-red-200 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <div className="flex-1">
                                    <p className="font-medium mb-1">Subscription Error</p>
                                    <p className="text-red-100 text-sm">{error}</p>
                                </div>
                                <button
                                    onClick={() => {
                                        setError(null);
                                        setPaymentStatus('idle');
                                    }}
                                    className="text-red-200 hover:text-white transition-colors"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* 已订阅用户提示 */}
                {user && hasActiveSubscription && (
                    <div className="max-w-4xl mx-auto mb-12 p-6 bg-green-500/10 border border-green-500/30 rounded-xl">
                        <div className="flex items-start gap-4">
                            <svg className="w-6 h-6 text-green-400 mt-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <div>
                                <h3 className="text-green-300 font-medium mb-2">You Have an Active Subscription</h3>
                                <p className="text-green-200 text-sm mb-4">
                                    You currently have an active subscription. You cannot subscribe to additional plans while your current subscription is active.
                                </p>
                                <div className="flex flex-wrap gap-3">
                                    <button
                                        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                                        className="px-4 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-300 rounded-lg transition-colors duration-200 text-sm"
                                    >
                                        Manage Current Subscription
                                    </button>
                                    <a
                                        href="/analyze"
                                        className="px-4 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-300 rounded-lg transition-colors duration-200 text-sm"
                                    >
                                        Start Analyzing
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Pricing Plans */}
                <div className="grid lg:grid-cols-4 md:grid-cols-2 gap-8 max-w-7xl mx-auto">
                    {/* Free Plan */}
                    <div className="relative p-8 rounded-2xl border border-green-500/30 bg-gradient-to-br from-green-500/5 to-emerald-500/5 hover:scale-105 transition-all duration-300 cursor-pointer flex flex-col h-full">
                        <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                            <span className="bg-gradient-to-r from-green-500 to-emerald-500 text-white text-sm font-medium px-4 py-2 rounded-full">
                                Free Trial
                            </span>
                        </div>

                        <div className="text-center flex-grow flex flex-col">
                            {/* Plan Name */}
                            <h3 className="text-2xl font-bold text-white mb-2">{FREE_PLAN.name}</h3>
                            <p className="text-slate-400 text-sm mb-6">{FREE_PLAN.description}</p>

                            {/* Price */}
                            <div className="mb-6">
                                <span className="text-4xl font-bold text-white">Free</span>
                                <div className="text-slate-400 text-sm mt-1">Forever Free</div>
                            </div>

                            {/* Credits */}
                            <div className="mb-8">
                                <div className="text-2xl font-bold text-green-400 mb-2">
                                    Not logged in: {FREE_PLAN.credits} credits
                                </div>
                                <div className="text-2xl font-bold text-green-400 mb-2">
                                    Logged in: {FREE_PLAN.creditsLoggedIn} credits/month
                                </div>
                                <div className="text-slate-400 text-sm">
                                    Logged in users get about {Math.floor(FREE_PLAN.creditsLoggedIn / 60)} minutes of audio analysis
                                </div>
                            </div>

                            {/* Features */}
                            <div className="mb-8 space-y-3 text-left flex-grow">
                                {FREE_PLAN.features.map((feature, index) => (
                                    <div key={index} className="flex items-center gap-3 text-sm text-slate-300">
                                        <svg className="w-4 h-4 text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                        {feature}
                                    </div>
                                ))}
                                {/* Limitations */}
                                {FREE_PLAN.limitations.map((limitation, index) => (
                                    <div key={`limit-${index}`} className="flex items-center gap-3 text-sm text-slate-400">
                                        <svg className="w-4 h-4 text-slate-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                        {limitation}
                                    </div>
                                ))}
                            </div>

                            {/* CTA Button */}
                            <div className="mt-auto">
                                <button
                                    onClick={handleFreePlanSelect}
                                    className="w-full py-4 px-6 rounded-xl font-semibold transition-all duration-300 bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:from-green-600 hover:to-emerald-600 shadow-lg hover:shadow-xl hover:shadow-green-500/25"
                                >
                                    Start Free
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Paid Plans */}
                    {plansArray.map((plan) => {
                        const valueMetrics = getValueMetrics(plan);
                        const isLoading = loading && selectedPlan === plan.id;
                        const isDisabled = loading && selectedPlan !== plan.id;
                        const isPopular = (plan as any).popular;

                        return (
                            <div
                                key={plan.id}
                                className={`relative p-8 rounded-2xl border transition-all duration-300 flex flex-col h-full ${isDisabled
                                    ? 'opacity-50 cursor-not-allowed'
                                    : 'hover:scale-105 cursor-pointer'
                                    } ${isPopular
                                        ? 'border-violet-500/50 bg-gradient-to-br from-violet-500/10 to-blue-500/10 shadow-xl shadow-violet-500/20'
                                        : 'border-slate-700 bg-slate-800/30 hover:border-slate-600'
                                    }`}
                            >
                                {/* Popular Badge */}
                                {isPopular && (
                                    <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                                        <span className="bg-gradient-to-r from-violet-500 to-blue-500 text-white text-sm font-medium px-4 py-2 rounded-full">
                                            Most Popular
                                        </span>
                                    </div>
                                )}

                                <div className="text-center flex-grow flex flex-col">
                                    {/* Plan Name */}
                                    <h3 className="text-2xl font-bold text-white mb-2">{plan.name}</h3>
                                    <p className="text-slate-400 text-sm mb-6">{plan.description}</p>

                                    {/* Price */}
                                    <div className="mb-6">
                                        <span className="text-4xl font-bold text-white">${plan.price}</span>
                                        <span className="text-slate-400 text-sm ml-2">/month</span>
                                        <div className="text-slate-500 text-xs mt-1">
                                            Auto-renews monthly, cancel anytime
                                        </div>
                                    </div>

                                    {/* Credits */}
                                    <div className="mb-8">
                                        <div className="text-3xl font-bold text-violet-400 mb-2">
                                            {plan.credits.toLocaleString()} credits/month
                                        </div>
                                        <div className="text-slate-400 text-sm">
                                            About {valueMetrics.minutesOfAnalysis} minutes of audio analysis
                                        </div>
                                        <div className="text-slate-500 text-xs mt-1">
                                            ${valueMetrics.pricePerMinute}/minute
                                        </div>
                                    </div>

                                    {/* Features */}
                                    <div className="mb-8 space-y-3 text-left flex-grow">
                                        {plan.features.map((feature, index) => (
                                            <div key={index} className="flex items-center gap-3 text-sm text-slate-300">
                                                <svg className="w-4 h-4 text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                </svg>
                                                {feature}
                                            </div>
                                        ))}

                                        {/* Additional feature highlights */}
                                        {(plan as any).audioFormats && (
                                            <div className="mt-4 pt-4 border-t border-slate-700">
                                                <div className="text-xs text-slate-400 mb-2">Supported formats:</div>
                                                <div className="flex flex-wrap gap-1">
                                                    {(plan as any).audioFormats.map((format: string, index: number) => (
                                                        <span key={index} className="px-2 py-1 bg-slate-700/50 text-xs text-slate-300 rounded">
                                                            {format}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {(plan as any).exportFormats && (
                                            <div className="mt-3">
                                                <div className="text-xs text-slate-400 mb-2">Export formats:</div>
                                                <div className="flex flex-wrap gap-1">
                                                    {(plan as any).exportFormats.map((format: string, index: number) => (
                                                        <span key={index} className="px-2 py-1 bg-violet-500/20 text-xs text-violet-300 rounded">
                                                            {format}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* CTA Button */}
                                    <div className="mt-auto">
                                        {/* 如果用户已有订阅，显示不同的按钮 */}
                                        {user && hasActiveSubscription ? (
                                            <button
                                                disabled
                                                className="w-full py-4 px-6 rounded-xl font-semibold transition-all duration-300 flex items-center justify-center gap-2 bg-slate-600/50 text-slate-400 cursor-not-allowed"
                                            >
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                </svg>
                                                Already Subscribed
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => !isDisabled && handlePlanSelect(plan.id)}
                                                disabled={isDisabled}
                                                className={`w-full py-4 px-6 rounded-xl font-semibold transition-all duration-300 flex items-center justify-center gap-2 ${isPopular
                                                    ? 'bg-gradient-to-r from-violet-500 to-blue-500 text-white hover:from-violet-600 hover:to-blue-600 disabled:from-violet-500/50 disabled:to-blue-500/50 shadow-lg hover:shadow-xl hover:shadow-violet-500/25'
                                                    : 'bg-slate-700 text-white hover:bg-slate-600 disabled:bg-slate-700/50'
                                                    } disabled:cursor-not-allowed`}
                                            >
                                                {isLoading && (
                                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                                )}
                                                {isLoading
                                                    ? (paymentStatus === 'redirecting' ? 'Redirecting...' : 'Processing...')
                                                    : 'Start Subscription'
                                                }
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>);
                    })}
                </div>

                {/* Subscription Benefits */}
                <div className="mt-16 max-w-4xl mx-auto grid md:grid-cols-2 gap-6">
                    <div className="p-6 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                        <div className="flex items-start gap-4">
                            <svg className="w-6 h-6 text-blue-400 mt-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <div>
                                <p className="text-blue-400 font-medium mb-2">Subscription Details</p>
                                <ul className="text-blue-300 space-y-1 text-sm">
                                    <li>• Payment securely processed by Lemonsqueezy, supports credit cards, PayPal, etc.</li>
                                    <li>• Auto-renews monthly, credits allocated to account monthly</li>
                                    <li>• 1 credit = 1 second of audio analysis, deducted based on actual usage</li>
                                    <li>• Cancel subscription anytime in customer portal, no penalty fees</li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    <div className="p-6 bg-violet-500/10 border border-violet-500/20 rounded-xl">
                        <div className="flex items-start gap-4">
                            <svg className="w-6 h-6 text-violet-400 mt-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <div>
                                <p className="text-violet-400 font-medium mb-2">Monthly Subscription Benefits</p>
                                <ul className="text-violet-300 space-y-1 text-sm">
                                    <li>• Fixed monthly credit allowance for more regular usage</li>
                                    <li>• Lower monthly cost, more cash flow friendly</li>
                                    <li>• Auto-renewal, no manual top-ups needed</li>
                                    <li>• Flexible cancellation, no long-term contract commitment</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Service Status */}
                {
                    !LemonsqueezyService.getInstance().isConfigured() && (
                        <div className="mt-8 max-w-2xl mx-auto p-6 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                            <div className="text-center">
                                <div className="w-16 h-16 mx-auto mb-4 bg-blue-500/20 rounded-full flex items-center justify-center">
                                    <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <h3 className="text-xl font-semibold text-blue-400 mb-2">Subscription System Configuration</h3>
                                <p className="text-blue-300 mb-4">
                                    We are configuring a secure subscription system and will soon provide monthly subscription services.
                                </p>
                                <div className="space-y-2 text-sm text-blue-200">
                                    <p>• Support for multiple secure payment methods</p>
                                    <p>• Automatic monthly credit allocation</p>
                                    <p>• Cancel subscription anytime</p>
                                </div>
                                <div className="mt-6 pt-4 border-t border-blue-500/20">
                                    <p className="text-blue-300 text-sm">
                                        For immediate subscription, please contact customer service:
                                    </p>
                                    <a
                                        href="/contact"
                                        className="inline-flex items-center gap-2 mt-2 px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 rounded-lg transition-colors duration-200"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                        </svg>
                                        Contact Support
                                    </a>
                                </div>
                            </div>
                        </div>
                    )
                }
            </div>
        </div>
    );
}