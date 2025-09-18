# Design Document

## Overview

This design document outlines the implementation of a subscription management UI that enhances the pricing page experience for existing subscribers. The system will detect user subscription status and dynamically render appropriate content - either subscription management options for existing subscribers or standard pricing options for new users.

## Architecture

### Component Structure

```
PricingPage (Wrapper)
├── AuthProvider
├── CreditProvider
└── PricingSection (Enhanced)
    ├── SubscriptionStatusLoader
    ├── SubscribedUserView (New)
    │   ├── CurrentSubscriptionCard
    │   ├── SubscriptionManagementActions
    │   ├── PlanComparisonSection
    │   └── RenewalReminderBanner
    └── StandardPricingView (Existing)
        ├── FreePlanCard
        └── PaidPlanCards
```

### Data Flow

1. **Page Load**: PricingSection checks user authentication status
2. **Subscription Detection**: If user is authenticated, fetch subscription status using SubscriptionManager
3. **Conditional Rendering**: Based on subscription status, render either SubscribedUserView or StandardPricingView
4. **State Management**: Use React state to manage loading, error, and subscription data states
5. **Action Handling**: Handle subscription management actions through Lemonsqueezy customer portal

## Components and Interfaces

### SubscriptionStatusLoader

**Purpose**: Manages the loading and error states while fetching subscription information.

**Props**:
```typescript
interface SubscriptionStatusLoaderProps {
  userId: string;
  onStatusLoaded: (status: SubscriptionStatus) => void;
  onError: (error: string) => void;
}
```

**State Management**:
- Loading state during API calls
- Error state with retry functionality
- Success state with subscription data

### CurrentSubscriptionCard

**Purpose**: Displays current subscription details in a card format.

**Props**:
```typescript
interface CurrentSubscriptionCardProps {
  subscription: {
    id: string;
    status: string;
    planName: string;
    renewsAt: Date;
    endsAt?: Date;
    cancelled: boolean;
    credits: number;
    cardBrand?: string;
    cardLastFour?: string;
  };
}
```

**Features**:
- Plan name and status display
- Renewal/expiration date
- Credit balance
- Payment method info (if available)
- Status badges (Active, Cancelled, etc.)

### SubscriptionManagementActions

**Purpose**: Provides action buttons for subscription management.

**Props**:
```typescript
interface SubscriptionManagementActionsProps {
  subscriptionId: string;
  status: string;
  customerPortalUrl?: string;
  onError: (error: string) => void;
}
```

**Actions**:
- "Manage Subscription" button (links to customer portal)
- "Update Payment Method" button
- Error handling for unavailable actions

### PlanComparisonSection

**Purpose**: Shows available plans with current plan highlighted.

**Props**:
```typescript
interface PlanComparisonSectionProps {
  currentPlanId: string;
  canUpgrade: boolean;
  onPlanSelect: (planId: string) => void;
}
```

**Features**:
- Current plan highlighting
- Upgrade/downgrade options
- Plan comparison table
- Disabled state for non-upgradeable subscriptions

### RenewalReminderBanner

**Purpose**: Shows renewal reminders and important subscription notices.

**Props**:
```typescript
interface RenewalReminderBannerProps {
  subscription: {
    renewsAt: Date;
    endsAt?: Date;
    cancelled: boolean;
    status: string;
  };
}
```

**Features**:
- 7-day renewal reminder
- Cancellation warnings
- Payment failure notices
- Dismissible banner functionality

## Data Models

### SubscriptionStatus Interface

```typescript
interface SubscriptionStatus {
  isActive: boolean;
  status: 'active' | 'cancelled' | 'expired' | 'past_due' | 'on_trial' | 'not_found' | 'error';
  subscription?: {
    id: string;
    status: string;
    planName: string;
    variantName: string;
    userEmail: string;
    renewsAt: Date;
    endsAt?: Date;
    cancelled: boolean;
    trialEndsAt?: Date;
    urls: {
      customer_portal: string;
      update_payment_method: string;
    };
    cardBrand?: string;
    cardLastFour?: string;
  };
  error?: string;
}
```

### Enhanced PricingSection State

```typescript
interface PricingSectionState {
  // Existing state
  selectedPlan: PlanId | null;
  loading: boolean;
  error: string | null;
  paymentStatus: 'idle' | 'processing' | 'redirecting' | 'success' | 'failed';
  
  // New subscription-related state
  subscriptionStatus: SubscriptionStatus | null;
  subscriptionLoading: boolean;
  subscriptionError: string | null;
  showRenewalReminder: boolean;
  renewalReminderDismissed: boolean;
}
```

## Error Handling

### Error Types and Responses

1. **Subscription Not Found**: Show standard pricing options
2. **API Connection Error**: Show retry button with error message
3. **Customer Portal Unavailable**: Show contact support message
4. **Plan Change Error**: Show error message with fallback to customer portal

### Error Recovery Strategies

- **Automatic Retry**: For transient network errors (max 3 attempts)
- **Graceful Degradation**: Fall back to standard pricing view on persistent errors
- **User-Initiated Retry**: Provide manual retry buttons for failed operations
- **Alternative Actions**: Offer contact support when automated actions fail

## Testing Strategy

### Unit Tests

1. **SubscriptionStatusLoader**: Test loading states, error handling, and data fetching
2. **CurrentSubscriptionCard**: Test data display, status formatting, and edge cases
3. **SubscriptionManagementActions**: Test button states, URL generation, and error handling
4. **PlanComparisonSection**: Test plan highlighting, upgrade logic, and disabled states
5. **RenewalReminderBanner**: Test reminder logic, dismissal, and date calculations

### Integration Tests

1. **Subscription Detection Flow**: Test the complete flow from page load to subscription display
2. **Customer Portal Integration**: Test redirection to Lemonsqueezy customer portal
3. **Plan Change Flow**: Test plan upgrade/downgrade initiation
4. **Error Recovery**: Test error states and recovery mechanisms

### E2E Tests

1. **Subscribed User Journey**: Test complete experience for active subscribers
2. **Cancelled Subscription Journey**: Test experience for cancelled but active subscriptions
3. **Expired Subscription Journey**: Test reactivation flow for expired subscriptions
4. **Non-Subscribed User Journey**: Ensure standard pricing flow remains intact

## Implementation Considerations

### Performance Optimizations

- **Lazy Loading**: Load subscription data only when needed
- **Caching**: Cache subscription status for short periods to reduce API calls
- **Debouncing**: Debounce retry attempts to prevent API spam
- **Skeleton Loading**: Show skeleton UI while loading subscription data

### Accessibility

- **Screen Reader Support**: Proper ARIA labels for subscription status and actions
- **Keyboard Navigation**: Ensure all interactive elements are keyboard accessible
- **Color Contrast**: Maintain proper contrast ratios for status indicators
- **Focus Management**: Proper focus handling for dynamic content changes

### Mobile Responsiveness

- **Card Layout**: Responsive subscription card design for mobile devices
- **Action Buttons**: Touch-friendly button sizes and spacing
- **Text Scaling**: Ensure text remains readable at different zoom levels
- **Horizontal Scrolling**: Avoid horizontal scrolling on mobile devices

### Security Considerations

- **Data Sanitization**: Sanitize all subscription data before display
- **URL Validation**: Validate customer portal URLs before redirection
- **Error Message Safety**: Avoid exposing sensitive information in error messages
- **Session Management**: Ensure subscription data is tied to authenticated sessions