import {
    lemonSqueezySetup,
    createCheckout,
    getSubscription,
    cancelSubscription as lemonsqueezyCancelSubscription,
    type Checkout,
    type Subscription,
    type NewCheckout
} from '@lemonsqueezy/lemonsqueezy.js';

// Free plan configuration
export const FREE_PLAN = {
    id: 'free',
    name: 'Free Trial',
    price: 0,
    credits: 100, // 100 credits for non-logged users
    creditsLoggedIn: 200, // 200 credits monthly for logged users (100 base + 100 bonus)
    description: 'Free trial of AI audio analysis',
    features: [
        'Not logged in: 100 credits (1.7 minutes)',
        'Logged in: 200 credits monthly (3.3 minutes)',
        'Basic audio analysis features',
        'Supports MP3 format (max 10MB)',
        'View analysis results online',
        'Community support'
    ],
    limitations: [
        'No export functionality',
        'No batch processing support',
        'No API access',
        'MP3 format only',
        '10MB file size limit'
    ],
    audioFormats: ['MP3'],
    maxFileSize: '10MB',
    exportFormats: [],
    hasExport: false,
    hasBatchProcessing: false,
    hasAPI: false,
    analysisLevel: 'basic'
} as const;

// Monthly subscription plans configuration
export const SUBSCRIPTION_PLANS = {
    basic: {
        id: 'basic',
        name: 'Basic Plan',
        price: 9.9,
        credits: 1200, // Monthly credits (20 minutes)
        variantId: import.meta.env.VITE_LEMONSQUEEZY_BASIC_VARIANT_ID || '999977',
        description: 'Perfect for light users',
        features: [
            '1200 credits monthly (20 minutes)',
            'PDF/TXT report export',
            'Supports MP3, WAV formats',
            'Max file size 50MB',
            'Advanced audio analysis',
            'Email customer support',
            'History record saving'
        ],
        audioFormats: ['MP3', 'WAV'],
        maxFileSize: '50MB',
        exportFormats: ['PDF', 'TXT'],
        hasExport: true,
        hasBatchProcessing: false,
        hasAPI: false,
        analysisLevel: 'advanced',
        supportLevel: 'email'
    },
    pro: {
        id: 'pro',
        name: 'Professional Plan',
        price: 19.9,
        credits: 3000, // Monthly credits (50 minutes)
        variantId: import.meta.env.VITE_LEMONSQUEEZY_PRO_VARIANT_ID || '999980',
        description: 'Perfect for professional users',
        popular: true,
        features: [
            '3000 credits monthly (50 minutes)',
            'Multi-format report export',
            'Supports all audio file formats',
            'Max file size 200MB',
            'Advanced audio analysis',
            'History record saving',
            '🚧 Batch processing feature (In Development)',
            '🚧 API access permissions (In Development)',
            'Email customer support'
        ],
        audioFormats: ['MP3', 'WAV', 'M4A', 'OGG', 'WMA'],
        maxFileSize: '200MB',
        exportFormats: ['PDF', 'TXT', 'CSV', 'JSON'],
        hasExport: true,
        hasBatchProcessing: 'coming_soon',
        hasAPI: 'coming_soon',
        analysisLevel: 'advanced',
        supportLevel: 'email'
    },
    premium: {
        id: 'premium',
        name: 'Enterprise Plan',
        price: 39.9,
        credits: 7200, // Monthly credits (120 minutes)
        variantId: import.meta.env.VITE_LEMONSQUEEZY_PREMIUM_VARIANT_ID || '999982',
        description: 'Perfect for enterprises and heavy users',
        features: [
            '7200 credits monthly (120 minutes)',
            'Complete report suite export',
            'Supports all audio file formats',
            'Max file size 200MB',
            'Advanced audio analysis',
            'History record saving',
            '🚧 Batch processing feature (In Development)',
            '🚧 API access permissions (In Development)',
            'Email customer support'
        ],
        audioFormats: ['MP3', 'WAV', 'M4A', 'OGG', 'WMA'],
        maxFileSize: '200MB',
        exportFormats: ['PDF', 'TXT', 'CSV', 'JSON'],
        hasExport: true,
        hasBatchProcessing: 'coming_soon',
        hasAPI: 'coming_soon',
        analysisLevel: 'advanced',
        supportLevel: 'email'
    }
} as const;

