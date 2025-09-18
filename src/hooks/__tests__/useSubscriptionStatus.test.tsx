/**
 * Unit tests for useSubscriptionStatus hook
 */

import { renderHook, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useSubscriptionStatus, useHasActiveSubscription, useSubscriptionRenewal } from '../useSubscriptionStatus';
import { subscriptionManager } from '../../services/lemonsqueezyService';
import { useAuth } from '../../contexts/AuthContext';

// Mock the dependencies
vi.mock('../../services/lemonsqueezyService', () => ({
    subscriptionManager: {
        getUserSubscriptionStatus: vi.fn()
    }
}));

vi.mock('../../contexts/AuthContext', () => ({
    useAuth: vi.fn()
}));

const mockSubscriptionManager = vi.mocked(subscriptionManager);
const mockUseAuth = vi.mocked(useAuth);

describe('useSubscriptionStatus', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('should return initial state when user is not authenticated', async () => {
        mockUseAuth.mockReturnValue({
            user: null,
            loading: false,
            session: null,
            usageStatus: null,
            deviceFingerprint: null,
            signUp: vi.fn(),
            signIn: vi.fn(),
            signOut: vi.fn(),
            resetPassword: vi.fn(),
            checkUsageLimit: vi.fn(),
            consumeUsage: vi.fn(),
            refreshUsageStatus: vi.fn(),
            getDeviceFingerprint: vi.fn(),
            clearDeviceCache: vi.fn()
        });

        const { result } = renderHook(() => useSubscriptionStatus());

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        expect(result.current.subscriptionStatus).toEqual({
            isActive: false,
            status: 'not_found'
        });
        expect(result.current.error).toBe(null);
    });

    it('should fetch subscription status for authenticated user', async () => {
        const mockUser = {
            id: 'user-123',
            email: 'test@example.com',
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
            app_metadata: {
                subscription_id: 'sub-123'
            }
        };

        const mockSubscriptionData = {
            isActive: true,
            status: 'active',
            subscription: {
                id: 'sub-123',
                status: 'active',
                variantName: 'Pro Plan',
                userEmail: 'test@example.com',
                renewsAt: new Date('2024-02-01T00:00:00Z'),
                endsAt: null,
                cancelled: false,
                trialEndsAt: null,
                urls: {
                    customer_portal: 'https://portal.example.com',
                    update_payment_method: 'https://payment.example.com'
                },
                cardBrand: 'visa',
                cardLastFour: '1234'
            }
        };

        mockUseAuth.mockReturnValue({
            user: mockUser,
            loading: false,
            session: null,
            usageStatus: null,
            deviceFingerprint: null,
            signUp: vi.fn(),
            signIn: vi.fn(),
            signOut: vi.fn(),
            resetPassword: vi.fn(),
            checkUsageLimit: vi.fn(),
            consumeUsage: vi.fn(),
            refreshUsageStatus: vi.fn(),
            getDeviceFingerprint: vi.fn(),
            clearDeviceCache: vi.fn()
        });

        mockSubscriptionManager.getUserSubscriptionStatus.mockResolvedValue(mockSubscriptionData);

        const { result } = renderHook(() => useSubscriptionStatus());

        // Initially loading
        expect(result.current.loading).toBe(true);

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        expect(result.current.subscriptionStatus?.isActive).toBe(true);
        expect(result.current.subscriptionStatus?.status).toBe('active');
        expect(result.current.subscriptionStatus?.subscription?.planName).toBe('Pro Plan');
        expect(result.current.error).toBe(null);
        expect(mockSubscriptionManager.getUserSubscriptionStatus).toHaveBeenCalledWith('sub-123');
    });

    it('should handle subscription not found', async () => {
        const mockUser = {
            id: 'user-123',
            email: 'test@example.com',
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
            app_metadata: {
                subscription_id: 'sub-123'
            }
        };

        mockUseAuth.mockReturnValue({
            user: mockUser,
            loading: false,
            session: null,
            usageStatus: null,
            deviceFingerprint: null,
            signUp: vi.fn(),
            signIn: vi.fn(),
            signOut: vi.fn(),
            resetPassword: vi.fn(),
            checkUsageLimit: vi.fn(),
            consumeUsage: vi.fn(),
            refreshUsageStatus: vi.fn(),
            getDeviceFingerprint: vi.fn(),
            clearDeviceCache: vi.fn()
        });

        mockSubscriptionManager.getUserSubscriptionStatus.mockResolvedValue({
            isActive: false,
            status: 'not_found',
            subscription: null
        });

        const { result } = renderHook(() => useSubscriptionStatus());

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        expect(result.current.subscriptionStatus?.isActive).toBe(false);
        expect(result.current.subscriptionStatus?.status).toBe('not_found');
        expect(result.current.error).toBe(null);
    });

    it('should handle errors and retry automatically', async () => {
        const mockUser = {
            id: 'user-123',
            email: 'test@example.com',
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
            app_metadata: {
                subscription_id: 'sub-123'
            }
        };

        mockUseAuth.mockReturnValue({
            user: mockUser,
            loading: false,
            session: null,
            usageStatus: null,
            deviceFingerprint: null,
            signUp: vi.fn(),
            signIn: vi.fn(),
            signOut: vi.fn(),
            resetPassword: vi.fn(),
            checkUsageLimit: vi.fn(),
            consumeUsage: vi.fn(),
            refreshUsageStatus: vi.fn(),
            getDeviceFingerprint: vi.fn(),
            clearDeviceCache: vi.fn()
        });

        // First call fails
        mockSubscriptionManager.getUserSubscriptionStatus
            .mockRejectedValueOnce(new Error('Network error'))
            .mockResolvedValueOnce({
                isActive: true,
                status: 'active',
                subscription: {
                    id: 'sub-123',
                    status: 'active',
                    variantName: 'Pro Plan',
                    userEmail: 'test@example.com',
                    renewsAt: new Date('2024-02-01T00:00:00Z'),
                    endsAt: null,
                    cancelled: false,
                    trialEndsAt: null,
                    urls: {
                        customer_portal: 'https://portal.example.com',
                        update_payment_method: 'https://payment.example.com'
                    }
                }
            });

        const { result } = renderHook(() => useSubscriptionStatus({ retryDelay: 100 }));

        // Wait for initial error
        await waitFor(() => {
            expect(result.current.error).toBe('Network error');
        });

        expect(result.current.subscriptionStatus?.status).toBe('error');
        expect(result.current.retryCount).toBe(0);

        // Fast-forward time to trigger retry
        vi.advanceTimersByTime(100);

        // Wait for retry to complete
        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        expect(result.current.subscriptionStatus?.isActive).toBe(true);
        expect(result.current.error).toBe(null);
        expect(mockSubscriptionManager.getUserSubscriptionStatus).toHaveBeenCalledTimes(2);
    });

    it('should allow manual refetch', async () => {
        const mockUser = {
            id: 'user-123',
            email: 'test@example.com',
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
            app_metadata: {
                subscription_id: 'sub-123'
            }
        };

        mockUseAuth.mockReturnValue({
            user: mockUser,
            loading: false,
            session: null,
            usageStatus: null,
            deviceFingerprint: null,
            signUp: vi.fn(),
            signIn: vi.fn(),
            signOut: vi.fn(),
            resetPassword: vi.fn(),
            checkUsageLimit: vi.fn(),
            consumeUsage: vi.fn(),
            refreshUsageStatus: vi.fn(),
            getDeviceFingerprint: vi.fn(),
            clearDeviceCache: vi.fn()
        });

        mockSubscriptionManager.getUserSubscriptionStatus.mockResolvedValue({
            isActive: true,
            status: 'active',
            subscription: {
                id: 'sub-123',
                status: 'active',
                variantName: 'Pro Plan',
                userEmail: 'test@example.com',
                renewsAt: new Date('2024-02-01T00:00:00Z'),
                endsAt: null,
                cancelled: false,
                trialEndsAt: null,
                urls: {
                    customer_portal: 'https://portal.example.com',
                    update_payment_method: 'https://payment.example.com'
                }
            }
        });

        const { result } = renderHook(() => useSubscriptionStatus());

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        // Manual refetch
        await result.current.refetch();

        expect(mockSubscriptionManager.getUserSubscriptionStatus).toHaveBeenCalledTimes(2);
    });
});

