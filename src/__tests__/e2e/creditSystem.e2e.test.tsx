import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

// Mock dependencies
vi.mock('../../lib/supabase');
vi.mock('../../utils/deviceFingerprint');
vi.mock('../../services/lemonsqueezyService');

import { supabase } from '../../lib/supabase';
import { DeviceFingerprint } from '../../utils/deviceFingerprint';
import { lemonsqueezyService } from '../../services/lemonsqueezyService';
import { CreditProvider } from '../../contexts/CreditContext';
import { AuthProvider } from '../../contexts/AuthContext';

const mockSupabase = vi.mocked(supabase);
const mockDeviceFingerprint = vi.mocked(DeviceFingerprint);
const mockLemonsqueezyService = vi.mocked(lemonsqueezyService);

// Test component that simulates the complete credit system flow
function CreditSystemTestApp() {
    const [user, setUser] = React.useState<any>(null);
    const [credits, setCredits] = React.useState(0);
    const [isAnalyzing, setIsAnalyzing] = React.useState(false);
    const [analysisResult, setAnalysisResult] = React.useState<string | null>(null);

    // Simulate user login
    const handleLogin = () => {
        setUser({
            id: 'test-user-123',
            email: 'test@example.com',
            created_at: '2024-01-01T00:00:00Z'
        });
    };

    // Simulate user logout
    const handleLogout = () => {
        setUser(null);
        setCredits(0);
    };

    // Simulate credit purchase
    const handlePurchase = async (planId: string) => {
        try {
            // This would normally redirect to Lemonsqueezy
            const checkout = await mockLemonsqueezyService.createCheckout(planId as any, {
                userId: user?.id,
                userEmail: user?.email
            });

            // Simulate successful payment webhook processing
            const planCredits = planId === 'basic' ? 1200 : planId === 'pro' ? 3000 : 7200;
            setCredits(prev => prev + planCredits);

            return checkout;
        } catch (error) {
            console.error('Purchase failed:', error);
            throw error;
        }
    };

    // Simulate audio analysis
    const handleAnalyze = async (duration: number) => {
        if (!user && credits < duration) {
            throw new Error('Insufficient credits');
        }

        setIsAnalyzing(true);

        try {
            // Simulate credit consumption
            setCredits(prev => prev - duration);

            // Simulate analysis
            await new Promise(resolve => setTimeout(resolve, 1000));

            setAnalysisResult(`Analysis completed for ${duration} seconds of audio`);
        } finally {
            setIsAnalyzing(false);
        }
    };

    return (
        <div>
            <div data-testid="user-status">
                {user ? `Logged in as ${user.email}` : 'Not logged in'}
            </div>

            <div data-testid="credit-balance">
                Credits: {credits}
            </div>

            {!user && (
                <button data-testid="login-btn" onClick={handleLogin}>
                    Login
                </button>
            )}

            {user && (
                <>
                    <button data-testid="logout-btn" onClick={handleLogout}>
                        Logout
                    </button>

                    <div data-testid="purchase-section">
                        <button
                            data-testid="buy-basic"
                            onClick={() => handlePurchase('basic')}
                        >
                            Buy Basic (2000 credits)
                        </button>
                        <button
                            data-testid="buy-pro"
                            onClick={() => handlePurchase('pro')}
                        >
                            Buy Pro (4000 credits)
                        </button>
                        <button
                            data-testid="buy-premium"
                            onClick={() => handlePurchase('premium')}
                        >
                            Buy Premium (6000 credits)
                        </button>
                    </div>

                    <div data-testid="analysis-section">
                        <button
                            data-testid="analyze-short"
                            onClick={() => handleAnalyze(60)}
                            disabled={isAnalyzing || credits < 60}
                        >
                            Analyze 1 minute (60 credits)
                        </button>
                        <button
                            data-testid="analyze-long"
                            onClick={() => handleAnalyze(300)}
                            disabled={isAnalyzing || credits < 300}
                        >
                            Analyze 5 minutes (300 credits)
                        </button>
                    </div>
                </>
            )}

            {isAnalyzing && (
                <div data-testid="analyzing">Analyzing...</div>
            )}

            {analysisResult && (
                <div data-testid="analysis-result">{analysisResult}</div>
            )}
        </div>
    );
}

