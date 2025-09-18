/**
 * Simple unit tests for useSubscriptionStatus hook
 */

import { renderHook, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useSubscriptionStatus } from '../useSubscriptionStatus';
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
    });

    it('should return not_found status when user is not authenticated', async () => {
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

        const { result } = renderHook(() => useSubscriptionStatus({ autoFetch: true }));

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        }, { timeout: 1000 });

        expect(result.current.subscriptionStatus?.status).toBe('not_found');
        expect(result.current.subscriptionStatus?.isActive).toBe(false);
        expect(result.current.error).toBe(null);
    });

    it('should fetch subscription status for authenticated user with subscription ID', async () => {
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
                }
            }
        };

        mockSubscriptionManager.getUserSubscriptionStatus.mockResolvedValue(mockSubscriptionData);

        const { result } = renderHook(() => useSubscriptionStatus({ autoFetch: true }));

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        }, { timeout: 2000 });

        expect(result.current.subscriptionStatus?.isActive).toBe(true);
        expect(result.current.subscriptionStatus?.status).toBe('active');
        expect(result.current.error).toBe(null);
        expect(mockSubscriptionManager.getUserSubscriptionStatus).toHaveBeenCalledWith('sub-123');
    });

    it('should handle user without subscription ID', async () => {
        const mockUser = {
            id: 'user-123',
            email: 'test@example.com',
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
            app_metadata: {}
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

        const { result } = renderHook(() => useSubscriptionStatus({ autoFetch: true }));

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        }, { timeout: 1000 });

        expect(result.current.subscriptionStatus?.status).toBe('not_found');
        expect(result.current.subscriptionStatus?.isActive).toBe(false);
        expect(result.current.error).toBe(null);
        expect(mockSubscriptionManager.getUserSubscriptionStatus).not.toHaveBeenCalled();
    });
});