describe('useHasActiveSubscription', () => {
    it('should return correct active subscription status', async () => {
        const mockUser = {
            id: 'user-123',
            email: 'test@example.com',
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
            app_metadata: {
                subscription_id: 'sub-123'
            }
        };

        mockUseAuth.mockReturnValue({
            user: mockUser,
            loading: false,
            session: null,
            usageStatus: null,
            deviceFingerprint: null,
            signUp: vi.fn(),
            signIn: vi.fn(),
            signOut: vi.fn(),
            resetPassword: vi.fn(),
            checkUsageLimit: vi.fn(),
            consumeUsage: vi.fn(),
            refreshUsageStatus: vi.fn(),
            getDeviceFingerprint: vi.fn(),
            clearDeviceCache: vi.fn()
        });

        mockSubscriptionManager.getUserSubscriptionStatus.mockResolvedValue({
            isActive: true,
            status: 'active',
            subscription: {
                id: 'sub-123',
                status: 'active',
                variantName: 'Pro Plan',
                userEmail: 'test@example.com',
                renewsAt: new Date('2024-02-01T00:00:00Z'),
                endsAt: null,
                cancelled: false,
                trialEndsAt: null,
                urls: {
                    customer_portal: 'https://portal.example.com',
                    update_payment_method: 'https://payment.example.com'
                }
            }
        });

        const { result } = renderHook(() => useHasActiveSubscription());

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        expect(result.current.hasActiveSubscription).toBe(true);
    });
});

