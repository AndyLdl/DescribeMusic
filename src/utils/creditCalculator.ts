/**
 * CreditCalculator - Credit calculation and validation logic
 * Handles credit balance checking, consumption estimation and display formatting
 */

export interface CreditBalance {
    total: number;
    trial: number;
    monthly: number;
    purchased: number;
}

export interface CreditConsumptionEstimate {
    creditsRequired: number;
    canAfford: boolean;
    shortfall: number; // Insufficient credit amount
    estimatedCost: string; // Formatted consumption description
    balanceAfter: number; // Balance after consumption
}

export interface CreditValidationResult {
    isValid: boolean;
    error?: string;
    suggestion?: string;
}

export class CreditCalculator {
    private static readonly CREDITS_PER_SECOND = 1;
    private static readonly MIN_CREDITS_WARNING = 100; // Low credit warning threshold

    /**
     * Calculate credit consumption (rounded up to seconds)
     * @param durationSeconds Audio duration in seconds
     * @returns Required credit amount
     */
    static calculateCreditsForDuration(durationSeconds: number): number {
        if (durationSeconds <= 0) {
            return 0;
        }

        // Round up to nearest second to ensure users aren't overcharged for fractional parts
        const roundedSeconds = Math.ceil(durationSeconds);
        return roundedSeconds * this.CREDITS_PER_SECOND;
    }

    /**
     * Check if credit balance is sufficient
     * @param currentBalance Current credit balance
     * @param requiredCredits Required credits
     * @returns Balance check result
     */
    static checkBalance(currentBalance: number, requiredCredits: number): CreditValidationResult {
        if (requiredCredits <= 0) {
            return {
                isValid: true
            };
        }

        if (currentBalance >= requiredCredits) {
            const balanceAfter = currentBalance - requiredCredits;

            // Check if low credit warning is needed
            if (balanceAfter < this.MIN_CREDITS_WARNING) {
                return {
                    isValid: true,
                    suggestion: `After analysis, your credit balance will drop to ${balanceAfter}. Consider purchasing more credits for continued use.`
                };
            }

            return {
                isValid: true
            };
        }

        const shortfall = requiredCredits - currentBalance;
        return {
            isValid: false,
            error: `Insufficient credit balance. Need ${shortfall} more credits to complete this analysis.`,
            suggestion: 'Please purchase a credit package or wait for next month\'s credit reset.'
        };
    }

    /**
     * Generate credit consumption estimate
     * @param durationSeconds Audio duration
     * @param currentBalance Current credit balance
     * @returns Consumption estimate information
     */
    static estimateConsumption(
        durationSeconds: number,
        currentBalance: number
    ): CreditConsumptionEstimate {
        const creditsRequired = this.calculateCreditsForDuration(durationSeconds);
        const canAfford = currentBalance >= creditsRequired;
        const shortfall = canAfford ? 0 : creditsRequired - currentBalance;
        const balanceAfter = Math.max(0, currentBalance - creditsRequired);

        // Format consumption description
        const minutes = Math.floor(durationSeconds / 60);
        const seconds = Math.floor(durationSeconds % 60);
        let durationText = '';

        if (minutes > 0) {
            durationText = `${minutes}m ${seconds}s`;
        } else {
            durationText = `${seconds}s`;
        }

        const estimatedCost = `${durationText} = ${creditsRequired} credits`;

        return {
            creditsRequired,
            canAfford,
            shortfall,
            estimatedCost,
            balanceAfter
        };
    }

    /**
     * Format credit amount display
     * @param credits Credit amount
     * @returns Formatted credit display
     */
    static formatCreditsDisplay(credits: number): string {
        if (credits < 0) {
            return '0';
        }

        if (credits >= 10000) {
            const k = Math.floor(credits / 1000);
            const remainder = credits % 1000;
            if (remainder === 0) {
                return `${k}k`;
            } else {
                return `${k}.${Math.floor(remainder / 100)}k`;
            }
        }

        return `${credits.toLocaleString()}`;
    }

    /**
     * Format credit balance details
     * @param balance Credit balance details
     * @returns Formatted balance display
     */
    static formatBalanceDetails(balance: CreditBalance): string {
        const parts: string[] = [];

        if (balance.trial > 0) {
            parts.push(`Trial: ${balance.trial}`);
        }

        if (balance.monthly > 0) {
            parts.push(`Monthly: ${balance.monthly}`);
        }

        if (balance.purchased > 0) {
            parts.push(`Purchased: ${balance.purchased}`);
        }

        if (parts.length === 0) {
            return 'No available credits';
        }

        return parts.join(' | ');
    }

