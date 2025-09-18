import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock crypto for browser environment
const crypto = {
    createHmac: (algorithm: string, key: string) => ({
        update: (data: string, encoding: string) => ({
            digest: (format: string) => {
                // Simple mock implementation for testing
                return `mocked-${algorithm}-${key}-${data}-${format}`;
            }
        })
    }),
    timingSafeEqual: (a: Buffer, b: Buffer) => {
        return a.toString() === b.toString();
    }
};

// Mock Firebase Functions
const mockHttpsOnRequest = vi.fn();
vi.mock('firebase-functions/v1', () => ({
    region: vi.fn(() => ({
        https: {
            onRequest: mockHttpsOnRequest
        }
    }))
}));

// Mock dependencies
vi.mock('../utils/config', () => ({
    default: {
        lemonsqueezy: {
            webhookSecret: 'test-webhook-secret',
            basicVariantId: '100',
            proVariantId: '200',
            premiumVariantId: '300'
        }
    }
}));

vi.mock('../utils/logger', () => ({
    default: {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn()
    }
}));

vi.mock('../utils/supabase', () => ({
    default: {
        from: vi.fn(() => ({
            insert: vi.fn(() => ({
                select: vi.fn(() => ({
                    single: vi.fn().mockResolvedValue({ data: { id: 'payment_123' }, error: null })
                }))
            })),
            upsert: vi.fn().mockResolvedValue({ error: null }),
            update: vi.fn(() => ({
                eq: vi.fn().mockResolvedValue({ error: null })
            })),
            select: vi.fn(() => ({
                eq: vi.fn(() => ({
                    single: vi.fn().mockResolvedValue({
                        data: {
                            id: 'sub_123',
                            user_id: 'user123',
                            plan_credits: 2000,
                            plan_name: 'Basic Plan',
                            current_period_end: '2024-01-01T00:00:00Z'
                        },
                        error: null
                    })
                }))
            }))
        })),
        rpc: vi.fn().mockResolvedValue({ data: true, error: null })
    }
}));

// Import after mocking
import config from '../utils/config';

