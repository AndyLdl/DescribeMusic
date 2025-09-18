import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
    LemonsqueezyService,
    LemonsqueezyError,
    SUBSCRIPTION_PLANS,
    initiatePayment,
    SubscriptionManager
} from '../lemonsqueezyService';
import * as lemonsqueezyJs from '@lemonsqueezy/lemonsqueezy.js';

// Mock the Lemonsqueezy SDK
vi.mock('@lemonsqueezy/lemonsqueezy.js', () => ({
    lemonSqueezySetup: vi.fn(),
    createCheckout: vi.fn(),
    getSubscription: vi.fn(),
    cancelSubscription: vi.fn(),
}));

const mockLemonsqueezyJs = vi.mocked(lemonsqueezyJs);

describe('LemonsqueezyService', () => {
    let service: LemonsqueezyService;
    let originalEnv: any;

    beforeEach(() => {
        // Store original environment
        originalEnv = { ...import.meta.env };

        // Mock environment variables
        import.meta.env.VITE_LEMONSQUEEZY_API_KEY = 'test-api-key';
        import.meta.env.VITE_LEMONSQUEEZY_STORE_ID = '12345';
        import.meta.env.VITE_LEMONSQUEEZY_BASIC_VARIANT_ID = '100';
        import.meta.env.VITE_LEMONSQUEEZY_PRO_VARIANT_ID = '200';
        import.meta.env.VITE_LEMONSQUEEZY_PREMIUM_VARIANT_ID = '300';

        // Clear all mocks
        vi.clearAllMocks();

        // Get fresh instance
        service = LemonsqueezyService.getInstance();

        // Mock console methods
        vi.spyOn(console, 'error').mockImplementation(() => { });
        vi.spyOn(console, 'warn').mockImplementation(() => { });
    });

    afterEach(() => {
        // Restore environment
        Object.assign(import.meta.env, originalEnv);
        vi.restoreAllMocks();
    });

    describe('getInstance', () => {
        it('should return singleton instance', () => {
            const instance1 = LemonsqueezyService.getInstance();
            const instance2 = LemonsqueezyService.getInstance();

            expect(instance1).toBe(instance2);
        });
    });

    describe('isConfigured', () => {
        it('should return true when API key and store ID are configured', () => {
            expect(service.isConfigured()).toBe(true);
        });

        it('should return false when API key is missing', () => {
            import.meta.env.VITE_LEMONSQUEEZY_API_KEY = '';
            const newService = new (LemonsqueezyService as any)();

            expect(newService.isConfigured()).toBe(false);
        });

        it('should return false when store ID is missing', () => {
            import.meta.env.VITE_LEMONSQUEEZY_STORE_ID = '';
            const newService = new (LemonsqueezyService as any)();

            expect(newService.isConfigured()).toBe(false);
        });
    });

    describe('getConfigStatus', () => {
        it('should return configuration status', () => {
            const status = service.getConfigStatus();

            expect(status).toEqual({
                hasApiKey: true,
                hasStoreId: true,
                isConfigured: true,
                plans: [
                    { id: 'basic', hasVariantId: true },
                    { id: 'pro', hasVariantId: true },
                    { id: 'premium', hasVariantId: true }
                ]
            });
        });

        it('should show missing variant IDs', () => {
            import.meta.env.VITE_LEMONSQUEEZY_BASIC_VARIANT_ID = '';
            const newService = new (LemonsqueezyService as any)();

            const status = newService.getConfigStatus();

            expect(status.plans[0]).toEqual({ id: 'basic', hasVariantId: false });
        });
    });

    describe('createCheckout', () => {
        const mockCheckoutResponse = {
            data: {
                id: 'checkout_123',
                type: 'checkouts',
                attributes: {
                    url: 'https://checkout.lemonsqueezy.com/checkout_123',
                    expires_at: '2024-12-31T23:59:59Z',
                    created_at: '2024-01-01T00:00:00Z',
                    updated_at: '2024-01-01T00:00:00Z'
                }
            }
        };

        beforeEach(() => {
            mockLemonsqueezyJs.lemonSqueezySetup.mockImplementation(() => { });
            mockLemonsqueezyJs.createCheckout.mockResolvedValue(mockCheckoutResponse);
        });

        it('should create checkout successfully', async () => {
            const result = await service.createCheckout('basic', {
                userId: 'user123',
                userEmail: 'test@example.com',
                userName: 'Test User'
            });

            expect(result).toEqual(mockCheckoutResponse);
            expect(mockLemonsqueezyJs.lemonSqueezySetup).toHaveBeenCalledWith({
                apiKey: 'test-api-key',
                onError: expect.any(Function)
            });
            expect(mockLemonsqueezyJs.createCheckout).toHaveBeenCalledWith(
                '12345',
                expect.objectContaining({
                    storeId: 12345,
                    variantId: 100,
                    attributes: expect.objectContaining({
                        checkout_data: expect.objectContaining({
                            email: 'test@example.com',
                            name: 'Test User',
                            custom: expect.objectContaining({
                                user_id: 'user123',
                                plan_id: 'basic',
                                credits: '2000'
                            })
                        })
                    })
                })
            );
        });

        it('should throw error for invalid plan ID', async () => {
            await expect(service.createCheckout('invalid' as any)).rejects.toThrow(
                new LemonsqueezyError('Invalid plan ID: invalid', 'INVALID_PLAN_ID')
            );
        });

        it('should throw error when variant ID is missing', async () => {
            import.meta.env.VITE_LEMONSQUEEZY_BASIC_VARIANT_ID = '';
            const newService = new (LemonsqueezyService as any)();

            await expect(newService.createCheckout('basic')).rejects.toThrow(
                new LemonsqueezyError('Variant ID not configured for plan: basic', 'MISSING_VARIANT_ID')
            );
        });

        it('should throw error when API key is missing', async () => {
            import.meta.env.VITE_LEMONSQUEEZY_API_KEY = '';
            const newService = new (LemonsqueezyService as any)();

            await expect(newService.createCheckout('basic')).rejects.toThrow(
                new LemonsqueezyError('Lemonsqueezy API key not configured', 'MISSING_API_KEY')
            );
        });

        it('should handle SDK errors', async () => {
            mockLemonsqueezyJs.createCheckout.mockRejectedValue(new Error('SDK Error'));

            await expect(service.createCheckout('basic')).rejects.toThrow(
                new LemonsqueezyError('Failed to create checkout session', 'CHECKOUT_CREATION_FAILED', 500)
            );
        });

        it('should handle invalid response', async () => {
            mockLemonsqueezyJs.createCheckout.mockResolvedValue({ data: null });

            await expect(service.createCheckout('basic')).rejects.toThrow(
                new LemonsqueezyError('Invalid response from Lemonsqueezy', 'INVALID_RESPONSE')
            );
        });
    });

    describe('getSubscription', () => {
        const mockSubscriptionResponse = {
            data: {
                id: 'sub_123',
                type: 'subscriptions',
                attributes: {
                    store_id: 12345,
                    customer_id: 67890,
                    order_id: 111,
                    order_item_id: 222,
                    product_id: 333,
                    variant_id: 100,
                    product_name: 'Test Product',
                    variant_name: 'Basic Plan',
                    user_name: 'Test User',
                    user_email: 'test@example.com',
                    status: 'active' as const,
                    status_formatted: 'Active',
                    card_brand: 'visa',
                    card_last_four: '4242',
                    pause: null,
                    cancelled: false,
                    trial_ends_at: null,
                    billing_anchor: 1,
                    urls: {
                        update_payment_method: 'https://example.com/update',
                        customer_portal: 'https://example.com/portal'
                    },
                    renews_at: '2024-02-01T00:00:00Z',
                    ends_at: null,
                    created_at: '2024-01-01T00:00:00Z',
                    updated_at: '2024-01-01T00:00:00Z'
                }
            }
        };

        beforeEach(() => {
            mockLemonsqueezyJs.lemonSqueezySetup.mockImplementation(() => { });
            mockLemonsqueezyJs.getSubscription.mockResolvedValue(mockSubscriptionResponse);
        });

        it('should get subscription successfully', async () => {
            const result = await service.getSubscription('sub_123');

            expect(result).toEqual(mockSubscriptionResponse);
            expect(mockLemonsqueezyJs.getSubscription).toHaveBeenCalledWith('sub_123');
        });

        it('should return null for non-existent subscription', async () => {
            mockLemonsqueezyJs.getSubscription.mockRejectedValue({ status: 404 });

            const result = await service.getSubscription('sub_nonexistent');

            expect(result).toBeNull();
        });

        it('should throw error for missing subscription ID', async () => {
            await expect(service.getSubscription('')).rejects.toThrow(
                new LemonsqueezyError('Subscription ID is required', 'MISSING_SUBSCRIPTION_ID')
            );
        });

        it('should handle SDK errors', async () => {
            mockLemonsqueezyJs.getSubscription.mockRejectedValue(new Error('SDK Error'));

            await expect(service.getSubscription('sub_123')).rejects.toThrow(
                new LemonsqueezyError('Failed to get subscription', 'GET_SUBSCRIPTION_FAILED', 500)
            );
        });

        it('should return null when response has no data', async () => {
            mockLemonsqueezyJs.getSubscription.mockResolvedValue({ data: null });

            const result = await service.getSubscription('sub_123');

            expect(result).toBeNull();
        });
    });

    describe('cancelSubscription', () => {
        const mockCancelResponse = {
            data: {
                id: 'sub_123',
                type: 'subscriptions',
                attributes: {
                    status: 'cancelled' as const,
                    cancelled: true,
                    ends_at: '2024-02-01T00:00:00Z'
                }
            }
        };

        beforeEach(() => {
            mockLemonsqueezyJs.lemonSqueezySetup.mockImplementation(() => { });
            mockLemonsqueezyJs.cancelSubscription.mockResolvedValue(mockCancelResponse);
        });

        it('should cancel subscription successfully', async () => {
            const result = await service.cancelSubscription('sub_123');

            expect(result).toEqual(mockCancelResponse);
            expect(mockLemonsqueezyJs.cancelSubscription).toHaveBeenCalledWith('sub_123');
        });

        it('should throw error for missing subscription ID', async () => {
            await expect(service.cancelSubscription('')).rejects.toThrow(
                new LemonsqueezyError('Subscription ID is required', 'MISSING_SUBSCRIPTION_ID')
            );
        });

        it('should handle SDK errors', async () => {
            mockLemonsqueezyJs.cancelSubscription.mockRejectedValue(new Error('SDK Error'));

            await expect(service.cancelSubscription('sub_123')).rejects.toThrow(
                new LemonsqueezyError('Failed to cancel subscription', 'CANCEL_SUBSCRIPTION_FAILED', 500)
            );
        });

        it('should handle invalid response', async () => {
            mockLemonsqueezyJs.cancelSubscription.mockResolvedValue({ data: null });

            await expect(service.cancelSubscription('sub_123')).rejects.toThrow(
                new LemonsqueezyError('Invalid response from Lemonsqueezy', 'INVALID_RESPONSE')
            );
        });
    });

    describe('Static methods', () => {
        describe('verifyWebhookSignature', () => {
            it('should verify valid signature', () => {
                const payload = '{"test": "data"}';
                const secret = 'test-secret';

                // Mock crypto module
                const crypto = require('crypto');
                const hmac = crypto.createHmac('sha256', secret);
                hmac.update(payload, 'utf8');
                const validSignature = hmac.digest('hex');

                const result = LemonsqueezyService.verifyWebhookSignature(payload, validSignature, secret);
                expect(result).toBe(true);
            });

            it('should reject invalid signature', () => {
                const payload = '{"test": "data"}';
                const secret = 'test-secret';
                const invalidSignature = 'invalid-signature';

                const result = LemonsqueezyService.verifyWebhookSignature(payload, invalidSignature, secret);
                expect(result).toBe(false);
            });

            it('should reject empty parameters', () => {
                expect(LemonsqueezyService.verifyWebhookSignature('', 'sig', 'secret')).toBe(false);
                expect(LemonsqueezyService.verifyWebhookSignature('payload', '', 'secret')).toBe(false);
                expect(LemonsqueezyService.verifyWebhookSignature('payload', 'sig', '')).toBe(false);
            });
        });

        describe('getPlan', () => {
            it('should return plan by ID', () => {
                const plan = LemonsqueezyService.getPlan('basic');
                expect(plan).toEqual(SUBSCRIPTION_PLANS.basic);
            });
        });

        describe('getAllPlans', () => {
            it('should return all plans', () => {
                const plans = LemonsqueezyService.getAllPlans();
                expect(plans).toEqual(Object.values(SUBSCRIPTION_PLANS));
            });
        });

        describe('getPlanByVariantId', () => {
            it('should return plan by variant ID', () => {
                const plan = LemonsqueezyService.getPlanByVariantId('100');
                expect(plan).toEqual(SUBSCRIPTION_PLANS.basic);
            });

            it('should return undefined for unknown variant ID', () => {
                const plan = LemonsqueezyService.getPlanByVariantId('999');
                expect(plan).toBeUndefined();
            });
        });
    });
});