    /**
     * Calculate recommended purchase plan
     * @param shortfall Insufficient credit amount
     * @returns Recommended plan information
     */
    static recommendPlan(shortfall: number): {
        planId: string;
        planName: string;
        credits: number;
        price: number;
        savings: number; // Credits saved compared to individual purchase
    } | null {
        // Plan configuration (consistent with design document)
        const plans = [
            { id: 'basic', name: 'Basic Plan', credits: 1200, price: 9.9 },
            { id: 'pro', name: 'Professional Plan', credits: 3000, price: 19.9 },
            { id: 'premium', name: 'Premium Plan', credits: 7200, price: 39.9 }
        ];

        // Find the smallest plan that meets the requirement
        const suitablePlan = plans.find(plan => plan.credits >= shortfall);

        if (!suitablePlan) {
            // If even the largest plan is not enough, recommend the largest one
            const premiumPlan = plans[plans.length - 1];
            return {
                ...premiumPlan,
                planId: premiumPlan.id,
                planName: premiumPlan.name,
                savings: 0
            };
        }

        // Calculate savings compared to on-demand purchase
        const savings = suitablePlan.credits - shortfall;

        return {
            ...suitablePlan,
            planId: suitablePlan.id,
            planName: suitablePlan.name,
            savings
        };
    }

    /**
     * Validate credit amount validity
     * @param credits Credit amount
     * @returns Validation result
     */
    static validateCreditsAmount(credits: number): CreditValidationResult {
        if (!Number.isInteger(credits)) {
            return {
                isValid: false,
                error: 'Credit amount must be an integer'
            };
        }

        if (credits < 0) {
            return {
                isValid: false,
                error: 'Credit amount cannot be negative'
            };
        }

        if (credits > 1000000) {
            return {
                isValid: false,
                error: 'Credit amount is too large'
            };
        }

        return {
            isValid: true
        };
    }

    /**
     * Calculate monthly credit reset information
     * @param lastResetDate Last reset date
     * @param monthlyCredits Monthly credit amount
     * @returns Reset information
     */
    static calculateMonthlyReset(
        lastResetDate: Date,
        monthlyCredits: number = 200
    ): {
        shouldReset: boolean;
        daysUntilReset: number;
        nextResetDate: Date;
    } {
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        const lastResetMonth = lastResetDate.getMonth();
        const lastResetYear = lastResetDate.getFullYear();

        // Check if reset is needed (cross-month or cross-year)
        const shouldReset = currentYear > lastResetYear ||
            (currentYear === lastResetYear && currentMonth > lastResetMonth);

        // Calculate next reset date (1st of next month)
        const nextResetDate = new Date(currentYear, currentMonth + 1, 1);

        // Calculate days until next reset
        const timeDiff = nextResetDate.getTime() - now.getTime();
        const daysUntilReset = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));

        return {
            shouldReset,
            daysUntilReset,
            nextResetDate
        };
    }

    /**
     * Generate credit usage suggestions
     * @param currentBalance Current balance
     * @param averageConsumption Average consumption (optional)
     * @returns Usage suggestions
     */
    static generateUsageSuggestion(
        currentBalance: number,
        averageConsumption?: number
    ): string {
        if (currentBalance <= 0) {
            return 'Your credits have been exhausted. Please purchase a credit package to continue using the service.';
        }

        if (currentBalance < this.MIN_CREDITS_WARNING) {
            return 'Your credit balance is low. Consider purchasing more credits to ensure uninterrupted service.';
        }

        if (averageConsumption && averageConsumption > 0) {
            const estimatedDays = Math.floor(currentBalance / averageConsumption);
            if (estimatedDays < 7) {
                return `Based on your average usage, current credits will last approximately ${estimatedDays} days. Consider purchasing more credits in advance.`;
            } else if (estimatedDays < 30) {
                return `Based on your average usage, current credits will last approximately ${estimatedDays} days.`;
            }
        }

        return 'Your credit balance is sufficient for normal service usage.';
    }
}

// Export constants
export const CREDITS_PER_SECOND = 1;
export const MIN_CREDITS_WARNING_THRESHOLD = 100;

// Subscription plan configuration
export const SUBSCRIPTION_PLANS = [
    {
        id: 'basic',
        name: 'Basic Plan',
        credits: 1200,
        price: 9.9,
        description: 'Perfect for light users',
        features: ['1200 Credits', '~20 minutes audio analysis', 'Basic customer support']
    },
    {
        id: 'pro',
        name: 'Professional Plan',
        credits: 3000,
        price: 19.9,
        description: 'Perfect for professional users',
        features: ['3000 Credits', '~50 minutes audio analysis', 'Priority customer support', 'Batch processing']
    },
    {
        id: 'premium',
        name: 'Premium Plan',
        credits: 7200,
        price: 39.9,
        description: 'Perfect for heavy users',
        features: ['7200 Credits', '~120 minutes audio analysis', 'Dedicated customer support', 'Batch processing', 'API access']
    }
] as const;