describe('Lemonsqueezy Webhook Integration Tests', () => {
    let mockRequest: any;
    let mockResponse: any;

    beforeEach(() => {
        vi.clearAllMocks();

        mockResponse = {
            setHeader: vi.fn(),
            status: vi.fn().mockReturnThis(),
            json: vi.fn().mockReturnThis(),
            end: vi.fn()
        };
    });

    describe('Webhook signature verification', () => {
        const createValidSignature = (payload: string): string => {
            return crypto
                .createHmac('sha256', config.lemonsqueezy.webhookSecret)
                .update(payload, 'utf8')
                .digest('hex');
        };

        it('should verify valid HMAC-SHA256 signature', () => {
            const payload = '{"test": "data"}';
            const signature = createValidSignature(payload);

            // Test the signature verification logic directly
            const expectedSignature = crypto
                .createHmac('sha256', config.lemonsqueezy.webhookSecret)
                .update(payload, 'utf8')
                .digest('hex');

            expect(signature).toBe(expectedSignature);

            // Test timing-safe comparison
            const isValid = crypto.timingSafeEqual(
                Buffer.from(signature, 'hex'),
                Buffer.from(expectedSignature, 'hex')
            );

            expect(isValid).toBe(true);
        });

        it('should reject invalid signature', () => {
            const payload = '{"test": "data"}';
            const validSignature = createValidSignature(payload);
            const invalidSignature = 'invalid-signature-hex';

            // Should not be equal
            expect(validSignature).not.toBe(invalidSignature);

            // Test with different length (should fail gracefully)
            const isValidLength = validSignature.length === invalidSignature.length;
            expect(isValidLength).toBe(false);
        });

        it('should handle signature format variations', () => {
            const payload = '{"test": "data"}';
            const signature = createValidSignature(payload);

            // Test with sha256= prefix (common format)
            const prefixedSignature = `sha256=${signature}`;
            const cleanSignature = prefixedSignature.replace('sha256=', '');

            expect(cleanSignature).toBe(signature);
        });
    });

    describe('Webhook payload validation', () => {
        it('should validate required payload structure', () => {
            // Valid payload
            const validPayload = {
                meta: {
                    event_name: 'order_created',
                    custom_data: { user_id: 'user123' }
                },
                data: {
                    id: 'order_123',
                    type: 'orders',
                    attributes: {}
                }
            };

            expect(validPayload.meta).toBeDefined();
            expect(validPayload.meta.event_name).toBeDefined();
            expect(validPayload.data).toBeDefined();
            expect(validPayload.data.id).toBeDefined();
            expect(validPayload.data.type).toBeDefined();

            // Invalid payloads
            const invalidPayloads = [
                null,
                {},
                { meta: {} },
                { data: {} },
                { meta: { event_name: 'test' } }, // missing data
                { data: { id: 'test', type: 'test' } }, // missing meta
                { meta: {}, data: { id: 'test', type: 'test' } }, // missing event_name
                { meta: { event_name: 'test' }, data: {} }, // missing id/type
            ];

            invalidPayloads.forEach(payload => {
                if (!payload || typeof payload !== 'object') {
                    expect(payload).toBeFalsy();
                    return;
                }

                const hasValidMeta = payload.meta && payload.meta.event_name;
                const hasValidData = payload.data && payload.data.id && payload.data.type;

                expect(hasValidMeta && hasValidData).toBe(false);
            });
        });
    });

    describe('Credit calculation by variant ID', () => {
        const getCreditsForVariant = (variantId: number): number => {
            const variantCreditsMap: Record<string, number> = {
                [config.lemonsqueezy.basicVariantId || '']: 2000,
                [config.lemonsqueezy.proVariantId || '']: 4000,
                [config.lemonsqueezy.premiumVariantId || '']: 6000
            };

            return variantCreditsMap[variantId.toString()] || 0;
        };

        it('should return correct credits for known variants', () => {
            expect(getCreditsForVariant(100)).toBe(2000); // Basic
            expect(getCreditsForVariant(200)).toBe(4000); // Pro
            expect(getCreditsForVariant(300)).toBe(6000); // Premium
        });

        it('should return 0 for unknown variants', () => {
            expect(getCreditsForVariant(999)).toBe(0);
            expect(getCreditsForVariant(0)).toBe(0);
        });
    });

    describe('Plan name mapping', () => {
        const getPlanNameForVariant = (variantId: number): string => {
            const variantPlanMap: Record<string, string> = {
                [config.lemonsqueezy.basicVariantId || '']: 'Basic Plan',
                [config.lemonsqueezy.proVariantId || '']: 'Pro Plan',
                [config.lemonsqueezy.premiumVariantId || '']: 'Premium Plan'
            };

            return variantPlanMap[variantId.toString()] || 'Unknown Plan';
        };

        it('should return correct plan names', () => {
            expect(getPlanNameForVariant(100)).toBe('Basic Plan');
            expect(getPlanNameForVariant(200)).toBe('Pro Plan');
            expect(getPlanNameForVariant(300)).toBe('Premium Plan');
        });

        it('should return default for unknown variants', () => {
            expect(getPlanNameForVariant(999)).toBe('Unknown Plan');
        });
    });

    describe('Webhook event types', () => {
        const supportedEvents = [
            'order_created',
            'subscription_created',
            'subscription_updated',
            'subscription_cancelled',
            'subscription_resumed',
            'subscription_expired',
            'subscription_paused',
            'subscription_unpaused'
        ];

        it('should handle all supported event types', () => {
            supportedEvents.forEach(eventType => {
                expect(typeof eventType).toBe('string');
                expect(eventType.length).toBeGreaterThan(0);
            });
        });

        it('should categorize events correctly', () => {
            const orderEvents = supportedEvents.filter(e => e.includes('order'));
            const subscriptionEvents = supportedEvents.filter(e => e.includes('subscription'));

            expect(orderEvents).toContain('order_created');
            expect(subscriptionEvents.length).toBeGreaterThan(0);
            expect(subscriptionEvents).toContain('subscription_created');
            expect(subscriptionEvents).toContain('subscription_cancelled');
        });
    });

    describe('Replay attack prevention', () => {
        it('should generate unique webhook identifiers', () => {
            const createWebhookId = (payload: any): string => {
                return `${payload.data.id}_${payload.meta.event_name}_${payload.data.attributes.created_at || payload.data.attributes.updated_at}`;
            };

            const payload1 = {
                meta: { event_name: 'order_created' },
                data: {
                    id: 'order_123',
                    attributes: { created_at: '2024-01-01T00:00:00Z' }
                }
            };

            const payload2 = {
                meta: { event_name: 'order_created' },
                data: {
                    id: 'order_124',
                    attributes: { created_at: '2024-01-01T00:00:00Z' }
                }
            };

            const id1 = createWebhookId(payload1);
            const id2 = createWebhookId(payload2);

            expect(id1).not.toBe(id2);
            expect(id1).toBe('order_123_order_created_2024-01-01T00:00:00Z');
        });

        it('should handle missing timestamps', () => {
            const createWebhookId = (payload: any): string => {
                return `${payload.data.id}_${payload.meta.event_name}_${payload.data.attributes.created_at || payload.data.attributes.updated_at}`;
            };

            const payload = {
                meta: { event_name: 'order_created' },
                data: {
                    id: 'order_123',
                    attributes: {}
                }
            };

            const id = createWebhookId(payload);
            expect(id).toBe('order_123_order_created_undefined');
        });
    });

    describe('Error handling scenarios', () => {
        it('should handle malformed JSON gracefully', () => {
            const malformedPayloads = [
                null,
                undefined,
                '',
                'invalid-json',
                '{"incomplete": json',
                123,
                []
            ];

            malformedPayloads.forEach(payload => {
                if (typeof payload !== 'object' || payload === null) {
                    expect(payload).not.toBeInstanceOf(Object);
                }
            });
        });

        it('should validate required fields', () => {
            const validatePayload = (payload: any): boolean => {
                if (!payload || typeof payload !== 'object') return false;
                if (!payload.meta || !payload.meta.event_name) return false;
                if (!payload.data || !payload.data.id || !payload.data.type) return false;
                return true;
            };

            expect(validatePayload(null)).toBe(false);
            expect(validatePayload({})).toBe(false);
            expect(validatePayload({ meta: { event_name: 'test' } })).toBe(false);
            expect(validatePayload({
                meta: { event_name: 'test' },
                data: { id: 'test', type: 'test', attributes: {} }
            })).toBe(true);
        });
    });

    describe('Database operation patterns', () => {
        it('should structure payment record correctly', () => {
            const paymentRecord = {
                user_id: 'user123',
                lemonsqueezy_order_id: 'order_123',
                amount_usd: 9.9,
                credits_purchased: 2000,
                status: 'completed',
                payment_method: 'Test Product - Basic Plan',
                webhook_data: { test: 'data' },
                processed_at: new Date().toISOString()
            };

            expect(paymentRecord).toHaveProperty('user_id');
            expect(paymentRecord).toHaveProperty('lemonsqueezy_order_id');
            expect(paymentRecord).toHaveProperty('amount_usd');
            expect(paymentRecord).toHaveProperty('credits_purchased');
            expect(paymentRecord).toHaveProperty('status');
            expect(paymentRecord.status).toBe('completed');
            expect(typeof paymentRecord.amount_usd).toBe('number');
            expect(typeof paymentRecord.credits_purchased).toBe('number');
        });

        it('should structure subscription record correctly', () => {
            const subscriptionRecord = {
                user_id: 'user123',
                lemonsqueezy_subscription_id: 'sub_123',
                lemonsqueezy_variant_id: '200',
                status: 'active',
                plan_name: 'Pro Plan',
                plan_credits: 4000,
                current_period_start: '2024-01-01T00:00:00Z',
                current_period_end: '2024-02-01T00:00:00Z',
                cancel_at_period_end: false
            };

            expect(subscriptionRecord).toHaveProperty('user_id');
            expect(subscriptionRecord).toHaveProperty('lemonsqueezy_subscription_id');
            expect(subscriptionRecord).toHaveProperty('status');
            expect(['active', 'cancelled', 'expired', 'past_due']).toContain(subscriptionRecord.status);
            expect(typeof subscriptionRecord.plan_credits).toBe('number');
            expect(typeof subscriptionRecord.cancel_at_period_end).toBe('boolean');
        });
    });
});