export type PlanId = keyof typeof SUBSCRIPTION_PLANS;

// Lemonsqueezy response types
export interface CheckoutResponse {
    data: {
        id: string;
        type: string;
        attributes: {
            url: string;
            expires_at: string;
            created_at: string;
            updated_at: string;
        };
    };
}

export interface SubscriptionResponse {
    data: {
        id: string;
        type: string;
        attributes: {
            store_id: number;
            customer_id: number;
            order_id: number;
            order_item_id: number;
            product_id: number;
            variant_id: number;
            product_name: string;
            variant_name: string;
            user_name: string;
            user_email: string;
            status: 'on_trial' | 'active' | 'paused' | 'past_due' | 'unpaid' | 'cancelled' | 'expired';
            status_formatted: string;
            card_brand: string;
            card_last_four: string;
            pause: any;
            cancelled: boolean;
            trial_ends_at: string | null;
            billing_anchor: number;
            urls: {
                update_payment_method: string;
                customer_portal: string;
            };
            renews_at: string;
            ends_at: string | null;
            created_at: string;
            updated_at: string;
        };
    };
}

// Custom error types
export class LemonsqueezyError extends Error {
    constructor(
        message: string,
        public code: string,
        public statusCode?: number
    ) {
        super(message);
        this.name = 'LemonsqueezyError';
    }
}

/**
 * Lemonsqueezy payment service class
 */
export class LemonsqueezyService {
    private static instance: LemonsqueezyService;
    private apiKey: string;
    private storeId: string;
    private isInitialized = false;

    private constructor() {
        // Read configuration from environment variables with fallback values
        const envApiKey = import.meta.env.VITE_LEMONSQUEEZY_API_KEY;
        const fallbackApiKey = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiI5NGQ1OWNlZi1kYmI4LTRlYTUtYjE3OC1kMjU0MGZjZDY5MTkiLCJqdGkiOiJkNTQzZmJmOGIxMTdkZjdmODI5MTFiMzI4NTRlYWQ0MjBmNjdkNDk5Y2RlYjU5ZTVkMDg1ZTBmOTE5NTVhNWUyN2MzODRiYzlmODU1MjllMCIsImlhdCI6MTc1Nzk5OTg1Ni44NzMxNTMsIm5iZiI6MTc1Nzk5OTg1Ni44NzMxNTYsImV4cCI6MjA3MzUzMjY1Ni44NTE3MjQsInN1YiI6IjE5MTQwMTEiLCJzY29wZXMiOltdfQ.QaX1W8waHys5KuCgR0TusrmFuAOm9p7dyTq_hH06X0f8VlWbH1x8451DLHTkn2KrEOoKLYSXuMPM3Mf20PKIGk5-9dQFnW4WB7elbe3picWemj4jkviTsQEzmcH4haqyypLfqscNXhxFcRjSyOdYBHmcJU2A83Sl5aDYhynICAXf_BLPttmGy7gMTI9Q7-PmLkz_HgxEHSawgWrDppL1hI8sNI_CgyiX-9J6brLOHmYfrTpHxokd916KjBFtxI7XSQ9SykejsVgGtfo6IC7DgPnu8QcSKATmvJ7OgbpT6uE3LBwCdnH0UGMi-CQQeTO04VPeeCqoJNAAuU75rC9rPcwAetVEVXtwSkiSJSQ5U5kr8lHTd3n8SU2BpwWEXDSajx_rWdxW5da-CcFDyTcyPGlGedH-F8SY85EAYRjt7-JU2ekP19yV7HCHyPwxbP4VFigGhw7kfGX8as2kjrJHBDKfUHNsdExEs-u3aJuVg7L2lTxLu-NGhSsQ7X1eBcsY';

        // Check if environment variables are complete
        if (envApiKey && envApiKey.length >= 800) {
            this.apiKey = envApiKey;
        } else {
            console.warn('⚠️ Environment variable API Key incomplete, using fallback value');
            this.apiKey = fallbackApiKey;
        }

        this.storeId = import.meta.env.VITE_LEMONSQUEEZY_STORE_ID || '76046';

        if (!this.apiKey || !this.storeId) {
            console.warn('Lemonsqueezy API key or Store ID not configured');
        }
    }

