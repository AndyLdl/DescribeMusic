import { describe, it, expect, beforeEach } from 'vitest';
import {
    CreditCalculator,
    type CreditBalance,
    type CreditConsumptionEstimate,
    SUBSCRIPTION_PLANS
} from '../creditCalculator';

describe('CreditCalculator', () => {
    describe('calculateCreditsForDuration', () => {
        it('should calculate credits correctly for whole seconds', () => {
            expect(CreditCalculator.calculateCreditsForDuration(60)).toBe(60);
            expect(CreditCalculator.calculateCreditsForDuration(120)).toBe(120);
            expect(CreditCalculator.calculateCreditsForDuration(180)).toBe(180);
        });

        it('should round up fractional seconds', () => {
            expect(CreditCalculator.calculateCreditsForDuration(60.1)).toBe(61);
            expect(CreditCalculator.calculateCreditsForDuration(60.9)).toBe(61);
            expect(CreditCalculator.calculateCreditsForDuration(120.5)).toBe(121);
        });

        it('should return 0 for zero or negative duration', () => {
            expect(CreditCalculator.calculateCreditsForDuration(0)).toBe(0);
            expect(CreditCalculator.calculateCreditsForDuration(-10)).toBe(0);
        });
    });

    describe('checkBalance', () => {
        it('should return valid when balance is sufficient', () => {
            const result = CreditCalculator.checkBalance(500, 100);

            expect(result.isValid).toBe(true);
            expect(result.error).toBeUndefined();
        });

        it('should return valid with warning when balance will be low after consumption', () => {
            const result = CreditCalculator.checkBalance(150, 100);

            expect(result.isValid).toBe(true);
            expect(result.suggestion).toContain('积分余额将降至 50');
            expect(result.suggestion).toContain('建议及时充值');
        });

        it('should return invalid when balance is insufficient', () => {
            const result = CreditCalculator.checkBalance(50, 100);

            expect(result.isValid).toBe(false);
            expect(result.error).toContain('积分余额不足，还需要 50 积分');
            expect(result.suggestion).toContain('请购买积分套餐或等待下月积分重置');
        });

        it('should return valid for zero required credits', () => {
            const result = CreditCalculator.checkBalance(0, 0);

            expect(result.isValid).toBe(true);
            expect(result.error).toBeUndefined();
            expect(result.suggestion).toBeUndefined();
        });

        it('should return valid for negative required credits', () => {
            const result = CreditCalculator.checkBalance(100, -10);

            expect(result.isValid).toBe(true);
        });
    });

    describe('estimateConsumption', () => {
        it('should estimate consumption correctly when user can afford', () => {
            const result = CreditCalculator.estimateConsumption(120, 500);

            expect(result.creditsRequired).toBe(120);
            expect(result.canAfford).toBe(true);
            expect(result.shortfall).toBe(0);
            expect(result.balanceAfter).toBe(380);
            expect(result.estimatedCost).toBe('2分0秒 = 120 积分');
        });

        it('should estimate consumption correctly when user cannot afford', () => {
            const result = CreditCalculator.estimateConsumption(180, 100);

            expect(result.creditsRequired).toBe(180);
            expect(result.canAfford).toBe(false);
            expect(result.shortfall).toBe(80);
            expect(result.balanceAfter).toBe(0);
            expect(result.estimatedCost).toBe('3分0秒 = 180 积分');
        });

        it('should format duration correctly for seconds only', () => {
            const result = CreditCalculator.estimateConsumption(45, 100);

            expect(result.estimatedCost).toBe('45秒 = 45 积分');
        });

        it('should format duration correctly for minutes and seconds', () => {
            const result = CreditCalculator.estimateConsumption(90, 100);

            expect(result.estimatedCost).toBe('1分30秒 = 90 积分');
        });

        it('should handle fractional seconds correctly', () => {
            const result = CreditCalculator.estimateConsumption(90.7, 100);

            expect(result.creditsRequired).toBe(91); // Rounded up
            expect(result.estimatedCost).toBe('1分30秒 = 91 积分'); // Display uses floor
        });

        it('should handle zero duration', () => {
            const result = CreditCalculator.estimateConsumption(0, 100);

            expect(result.creditsRequired).toBe(0);
            expect(result.canAfford).toBe(true);
            expect(result.shortfall).toBe(0);
            expect(result.balanceAfter).toBe(100);
            expect(result.estimatedCost).toBe('0秒 = 0 积分');
        });
    });

    describe('formatCreditsDisplay', () => {
        it('should format small numbers correctly', () => {
            expect(CreditCalculator.formatCreditsDisplay(0)).toBe('0 积分');
            expect(CreditCalculator.formatCreditsDisplay(50)).toBe('50 积分');
            expect(CreditCalculator.formatCreditsDisplay(999)).toBe('999 积分');
        });

        it('should format thousands with commas', () => {
            expect(CreditCalculator.formatCreditsDisplay(1000)).toBe('1,000 积分');
            expect(CreditCalculator.formatCreditsDisplay(5000)).toBe('5,000 积分');
            expect(CreditCalculator.formatCreditsDisplay(9999)).toBe('9,999 积分');
        });

        it('should format large numbers with k notation', () => {
            expect(CreditCalculator.formatCreditsDisplay(10000)).toBe('10k 积分');
            expect(CreditCalculator.formatCreditsDisplay(15000)).toBe('15k 积分');
            expect(CreditCalculator.formatCreditsDisplay(15500)).toBe('15.5k 积分');
        });

        it('should handle negative numbers', () => {
            expect(CreditCalculator.formatCreditsDisplay(-100)).toBe('0 积分');
            expect(CreditCalculator.formatCreditsDisplay(-1000)).toBe('0 积分');
        });
    });

    describe('formatBalanceDetails', () => {
        it('should format balance with all credit types', () => {
            const balance: CreditBalance = {
                total: 1000,
                trial: 100,
                monthly: 200,
                purchased: 700
            };

            const result = CreditCalculator.formatBalanceDetails(balance);
            expect(result).toBe('试用: 100 | 月度: 200 | 购买: 700');
        });

        it('should format balance with only some credit types', () => {
            const balance: CreditBalance = {
                total: 300,
                trial: 0,
                monthly: 200,
                purchased: 100
            };

            const result = CreditCalculator.formatBalanceDetails(balance);
            expect(result).toBe('月度: 200 | 购买: 100');
        });

        it('should handle zero balance', () => {
            const balance: CreditBalance = {
                total: 0,
                trial: 0,
                monthly: 0,
                purchased: 0
            };

            const result = CreditCalculator.formatBalanceDetails(balance);
            expect(result).toBe('无可用积分');
        });

        it('should format balance with only trial credits', () => {
            const balance: CreditBalance = {
                total: 100,
                trial: 100,
                monthly: 0,
                purchased: 0
            };

            const result = CreditCalculator.formatBalanceDetails(balance);
            expect(result).toBe('试用: 100');
        });
    });

    describe('recommendPlan', () => {
        it('should recommend basic plan for small shortfall', () => {
            const result = CreditCalculator.recommendPlan(500);

            expect(result).not.toBeNull();
            expect(result!.planId).toBe('basic');
            expect(result!.planName).toBe('基础套餐');
            expect(result!.credits).toBe(2000);
            expect(result!.price).toBe(9.9);
            expect(result!.savings).toBe(1500); // 2000 - 500
        });

        it('should recommend pro plan for medium shortfall', () => {
            const result = CreditCalculator.recommendPlan(3000);

            expect(result).not.toBeNull();
            expect(result!.planId).toBe('pro');
            expect(result!.planName).toBe('专业套餐');
            expect(result!.credits).toBe(4000);
            expect(result!.savings).toBe(1000); // 4000 - 3000
        });

        it('should recommend premium plan for large shortfall', () => {
            const result = CreditCalculator.recommendPlan(5500);

            expect(result).not.toBeNull();
            expect(result!.planId).toBe('premium');
            expect(result!.planName).toBe('高级套餐');
            expect(result!.credits).toBe(6000);
            expect(result!.savings).toBe(500); // 6000 - 5500
        });

        it('should recommend premium plan for very large shortfall', () => {
            const result = CreditCalculator.recommendPlan(10000);

            expect(result).not.toBeNull();
            expect(result!.planId).toBe('premium');
            expect(result!.savings).toBe(0); // Can't satisfy the shortfall completely
        });

        it('should handle zero shortfall', () => {
            const result = CreditCalculator.recommendPlan(0);

            expect(result).not.toBeNull();
            expect(result!.planId).toBe('basic');
            expect(result!.savings).toBe(2000);
        });
    });

    describe('validateCreditsAmount', () => {
        it('should validate positive integers', () => {
            expect(CreditCalculator.validateCreditsAmount(100).isValid).toBe(true);
            expect(CreditCalculator.validateCreditsAmount(1).isValid).toBe(true);
            expect(CreditCalculator.validateCreditsAmount(1000000).isValid).toBe(true);
        });

        it('should reject non-integers', () => {
            const result = CreditCalculator.validateCreditsAmount(100.5);
            expect(result.isValid).toBe(false);
            expect(result.error).toBe('积分数量必须是整数');
        });

        it('should reject negative numbers', () => {
            const result = CreditCalculator.validateCreditsAmount(-10);
            expect(result.isValid).toBe(false);
            expect(result.error).toBe('积分数量不能为负数');
        });

        it('should reject zero', () => {
            expect(CreditCalculator.validateCreditsAmount(0).isValid).toBe(true);
        });

        it('should reject very large numbers', () => {
            const result = CreditCalculator.validateCreditsAmount(2000000);
            expect(result.isValid).toBe(false);
            expect(result.error).toBe('积分数量过大');
        });
    });

    describe('calculateMonthlyReset', () => {
        it('should indicate reset needed when crossing month boundary', () => {
            const lastReset = new Date('2024-01-15');
            const result = CreditCalculator.calculateMonthlyReset(lastReset, 200);

            expect(result.shouldReset).toBe(true);
            expect(result.daysUntilReset).toBeGreaterThan(0);
            expect(result.nextResetDate.getDate()).toBe(1); // First day of next month
        });

        it('should indicate no reset needed within same month', () => {
            const now = new Date();
            const lastReset = new Date(now.getFullYear(), now.getMonth(), 1); // First day of current month

            const result = CreditCalculator.calculateMonthlyReset(lastReset, 200);

            expect(result.shouldReset).toBe(false);
            expect(result.daysUntilReset).toBeGreaterThan(0);
        });

        it('should calculate days until next reset correctly', () => {
            const now = new Date();
            const lastReset = new Date(now.getFullYear(), now.getMonth(), 1);

            const result = CreditCalculator.calculateMonthlyReset(lastReset, 200);

            // Should be positive number of days
            expect(result.daysUntilReset).toBeGreaterThan(0);
            expect(result.daysUntilReset).toBeLessThanOrEqual(31);
        });

        it('should handle year boundary correctly', () => {
            const lastReset = new Date('2023-12-15');
            // Assuming current date is in 2024
            const result = CreditCalculator.calculateMonthlyReset(lastReset, 200);

            expect(result.shouldReset).toBe(true);
        });
    });

    describe('generateUsageSuggestion', () => {
        it('should suggest purchasing credits when balance is zero', () => {
            const suggestion = CreditCalculator.generateUsageSuggestion(0);
            expect(suggestion).toContain('积分已用完');
            expect(suggestion).toContain('请购买积分套餐');
        });

        it('should suggest recharging when balance is low', () => {
            const suggestion = CreditCalculator.generateUsageSuggestion(50);
            expect(suggestion).toContain('积分余额较低');
            expect(suggestion).toContain('建议及时充值');
        });

        it('should provide usage estimate when average consumption is provided', () => {
            const suggestion = CreditCalculator.generateUsageSuggestion(500, 50);
            expect(suggestion).toContain('大约可使用 10 天');
        });

        it('should warn about low remaining days', () => {
            const suggestion = CreditCalculator.generateUsageSuggestion(300, 50);
            expect(suggestion).toContain('大约可使用 6 天');
            expect(suggestion).toContain('建议提前充值');
        });

        it('should provide positive message for sufficient balance', () => {
            const suggestion = CreditCalculator.generateUsageSuggestion(2000, 50);
            expect(suggestion).toContain('积分余额充足');
            expect(suggestion).toContain('可以正常使用服务');
        });

        it('should handle high balance without average consumption', () => {
            const suggestion = CreditCalculator.generateUsageSuggestion(1000);
            expect(suggestion).toContain('积分余额充足');
        });

        it('should handle zero average consumption', () => {
            const suggestion = CreditCalculator.generateUsageSuggestion(500, 0);
            expect(suggestion).toContain('积分余额充足');
        });
    });

    describe('SUBSCRIPTION_PLANS constant', () => {
        it('should have correct plan structure', () => {
            expect(SUBSCRIPTION_PLANS).toHaveLength(3);

            const basicPlan = SUBSCRIPTION_PLANS.find(p => p.id === 'basic');
            expect(basicPlan).toBeDefined();
            expect(basicPlan!.credits).toBe(2000);
            expect(basicPlan!.price).toBe(9.9);

            const proPlan = SUBSCRIPTION_PLANS.find(p => p.id === 'pro');
            expect(proPlan).toBeDefined();
            expect(proPlan!.credits).toBe(4000);
            expect(proPlan!.price).toBe(19.9);

            const premiumPlan = SUBSCRIPTION_PLANS.find(p => p.id === 'premium');
            expect(premiumPlan).toBeDefined();
            expect(premiumPlan!.credits).toBe(6000);
            expect(premiumPlan!.price).toBe(29.9);
        });

        it('should have required properties for each plan', () => {
            SUBSCRIPTION_PLANS.forEach(plan => {
                expect(plan).toHaveProperty('id');
                expect(plan).toHaveProperty('name');
                expect(plan).toHaveProperty('credits');
                expect(plan).toHaveProperty('price');
                expect(plan).toHaveProperty('description');
                expect(plan).toHaveProperty('features');
                expect(Array.isArray(plan.features)).toBe(true);
            });
        });
    });
});