import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as crypto from 'crypto';
import { Request, Response } from 'express';

// Mock dependencies
vi.mock('firebase-functions/v1', () => ({
    region: vi.fn(() => ({
        https: {
            onRequest: vi.fn((handler) => handler)
        }
    }))
}));

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
                    single: vi.fn()
                }))
            })),
            upsert: vi.fn(),
            update: vi.fn(() => ({
                eq: vi.fn()
            })),
            select: vi.fn(() => ({
                eq: vi.fn(() => ({
                    single: vi.fn()
                }))
            }))
        })),
        rpc: vi.fn()
    }
}));

// Import after mocking
import { lemonsqueezyWebhook, WebhookEventType } from '../lemonsqueezyWebhook';
import config from '../utils/config';
import logger from '../utils/logger';
import supabase from '../utils/supabase';

describe('lemonsqueezyWebhook', () => {
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;
    let mockSupabase: any;
    let mockLogger: any;

    beforeEach(() => {
        vi.clearAllMocks();

        mockSupabase = vi.mocked(supabase);
        mockLogger = vi.mocked(logger);

        // Mock response object
        mockResponse = {
            setHeader: vi.fn(),
            status: vi.fn().mockReturnThis(),
            json: vi.fn().mockReturnThis(),
            end: vi.fn()
        };

        // Default successful database responses
        mockSupabase.from.mockReturnValue({
            insert: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                    single: vi.fn().mockResolvedValue({
                        data: { id: 'payment_123' },
                        error: null
                    })
                })
            }),
            upsert: vi.fn().mockResolvedValue({ error: null }),
            update: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ error: null })
            }),
            select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
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
                })
            })
        });

        mockSupabase.rpc.mockResolvedValue({ data: true, error: null });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('HTTP method handling', () => {
        it('should handle OPTIONS request for CORS', async () => {
            mockRequest = {
                method: 'OPTIONS'
            };

            await lemonsqueezyWebhook(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Origin', '*');
            expect(mockResponse.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Methods', 'POST, OPTIONS');
            expect(mockResponse.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Headers', 'Content-Type, X-Signature');
            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.end).toHaveBeenCalled();
        });

        it('should reject non-POST requests', async () => {
            mockRequest = {
                method: 'GET'
            };

            await lemonsqueezyWebhook(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(405);
            expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Method not allowed' });
        });
    });

    describe('Signature verification', () => {
        const createValidSignature = (payload: string): string => {
            return crypto
                .createHmac('sha256', config.lemonsqueezy.webhookSecret)
                .update(payload, 'utf8')
                .digest('hex');
        };

        it('should accept valid signature', async () => {
            const payload = {
                meta: {
                    event_name: WebhookEventType.ORDER_CREATED,
                    custom_data: { user_id: 'user123' }
                },
                data: {
                    id: 'order_123',
                    type: 'orders',
                    attributes: {
                        order_number: 12345,
                        total_usd: 9.9,
                        first_order_item: {
                            id: 1,
                            variant_id: 100,
                            product_name: 'Test Product',
                            variant_name: 'Basic Plan'
                        },
                        created_at: '2024-01-01T00:00:00Z'
                    }
                }
            };

            const payloadString = JSON.stringify(payload);
            const signature = `sha256=${createValidSignature(payloadString)}`;

            mockRequest = {
                method: 'POST',
                body: payload,
                get: vi.fn().mockReturnValue(signature)
            };

            await lemonsqueezyWebhook(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith({
                success: true,
                message: 'Webhook processed successfully',
                requestId: expect.any(String)
            });
        });

        it('should reject invalid signature', async () => {
            const payload = {
                meta: { event_name: WebhookEventType.ORDER_CREATED },
                data: { id: 'order_123', type: 'orders', attributes: {} }
            };

            mockRequest = {
                method: 'POST',
                body: payload,
                get: vi.fn().mockReturnValue('invalid-signature')
            };

            await lemonsqueezyWebhook(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(401);
            expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Invalid signature' });
        });

        it('should reject missing signature', async () => {
            const payload = {
                meta: { event_name: WebhookEventType.ORDER_CREATED },
                data: { id: 'order_123', type: 'orders', attributes: {} }
            };

            mockRequest = {
                method: 'POST',
                body: payload,
                get: vi.fn().mockReturnValue('')
            };

            await lemonsqueezyWebhook(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(401);
            expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Invalid signature' });
        });
    });

    describe('Payload validation', () => {
        const createValidRequest = (payload: any): Partial<Request> => {
            const payloadString = JSON.stringify(payload);
            const signature = `sha256=${crypto
                .createHmac('sha256', config.lemonsqueezy.webhookSecret)
                .update(payloadString, 'utf8')
                .digest('hex')}`;

            return {
                method: 'POST',
                body: payload,
                get: vi.fn().mockReturnValue(signature)
            };
        };

        it('should reject malformed payload', async () => {
            mockRequest = createValidRequest({ invalid: 'payload' });

            await lemonsqueezyWebhook(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Invalid payload structure' });
        });

        it('should reject payload without meta', async () => {
            mockRequest = createValidRequest({
                data: { id: 'test', type: 'test', attributes: {} }
            });

            await lemonsqueezyWebhook(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Invalid payload structure' });
        });

        it('should reject payload without data', async () => {
            mockRequest = createValidRequest({
                meta: { event_name: WebhookEventType.ORDER_CREATED }
            });

            await lemonsqueezyWebhook(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Invalid payload structure' });
        });
    });

    describe('Order created event', () => {
        const createOrderPayload = (customData: any = {}) => ({
            meta: {
                event_name: WebhookEventType.ORDER_CREATED,
                custom_data: { user_id: 'user123', ...customData }
            },
            data: {
                id: 'order_123',
                type: 'orders',
                attributes: {
                    order_number: 12345,
                    total_usd: 9.9,
                    first_order_item: {
                        id: 1,
                        variant_id: 100, // Basic plan
                        product_name: 'Test Product',
                        variant_name: 'Basic Plan'
                    },
                    created_at: '2024-01-01T00:00:00Z'
                }
            }
        });

        it('should process order created successfully', async () => {
            const payload = createOrderPayload();
            mockRequest = {
                method: 'POST',
                body: payload,
                get: vi.fn().mockReturnValue(`sha256=${crypto
                    .createHmac('sha256', config.lemonsqueezy.webhookSecret)
                    .update(JSON.stringify(payload), 'utf8')
                    .digest('hex')}`)
            };

            await lemonsqueezyWebhook(mockRequest as Request, mockResponse as Response);

            expect(mockSupabase.from).toHaveBeenCalledWith('payment_records');
            expect(mockSupabase.rpc).toHaveBeenCalledWith('add_credits', {
                user_uuid: 'user123',
                credits_amount: 2000, // Basic plan credits
                credit_source: 'purchase',
                description: 'Purchase: Basic Plan',
                payment_record_id: null
            });

            expect(mockResponse.status).toHaveBeenCalledWith(200);
        });

        it('should handle missing user ID in order', async () => {
            const payload = createOrderPayload();
            delete payload.meta.custom_data.user_id;

            mockRequest = {
                method: 'POST',
                body: payload,
                get: vi.fn().mockReturnValue(`sha256=${crypto
                    .createHmac('sha256', config.lemonsqueezy.webhookSecret)
                    .update(JSON.stringify(payload), 'utf8')
                    .digest('hex')}`)
            };

            await lemonsqueezyWebhook(mockRequest as Request, mockResponse as Response);

            expect(mockLogger.error).toHaveBeenCalledWith(
                'No user ID in order custom data',
                expect.any(Error),
                expect.objectContaining({ requestId: expect.any(String) })
            );

            expect(mockResponse.status).toHaveBeenCalledWith(200);
        });

        it('should handle unknown variant ID', async () => {
            const payload = createOrderPayload();
            payload.data.attributes.first_order_item.variant_id = 999; // Unknown variant

            mockRequest = {
                method: 'POST',
                body: payload,
                get: vi.fn().mockReturnValue(`sha256=${crypto
                    .createHmac('sha256', config.lemonsqueezy.webhookSecret)
                    .update(JSON.stringify(payload), 'utf8')
                    .digest('hex')}`)
            };

            await lemonsqueezyWebhook(mockRequest as Request, mockResponse as Response);

            expect(mockLogger.error).toHaveBeenCalledWith(
                'Unknown variant ID',
                expect.any(Error),
                expect.objectContaining({ requestId: expect.any(String) })
            );

            expect(mockResponse.status).toHaveBeenCalledWith(200);
        });

        it('should handle database errors', async () => {
            const payload = createOrderPayload();
            mockSupabase.from.mockReturnValue({
                insert: vi.fn().mockResolvedValue({
                    error: { message: 'Database error' }
                })
            });

            mockRequest = {
                method: 'POST',
                body: payload,
                get: vi.fn().mockReturnValue(`sha256=${crypto
                    .createHmac('sha256', config.lemonsqueezy.webhookSecret)
                    .update(JSON.stringify(payload), 'utf8')
                    .digest('hex')}`)
            };

            await lemonsqueezyWebhook(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(500);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: 'Internal server error',
                requestId: expect.any(String)
            });
        });
    });

    describe('Subscription created event', () => {
        const createSubscriptionPayload = (customData: any = {}) => ({
            meta: {
                event_name: WebhookEventType.SUBSCRIPTION_CREATED,
                custom_data: { user_id: 'user123', ...customData }
            },
            data: {
                id: 'sub_123',
                type: 'subscriptions',
                attributes: {
                    variant_id: 200, // Pro plan
                    order_id: 456,
                    created_at: '2024-01-01T00:00:00Z',
                    renews_at: '2024-02-01T00:00:00Z'
                }
            }
        });

        it('should process subscription created successfully', async () => {
            const payload = createSubscriptionPayload();
            mockRequest = {
                method: 'POST',
                body: payload,
                get: vi.fn().mockReturnValue(`sha256=${crypto
                    .createHmac('sha256', config.lemonsqueezy.webhookSecret)
                    .update(JSON.stringify(payload), 'utf8')
                    .digest('hex')}`)
            };

            await lemonsqueezyWebhook(mockRequest as Request, mockResponse as Response);

            expect(mockSupabase.from).toHaveBeenCalledWith('subscriptions');
            expect(mockSupabase.rpc).toHaveBeenCalledWith('add_credits', {
                user_uuid: 'user123',
                credits_amount: 4000, // Pro plan credits
                credit_source: 'subscription',
                description: 'Subscription: Pro Plan',
                payment_record_id: expect.any(String)
            });

            expect(mockResponse.status).toHaveBeenCalledWith(200);
        });
    });

    describe('Subscription updated event', () => {
        const createSubscriptionUpdatePayload = () => ({
            meta: {
                event_name: WebhookEventType.SUBSCRIPTION_UPDATED,
                custom_data: { user_id: 'user123' }
            },
            data: {
                id: 'sub_123',
                type: 'subscriptions',
                attributes: {
                    status: 'active',
                    created_at: '2024-01-01T00:00:00Z',
                    renews_at: '2024-03-01T00:00:00Z', // New renewal date
                    cancelled: false
                }
            }
        });

        it('should process subscription renewal', async () => {
            const payload = createSubscriptionUpdatePayload();
            mockRequest = {
                method: 'POST',
                body: payload,
                get: vi.fn().mockReturnValue(`sha256=${crypto
                    .createHmac('sha256', config.lemonsqueezy.webhookSecret)
                    .update(JSON.stringify(payload), 'utf8')
                    .digest('hex')}`)
            };

            await lemonsqueezyWebhook(mockRequest as Request, mockResponse as Response);

            expect(mockSupabase.from).toHaveBeenCalledWith('subscriptions');
            expect(mockSupabase.rpc).toHaveBeenCalledWith('add_credits', {
                user_uuid: 'user123',
                credits_amount: 2000, // From existing subscription
                credit_source: 'subscription',
                description: 'Subscription Renewal: Basic Plan',
                payment_record_id: null
            });

            expect(mockResponse.status).toHaveBeenCalledWith(200);
        });

        it('should handle subscription update without renewal', async () => {
            const payload = createSubscriptionUpdatePayload();
            payload.data.attributes.renews_at = '2024-01-01T00:00:00Z'; // Same date, no renewal

            mockRequest = {
                method: 'POST',
                body: payload,
                get: vi.fn().mockReturnValue(`sha256=${crypto
                    .createHmac('sha256', config.lemonsqueezy.webhookSecret)
                    .update(JSON.stringify(payload), 'utf8')
                    .digest('hex')}`)
            };

            await lemonsqueezyWebhook(mockRequest as Request, mockResponse as Response);

            // Should update subscription but not add renewal credits
            expect(mockSupabase.from).toHaveBeenCalledWith('subscriptions');
            expect(mockSupabase.rpc).not.toHaveBeenCalled();

            expect(mockResponse.status).toHaveBeenCalledWith(200);
        });
    });

    describe('Subscription cancelled event', () => {
        const createSubscriptionCancelPayload = () => ({
            meta: {
                event_name: WebhookEventType.SUBSCRIPTION_CANCELLED
            },
            data: {
                id: 'sub_123',
                type: 'subscriptions',
                attributes: {
                    status: 'cancelled',
                    cancelled: true
                }
            }
        });

        it('should process subscription cancellation', async () => {
            const payload = createSubscriptionCancelPayload();
            mockRequest = {
                method: 'POST',
                body: payload,
                get: vi.fn().mockReturnValue(`sha256=${crypto
                    .createHmac('sha256', config.lemonsqueezy.webhookSecret)
                    .update(JSON.stringify(payload), 'utf8')
                    .digest('hex')}`)
            };

            await lemonsqueezyWebhook(mockRequest as Request, mockResponse as Response);

            expect(mockSupabase.from).toHaveBeenCalledWith('subscriptions');
            expect(mockSupabase.from().update).toHaveBeenCalledWith({
                status: 'cancelled',
                cancel_at_period_end: true,
                updated_at: expect.any(String)
            });

            expect(mockResponse.status).toHaveBeenCalledWith(200);
        });
    });

    describe('Unhandled events', () => {
        it('should log unhandled event types', async () => {
            const payload = {
                meta: {
                    event_name: 'unknown_event'
                },
                data: {
                    id: 'test_123',
                    type: 'test',
                    attributes: {}
                }
            };

            mockRequest = {
                method: 'POST',
                body: payload,
                get: vi.fn().mockReturnValue(`sha256=${crypto
                    .createHmac('sha256', config.lemonsqueezy.webhookSecret)
                    .update(JSON.stringify(payload), 'utf8')
                    .digest('hex')}`)
            };

            await lemonsqueezyWebhook(mockRequest as Request, mockResponse as Response);

            expect(mockLogger.info).toHaveBeenCalledWith(
                'Unhandled webhook event type',
                expect.objectContaining({
                    eventType: 'unknown_event',
                    requestId: expect.any(String)
                })
            );

            expect(mockResponse.status).toHaveBeenCalledWith(200);
        });
    });

    describe('Error handling', () => {
        it('should handle unexpected errors', async () => {
            const payload = {
                meta: {
                    event_name: WebhookEventType.ORDER_CREATED,
                    custom_data: { user_id: 'user123' }
                },
                data: {
                    id: 'order_123',
                    type: 'orders',
                    attributes: {
                        first_order_item: {
                            variant_id: 100
                        }
                    }
                }
            };

            // Mock an unexpected error
            mockSupabase.from.mockImplementation(() => {
                throw new Error('Unexpected error');
            });

            mockRequest = {
                method: 'POST',
                body: payload,
                get: vi.fn().mockReturnValue(`sha256=${crypto
                    .createHmac('sha256', config.lemonsqueezy.webhookSecret)
                    .update(JSON.stringify(payload), 'utf8')
                    .digest('hex')}`)
            };

            await lemonsqueezyWebhook(mockRequest as Request, mockResponse as Response);

            expect(mockLogger.error).toHaveBeenCalledWith(
                'Webhook processing error',
                expect.any(Error),
                expect.objectContaining({ requestId: expect.any(String) })
            );

            expect(mockResponse.status).toHaveBeenCalledWith(500);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: 'Internal server error',
                requestId: expect.any(String)
            });
        });
    });

    describe('Replay attack prevention', () => {
        it('should detect and reject duplicate webhooks', async () => {
            const payload = {
                meta: {
                    event_name: WebhookEventType.ORDER_CREATED,
                    custom_data: { user_id: 'user123' }
                },
                data: {
                    id: 'order_123',
                    type: 'orders',
                    attributes: {
                        order_number: 12345,
                        total_usd: 9.9,
                        first_order_item: {
                            variant_id: 100
                        },
                        created_at: '2024-01-01T00:00:00Z'
                    }
                }
            };

            const signature = `sha256=${crypto
                .createHmac('sha256', config.lemonsqueezy.webhookSecret)
                .update(JSON.stringify(payload), 'utf8')
                .digest('hex')}`;

            mockRequest = {
                method: 'POST',
                body: payload,
                get: vi.fn().mockReturnValue(signature)
            };

            // First request should succeed
            await lemonsqueezyWebhook(mockRequest as Request, mockResponse as Response);
            expect(mockResponse.status).toHaveBeenCalledWith(200);

            // Reset mocks
            vi.clearAllMocks();
            mockResponse.status = vi.fn().mockReturnThis();
            mockResponse.json = vi.fn().mockReturnThis();

            // Second identical request should be rejected
            await lemonsqueezyWebhook(mockRequest as Request, mockResponse as Response);
            expect(mockResponse.status).toHaveBeenCalledWith(409);
            expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Duplicate webhook' });
        });
    });
});