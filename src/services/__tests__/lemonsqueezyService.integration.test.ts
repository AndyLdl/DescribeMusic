import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
    LemonsqueezyService,
    LemonsqueezyError,
    SUBSCRIPTION_PLANS
} from '../lemonsqueezyService';

// Mock the Lemonsqueezy SDK
vi.mock('@lemonsqueezy/lemonsqueezy.js', () => ({
    lemonSqueezySetup: vi.fn(),
    createCheckout: vi.fn(),
    getSubscription: vi.fn(),
    cancelSubscription: vi.fn(),
}));

// Create a test service class that bypasses environment variable checks
class TestLemonsqueezyService extends LemonsqueezyService {
    constructor(apiKey = 'test-api-key', storeId = '12345') {
        super();
        (this as any).apiKey = apiKey;
        (this as any).storeId = storeId;
    }

    static createTestInstance(apiKey?: string, storeId?: string) {
        return new TestLemonsqueezyService(apiKey, storeId);
    }
}

describe('LemonsqueezyService Integration Tests', () => {
    let service: TestLemonsqueezyService;

    beforeEach(() => {
        vi.clearAllMocks();
        vi.spyOn(console, 'error').mockImplementation(() => { });
        vi.spyOn(console, 'warn').mockImplementation(() => { });

        service = TestLemonsqueezyService.createTestInstance();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('Configuration', () => {
        it('should be configured with test credentials', () => {
            expect(service.isConfigured()).toBe(true);
        });

        it('should not be configured without API key', () => {
            const unconfiguredService = TestLemonsqueezyService.createTestInstance('', '12345');
            expect(unconfiguredService.isConfigured()).toBe(false);
        });

        it('should not be configured without store ID', () => {
            const unconfiguredService = TestLemonsqueezyService.createTestInstance('test-key', '');
            expect(unconfiguredService.isConfigured()).toBe(false);
        });
    });

    describe('Static utility methods', () => {
        it('should verify webhook signatures correctly', () => {
            const payload = '{"test": "data"}';
            const secret = 'test-secret';

            // Create valid signature
            const crypto = require('crypto');
            const hmac = crypto.createHmac('sha256', secret);
            hmac.update(payload, 'utf8');
            const validSignature = hmac.digest('hex');

            expect(LemonsqueezyService.verifyWebhookSignature(payload, validSignature, secret)).toBe(true);
            expect(LemonsqueezyService.verifyWebhookSignature(payload, 'invalid', secret)).toBe(false);
            expect(LemonsqueezyService.verifyWebhookSignature('', validSignature, secret)).toBe(false);
        });

        it('should get plan information', () => {
            const basicPlan = LemonsqueezyService.getPlan('basic');
            expect(basicPlan).toEqual(SUBSCRIPTION_PLANS.basic);

            const allPlans = LemonsqueezyService.getAllPlans();
            expect(allPlans).toHaveLength(3);
            expect(allPlans).toContain(SUBSCRIPTION_PLANS.basic);
        });
    });

    describe('Error handling', () => {
        it('should handle missing API key', async () => {
            const unconfiguredService = TestLemonsqueezyService.createTestInstance('', '12345');

            await expect(unconfiguredService.createCheckout('basic')).rejects.toThrow(
                new LemonsqueezyError('Lemonsqueezy API key not configured', 'MISSING_API_KEY')
            );
        });

        it('should validate subscription ID', async () => {
            await expect(service.getSubscription('')).rejects.toThrow(
                new LemonsqueezyError('Subscription ID is required', 'MISSING_SUBSCRIPTION_ID')
            );

            await expect(service.cancelSubscription('')).rejects.toThrow(
                new LemonsqueezyError('Subscription ID is required', 'MISSING_SUBSCRIPTION_ID')
            );
        });

        it('should validate plan ID', async () => {
            await expect(service.createCheckout('invalid' as any)).rejects.toThrow(
                new LemonsqueezyError('Invalid plan ID: invalid', 'INVALID_PLAN_ID')
            );
        });
    });
});

describe('SUBSCRIPTION_PLANS constant', () => {
    it('should have correct plan structure', () => {
        expect(SUBSCRIPTION_PLANS).toHaveProperty('basic');
        expect(SUBSCRIPTION_PLANS).toHaveProperty('pro');
        expect(SUBSCRIPTION_PLANS).toHaveProperty('premium');

        // Check basic plan structure
        expect(SUBSCRIPTION_PLANS.basic).toEqual({
            id: 'basic',
            name: '基础套餐',
            price: 9.9,
            credits: 2000,
            variantId: expect.any(String),
            description: '适合轻度使用者'
        });

        // Check pro plan has popular flag
        expect(SUBSCRIPTION_PLANS.pro).toHaveProperty('popular', true);
    });

    it('should have increasing credits and prices', () => {
        const plans = Object.values(SUBSCRIPTION_PLANS);

        expect(plans[0].credits).toBeLessThan(plans[1].credits);
        expect(plans[1].credits).toBeLessThan(plans[2].credits);

        expect(plans[0].price).toBeLessThan(plans[1].price);
        expect(plans[1].price).toBeLessThan(plans[2].price);
    });
});

describe('LemonsqueezyError', () => {
    it('should create error with code and status', () => {
        const error = new LemonsqueezyError('Test message', 'TEST_CODE', 400);

        expect(error.message).toBe('Test message');
        expect(error.code).toBe('TEST_CODE');
        expect(error.statusCode).toBe(400);
        expect(error.name).toBe('LemonsqueezyError');
    });

    it('should create error without status code', () => {
        const error = new LemonsqueezyError('Test message', 'TEST_CODE');

        expect(error.statusCode).toBeUndefined();
    });
});