describe('useSubscriptionRenewal', () => {
    it('should calculate renewal reminder correctly', async () => {
        const mockUser = {
            id: 'user-123',
            email: 'test@example.com',
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
            app_metadata: {
                subscription_id: 'sub-123'
            }
        };

        mockUseAuth.mockReturnValue({
            user: mockUser,
            loading: false,
            session: null,
            usageStatus: null,
            deviceFingerprint: null,
            signUp: vi.fn(),
            signIn: vi.fn(),
            signOut: vi.fn(),
            resetPassword: vi.fn(),
            checkUsageLimit: vi.fn(),
            consumeUsage: vi.fn(),
            refreshUsageStatus: vi.fn(),
            getDeviceFingerprint: vi.fn(),
            clearDeviceCache: vi.fn()
        });

        // Set renewal date to 5 days from now
        const renewalDate = new Date();
        renewalDate.setDate(renewalDate.getDate() + 5);

        mockSubscriptionManager.getUserSubscriptionStatus.mockResolvedValue({
            isActive: true,
            status: 'active',
            subscription: {
                id: 'sub-123',
                status: 'active',
                variantName: 'Pro Plan',
                userEmail: 'test@example.com',
                renewsAt: renewalDate,
                endsAt: null,
                cancelled: false,
                trialEndsAt: null,
                urls: {
                    customer_portal: 'https://portal.example.com',
                    update_payment_method: 'https://payment.example.com'
                }
            }
        });

        const { result } = renderHook(() => useSubscriptionRenewal());

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        expect(result.current.needsRenewalReminder).toBe(true);
        expect(result.current.daysUntilRenewal).toBe(5);
        expect(result.current.renewalDate).toEqual(renewalDate);
    });
});