describe('initiatePayment', () => {
    beforeEach(() => {
        // Mock window.location
        Object.defineProperty(window, 'location', {
            value: {
                href: '',
                origin: 'https://example.com'
            },
            writable: true
        });

        // Mock environment
        import.meta.env.VITE_LEMONSQUEEZY_API_KEY = 'test-api-key';
        import.meta.env.VITE_LEMONSQUEEZY_STORE_ID = '12345';
        import.meta.env.VITE_LEMONSQUEEZY_BASIC_VARIANT_ID = '100';

        mockLemonsqueezyJs.lemonSqueezySetup.mockImplementation(() => { });
        mockLemonsqueezyJs.createCheckout.mockResolvedValue({
            data: {
                id: 'checkout_123',
                attributes: {
                    url: 'https://checkout.lemonsqueezy.com/checkout_123'
                }
            }
        });
    });

    it('should initiate payment and redirect', async () => {
        await initiatePayment('basic', {
            userId: 'user123',
            userEmail: 'test@example.com'
        });

        expect(window.location.href).toBe('https://checkout.lemonsqueezy.com/checkout_123');
    });

    it('should throw error when service is not configured', async () => {
        import.meta.env.VITE_LEMONSQUEEZY_API_KEY = '';

        await expect(initiatePayment('basic')).rejects.toThrow(
            new LemonsqueezyError('Lemonsqueezy service is not properly configured', 'SERVICE_NOT_CONFIGURED')
        );
    });
});

