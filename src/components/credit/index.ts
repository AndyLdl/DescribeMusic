/**
 * Credit System Components Index
 * Exports all credit-related components and utilities
 */

// Error Handling Components
export { default as CreditErrorBoundary } from './CreditErrorBoundary';
export type {
    CreditErrorType,
    PaymentErrorType,
    CreditError
} from './CreditErrorBoundary';
export {
    createCreditError,
    isCreditError,
    isPaymentError,
    getErrorSeverity
} from './CreditErrorBoundary';

// Toast Notifications
export { default as CreditToastContainer } from './CreditToast';
export { useCreditToast } from './CreditToast';
export type { Toast, ToastType } from './CreditToast';
export { addToast, removeToast, clearToasts } from './CreditToast';

// Offline Support
export { default as OfflineHandler } from './OfflineHandler';
export { useOfflineHandler } from './OfflineHandler';
export {
    shouldQueueOffline,
    getOfflineStorageUsage
} from './OfflineHandler';

// Data Synchronization
export { default as DataSyncManager } from './DataSyncManager';
export { useDataSyncManager } from './DataSyncManager';
export {
    getSyncPriority,
    estimateSyncTime
} from './DataSyncManager';

// Error Recovery
export { default as ErrorRecoveryManager } from './ErrorRecoveryManager';
export { useErrorRecoveryManager } from './ErrorRecoveryManager';
export {
    isRecoverableError,
    getRecoveryPriority
} from './ErrorRecoveryManager';

// Payment Components (re-export from payment folder)
export { default as PaymentModal } from '../payment/PaymentModal';
export { usePaymentModal } from '../payment/PaymentModal';
export { default as PaymentStatusTracker } from '../payment/PaymentStatusTracker';
export { usePaymentStatusTracker } from '../payment/PaymentStatusTracker';
export { default as PaymentRetryHandler } from '../payment/PaymentRetryHandler';
export { usePaymentRetry } from '../payment/PaymentRetryHandler';
export {
    hasPendingPayment,
    getPendingPaymentInfo,
    clearPendingPayment
} from '../payment/PaymentStatusTracker';
export {
    isRetryablePaymentError,
    getRecommendedRetryDelay
} from '../payment/PaymentRetryHandler';

// Error Handler Utilities
export { creditErrorHandler } from '../../utils/creditErrorHandler';
export {
    withCreditErrorHandling,
    withRetry,
    getUserFriendlyErrorMessage,
    isRetryableError,
    createCreditError as createCreditErrorUtil
} from '../../utils/creditErrorHandler';