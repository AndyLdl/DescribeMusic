import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import React from 'react';
import { CreditProvider, useCredit, useCreditCheck, useTrialCredit } from '../CreditContext';
import { useAuth } from '../AuthContext';
import { supabase } from '../../lib/supabase';
import { DeviceFingerprint } from '../../utils/deviceFingerprint';

// Mock dependencies
vi.mock('../AuthContext');
vi.mock('../../lib/supabase');
vi.mock('../../utils/deviceFingerprint');

const mockUseAuth = vi.mocked(useAuth);
const mockSupabase = vi.mocked(supabase);
const mockDeviceFingerprint = vi.mocked(DeviceFingerprint);

// Test component that uses the credit context
function TestComponent() {
    const {
        credits,
        creditBalance,
        loading,
        error,
        checkCredits,
        consumeCredits,
        addCredits,
        refundCredits,
        calculateCreditsForDuration,
        estimateConsumption
    } = useCredit();

    const { hasCredits, canAfford, getEstimate } = useCreditCheck();

    const {
        checkTrialCredits,
        consumeTrialCredits,
        getTrialCreditBalance
    } = useTrialCredit();

    return (
        <div>
            <div data-testid="credits">{credits}</div>
            <div data-testid="loading">{loading.toString()}</div>
            <div data-testid="error">{error || 'no-error'}</div>
            <div data-testid="balance-total">{creditBalance?.total || 0}</div>
            <div data-testid="balance-trial">{creditBalance?.trial || 0}</div>
            <div data-testid="balance-monthly">{creditBalance?.monthly || 0}</div>
            <div data-testid="balance-purchased">{creditBalance?.purchased || 0}</div>

            <button
                data-testid="check-credits"
                onClick={() => checkCredits()}
            >
                Check Credits
            </button>

            <button
                data-testid="consume-credits"
                onClick={() => consumeCredits(100, 'Test analysis')}
            >
                Consume Credits
            </button>

            <button
                data-testid="add-credits"
                onClick={() => addCredits(200, 'purchase', 'Test purchase')}
            >
                Add Credits
            </button>

            <button
                data-testid="refund-credits"
                onClick={() => refundCredits(50, 'Test refund')}
            >
                Refund Credits
            </button>

            <div data-testid="credits-for-duration">
                {calculateCreditsForDuration(180)}
            </div>

            <div data-testid="has-credits-100">
                {hasCredits(100).toString()}
            </div>

            <div data-testid="can-afford-180">
                {canAfford(180).toString()}
            </div>

            <button
                data-testid="check-trial-credits"
                onClick={async () => {
                    const result = await checkTrialCredits(100);
                    console.log('Trial credits check:', result);
                }}
            >
                Check Trial Credits
            </button>

            <button
                data-testid="consume-trial-credits"
                onClick={() => consumeTrialCredits(50, 'Trial analysis')}
            >
                Consume Trial Credits
            </button>
        </div>
    );
}

