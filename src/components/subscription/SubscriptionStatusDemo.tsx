/**
 * Demo component to test the useSubscriptionStatus hook
 * This is for testing purposes only
 */

import React from 'react';
import { useSubscriptionStatus, useHasActiveSubscription, useSubscriptionRenewal } from '../../hooks/useSubscriptionStatus';

export function SubscriptionStatusDemo() {
    const {
        subscriptionStatus,
        loading,
        error,
        retryCount,
        refetch,
        retry,
        clearError
    } = useSubscriptionStatus({
        autoFetch: true,
        retryAttempts: 3,
        retryDelay: 1000
    });

    const { hasActiveSubscription } = useHasActiveSubscription();

    const {
        needsRenewalReminder,
        daysUntilRenewal,
        renewalDate
    } = useSubscriptionRenewal();

    if (loading) {
        return (
            <div className="p-4 border rounded-lg bg-gray-50">
                <div className="animate-pulse">
                    <div className="h-4 bg-gray-300 rounded w-3/4 mb-2"></div>
                    <div className="h-4 bg-gray-300 rounded w-1/2"></div>
                </div>
                <p className="text-sm text-gray-600 mt-2">Loading subscription status...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-4 border rounded-lg bg-red-50 border-red-200">
                <h3 className="text-lg font-semibold text-red-800 mb-2">Error Loading Subscription</h3>
                <p className="text-red-600 mb-3">{error}</p>
                <p className="text-sm text-red-500 mb-3">Retry attempts: {retryCount}</p>
                <div className="flex gap-2">
                    <button
                        onClick={retry}
                        className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                    >
                        Retry
                    </button>
                    <button
                        onClick={refetch}
                        className="px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700"
                    >
                        Refetch
                    </button>
                    <button
                        onClick={clearError}
                        className="px-3 py-1 bg-gray-400 text-white rounded text-sm hover:bg-gray-500"
                    >
                        Clear Error
                    </button>
                </div>
            </div>
        );
    }

    if (!subscriptionStatus) {
        return (
            <div className="p-4 border rounded-lg bg-gray-50">
                <p className="text-gray-600">No subscription status available</p>
            </div>
        );
    }

    return (
        <div className="p-4 border rounded-lg bg-white shadow-sm">
            <h3 className="text-lg font-semibold mb-4">Subscription Status Demo</h3>

            {/* Main Status */}
            <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                    <span className={`px-2 py-1 rounded text-sm font-medium ${subscriptionStatus.isActive
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                        {subscriptionStatus.status.toUpperCase()}
                    </span>
                    <span className="text-sm text-gray-600">
                        {hasActiveSubscription ? 'Active Subscription' : 'No Active Subscription'}
                    </span>
                </div>
            </div>

            {/* Subscription Details */}
            {subscriptionStatus.subscription && (
                <div className="mb-4 p-3 bg-gray-50 rounded">
                    <h4 className="font-medium mb-2">Subscription Details</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                            <span className="text-gray-600">Plan:</span>
                            <span className="ml-2 font-medium">{subscriptionStatus.subscription.planName}</span>
                        </div>
                        <div>
                            <span className="text-gray-600">Status:</span>
                            <span className="ml-2">{subscriptionStatus.subscription.status}</span>
                        </div>
                        <div>
                            <span className="text-gray-600">Email:</span>
                            <span className="ml-2">{subscriptionStatus.subscription.userEmail}</span>
                        </div>
                        <div>
                            <span className="text-gray-600">Cancelled:</span>
                            <span className="ml-2">{subscriptionStatus.subscription.cancelled ? 'Yes' : 'No'}</span>
                        </div>
                        <div className="col-span-2">
                            <span className="text-gray-600">Renews At:</span>
                            <span className="ml-2">{subscriptionStatus.subscription.renewsAt.toLocaleDateString()}</span>
                        </div>
                        {subscriptionStatus.subscription.endsAt && (
                            <div className="col-span-2">
                                <span className="text-gray-600">Ends At:</span>
                                <span className="ml-2">{subscriptionStatus.subscription.endsAt.toLocaleDateString()}</span>
                            </div>
                        )}
                        {subscriptionStatus.subscription.cardBrand && (
                            <div className="col-span-2">
                                <span className="text-gray-600">Payment:</span>
                                <span className="ml-2">
                                    {subscriptionStatus.subscription.cardBrand} ****{subscriptionStatus.subscription.cardLastFour}
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Renewal Reminder */}
            {needsRenewalReminder && (
                <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
                    <h4 className="font-medium text-yellow-800 mb-1">Renewal Reminder</h4>
                    <p className="text-sm text-yellow-700">
                        Your subscription renews in {daysUntilRenewal} days
                        {renewalDate && ` on ${renewalDate.toLocaleDateString()}`}
                    </p>
                </div>
            )}

            {/* Actions */}
            <div className="flex gap-2">
                <button
                    onClick={refetch}
                    className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                >
                    Refresh Status
                </button>
                {subscriptionStatus.subscription?.urls.customer_portal && (
                    <a
                        href={subscriptionStatus.subscription.urls.customer_portal}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                    >
                        Manage Subscription
                    </a>
                )}
            </div>
        </div>
    );
}