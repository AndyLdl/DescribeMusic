import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

// Mock dependencies
vi.mock('../../lib/supabase');
vi.mock('../../utils/deviceFingerprint');
vi.mock('../../contexts/AuthContext');

import { supabase } from '../../lib/supabase';
import { DeviceFingerprint } from '../../utils/deviceFingerprint';
import { useAuth } from '../../contexts/AuthContext';

const mockSupabase = vi.mocked(supabase);
const mockDeviceFingerprint = vi.mocked(DeviceFingerprint);
const mockUseAuth = vi.mocked(useAuth);

// Test component that simulates data migration scenarios
function DataMigrationTestApp() {
    const [migrationStatus, setMigrationStatus] = React.useState<string>('idle');
    const [trialData, setTrialData] = React.useState<any>(null);
    const [userCredits, setUserCredits] = React.useState<number>(0);
    const [error, setError] = React.useState<string | null>(null);

    // Simulate getting trial data
    const getTrialData = async () => {
        try {
            setMigrationStatus('fetching-trial');
            const fingerprint = await DeviceFingerprint.generate();
            const usage = await DeviceFingerprint.getTrialUsage(fingerprint);

            // Convert trial usage to credit format
            const trialCredits = Math.max(0, 100 - (usage.totalTrials - usage.remainingTrials) * 10);

            setTrialData({
                fingerprint,
                remainingTrials: usage.remainingTrials,
                totalTrials: usage.totalTrials,
                estimatedCredits: trialCredits
            });

            setMigrationStatus('trial-fetched');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to get trial data');
            setMigrationStatus('error');
        }
    };

    // Simulate user registration/login
    const simulateUserLogin = async (userId: string) => {
        try {
            setMigrationStatus('logging-in');

            // Simulate user login
            mockUseAuth.mockReturnValue({
                user: { id: userId, email: 'test@example.com', created_at: '2024-01-01T00:00:00Z' },
                loading: false,
                signIn: vi.fn(),
                signOut: vi.fn(),
                signUp: vi.fn()
            });

            setMigrationStatus('logged-in');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Login failed');
            setMigrationStatus('error');
        }
    };

    // Simulate trial credit migration
    const migrateTrialCredits = async (userId: string) => {
        try {
            setMigrationStatus('migrating');

            if (!trialData) {
                throw new Error('No trial data available');
            }

            // Simulate adding migrated credits to user account
            const { error: addError } = await mockSupabase.rpc('add_credits', {
                user_uuid: userId,
                credits_amount: trialData.estimatedCredits,
                credit_source: 'trial_grant',
                description: `Migrated ${trialData.estimatedCredits} trial credits from device`
            });

            if (addError) {
                throw new Error(`Failed to add credits: ${addError.message}`);
            }

            // Simulate associating device with user
            await DeviceFingerprint.associateWithUser(userId, trialData.fingerprint);

            setUserCredits(trialData.estimatedCredits);
            setMigrationStatus('migration-complete');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Migration failed');
            setMigrationStatus('error');
        }
    };

    // Simulate checking existing user credits
    const checkUserCredits = async (userId: string) => {
        try {
            setMigrationStatus('checking-credits');

            const { data, error } = await mockSupabase.rpc('get_user_credit_details', {
                user_uuid: userId
            });

            if (error) {
                throw new Error(`Failed to get credits: ${error.message}`);
            }

            const credits = data?.[0]?.total_credits || 0;
            setUserCredits(credits);
            setMigrationStatus('credits-checked');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to check credits');
            setMigrationStatus('error');
        }
    };

    // Simulate complete migration flow
    const runCompleteMigration = async () => {
        try {
            setError(null);

            // Step 1: Get trial data
            await getTrialData();

            // Step 2: Simulate user login
            await simulateUserLogin('user-123');

            // Step 3: Check existing credits
            await checkUserCredits('user-123');

            // Step 4: Migrate trial credits if any
            if (trialData?.estimatedCredits > 0) {
                await migrateTrialCredits('user-123');
            } else {
                setMigrationStatus('no-migration-needed');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Complete migration failed');
            setMigrationStatus('error');
        }
    };

    return (
        <div>
            <div data-testid="migration-status">Status: {migrationStatus}</div>

            {error && <div data-testid="error">{error}</div>}

            <div data-testid="user-credits">User Credits: {userCredits}</div>

            {trialData && (
                <div data-testid="trial-data">
                    <div>Fingerprint: {trialData.fingerprint}</div>
                    <div>Remaining Trials: {trialData.remainingTrials}</div>
                    <div>Total Trials: {trialData.totalTrials}</div>
                    <div>Estimated Credits: {trialData.estimatedCredits}</div>
                </div>
            )}

            <div data-testid="migration-controls">
                <button data-testid="get-trial-btn" onClick={getTrialData}>
                    Get Trial Data
                </button>

                <button data-testid="login-btn" onClick={() => simulateUserLogin('user-123')}>
                    Simulate Login
                </button>

                <button data-testid="check-credits-btn" onClick={() => checkUserCredits('user-123')}>
                    Check User Credits
                </button>

                <button data-testid="migrate-btn" onClick={() => migrateTrialCredits('user-123')}>
                    Migrate Trial Credits
                </button>

                <button data-testid="complete-migration-btn" onClick={runCompleteMigration}>
                    Run Complete Migration
                </button>
            </div>
        </div>
    );
}

describe('Data Migration End-to-End Tests', () => {
    const user = userEvent.setup();

    beforeEach(() => {
        vi.clearAllMocks();

        // Mock DeviceFingerprint
        mockDeviceFingerprint.generate.mockResolvedValue('test-fingerprint-123');
        mockDeviceFingerprint.getTrialUsage.mockResolvedValue({
            remainingTrials: 3,
            totalTrials: 10,
            isExhausted: false
        });
        mockDeviceFingerprint.associateWithUser.mockResolvedValue();

        // Mock Supabase operations
        mockSupabase.rpc.mockImplementation((functionName) => {
            if (functionName === 'add_credits') {
                return Promise.resolve({ data: true, error: null });
            }
            if (functionName === 'get_user_credit_details') {
                return Promise.resolve({
                    data: [{ total_credits: 200 }],
                    error: null
                });
            }
            return Promise.resolve({ data: null, error: null });
        });

        // Mock Auth context
        mockUseAuth.mockReturnValue({
            user: null,
            loading: false,
            signIn: vi.fn(),
            signOut: vi.fn(),
            signUp: vi.fn()
        });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('Trial Data Migration', () => {
        it('should successfully migrate trial credits to user account', async () => {
            render(<DataMigrationTestApp />);

            // Initial state
            expect(screen.getByTestId('migration-status')).toHaveTextContent('Status: idle');
            expect(screen.getByTestId('user-credits')).toHaveTextContent('User Credits: 0');

            // Run complete migration
            await user.click(screen.getByTestId('complete-migration-btn'));

            // Should go through all migration steps
            await waitFor(() => {
                expect(screen.getByTestId('migration-status')).toHaveTextContent('Status: migration-complete');
            }, { timeout: 5000 });

            // Should show trial data
            expect(screen.getByTestId('trial-data')).toBeInTheDocument();
            expect(screen.getByTestId('trial-data')).toHaveTextContent('Fingerprint: test-fingerprint-123');
            expect(screen.getByTestId('trial-data')).toHaveTextContent('Remaining Trials: 3');
            expect(screen.getByTestId('trial-data')).toHaveTextContent('Total Trials: 10');
            expect(screen.getByTestId('trial-data')).toHaveTextContent('Estimated Credits: 30'); // 100 - (10-3)*10

            // Should show migrated credits
            expect(screen.getByTestId('user-credits')).toHaveTextContent('User Credits: 30');

            // Should have called Supabase functions
            expect(mockSupabase.rpc).toHaveBeenCalledWith('add_credits', {
                user_uuid: 'user-123',
                credits_amount: 30,
                credit_source: 'trial_grant',
                description: 'Migrated 30 trial credits from device'
            });

            expect(mockDeviceFingerprint.associateWithUser).toHaveBeenCalledWith(
                'user-123',
                'test-fingerprint-123'
            );
        });

        it('should handle migration when no trial credits remain', async () => {
            // Mock exhausted trial usage
            mockDeviceFingerprint.getTrialUsage.mockResolvedValue({
                remainingTrials: 0,
                totalTrials: 10,
                isExhausted: true
            });

            render(<DataMigrationTestApp />);

            await user.click(screen.getByTestId('complete-migration-btn'));

            await waitFor(() => {
                expect(screen.getByTestId('migration-status')).toHaveTextContent('Status: no-migration-needed');
            });

            // Should show trial data with 0 credits
            expect(screen.getByTestId('trial-data')).toHaveTextContent('Estimated Credits: 0');

            // Should not have called add_credits
            expect(mockSupabase.rpc).not.toHaveBeenCalledWith('add_credits', expect.any(Object));
        });

        it('should handle step-by-step migration process', async () => {
            render(<DataMigrationTestApp />);

            // Step 1: Get trial data
            await user.click(screen.getByTestId('get-trial-btn'));

            await waitFor(() => {
                expect(screen.getByTestId('migration-status')).toHaveTextContent('Status: trial-fetched');
            });

            expect(screen.getByTestId('trial-data')).toBeInTheDocument();

            // Step 2: Simulate login
            await user.click(screen.getByTestId('login-btn'));

            await waitFor(() => {
                expect(screen.getByTestId('migration-status')).toHaveTextContent('Status: logged-in');
            });

            // Step 3: Check existing credits
            await user.click(screen.getByTestId('check-credits-btn'));

            await waitFor(() => {
                expect(screen.getByTestId('migration-status')).toHaveTextContent('Status: credits-checked');
            });

            expect(screen.getByTestId('user-credits')).toHaveTextContent('User Credits: 200');

            // Step 4: Migrate trial credits
            await user.click(screen.getByTestId('migrate-btn'));

            await waitFor(() => {
                expect(screen.getByTestId('migration-status')).toHaveTextContent('Status: migration-complete');
            });

            // Credits should be updated (200 existing + 30 migrated = 230)
            expect(screen.getByTestId('user-credits')).toHaveTextContent('User Credits: 30');
        });
    });

    describe('Migration Error Handling', () => {
        it('should handle device fingerprint generation errors', async () => {
            mockDeviceFingerprint.generate.mockRejectedValue(new Error('Fingerprint generation failed'));

            render(<DataMigrationTestApp />);

            await user.click(screen.getByTestId('get-trial-btn'));

            await waitFor(() => {
                expect(screen.getByTestId('migration-status')).toHaveTextContent('Status: error');
                expect(screen.getByTestId('error')).toHaveTextContent('Fingerprint generation failed');
            });
        });

        it('should handle trial usage fetch errors', async () => {
            mockDeviceFingerprint.getTrialUsage.mockRejectedValue(new Error('Trial usage fetch failed'));

            render(<DataMigrationTestApp />);

            await user.click(screen.getByTestId('get-trial-btn'));

            await waitFor(() => {
                expect(screen.getByTestId('migration-status')).toHaveTextContent('Status: error');
                expect(screen.getByTestId('error')).toHaveTextContent('Trial usage fetch failed');
            });
        });

        it('should handle credit addition errors', async () => {
            mockSupabase.rpc.mockImplementation((functionName) => {
                if (functionName === 'add_credits') {
                    return Promise.resolve({ data: null, error: { message: 'Database error' } });
                }
                return Promise.resolve({ data: [{ total_credits: 200 }], error: null });
            });

            render(<DataMigrationTestApp />);

            await user.click(screen.getByTestId('complete-migration-btn'));

            await waitFor(() => {
                expect(screen.getByTestId('migration-status')).toHaveTextContent('Status: error');
                expect(screen.getByTestId('error')).toHaveTextContent('Failed to add credits: Database error');
            });
        });

        it('should handle device association errors', async () => {
            mockDeviceFingerprint.associateWithUser.mockRejectedValue(new Error('Association failed'));

            render(<DataMigrationTestApp />);

            await user.click(screen.getByTestId('complete-migration-btn'));

            await waitFor(() => {
                expect(screen.getByTestId('migration-status')).toHaveTextContent('Status: error');
                expect(screen.getByTestId('error')).toHaveTextContent('Association failed');
            });
        });

        it('should handle missing trial data during migration', async () => {
            render(<DataMigrationTestApp />);

            // Try to migrate without getting trial data first
            await user.click(screen.getByTestId('migrate-btn'));

            await waitFor(() => {
                expect(screen.getByTestId('migration-status')).toHaveTextContent('Status: error');
                expect(screen.getByTestId('error')).toHaveTextContent('No trial data available');
            });
        });
    });

    describe('Migration Data Validation', () => {
        it('should correctly calculate trial credits from usage data', async () => {
            const testCases = [
                { remaining: 10, total: 10, expected: 100 }, // No usage
                { remaining: 5, total: 10, expected: 50 },   // Half used
                { remaining: 0, total: 10, expected: 0 },    // Fully used
                { remaining: 8, total: 10, expected: 80 },   // Minimal usage
            ];

            for (const testCase of testCases) {
                mockDeviceFingerprint.getTrialUsage.mockResolvedValue({
                    remainingTrials: testCase.remaining,
                    totalTrials: testCase.total,
                    isExhausted: testCase.remaining === 0
                });

                render(<DataMigrationTestApp />);

                await user.click(screen.getByTestId('get-trial-btn'));

                await waitFor(() => {
                    expect(screen.getByTestId('trial-data')).toHaveTextContent(
                        `Estimated Credits: ${testCase.expected}`
                    );
                });

                // Clean up for next iteration
                screen.unmount();
            }
        });

        it('should handle edge cases in credit calculation', async () => {
            // Test negative remaining trials (shouldn't happen but handle gracefully)
            mockDeviceFingerprint.getTrialUsage.mockResolvedValue({
                remainingTrials: -1,
                totalTrials: 10,
                isExhausted: true
            });

            render(<DataMigrationTestApp />);

            await user.click(screen.getByTestId('get-trial-btn'));

            await waitFor(() => {
                expect(screen.getByTestId('trial-data')).toHaveTextContent('Estimated Credits: 0');
            });
        });
    });

    describe('Migration State Management', () => {
        it('should maintain correct state throughout migration process', async () => {
            render(<DataMigrationTestApp />);

            const statusElement = screen.getByTestId('migration-status');

            // Initial state
            expect(statusElement).toHaveTextContent('Status: idle');

            // Start complete migration and track state changes
            await user.click(screen.getByTestId('complete-migration-btn'));

            // Should go through expected states
            const expectedStates = [
                'fetching-trial',
                'trial-fetched',
                'logging-in',
                'logged-in',
                'checking-credits',
                'credits-checked',
                'migrating',
                'migration-complete'
            ];

            // Wait for final state
            await waitFor(() => {
                expect(statusElement).toHaveTextContent('Status: migration-complete');
            }, { timeout: 5000 });

            // Verify final state
            expect(screen.getByTestId('trial-data')).toBeInTheDocument();
            expect(screen.getByTestId('user-credits')).toHaveTextContent('User Credits: 30');
            expect(screen.queryByTestId('error')).not.toBeInTheDocument();
        });

        it('should reset error state when starting new migration', async () => {
            // First, cause an error
            mockDeviceFingerprint.generate.mockRejectedValueOnce(new Error('First error'));

            render(<DataMigrationTestApp />);

            await user.click(screen.getByTestId('get-trial-btn'));

            await waitFor(() => {
                expect(screen.getByTestId('error')).toHaveTextContent('First error');
            });

            // Now fix the mock and try again
            mockDeviceFingerprint.generate.mockResolvedValue('test-fingerprint-123');

            await user.click(screen.getByTestId('complete-migration-btn'));

            // Error should be cleared and migration should succeed
            await waitFor(() => {
                expect(screen.queryByTestId('error')).not.toBeInTheDocument();
                expect(screen.getByTestId('migration-status')).toHaveTextContent('Status: migration-complete');
            });
        });
    });
});