    /**
     * Get service instance (singleton pattern)
     */
    public static getInstance(): LemonsqueezyService {
        if (!LemonsqueezyService.instance) {
            LemonsqueezyService.instance = new LemonsqueezyService();
        }
        return LemonsqueezyService.instance;
    }

    /**
     * Initialize Lemonsqueezy SDK
     */
    private async initialize(): Promise<void> {
        if (this.isInitialized) return;

        if (!this.apiKey) {
            throw new LemonsqueezyError(
                'Lemonsqueezy API key not configured',
                'MISSING_API_KEY'
            );
        }

        try {
            lemonSqueezySetup({
                apiKey: this.apiKey,
                onError: (error) => {
                    console.error('Lemonsqueezy SDK Error:', error);
                }
            });

            this.isInitialized = true;
        } catch (error) {
            throw new LemonsqueezyError(
                'Failed to initialize Lemonsqueezy SDK',
                'INITIALIZATION_FAILED'
            );
        }
    }

    /**
     * Create payment checkout session
     */
    async createCheckout(
        planId: PlanId,
        customData: {
            userId?: string;
            userEmail?: string;
            userName?: string;
            [key: string]: any;
        } = {}
    ): Promise<CheckoutResponse> {
        await this.initialize();

        const plan = SUBSCRIPTION_PLANS[planId];
        if (!plan) {
            throw new LemonsqueezyError(
                `Invalid plan ID: ${planId}`,
                'INVALID_PLAN_ID'
            );
        }

        if (!plan.variantId) {
            throw new LemonsqueezyError(
                `Variant ID not configured for plan: ${planId}`,
                'MISSING_VARIANT_ID'
            );
        }

        try {
            // Use correct Lemonsqueezy API format
            const checkoutData = {
                data: {
                    type: 'checkouts',
                    attributes: {
                        checkout_options: {
                            embed: false,
                            media: false,
                            logo: true,
                            desc: true,
                            discount: true,
                            dark: false,
                            subscription_preview: true,
                            button_color: '#3B82F6'
                        },
                        checkout_data: {
                            email: customData.userEmail || '',
                            name: customData.userName || '',
                            custom: {
                                user_id: customData.userId || '',
                                plan_id: planId,
                                credits: plan.credits.toString(),
                                ...customData
                            }
                        },
                        product_options: {
                            name: plan.name,
                            description: `${plan.description} - ${plan.credits} credits`,
                            media: [],
                            redirect_url: `${window.location.origin}/analyze?payment=success`,
                            receipt_button_text: 'Return to App',
                            receipt_link_url: `${window.location.origin}/analyze`,
                            receipt_thank_you_note: 'Thank you for your purchase! Credits will be added to your account within a few minutes.'
                        }
                    },
                    relationships: {
                        store: {
                            data: {
                                type: 'stores',
                                id: this.storeId
                            }
                        },
                        variant: {
                            data: {
                                type: 'variants',
                                id: plan.variantId
                            }
                        }
                    }
                }
            };

            console.log('🔍 Creating checkout session, data:', {
                storeId: this.storeId,
                variantId: plan.variantId,
                checkoutData
            });

            // Use fetch API directly as SDK might have issues
            const response = await fetch('https://api.lemonsqueezy.com/v1/checkouts', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Accept': 'application/vnd.api+json',
                    'Content-Type': 'application/vnd.api+json'
                },
                body: JSON.stringify(checkoutData)
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Lemonsqueezy API error:', {
                    status: response.status,
                    statusText: response.statusText,
                    error: errorText
                });
                throw new LemonsqueezyError(
                    `API request failed: ${response.status} ${response.statusText}`,
                    'API_REQUEST_FAILED',
                    response.status
                );
            }

            const responseData = await response.json();

            if (!responseData.data) {
                throw new LemonsqueezyError(
                    'Invalid response from Lemonsqueezy',
                    'INVALID_RESPONSE'
                );
            }

            console.log('✅ Checkout session created successfully:', responseData.data);

            return responseData as CheckoutResponse;
        } catch (error) {
            console.error('Lemonsqueezy createCheckout error:', error);

            if (error instanceof LemonsqueezyError) {
                throw error;
            }

            throw new LemonsqueezyError(
                'Failed to create checkout session',
                'CHECKOUT_CREATION_FAILED',
                500
            );
        }
    }

    /**
     * Get subscription information
     */
    async getSubscription(subscriptionId: string): Promise<SubscriptionResponse | null> {
        await this.initialize();

        if (!subscriptionId) {
            throw new LemonsqueezyError(
                'Subscription ID is required',
                'MISSING_SUBSCRIPTION_ID'
            );
        }

        try {
            const response = await getSubscription(subscriptionId);

            if (!response.data) {
                return null;
            }

            return response as SubscriptionResponse;
        } catch (error) {
            console.error('Lemonsqueezy getSubscription error:', error);

            // If subscription doesn't exist, return null instead of throwing error
            if (error && typeof error === 'object' && 'status' in error && error.status === 404) {
                return null;
            }

            throw new LemonsqueezyError(
                'Failed to get subscription',
                'GET_SUBSCRIPTION_FAILED',
                500
            );
        }
    }

    /**
     * Cancel subscription
     */
    async cancelSubscription(subscriptionId: string): Promise<SubscriptionResponse> {
        await this.initialize();

        if (!subscriptionId) {
            throw new LemonsqueezyError(
                'Subscription ID is required',
                'MISSING_SUBSCRIPTION_ID'
            );
        }

        try {
            console.log('🔄 Calling Lemonsqueezy cancelSubscription API for:', subscriptionId);

            const response = await lemonsqueezyCancelSubscription(subscriptionId);

            console.log('📥 Raw Lemonsqueezy API response:', response);
            console.log('📋 Response data:', response?.data);
            console.log('📋 Response statusCode:', response?.statusCode);
            console.log('📋 Response error:', response?.error);

            // 检查不同的响应格式
            if (!response) {
                throw new LemonsqueezyError(
                    'No response from Lemonsqueezy API',
                    'NO_RESPONSE'
                );
            }

            // Lemonsqueezy SDK可能返回不同的格式
            if (response.error) {
                throw new LemonsqueezyError(
                    `Lemonsqueezy API error: ${response.error.message || response.error}`,
                    'API_ERROR'
                );
            }

            if (!response.data) {
                console.warn('⚠️ No data in response, but no error either. Response:', response);
                throw new LemonsqueezyError(
                    'Invalid response from Lemonsqueezy - no data field',
                    'INVALID_RESPONSE'
                );
            }

            console.log('✅ Valid response received from Lemonsqueezy');
            return response as SubscriptionResponse;
        } catch (error) {
            console.error('Lemonsqueezy cancelSubscription error:', error);

            if (error instanceof LemonsqueezyError) {
                throw error;
            }

            throw new LemonsqueezyError(
                'Failed to cancel subscription',
                'CANCEL_SUBSCRIPTION_FAILED',
                500
            );
        }
    }

    /**
     * Verify Webhook signature
     */
    static verifyWebhookSignature(
        payload: string,
        signature: string,
        secret: string
    ): boolean {
        if (!payload || !signature || !secret) {
            return false;
        }

        try {
            // Use crypto module to verify signature
            const crypto = require('crypto');
            const hmac = crypto.createHmac('sha256', secret);
            hmac.update(payload, 'utf8');
            const expectedSignature = hmac.digest('hex');

            // Secure signature comparison
            return crypto.timingSafeEqual(
                Buffer.from(signature, 'hex'),
                Buffer.from(expectedSignature, 'hex')
            );
        } catch (error) {
            console.error('Webhook signature verification error:', error);
            return false;
        }
    }

    /**
     * Get plan information
     */
    static getPlan(planId: PlanId) {
        return SUBSCRIPTION_PLANS[planId];
    }

    /**
     * Get all plans
     */
    static getAllPlans() {
        return Object.values(SUBSCRIPTION_PLANS);
    }

    /**
     * Get plan by variant ID
     */
    static getPlanByVariantId(variantId: string) {
        return Object.values(SUBSCRIPTION_PLANS).find(
            plan => plan.variantId === variantId
        );
    }

    /**
     * Check if service is configured
     */
    isConfigured(): boolean {
        return !!(this.apiKey && this.storeId);
    }

    /**
     * Get configuration status
     */
    getConfigStatus() {
        return {
            hasApiKey: !!this.apiKey,
            hasStoreId: !!this.storeId,
            isConfigured: this.isConfigured(),
            plans: Object.keys(SUBSCRIPTION_PLANS).map(planId => ({
                id: planId,
                hasVariantId: !!SUBSCRIPTION_PLANS[planId as PlanId].variantId
            }))
        };
    }
}