describe('Credit System End-to-End Tests', () => {
    const user = userEvent.setup();

    beforeEach(() => {
        vi.clearAllMocks();

        // Mock successful Lemonsqueezy service
        mockLemonsqueezyService.createCheckout.mockResolvedValue({
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
        });

        // Mock Supabase operations
        mockSupabase.rpc.mockResolvedValue({ data: true, error: null });
        mockSupabase.from.mockReturnValue({
            insert: vi.fn().mockResolvedValue({ error: null }),
            update: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ error: null })
            }),
            select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                    single: vi.fn().mockResolvedValue({
                        data: { total_credits: 0 },
                        error: null
                    })
                })
            })
        } as any);

        // Mock device fingerprint
        mockDeviceFingerprint.generate.mockResolvedValue('test-fingerprint');
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('Complete User Purchase Flow', () => {
        it('should handle complete purchase and consumption flow', async () => {
            render(<CreditSystemTestApp />);

            // Initial state - user not logged in
            expect(screen.getByTestId('user-status')).toHaveTextContent('Not logged in');
            expect(screen.getByTestId('credit-balance')).toHaveTextContent('Credits: 0');

            // User logs in
            await user.click(screen.getByTestId('login-btn'));

            await waitFor(() => {
                expect(screen.getByTestId('user-status')).toHaveTextContent('Logged in as test@example.com');
            });

            // Purchase section should be visible
            expect(screen.getByTestId('purchase-section')).toBeInTheDocument();
            expect(screen.getByTestId('analysis-section')).toBeInTheDocument();

            // Analysis buttons should be disabled (no credits)
            expect(screen.getByTestId('analyze-short')).toBeDisabled();
            expect(screen.getByTestId('analyze-long')).toBeDisabled();

            // Purchase basic plan
            await user.click(screen.getByTestId('buy-basic'));

            await waitFor(() => {
                expect(screen.getByTestId('credit-balance')).toHaveTextContent('Credits: 1200');
            });

            // Analysis buttons should now be enabled
            expect(screen.getByTestId('analyze-short')).not.toBeDisabled();
            expect(screen.getByTestId('analyze-long')).not.toBeDisabled();

            // Perform short analysis
            await user.click(screen.getByTestId('analyze-short'));

            // Should show analyzing state
            expect(screen.getByTestId('analyzing')).toBeInTheDocument();

            // Wait for analysis to complete
            await waitFor(() => {
                expect(screen.getByTestId('analysis-result')).toHaveTextContent('Analysis completed for 60 seconds');
            }, { timeout: 2000 });

            // Credits should be deducted
            expect(screen.getByTestId('credit-balance')).toHaveTextContent('Credits: 1940');

            // Should not be analyzing anymore
            expect(screen.queryByTestId('analyzing')).not.toBeInTheDocument();
        });

        it('should handle insufficient credits scenario', async () => {
            render(<CreditSystemTestApp />);

            // Login user
            await user.click(screen.getByTestId('login-btn'));

            await waitFor(() => {
                expect(screen.getByTestId('user-status')).toHaveTextContent('Logged in as test@example.com');
            });

            // Try to analyze without credits
            expect(screen.getByTestId('analyze-short')).toBeDisabled();
            expect(screen.getByTestId('analyze-long')).toBeDisabled();

            // Purchase basic plan
            await user.click(screen.getByTestId('buy-basic'));

            await waitFor(() => {
                expect(screen.getByTestId('credit-balance')).toHaveTextContent('Credits: 1200');
            });

            // Perform multiple analyses to exhaust credits
            for (let i = 0; i < 4; i++) {
                await user.click(screen.getByTestId('analyze-long'));

                await waitFor(() => {
                    expect(screen.queryByTestId('analyzing')).not.toBeInTheDocument();
                }, { timeout: 2000 });
            }

            // Should have 0 credits left (1200 - 4*300 = 0)
            expect(screen.getByTestId('credit-balance')).toHaveTextContent('Credits: 0');

            // Both analyses should be disabled (no credits left)
            expect(screen.getByTestId('analyze-long')).toBeDisabled();
            expect(screen.getByTestId('analyze-short')).toBeDisabled();
        });

        it('should handle multiple plan purchases', async () => {
            render(<CreditSystemTestApp />);

            // Login user
            await user.click(screen.getByTestId('login-btn'));

            await waitFor(() => {
                expect(screen.getByTestId('user-status')).toHaveTextContent('Logged in as test@example.com');
            });

            // Purchase basic plan
            await user.click(screen.getByTestId('buy-basic'));
            await waitFor(() => {
                expect(screen.getByTestId('credit-balance')).toHaveTextContent('Credits: 1200');
            });

            // Purchase pro plan (should add to existing credits)
            await user.click(screen.getByTestId('buy-pro'));
            await waitFor(() => {
                expect(screen.getByTestId('credit-balance')).toHaveTextContent('Credits: 4200');
            });

            // Purchase premium plan
            await user.click(screen.getByTestId('buy-premium'));
            await waitFor(() => {
                expect(screen.getByTestId('credit-balance')).toHaveTextContent('Credits: 11400');
            });

            // Should be able to perform many analyses
            expect(screen.getByTestId('analyze-short')).not.toBeDisabled();
            expect(screen.getByTestId('analyze-long')).not.toBeDisabled();
        });

        it('should handle user logout and login', async () => {
            render(<CreditSystemTestApp />);

            // Login and purchase credits
            await user.click(screen.getByTestId('login-btn'));
            await waitFor(() => {
                expect(screen.getByTestId('user-status')).toHaveTextContent('Logged in as test@example.com');
            });

            await user.click(screen.getByTestId('buy-pro'));
            await waitFor(() => {
                expect(screen.getByTestId('credit-balance')).toHaveTextContent('Credits: 3000');
            });

            // Logout
            await user.click(screen.getByTestId('logout-btn'));

            await waitFor(() => {
                expect(screen.getByTestId('user-status')).toHaveTextContent('Not logged in');
                expect(screen.getByTestId('credit-balance')).toHaveTextContent('Credits: 0');
            });

            // Purchase and analysis sections should not be visible
            expect(screen.queryByTestId('purchase-section')).not.toBeInTheDocument();
            expect(screen.queryByTestId('analysis-section')).not.toBeInTheDocument();

            // Login again
            await user.click(screen.getByTestId('login-btn'));

            await waitFor(() => {
                expect(screen.getByTestId('user-status')).toHaveTextContent('Logged in as test@example.com');
            });

            // In a real app, credits would be restored from database
            // For this test, they start at 0 again
            expect(screen.getByTestId('credit-balance')).toHaveTextContent('Credits: 0');
        });
    });

    describe('Error Handling', () => {
        it('should handle purchase failures', async () => {
            // Mock purchase failure
            mockLemonsqueezyService.createCheckout.mockRejectedValue(new Error('Payment failed'));

            render(<CreditSystemTestApp />);

            // Login user
            await user.click(screen.getByTestId('login-btn'));
            await waitFor(() => {
                expect(screen.getByTestId('user-status')).toHaveTextContent('Logged in as test@example.com');
            });

            // Try to purchase - should fail silently in this test
            await user.click(screen.getByTestId('buy-basic'));

            // Credits should remain 0
            expect(screen.getByTestId('credit-balance')).toHaveTextContent('Credits: 0');

            // Analysis buttons should remain disabled
            expect(screen.getByTestId('analyze-short')).toBeDisabled();
            expect(screen.getByTestId('analyze-long')).toBeDisabled();
        });

        it('should handle concurrent analysis attempts', async () => {
            render(<CreditSystemTestApp />);

            // Login and purchase credits
            await user.click(screen.getByTestId('login-btn'));
            await waitFor(() => {
                expect(screen.getByTestId('user-status')).toHaveTextContent('Logged in as test@example.com');
            });

            await user.click(screen.getByTestId('buy-basic'));
            await waitFor(() => {
                expect(screen.getByTestId('credit-balance')).toHaveTextContent('Credits: 1200');
            });

            // Start first analysis
            await user.click(screen.getByTestId('analyze-short'));
            expect(screen.getByTestId('analyzing')).toBeInTheDocument();

            // Analysis buttons should be disabled during analysis
            expect(screen.getByTestId('analyze-short')).toBeDisabled();
            expect(screen.getByTestId('analyze-long')).toBeDisabled();

            // Wait for analysis to complete
            await waitFor(() => {
                expect(screen.queryByTestId('analyzing')).not.toBeInTheDocument();
            }, { timeout: 2000 });

            // Buttons should be enabled again
            expect(screen.getByTestId('analyze-short')).not.toBeDisabled();
            expect(screen.getByTestId('analyze-long')).not.toBeDisabled();
        });
    });

    describe('Credit Balance Validation', () => {
        it('should accurately track credit consumption', async () => {
            render(<CreditSystemTestApp />);

            // Login and purchase premium plan
            await user.click(screen.getByTestId('login-btn'));
            await waitFor(() => {
                expect(screen.getByTestId('user-status')).toHaveTextContent('Logged in as test@example.com');
            });

            await user.click(screen.getByTestId('buy-premium'));
            await waitFor(() => {
                expect(screen.getByTestId('credit-balance')).toHaveTextContent('Credits: 7200');
            });

            // Perform specific sequence of analyses
            const analyses = [
                { button: 'analyze-short', cost: 60, remaining: 7140 },
                { button: 'analyze-long', cost: 300, remaining: 6840 },
                { button: 'analyze-short', cost: 60, remaining: 6780 },
                { button: 'analyze-short', cost: 60, remaining: 6720 },
                { button: 'analyze-long', cost: 300, remaining: 6420 }
            ];

            for (const analysis of analyses) {
                await user.click(screen.getByTestId(analysis.button));

                await waitFor(() => {
                    expect(screen.queryByTestId('analyzing')).not.toBeInTheDocument();
                }, { timeout: 2000 });

                expect(screen.getByTestId('credit-balance')).toHaveTextContent(`Credits: ${analysis.remaining}`);
            }
        });

        it('should prevent analysis when credits are insufficient', async () => {
            render(<CreditSystemTestApp />);

            // Login and purchase basic plan
            await user.click(screen.getByTestId('login-btn'));
            await waitFor(() => {
                expect(screen.getByTestId('user-status')).toHaveTextContent('Logged in as test@example.com');
            });

            await user.click(screen.getByTestId('buy-basic'));
            await waitFor(() => {
                expect(screen.getByTestId('credit-balance')).toHaveTextContent('Credits: 1200');
            });

            // Consume most credits (leaving 60)
            for (let i = 0; i < 3; i++) {
                await user.click(screen.getByTestId('analyze-long'));
                await waitFor(() => {
                    expect(screen.queryByTestId('analyzing')).not.toBeInTheDocument();
                }, { timeout: 2000 });
            }

            expect(screen.getByTestId('credit-balance')).toHaveTextContent('Credits: 200');

            // Long analysis should be disabled
            expect(screen.getByTestId('analyze-long')).toBeDisabled();

            // Short analysis should still work
            expect(screen.getByTestId('analyze-short')).not.toBeDisabled();

            // Consume remaining credits with short analyses
            for (let i = 0; i < 3; i++) {
                await user.click(screen.getByTestId('analyze-short'));
                await waitFor(() => {
                    expect(screen.queryByTestId('analyzing')).not.toBeInTheDocument();
                }, { timeout: 2000 });
            }

            expect(screen.getByTestId('credit-balance')).toHaveTextContent('Credits: 20');

            // Both buttons should be disabled now
            expect(screen.getByTestId('analyze-short')).toBeDisabled();
            expect(screen.getByTestId('analyze-long')).toBeDisabled();
        });
    });
});