describe('SubscriptionManager', () => {
    let manager: SubscriptionManager;
    let mockService: any;

    beforeEach(() => {
        manager = new SubscriptionManager();
        mockService = {
            getSubscription: vi.fn(),
            cancelSubscription: vi.fn()
        };

        // Replace the service instance
        (manager as any).service = mockService;
    });

    describe('getUserSubscriptionStatus', () => {
        it('should return active subscription status', async () => {
            const mockSubscription = {
                data: {
                    id: 'sub_123',
                    attributes: {
                        status: 'active',
                        status_formatted: 'Active',
                        product_name: 'Test Product',
                        variant_name: 'Basic Plan',
                        user_email: 'test@example.com',
                        renews_at: '2024-02-01T00:00:00Z',
                        ends_at: null,
                        cancelled: false,
                        trial_ends_at: null,
                        urls: {
                            update_payment_method: 'https://example.com/update',
                            customer_portal: 'https://example.com/portal'
                        },
                        card_brand: 'visa',
                        card_last_four: '4242'
                    }
                }
            };

            mockService.getSubscription.mockResolvedValue(mockSubscription);

            const result = await manager.getUserSubscriptionStatus('sub_123');

            expect(result.isActive).toBe(true);
            expect(result.status).toBe('active');
            expect(result.subscription).toEqual({
                id: 'sub_123',
                status: 'active',
                statusFormatted: 'Active',
                productName: 'Test Product',
                variantName: 'Basic Plan',
                userEmail: 'test@example.com',
                renewsAt: new Date('2024-02-01T00:00:00Z'),
                endsAt: null,
                cancelled: false,
                trialEndsAt: null,
                urls: {
                    update_payment_method: 'https://example.com/update',
                    customer_portal: 'https://example.com/portal'
                },
                cardBrand: 'visa',
                cardLastFour: '4242'
            });
        });

        it('should return not found for non-existent subscription', async () => {
            mockService.getSubscription.mockResolvedValue(null);

            const result = await manager.getUserSubscriptionStatus('sub_nonexistent');

            expect(result.isActive).toBe(false);
            expect(result.status).toBe('not_found');
            expect(result.subscription).toBeNull();
        });

        it('should handle errors gracefully', async () => {
            mockService.getSubscription.mockRejectedValue(new Error('API Error'));

            const result = await manager.getUserSubscriptionStatus('sub_123');

            expect(result.isActive).toBe(false);
            expect(result.status).toBe('error');
            expect(result.error).toBe('API Error');
        });
    });

    describe('checkRenewalReminder', () => {
        it('should return reminder needed for subscription expiring in 5 days', async () => {
            const renewalDate = new Date();
            renewalDate.setDate(renewalDate.getDate() + 5);

            mockService.getSubscription.mockResolvedValue({
                data: {
                    id: 'sub_123',
                    attributes: {
                        status: 'active',
                        renews_at: renewalDate.toISOString()
                    }
                }
            });

            const result = await manager.checkRenewalReminder('sub_123');

            expect(result.needsReminder).toBe(true);
            expect(result.daysUntilRenewal).toBe(5);
            expect(result.renewalDate).toEqual(renewalDate);
        });

        it('should return no reminder needed for subscription expiring in 10 days', async () => {
            const renewalDate = new Date();
            renewalDate.setDate(renewalDate.getDate() + 10);

            mockService.getSubscription.mockResolvedValue({
                data: {
                    id: 'sub_123',
                    attributes: {
                        status: 'active',
                        renews_at: renewalDate.toISOString()
                    }
                }
            });

            const result = await manager.checkRenewalReminder('sub_123');

            expect(result.needsReminder).toBe(false);
            expect(result.daysUntilRenewal).toBe(10);
        });

        it('should return no reminder for inactive subscription', async () => {
            mockService.getSubscription.mockResolvedValue(null);

            const result = await manager.checkRenewalReminder('sub_123');

            expect(result.needsReminder).toBe(false);
        });
    });

    describe('cancelUserSubscription', () => {
        it('should cancel subscription successfully', async () => {
            const mockCancelResponse = {
                data: {
                    id: 'sub_123',
                    attributes: {
                        status: 'cancelled',
                        cancelled: true,
                        ends_at: '2024-02-01T00:00:00Z'
                    }
                }
            };

            mockService.cancelSubscription.mockResolvedValue(mockCancelResponse);

            const result = await manager.cancelUserSubscription('sub_123');

            expect(result.success).toBe(true);
            expect(result.subscription).toEqual({
                id: 'sub_123',
                status: 'cancelled',
                cancelled: true,
                endsAt: new Date('2024-02-01T00:00:00Z')
            });
        });

        it('should handle cancellation errors', async () => {
            mockService.cancelSubscription.mockRejectedValue(new Error('Cancel failed'));

            const result = await manager.cancelUserSubscription('sub_123');

            expect(result.success).toBe(false);
            expect(result.error).toBe('Cancel failed');
        });
    });

    describe('Utility methods', () => {
        it('should get subscription credits by variant ID', () => {
            const credits = manager.getSubscriptionCredits('100');
            expect(credits).toBe(2000);
        });

        it('should return 0 credits for unknown variant ID', () => {
            const credits = manager.getSubscriptionCredits('999');
            expect(credits).toBe(0);
        });

        it('should format subscription status', () => {
            expect(manager.formatSubscriptionStatus('active')).toBe('活跃');
            expect(manager.formatSubscriptionStatus('cancelled')).toBe('已取消');
            expect(manager.formatSubscriptionStatus('unknown')).toBe('unknown');
        });

        it('should check if subscription can be modified', () => {
            expect(manager.canModifySubscription('active')).toBe(true);
            expect(manager.canModifySubscription('on_trial')).toBe(true);
            expect(manager.canModifySubscription('cancelled')).toBe(false);
            expect(manager.canModifySubscription('expired')).toBe(false);
        });
    });
});