// Export function to get instance instead of directly exporting instance
export const getLemonsqueezyService = () => LemonsqueezyService.getInstance();

// For backward compatibility, also export a getter
export const lemonsqueezyService = {
    get instance() {
        return LemonsqueezyService.getInstance();
    },
    isConfigured() {
        return this.instance.isConfigured();
    },
    getConfigStatus() {
        return this.instance.getConfigStatus();
    },
    createCheckout(planId: PlanId, customData: any) {
        return this.instance.createCheckout(planId, customData);
    },
    getSubscription(subscriptionId: string) {
        return this.instance.getSubscription(subscriptionId);
    },
    cancelSubscription(subscriptionId: string) {
        return this.instance.cancelSubscription(subscriptionId);
    }
};

/**
 * Convenience function: Create payment checkout and redirect
 */
export async function initiatePayment(
    planId: PlanId,
    userInfo: {
        userId?: string;
        userEmail?: string;
        userName?: string;
    } = {}
): Promise<void> {
    try {
        const service = LemonsqueezyService.getInstance();

        if (!service.isConfigured()) {
            throw new LemonsqueezyError(
                'Lemonsqueezy service is not properly configured',
                'SERVICE_NOT_CONFIGURED'
            );
        }

        const checkout = await service.createCheckout(planId, userInfo);

        // Redirect to payment page
        window.location.href = checkout.data.attributes.url;
    } catch (error) {
        console.error('Failed to initiate payment:', error);
        throw error;
    }
}

