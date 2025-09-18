import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

// Mock dependencies
vi.mock('../../services/lemonsqueezyService');

import { SubscriptionManager } from '../../services/lemonsqueezyService';

const mockSubscriptionManager = vi.mocked(SubscriptionManager);

// Test component that simulates subscription management
function SubscriptionManagementTestApp() {
    const [subscription, setSubscription] = React.useState<any>(null);
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);

    const subscriptionManager = new SubscriptionManager();

    const handleGetSubscription = async (subscriptionId: string) => {
        setLoading(true);
        setError(null);

        try {
            const result = await subscriptionManager.getUserSubscriptionStatus(subscriptionId);
            setSubscription(result);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
        } finally {
            setLoading(false);
        }
    };

    const handleCancelSubscription = async (subscriptionId: string) => {
        setLoading(true);
        setError(null);

        try {
            const result = await subscriptionManager.cancelUserSubscription(subscriptionId);
            if (result.success && subscription) {
                setSubscription({
                    ...subscription,
                    subscription: {
                        ...subscription.subscription,
                        status: 'cancelled',
                        cancelled: true
                    }
                });
            } else {
                setError(result.error || 'Cancellation failed');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
        } finally {
            setLoading(false);
        }
    };

    const handleCheckRenewal = async (subscriptionId: string) => {
        try {
            const result = await subscriptionManager.checkRenewalReminder(subscriptionId);
            return result;
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
            return { needsReminder: false };
        }
    };

    return (
        <div>
            <div data-testid="subscription-manager">
                <input
                    data-testid="subscription-id-input"
                    placeholder="Enter subscription ID"
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            const target = e.target as HTMLInputElement;
                            handleGetSubscription(target.value);
                        }
                    }}
                />

                <button
                    data-testid="get-subscription-btn"
                    onClick={() => {
                        const input = screen.getByTestId('subscription-id-input') as HTMLInputElement;
                        handleGetSubscription(input.value);
                    }}
                >
                    Get Subscription
                </button>

                {loading && <div data-testid="loading">Loading...</div>}

                {error && <div data-testid="error">{error}</div>}

                {subscription && (
                    <div data-testid="subscription-info">
                        <div data-testid="subscription-status">
                            Status: {subscription.isActive ? 'Active' : 'Inactive'} ({subscription.status})
                        </div>

                        {subscription.subscription && (
                            <>
                                <div data-testid="subscription-details">
                                    <div>ID: {subscription.subscription.id}</div>
                                    <div>Product: {subscription.subscription.productName}</div>
                                    <div>Plan: {subscription.subscription.variantName}</div>
                                    <div>Email: {subscription.subscription.userEmail}</div>
                                    <div>Renews: {subscription.subscription.renewsAt?.toISOString()}</div>
                                    <div>Cancelled: {subscription.subscription.cancelled ? 'Yes' : 'No'}</div>
                                </div>

                                <div data-testid="subscription-actions">
                                    {!subscription.subscription.cancelled && (
                                        <button
                                            data-testid="cancel-subscription-btn"
                                            onClick={() => handleCancelSubscription(subscription.subscription.id)}
                                        >
                                            Cancel Subscription
                                        </button>
                                    )}

                                    <button
                                        data-testid="check-renewal-btn"
                                        onClick={async () => {
                                            const result = await handleCheckRenewal(subscription.subscription.id);
                                            const element = screen.getByTestId('renewal-info');
                                            element.textContent = result.needsReminder
                                                ? `Renewal needed in ${result.daysUntilRenewal} days`
                                                : 'No renewal reminder needed';
                                        }}
                                    >
                                        Check Renewal
                                    </button>
                                </div>

                                <div data-testid="renewal-info"></div>
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

describe('Subscription Management End-to-End Tests', () => {
    const user = userEvent.setup();
    let mockManager: any;

    beforeEach(() => {
        vi.clearAllMocks();

        // Create mock subscription manager
        mockManager = {
            getUserSubscriptionStatus: vi.fn(),
            cancelUserSubscription: vi.fn(),
            checkRenewalReminder: vi.fn(),
            getSubscriptionCredits: vi.fn(),
            formatSubscriptionStatus: vi.fn(),
            canModifySubscription: vi.fn(),
            getCustomerPortalUrl: vi.fn(),
            syncSubscriptionStatus: vi.fn()
        };

        // Mock the constructor to return our mock
        vi.mocked(SubscriptionManager).mockImplementation(() => mockManager);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('Active Subscription Management', () => {
        it('should display active subscription information', async () => {
            const mockSubscription = {
                isActive: true,
                status: 'active',
                subscription: {
                    id: 'sub_123',
                    status: 'active',
                    statusFormatted: 'Active',
                    productName: 'Music Analysis Pro',
                    variantName: 'Pro Plan',
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
                }
            };

            mockManager.getUserSubscriptionStatus.mockResolvedValue(mockSubscription);

            render(<SubscriptionManagementTestApp />);

            // Enter subscription ID and get subscription
            const input = screen.getByTestId('subscription-id-input');
            await user.type(input, 'sub_123');
            await user.click(screen.getByTestId('get-subscription-btn'));

            // Should show loading state
            expect(screen.getByTestId('loading')).toBeInTheDocument();

            // Wait for subscription info to load
            await waitFor(() => {
                expect(screen.getByTestId('subscription-info')).toBeInTheDocument();
            });

            // Verify subscription details
            expect(screen.getByTestId('subscription-status')).toHaveTextContent('Status: Active (active)');
            expect(screen.getByTestId('subscription-details')).toHaveTextContent('ID: sub_123');
            expect(screen.getByTestId('subscription-details')).toHaveTextContent('Product: Music Analysis Pro');
            expect(screen.getByTestId('subscription-details')).toHaveTextContent('Plan: Pro Plan');
            expect(screen.getByTestId('subscription-details')).toHaveTextContent('Email: test@example.com');
            expect(screen.getByTestId('subscription-details')).toHaveTextContent('Cancelled: No');

            // Should show cancel button for active subscription
            expect(screen.getByTestId('cancel-subscription-btn')).toBeInTheDocument();
            expect(screen.getByTestId('check-renewal-btn')).toBeInTheDocument();
        });

        it('should handle subscription cancellation flow', async () => {
            const mockSubscription = {
                isActive: true,
                status: 'active',
                subscription: {
                    id: 'sub_123',
                    status: 'active',
                    productName: 'Music Analysis Pro',
                    variantName: 'Pro Plan',
                    userEmail: 'test@example.com',
                    renewsAt: new Date('2024-02-01T00:00:00Z'),
                    cancelled: false
                }
            };

            const mockCancelResult = {
                success: true,
                subscription: {
                    id: 'sub_123',
                    status: 'cancelled',
                    cancelled: true,
                    endsAt: new Date('2024-02-01T00:00:00Z')
                }
            };

            mockManager.getUserSubscriptionStatus.mockResolvedValue(mockSubscription);
            mockManager.cancelUserSubscription.mockResolvedValue(mockCancelResult);

            render(<SubscriptionManagementTestApp />);

            // Get subscription
            const input = screen.getByTestId('subscription-id-input');
            await user.type(input, 'sub_123');
            await user.click(screen.getByTestId('get-subscription-btn'));

            await waitFor(() => {
                expect(screen.getByTestId('subscription-info')).toBeInTheDocument();
            });

            // Cancel subscription
            await user.click(screen.getByTestId('cancel-subscription-btn'));

            // Should show loading during cancellation
            expect(screen.getByTestId('loading')).toBeInTheDocument();

            await waitFor(() => {
                expect(screen.queryByTestId('loading')).not.toBeInTheDocument();
            });

            // Subscription should now show as cancelled
            expect(screen.getByTestId('subscription-details')).toHaveTextContent('Cancelled: Yes');

            // Cancel button should be gone
            expect(screen.queryByTestId('cancel-subscription-btn')).not.toBeInTheDocument();
        });

        it('should check renewal reminders', async () => {
            const mockSubscription = {
                isActive: true,
                status: 'active',
                subscription: {
                    id: 'sub_123',
                    status: 'active',
                    productName: 'Music Analysis Pro',
                    variantName: 'Pro Plan',
                    userEmail: 'test@example.com',
                    renewsAt: new Date('2024-02-01T00:00:00Z'),
                    cancelled: false
                }
            };

            const mockRenewalCheck = {
                needsReminder: true,
                daysUntilRenewal: 5,
                renewalDate: new Date('2024-02-01T00:00:00Z')
            };

            mockManager.getUserSubscriptionStatus.mockResolvedValue(mockSubscription);
            mockManager.checkRenewalReminder.mockResolvedValue(mockRenewalCheck);

            render(<SubscriptionManagementTestApp />);

            // Get subscription
            const input = screen.getByTestId('subscription-id-input');
            await user.type(input, 'sub_123');
            await user.click(screen.getByTestId('get-subscription-btn'));

            await waitFor(() => {
                expect(screen.getByTestId('subscription-info')).toBeInTheDocument();
            });

            // Check renewal
            await user.click(screen.getByTestId('check-renewal-btn'));

            await waitFor(() => {
                expect(screen.getByTestId('renewal-info')).toHaveTextContent('Renewal needed in 5 days');
            });
        });
    });

    describe('Inactive/Cancelled Subscription Management', () => {
        it('should display cancelled subscription information', async () => {
            const mockSubscription = {
                isActive: false,
                status: 'cancelled',
                subscription: {
                    id: 'sub_456',
                    status: 'cancelled',
                    statusFormatted: 'Cancelled',
                    productName: 'Music Analysis Pro',
                    variantName: 'Pro Plan',
                    userEmail: 'test@example.com',
                    renewsAt: new Date('2024-02-01T00:00:00Z'),
                    endsAt: new Date('2024-02-01T00:00:00Z'),
                    cancelled: true
                }
            };

            mockManager.getUserSubscriptionStatus.mockResolvedValue(mockSubscription);

            render(<SubscriptionManagementTestApp />);

            // Get subscription
            const input = screen.getByTestId('subscription-id-input');
            await user.type(input, 'sub_456');
            await user.click(screen.getByTestId('get-subscription-btn'));

            await waitFor(() => {
                expect(screen.getByTestId('subscription-info')).toBeInTheDocument();
            });

            // Verify cancelled status
            expect(screen.getByTestId('subscription-status')).toHaveTextContent('Status: Inactive (cancelled)');
            expect(screen.getByTestId('subscription-details')).toHaveTextContent('Cancelled: Yes');

            // Cancel button should not be present
            expect(screen.queryByTestId('cancel-subscription-btn')).not.toBeInTheDocument();

            // Check renewal button should still be present
            expect(screen.getByTestId('check-renewal-btn')).toBeInTheDocument();
        });

        it('should handle non-existent subscription', async () => {
            mockManager.getUserSubscriptionStatus.mockResolvedValue({
                isActive: false,
                status: 'not_found',
                subscription: null
            });

            render(<SubscriptionManagementTestApp />);

            // Get non-existent subscription
            const input = screen.getByTestId('subscription-id-input');
            await user.type(input, 'sub_nonexistent');
            await user.click(screen.getByTestId('get-subscription-btn'));

            await waitFor(() => {
                expect(screen.getByTestId('subscription-status')).toHaveTextContent('Status: Inactive (not_found)');
            });

            // Should not show subscription details
            expect(screen.queryByTestId('subscription-details')).not.toBeInTheDocument();
            expect(screen.queryByTestId('subscription-actions')).not.toBeInTheDocument();
        });
    });

    describe('Error Handling', () => {
        it('should handle subscription fetch errors', async () => {
            mockManager.getUserSubscriptionStatus.mockRejectedValue(new Error('API Error'));

            render(<SubscriptionManagementTestApp />);

            // Try to get subscription
            const input = screen.getByTestId('subscription-id-input');
            await user.type(input, 'sub_error');
            await user.click(screen.getByTestId('get-subscription-btn'));

            await waitFor(() => {
                expect(screen.getByTestId('error')).toHaveTextContent('API Error');
            });

            // Should not show subscription info
            expect(screen.queryByTestId('subscription-info')).not.toBeInTheDocument();
        });

        it('should handle cancellation errors', async () => {
            const mockSubscription = {
                isActive: true,
                status: 'active',
                subscription: {
                    id: 'sub_123',
                    status: 'active',
                    cancelled: false
                }
            };

            mockManager.getUserSubscriptionStatus.mockResolvedValue(mockSubscription);
            mockManager.cancelUserSubscription.mockResolvedValue({
                success: false,
                error: 'Cancellation failed'
            });

            render(<SubscriptionManagementTestApp />);

            // Get subscription
            const input = screen.getByTestId('subscription-id-input');
            await user.type(input, 'sub_123');
            await user.click(screen.getByTestId('get-subscription-btn'));

            await waitFor(() => {
                expect(screen.getByTestId('subscription-info')).toBeInTheDocument();
            });

            // Try to cancel subscription
            await user.click(screen.getByTestId('cancel-subscription-btn'));

            await waitFor(() => {
                expect(screen.getByTestId('error')).toHaveTextContent('Cancellation failed');
            });

            // Subscription should still show as active
            expect(screen.getByTestId('subscription-details')).toHaveTextContent('Cancelled: No');
        });

        it('should handle renewal check errors', async () => {
            const mockSubscription = {
                isActive: true,
                status: 'active',
                subscription: {
                    id: 'sub_123',
                    status: 'active',
                    cancelled: false
                }
            };

            mockManager.getUserSubscriptionStatus.mockResolvedValue(mockSubscription);
            mockManager.checkRenewalReminder.mockRejectedValue(new Error('Renewal check failed'));

            render(<SubscriptionManagementTestApp />);

            // Get subscription
            const input = screen.getByTestId('subscription-id-input');
            await user.type(input, 'sub_123');
            await user.click(screen.getByTestId('get-subscription-btn'));

            await waitFor(() => {
                expect(screen.getByTestId('subscription-info')).toBeInTheDocument();
            });

            // Try to check renewal
            await user.click(screen.getByTestId('check-renewal-btn'));

            await waitFor(() => {
                expect(screen.getByTestId('error')).toHaveTextContent('Renewal check failed');
            });
        });
    });

    describe('Keyboard Navigation', () => {
        it('should support Enter key for subscription lookup', async () => {
            const mockSubscription = {
                isActive: true,
                status: 'active',
                subscription: {
                    id: 'sub_keyboard',
                    status: 'active',
                    cancelled: false
                }
            };

            mockManager.getUserSubscriptionStatus.mockResolvedValue(mockSubscription);

            render(<SubscriptionManagementTestApp />);

            // Type subscription ID and press Enter
            const input = screen.getByTestId('subscription-id-input');
            await user.type(input, 'sub_keyboard');
            await user.keyboard('{Enter}');

            await waitFor(() => {
                expect(screen.getByTestId('subscription-info')).toBeInTheDocument();
            });

            expect(screen.getByTestId('subscription-details')).toHaveTextContent('ID: sub_keyboard');
        });
    });
});