describe('CreditContext', () => {
    const mockUser = {
        id: 'test-user-id',
        email: 'test@example.com',
        created_at: '2024-01-01T00:00:00Z'
    };

    beforeEach(() => {
        vi.clearAllMocks();

        // Mock console methods to avoid noise in tests
        vi.spyOn(console, 'log').mockImplementation(() => { });
        vi.spyOn(console, 'error').mockImplementation(() => { });
        vi.spyOn(console, 'warn').mockImplementation(() => { });

        // Default auth mock - no user, not loading
        mockUseAuth.mockReturnValue({
            user: null,
            loading: false,
            signIn: vi.fn(),
            signOut: vi.fn(),
            signUp: vi.fn()
        });

        // Default supabase mocks
        mockSupabase.rpc = vi.fn();

        // Default device fingerprint mocks
        mockDeviceFingerprint.generate.mockResolvedValue('test-fingerprint');
        mockDeviceFingerprint.getTrialUsage.mockResolvedValue({
            remainingTrials: 5,
            totalTrials: 10,
            isExhausted: false
        });
        mockDeviceFingerprint.associateWithUser.mockResolvedValue();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('Provider initialization', () => {
        it('should render without crashing', () => {
            render(
                <CreditProvider>
                    <TestComponent />
                </CreditProvider>
            );

            expect(screen.getByTestId('credits')).toHaveTextContent('0');
            expect(screen.getByTestId('loading')).toHaveTextContent('true');
        });

        it('should initialize with default values for non-authenticated users', async () => {
            render(
                <CreditProvider>
                    <TestComponent />
                </CreditProvider>
            );

            await waitFor(() => {
                expect(screen.getByTestId('loading')).toHaveTextContent('false');
            });

            expect(screen.getByTestId('credits')).toHaveTextContent('0');
            expect(screen.getByTestId('balance-total')).toHaveTextContent('0');
            expect(screen.getByTestId('error')).toHaveTextContent('no-error');
        });
    });

    describe('Authenticated user credit operations', () => {
        beforeEach(() => {
            mockUseAuth.mockReturnValue({
                user: mockUser,
                loading: false,
                signIn: vi.fn(),
                signOut: vi.fn(),
                signUp: vi.fn()
            });
        });

        it('should check credits for authenticated user', async () => {
            const mockCreditData = [{
                total_credits: 500,
                trial_credits: 100,
                monthly_credits: 200,
                purchased_credits: 200
            }];

            mockSupabase.rpc.mockResolvedValue({
                data: mockCreditData,
                error: null
            });

            render(
                <CreditProvider>
                    <TestComponent />
                </CreditProvider>
            );

            await waitFor(() => {
                expect(screen.getByTestId('loading')).toHaveTextContent('false');
            });

            expect(screen.getByTestId('credits')).toHaveTextContent('500');
            expect(screen.getByTestId('balance-total')).toHaveTextContent('500');
            expect(screen.getByTestId('balance-trial')).toHaveTextContent('100');
            expect(screen.getByTestId('balance-monthly')).toHaveTextContent('200');
            expect(screen.getByTestId('balance-purchased')).toHaveTextContent('200');
        });

        it('should create default credit record for new user', async () => {
            // First call fails (no record), second call succeeds after creation
            mockSupabase.rpc
                .mockResolvedValueOnce({
                    data: null,
                    error: { code: 'PGRST116', message: 'no rows' }
                })
                .mockResolvedValueOnce({
                    data: true,
                    error: null
                });

            render(
                <CreditProvider>
                    <TestComponent />
                </CreditProvider>
            );

            await waitFor(() => {
                expect(screen.getByTestId('loading')).toHaveTextContent('false');
            });

            expect(mockSupabase.rpc).toHaveBeenCalledWith('get_user_credit_details', {
                user_uuid: mockUser.id
            });

            expect(mockSupabase.rpc).toHaveBeenCalledWith('add_credits', {
                user_uuid: mockUser.id,
                credits_amount: 200,
                credit_source: 'monthly_grant',
                description: 'Initial monthly credit grant for new user'
            });

            expect(screen.getByTestId('credits')).toHaveTextContent('200');
        });

        it('should consume credits successfully', async () => {
            const mockCreditData = [{
                total_credits: 500,
                trial_credits: 0,
                monthly_credits: 200,
                purchased_credits: 300
            }];

            mockSupabase.rpc
                .mockResolvedValueOnce({ data: mockCreditData, error: null }) // Initial check
                .mockResolvedValueOnce({ data: true, error: null }) // Consume credits
                .mockResolvedValueOnce({
                    data: [{ ...mockCreditData[0], total_credits: 400 }],
                    error: null
                }); // Refresh after consumption

            render(
                <CreditProvider>
                    <TestComponent />
                </CreditProvider>
            );

            await waitFor(() => {
                expect(screen.getByTestId('credits')).toHaveTextContent('500');
            });

            await act(async () => {
                screen.getByTestId('consume-credits').click();
            });

            await waitFor(() => {
                expect(mockSupabase.rpc).toHaveBeenCalledWith('consume_credits', {
                    user_uuid: mockUser.id,
                    credits_amount: 100,
                    analysis_description: 'Test analysis',
                    analysis_id: null
                });
            });
        });

        it('should handle insufficient credits error', async () => {
            const mockCreditData = [{
                total_credits: 50,
                trial_credits: 0,
                monthly_credits: 50,
                purchased_credits: 0
            }];

            mockSupabase.rpc.mockResolvedValue({
                data: mockCreditData,
                error: null
            });

            render(
                <CreditProvider>
                    <TestComponent />
                </CreditProvider>
            );

            await waitFor(() => {
                expect(screen.getByTestId('credits')).toHaveTextContent('50');
            });

            await act(async () => {
                screen.getByTestId('consume-credits').click();
            });

            await waitFor(() => {
                expect(screen.getByTestId('error')).toContain('Insufficient credits');
            });
        });

        it('should add credits successfully', async () => {
            const mockCreditData = [{
                total_credits: 500,
                trial_credits: 0,
                monthly_credits: 200,
                purchased_credits: 300
            }];

            mockSupabase.rpc
                .mockResolvedValueOnce({ data: mockCreditData, error: null }) // Initial check
                .mockResolvedValueOnce({ data: true, error: null }) // Add credits
                .mockResolvedValueOnce({
                    data: [{ ...mockCreditData[0], total_credits: 700, purchased_credits: 500 }],
                    error: null
                }); // Refresh after addition

            render(
                <CreditProvider>
                    <TestComponent />
                </CreditProvider>
            );

            await waitFor(() => {
                expect(screen.getByTestId('credits')).toHaveTextContent('500');
            });

            await act(async () => {
                screen.getByTestId('add-credits').click();
            });

            await waitFor(() => {
                expect(mockSupabase.rpc).toHaveBeenCalledWith('add_credits', {
                    user_uuid: mockUser.id,
                    credits_amount: 200,
                    credit_source: 'purchase',
                    description: 'Test purchase'
                });
            });
        });

        it('should refund credits successfully', async () => {
            const mockCreditData = [{
                total_credits: 500,
                trial_credits: 0,
                monthly_credits: 200,
                purchased_credits: 300
            }];

            mockSupabase.rpc
                .mockResolvedValueOnce({ data: mockCreditData, error: null }) // Initial check
                .mockResolvedValueOnce({ data: true, error: null }) // Refund credits
                .mockResolvedValueOnce({
                    data: [{ ...mockCreditData[0], total_credits: 550 }],
                    error: null
                }); // Refresh after refund

            render(
                <CreditProvider>
                    <TestComponent />
                </CreditProvider>
            );

            await waitFor(() => {
                expect(screen.getByTestId('credits')).toHaveTextContent('500');
            });

            await act(async () => {
                screen.getByTestId('refund-credits').click();
            });

            await waitFor(() => {
                expect(mockSupabase.rpc).toHaveBeenCalledWith('refund_credits', {
                    user_uuid: mockUser.id,
                    credits_amount: 50,
                    refund_reason: 'Test refund',
                    original_analysis_id: null
                });
            });
        });
    });

    describe('Credit calculation methods', () => {
        it('should calculate credits for duration correctly', () => {
            render(
                <CreditProvider>
                    <TestComponent />
                </CreditProvider>
            );

            expect(screen.getByTestId('credits-for-duration')).toHaveTextContent('180');
        });

        it('should check if user has sufficient credits', async () => {
            const mockCreditData = [{
                total_credits: 500,
                trial_credits: 0,
                monthly_credits: 200,
                purchased_credits: 300
            }];

            mockSupabase.rpc.mockResolvedValue({
                data: mockCreditData,
                error: null
            });

            mockUseAuth.mockReturnValue({
                user: mockUser,
                loading: false,
                signIn: vi.fn(),
                signOut: vi.fn(),
                signUp: vi.fn()
            });

            render(
                <CreditProvider>
                    <TestComponent />
                </CreditProvider>
            );

            await waitFor(() => {
                expect(screen.getByTestId('has-credits-100')).toHaveTextContent('true');
                expect(screen.getByTestId('can-afford-180')).toHaveTextContent('true');
            });
        });
    });

    describe('Trial credit operations', () => {
        it('should check trial credits for non-authenticated users', async () => {
            mockSupabase.rpc.mockResolvedValue({
                data: true,
                error: null
            });

            render(
                <CreditProvider>
                    <TestComponent />
                </CreditProvider>
            );

            await act(async () => {
                screen.getByTestId('check-trial-credits').click();
            });

            await waitFor(() => {
                expect(mockSupabase.rpc).toHaveBeenCalledWith('check_trial_credits', {
                    fingerprint_hash_param: 'test-fingerprint',
                    required_credits: 100
                });
            });
        });

        it('should consume trial credits successfully', async () => {
            mockSupabase.rpc
                .mockResolvedValueOnce({ data: true, error: null }) // Check trial credits
                .mockResolvedValueOnce({ data: true, error: null }); // Consume trial credits

            render(
                <CreditProvider>
                    <TestComponent />
                </CreditProvider>
            );

            await act(async () => {
                screen.getByTestId('consume-trial-credits').click();
            });

            await waitFor(() => {
                expect(mockSupabase.rpc).toHaveBeenCalledWith('consume_trial_credits', {
                    fingerprint_hash_param: 'test-fingerprint',
                    credits_amount: 50,
                    analysis_description: 'Trial analysis',
                    analysis_id: null
                });
            });
        });

        it('should handle insufficient trial credits', async () => {
            mockSupabase.rpc.mockResolvedValue({
                data: false,
                error: null
            });

            render(
                <CreditProvider>
                    <TestComponent />
                </CreditProvider>
            );

            await expect(async () => {
                await act(async () => {
                    screen.getByTestId('consume-trial-credits').click();
                });
            }).rejects.toThrow('Insufficient trial credits');
        });

        it('should get trial credit balance', async () => {
            const { getTrialCreditBalance } = useTrialCredit();

            render(
                <CreditProvider>
                    <div>Test</div>
                </CreditProvider>
            );

            const TestBalanceComponent = () => {
                const { getTrialCreditBalance } = useTrialCredit();
                const [balance, setBalance] = React.useState<any>(null);

                React.useEffect(() => {
                    getTrialCreditBalance().then(setBalance);
                }, []);

                return (
                    <div>
                        <div data-testid="trial-total">{balance?.total || 0}</div>
                        <div data-testid="trial-used">{balance?.used || 0}</div>
                        <div data-testid="trial-remaining">{balance?.remaining || 0}</div>
                    </div>
                );
            };

            render(
                <CreditProvider>
                    <TestBalanceComponent />
                </CreditProvider>
            );

            await waitFor(() => {
                expect(screen.getByTestId('trial-total')).toHaveTextContent('100');
                expect(screen.getByTestId('trial-remaining')).toHaveTextContent('900'); // 5 * 180
            });
        });
    });

    describe('Error handling', () => {
        beforeEach(() => {
            mockUseAuth.mockReturnValue({
                user: mockUser,
                loading: false,
                signIn: vi.fn(),
                signOut: vi.fn(),
                signUp: vi.fn()
            });
        });

        it('should handle database errors gracefully', async () => {
            mockSupabase.rpc.mockResolvedValue({
                data: null,
                error: { message: 'Database connection failed' }
            });

            render(
                <CreditProvider>
                    <TestComponent />
                </CreditProvider>
            );

            await waitFor(() => {
                expect(screen.getByTestId('error')).toContain('Failed to check credits');
            });
        });

        it('should handle consume credits errors', async () => {
            const mockCreditData = [{
                total_credits: 500,
                trial_credits: 0,
                monthly_credits: 200,
                purchased_credits: 300
            }];

            mockSupabase.rpc
                .mockResolvedValueOnce({ data: mockCreditData, error: null }) // Initial check
                .mockResolvedValueOnce({
                    data: null,
                    error: { message: 'Consumption failed' }
                }); // Consume credits fails

            render(
                <CreditProvider>
                    <TestComponent />
                </CreditProvider>
            );

            await waitFor(() => {
                expect(screen.getByTestId('credits')).toHaveTextContent('500');
            });

            await act(async () => {
                screen.getByTestId('consume-credits').click();
            });

            await waitFor(() => {
                expect(screen.getByTestId('error')).toContain('Failed to consume credits');
            });
        });
    });

    describe('Context hook error handling', () => {
        it('should throw error when useCredit is used outside provider', () => {
            // Suppress console.error for this test
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

            expect(() => {
                render(<TestComponent />);
            }).toThrow('useCredit must be used within a CreditProvider');

            consoleSpy.mockRestore();
        });
    });

    describe('Migration functionality', () => {
        beforeEach(() => {
            mockUseAuth.mockReturnValue({
                user: mockUser,
                loading: false,
                signIn: vi.fn(),
                signOut: vi.fn(),
                signUp: vi.fn()
            });
        });

        it('should migrate trial credits when user logs in', async () => {
            const mockCreditData = [{
                total_credits: 200,
                trial_credits: 0,
                monthly_credits: 200,
                purchased_credits: 0
            }];

            mockSupabase.rpc
                .mockResolvedValueOnce({ data: mockCreditData, error: null }) // Initial check
                .mockResolvedValueOnce({ data: true, error: null }); // Add migrated credits

            mockDeviceFingerprint.getTrialUsage.mockResolvedValue({
                remainingTrials: 2,
                totalTrials: 10,
                isExhausted: false
            });

            render(
                <CreditProvider>
                    <TestComponent />
                </CreditProvider>
            );

            await waitFor(() => {
                expect(mockDeviceFingerprint.associateWithUser).toHaveBeenCalledWith(
                    mockUser.id,
                    'test-fingerprint'
                );
            });
        });
    });
});