/**
 * Convenience function: Get recommended plan
 */
export function getRecommendedPlan(): PlanId {
    return 'pro'; // Recommend professional plan
}

/**
 * Convenience function: Format price display
 */
export function formatPrice(price: number): string {
    return `$${price.toFixed(2)}`;
}

/**
 * Convenience function: Format credits display
 */
export function formatCredits(credits: number): string {
    return `${credits.toLocaleString()} credits`;
}
/**
 * Subscription status management class
 */
export class SubscriptionManager {
    private service: LemonsqueezyService;

    constructor() {
        this.service = LemonsqueezyService.getInstance();
    }

    /**
     * Get user subscription status
     */
    async getUserSubscriptionStatus(subscriptionId: string) {
        try {
            const subscription = await this.service.getSubscription(subscriptionId);

            if (!subscription) {
                return {
                    isActive: false,
                    status: 'not_found',
                    subscription: null
                };
            }

            const status = subscription.data.attributes.status;
            const isActive = ['active', 'on_trial'].includes(status);

            return {
                isActive,
                status,
                subscription: {
                    id: subscription.data.id,
                    status: subscription.data.attributes.status,
                    statusFormatted: subscription.data.attributes.status_formatted,
                    productName: subscription.data.attributes.product_name,
                    variantName: subscription.data.attributes.variant_name,
                    userEmail: subscription.data.attributes.user_email,
                    renewsAt: new Date(subscription.data.attributes.renews_at),
                    endsAt: subscription.data.attributes.ends_at ? new Date(subscription.data.attributes.ends_at) : null,
                    cancelled: subscription.data.attributes.cancelled,
                    trialEndsAt: subscription.data.attributes.trial_ends_at ? new Date(subscription.data.attributes.trial_ends_at) : null,
                    urls: subscription.data.attributes.urls,
                    cardBrand: subscription.data.attributes.card_brand,
                    cardLastFour: subscription.data.attributes.card_last_four
                }
            };
        } catch (error) {
            console.error('Failed to get subscription status:', error);
            return {
                isActive: false,
                status: 'error',
                subscription: null,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    /**
     * Check if subscription needs renewal reminder
     */
    async checkRenewalReminder(subscriptionId: string): Promise<{
        needsReminder: boolean;
        daysUntilRenewal?: number;
        renewalDate?: Date;
    }> {
        try {
            const statusResult = await this.getUserSubscriptionStatus(subscriptionId);

            if (!statusResult.isActive || !statusResult.subscription) {
                return { needsReminder: false };
            }

            const renewalDate = statusResult.subscription.renewsAt;
            const now = new Date();
            const daysUntilRenewal = Math.ceil((renewalDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

            // Remind user 7 days before renewal
            const needsReminder = daysUntilRenewal <= 7 && daysUntilRenewal > 0;

            return {
                needsReminder,
                daysUntilRenewal,
                renewalDate
            };
        } catch (error) {
            console.error('Failed to check renewal reminder:', error);
            return { needsReminder: false };
        }
    }

    /**
     * Cancel subscription
     */
    async cancelUserSubscription(subscriptionId: string) {
        try {
            console.log('🚫 Attempting to cancel subscription:', subscriptionId);

            const result = await this.service.cancelSubscription(subscriptionId);

            console.log('📋 Cancel subscription API response:', result);

            // 检查响应结构
            if (!result) {
                throw new Error('No response from Lemonsqueezy API');
            }

            if (!result.data) {
                console.error('❌ Invalid response structure:', result);
                throw new Error('Invalid response structure from Lemonsqueezy API');
            }

            // 根据API文档，响应应该有这样的结构
            const subscriptionData = {
                id: result.data.id,
                status: result.data.attributes?.status || 'cancelled',
                cancelled: result.data.attributes?.cancelled || true,
                endsAt: result.data.attributes?.ends_at ? new Date(result.data.attributes.ends_at) : null
            };

            console.log('✅ Subscription cancelled successfully:', subscriptionData);

            return {
                success: true,
                subscription: subscriptionData
            };
        } catch (error) {
            console.error('❌ Failed to cancel subscription:', error);

            // 提供更详细的错误信息
            let errorMessage = 'Unknown error';
            if (error instanceof Error) {
                errorMessage = error.message;
            } else if (typeof error === 'string') {
                errorMessage = error;
            } else if (error && typeof error === 'object') {
                errorMessage = JSON.stringify(error);
            }

            return {
                success: false,
                error: errorMessage
            };
        }
    }

    /**
     * Get subscription credit information
     */
    getSubscriptionCredits(variantId: string): number {
        const plan = LemonsqueezyService.getPlanByVariantId(variantId);
        return plan?.credits || 0;
    }

    /**
     * Format subscription status display
     */
    formatSubscriptionStatus(status: string): string {
        const statusMap: Record<string, string> = {
            'active': 'Active',
            'on_trial': 'On Trial',
            'paused': 'Paused',
            'past_due': 'Past Due',
            'unpaid': 'Unpaid',
            'cancelled': 'Cancelled',
            'expired': 'Expired'
        };

        return statusMap[status] || status;
    }

    /**
     * Check if subscription can be upgraded/downgraded
     */
    canModifySubscription(status: string): boolean {
        return ['active', 'on_trial'].includes(status);
    }

    /**
     * Get customer portal URL (for managing subscription)
     */
    async getCustomerPortalUrl(subscriptionId: string): Promise<string | null> {
        try {
            const statusResult = await this.getUserSubscriptionStatus(subscriptionId);

            if (!statusResult.subscription) {
                return null;
            }

            return statusResult.subscription.urls.customer_portal;
        } catch (error) {
            console.error('Failed to get customer portal URL:', error);
            return null;
        }
    }

    /**
     * Sync subscription status to local database
     */
    async syncSubscriptionStatus(subscriptionId: string, userId: string) {
        try {
            const statusResult = await this.getUserSubscriptionStatus(subscriptionId);

            if (!statusResult.subscription) {
                return {
                    success: false,
                    error: 'Subscription not found'
                };
            }

            // Should call Supabase function to update local subscription status
            // Since this is service layer, we return data that needs to be updated
            return {
                success: true,
                subscriptionData: {
                    lemonsqueezy_subscription_id: statusResult.subscription.id,
                    status: statusResult.subscription.status,
                    current_period_start: statusResult.subscription.renewsAt,
                    current_period_end: statusResult.subscription.endsAt,
                    cancel_at_period_end: statusResult.subscription.cancelled,
                    plan_name: statusResult.subscription.variantName,
                    plan_credits: this.getSubscriptionCredits(statusResult.subscription.id)
                }
            };
        } catch (error) {
            console.error('Failed to sync subscription status:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
}

// Export subscription manager instance
export const subscriptionManager = new SubscriptionManager();