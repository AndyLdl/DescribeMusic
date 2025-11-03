"use strict";
/**
 * Lemonsqueezy Webhook Handler
 *
 * Handles payment events from Lemonsqueezy and processes credit additions
 * and subscription management.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.lemonsqueezyWebhook = exports.WebhookEventType = void 0;
const functions = __importStar(require("firebase-functions/v1"));
const crypto = __importStar(require("crypto"));
const config_1 = __importDefault(require("../utils/config"));
const logger_1 = __importDefault(require("../utils/logger"));
const supabase_1 = __importDefault(require("../utils/supabase"));
// Webhook event types we handle
var WebhookEventType;
(function (WebhookEventType) {
    WebhookEventType["ORDER_CREATED"] = "order_created";
    WebhookEventType["SUBSCRIPTION_CREATED"] = "subscription_created";
    WebhookEventType["SUBSCRIPTION_UPDATED"] = "subscription_updated";
    WebhookEventType["SUBSCRIPTION_CANCELLED"] = "subscription_cancelled";
    WebhookEventType["SUBSCRIPTION_RESUMED"] = "subscription_resumed";
    WebhookEventType["SUBSCRIPTION_EXPIRED"] = "subscription_expired";
    WebhookEventType["SUBSCRIPTION_PAUSED"] = "subscription_paused";
    WebhookEventType["SUBSCRIPTION_UNPAUSED"] = "subscription_unpaused";
})(WebhookEventType || (exports.WebhookEventType = WebhookEventType = {}));
/**
 * Main webhook handler function
 */
exports.lemonsqueezyWebhook = functions
    .region('us-central1')
    .https
    .onRequest(async (req, res) => {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Signature');
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }
    const requestId = `webhook_${Date.now()}`;
    logger_1.default.info('Received Lemonsqueezy webhook', { requestId });
    try {
        // Get raw body for signature verification
        // Use req.rawBody if available, otherwise fallback to JSON.stringify
        const rawBody = req.rawBody ? req.rawBody.toString('utf8') : JSON.stringify(req.body);
        const signature = req.get('X-Signature') || '';
        logger_1.default.info('Webhook signature verification details', {
            hasRawBody: !!req.rawBody,
            bodyLength: rawBody.length,
            signaturePresent: !!signature,
            requestId
        });
        // Verify webhook signature
        if (!verifyWebhookSignature(rawBody, signature)) {
            logger_1.default.error('Invalid webhook signature', new Error('Signature verification failed'), {
                requestId,
                bodyPreview: rawBody.substring(0, 100),
                signaturePreview: signature.substring(0, 20)
            });
            res.status(401).json({ error: 'Invalid signature' });
            return;
        }
        // Validate payload structure
        if (!validateWebhookPayload(req.body)) {
            logger_1.default.error('Invalid webhook payload structure', new Error('Malformed payload'), { requestId });
            res.status(400).json({ error: 'Invalid payload structure' });
            return;
        }
        // Parse webhook payload
        const payload = req.body;
        const eventType = payload.meta.event_name;
        // Check for replay attacks
        // if (await checkReplayAttack(payload, requestId)) {
        //     logger.error('Replay attack detected', new Error('Duplicate webhook'), { requestId });
        //     res.status(409).json({ error: 'Duplicate webhook' });
        //     return;
        // }
        logger_1.default.info('Processing webhook event', {
            eventType,
            dataId: payload.data.id,
            requestId
        });
        // Route to appropriate handler
        await handleWebhookEvent(payload, requestId);
        res.status(200).json({
            success: true,
            message: 'Webhook processed successfully',
            requestId
        });
    }
    catch (error) {
        logger_1.default.error('Webhook processing error', error, { requestId });
        res.status(500).json({
            error: 'Internal server error',
            requestId
        });
    }
});
// Webhook processing tracking - moved to database for persistence across function instances
const WEBHOOK_EXPIRY_TIME = 5 * 60 * 1000; // 5 minutes
/**
 * Verify webhook signature from Lemonsqueezy
 */
function verifyWebhookSignature(payload, signature) {
    try {
        const webhookSecret = config_1.default.lemonsqueezy.webhookSecret;
        if (!webhookSecret) {
            logger_1.default.error('Webhook secret not configured', new Error('Missing webhook secret'));
            return false;
        }
        if (!signature) {
            logger_1.default.error('No signature provided', new Error('Missing signature'));
            return false;
        }
        // Generate expected signature using HMAC-SHA256
        const expectedSignature = crypto
            .createHmac('sha256', webhookSecret)
            .update(payload, 'utf8')
            .digest('hex');
        // LemonSqueezy might send signature with or without sha256= prefix
        const providedSignature = signature.startsWith('sha256=')
            ? signature.replace('sha256=', '')
            : signature;
        // Log for debugging
        logger_1.default.info('Signature verification details', {
            expectedLength: expectedSignature.length,
            providedLength: providedSignature.length,
            expectedSignature: expectedSignature.substring(0, 8) + '...',
            providedSignature: providedSignature.substring(0, 8) + '...',
            hasPrefix: signature.startsWith('sha256=')
        });
        if (providedSignature.length !== expectedSignature.length) {
            logger_1.default.error('Signature length mismatch', new Error('Invalid signature format'), {
                expected: expectedSignature.length,
                provided: providedSignature.length
            });
            return false;
        }
        // Use timing-safe comparison
        const isValid = crypto.timingSafeEqual(Buffer.from(expectedSignature, 'hex'), Buffer.from(providedSignature, 'hex'));
        logger_1.default.info('Signature verification result', { isValid });
        return isValid;
    }
    catch (error) {
        logger_1.default.error('Signature verification error', error);
        return false;
    }
}
/**
 * Check for replay attacks by tracking processed webhook IDs in database
 */
async function checkReplayAttack(payload, requestId) {
    try {
        // Create a unique identifier for this webhook
        const webhookId = `${payload.data.id}_${payload.meta.event_name}_${payload.data.attributes.created_at || payload.data.attributes.updated_at}`;
        logger_1.default.info('Checking for replay attack', {
            webhookId,
            eventName: payload.meta.event_name,
            dataId: payload.data.id,
            requestId
        });
        // Check if we've already processed this webhook using database
        const { data: existingWebhook, error: checkError } = await supabase_1.default
            .from('webhook_processing_log')
            .select('id, processed_at')
            .eq('webhook_id', webhookId)
            .single();
        if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows found
            logger_1.default.error('Error checking webhook processing log', checkError, { requestId });
            // In case of database error, allow the webhook to proceed but log the issue
            return false;
        }
        if (existingWebhook) {
            logger_1.default.error('Replay attack detected', new Error('Duplicate webhook'), {
                webhookId,
                existingProcessedAt: existingWebhook.processed_at,
                requestId
            });
            return true; // This is a replay attack
        }
        // Record this webhook as being processed
        const { error: insertError } = await supabase_1.default
            .from('webhook_processing_log')
            .insert({
            webhook_id: webhookId,
            event_name: payload.meta.event_name,
            data_id: payload.data.id,
            webhook_data: payload,
            processed_at: new Date().toISOString(),
            request_id: requestId
        });
        if (insertError) {
            logger_1.default.error('Failed to record webhook processing', insertError, { requestId });
            // If we can't record it, there might be a race condition
            // Check again if another instance already processed it
            const { data: raceCheck } = await supabase_1.default
                .from('webhook_processing_log')
                .select('id')
                .eq('webhook_id', webhookId)
                .single();
            if (raceCheck) {
                logger_1.default.warn('Race condition detected - webhook already processed by another instance', {
                    webhookId,
                    requestId
                });
                return true; // Treat as replay attack
            }
        }
        logger_1.default.info('Webhook marked as processing', {
            webhookId,
            requestId
        });
        return false; // Not a replay attack
    }
    catch (error) {
        logger_1.default.error('Error checking replay attack', error, { requestId });
        // In case of error, allow the webhook to proceed but log the issue
        return false;
    }
}
/**
 * Validate webhook payload structure
 */
function validateWebhookPayload(payload) {
    if (!payload || typeof payload !== 'object') {
        return false;
    }
    if (!payload.meta || !payload.meta.event_name) {
        return false;
    }
    if (!payload.data || !payload.data.id || !payload.data.type) {
        return false;
    }
    return true;
}
/**
 * Route webhook events to appropriate handlers
 */
async function handleWebhookEvent(payload, requestId) {
    const eventType = payload.meta.event_name;
    switch (eventType) {
        case WebhookEventType.ORDER_CREATED:
            await handleOrderCreated(payload, requestId);
            break;
        case WebhookEventType.SUBSCRIPTION_CREATED:
            await handleSubscriptionCreated(payload, requestId);
            break;
        case WebhookEventType.SUBSCRIPTION_UPDATED:
            await handleSubscriptionUpdated(payload, requestId);
            break;
        case WebhookEventType.SUBSCRIPTION_CANCELLED:
            await handleSubscriptionCancelled(payload, requestId);
            break;
        case WebhookEventType.SUBSCRIPTION_RESUMED:
            await handleSubscriptionResumed(payload, requestId);
            break;
        case WebhookEventType.SUBSCRIPTION_EXPIRED:
            await handleSubscriptionExpired(payload, requestId);
            break;
        case WebhookEventType.SUBSCRIPTION_PAUSED:
            await handleSubscriptionPaused(payload, requestId);
            break;
        case WebhookEventType.SUBSCRIPTION_UNPAUSED:
            await handleSubscriptionUnpaused(payload, requestId);
            break;
        default:
            logger_1.default.info('Unhandled webhook event type', { eventType, requestId });
    }
}
/**
 * Handle order created event (one-time payment)
 */
async function handleOrderCreated(payload, requestId) {
    const orderData = payload.data.attributes;
    const customData = payload.meta.custom_data;
    logger_1.default.info('Processing order created', {
        orderId: payload.data.id,
        orderNumber: orderData.order_number,
        total: orderData.total_usd,
        userId: customData === null || customData === void 0 ? void 0 : customData.user_id,
        requestId
    });
    // Extract user ID from custom data
    const userId = customData === null || customData === void 0 ? void 0 : customData.user_id;
    if (!userId) {
        logger_1.default.error('No user ID in order custom data', new Error('Missing user ID'), { requestId });
        return;
    }
    // Check if this order has already been processed
    const { data: existingPayment, error: checkError } = await supabase_1.default
        .from('payment_records')
        .select('id, credits_purchased, processed_at')
        .eq('lemonsqueezy_order_id', payload.data.id)
        .eq('user_id', userId)
        .eq('status', 'completed')
        .single();
    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows found
        logger_1.default.error('Error checking existing payment', checkError, { requestId });
        throw new Error(`Failed to check existing payment: ${checkError.message}`);
    }
    if (existingPayment) {
        logger_1.default.warn('Order already processed, skipping duplicate', {
            orderId: payload.data.id,
            userId,
            existingPaymentId: existingPayment.id,
            existingCredits: existingPayment.credits_purchased,
            processedAt: existingPayment.processed_at,
            requestId
        });
        return; // Skip processing duplicate order
    }
    // Determine credits based on variant ID
    const variantId = orderData.first_order_item.variant_id;
    const credits = getCreditsForVariant(variantId);
    if (credits === 0) {
        logger_1.default.error('Unknown variant ID', new Error(`Unknown variant: ${variantId}`), { requestId });
        return;
    }
    try {
        // Record payment in database
        const { error: paymentError } = await supabase_1.default
            .from('payment_records')
            .insert({
            user_id: userId,
            lemonsqueezy_order_id: payload.data.id,
            amount_usd: orderData.total_usd,
            credits_purchased: credits,
            status: 'completed',
            payment_method: `${orderData.first_order_item.product_name} - ${orderData.first_order_item.variant_name}`,
            webhook_data: payload,
            processed_at: new Date().toISOString()
        });
        if (paymentError) {
            throw new Error(`Failed to record payment: ${paymentError.message}`);
        }
        // Add credits to user account using the existing credit system
        const { data: creditResult, error: creditError } = await supabase_1.default.rpc('add_credits', {
            user_uuid: userId,
            credits_amount: credits,
            credit_source: 'purchase',
            description: `Purchase: ${orderData.first_order_item.variant_name}`
        });
        if (creditError) {
            throw new Error(`Failed to add credits: ${creditError.message}`);
        }
        if (!creditResult) {
            throw new Error('Failed to add credits - database operation returned false');
        }
        logger_1.default.info('Order processed successfully', {
            orderId: payload.data.id,
            userId,
            credits,
            requestId
        });
    }
    catch (error) {
        logger_1.default.error('Error processing order', error, {
            orderId: payload.data.id,
            userId,
            requestId
        });
        throw error;
    }
}
/**
 * Handle subscription created event
 */
async function handleSubscriptionCreated(payload, requestId) {
    const subscriptionData = payload.data.attributes;
    const customData = payload.meta.custom_data;
    logger_1.default.info('Processing subscription created', {
        subscriptionId: payload.data.id,
        userId: customData === null || customData === void 0 ? void 0 : customData.user_id,
        variantId: subscriptionData.variant_id,
        requestId
    });
    const userId = customData === null || customData === void 0 ? void 0 : customData.user_id;
    if (!userId) {
        logger_1.default.error('No user ID in subscription custom data', new Error('Missing user ID'), { requestId });
        return;
    }
    // Check if this subscription has already been processed
    const { data: existingPayment, error: checkError } = await supabase_1.default
        .from('payment_records')
        .select('id, credits_purchased, processed_at')
        .eq('lemonsqueezy_subscription_id', payload.data.id)
        .eq('user_id', userId)
        .eq('status', 'completed')
        .single();
    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows found
        logger_1.default.error('Error checking existing subscription payment', checkError, { requestId });
        throw new Error(`Failed to check existing subscription payment: ${checkError.message}`);
    }
    if (existingPayment) {
        logger_1.default.warn('Subscription already processed, skipping duplicate', {
            subscriptionId: payload.data.id,
            userId,
            existingPaymentId: existingPayment.id,
            existingCredits: existingPayment.credits_purchased,
            processedAt: existingPayment.processed_at,
            requestId
        });
        return; // Skip processing duplicate subscription
    }
    const credits = getCreditsForVariant(subscriptionData.variant_id);
    const planName = getPlanNameForVariant(subscriptionData.variant_id);
    const priceUsd = getPriceForVariant(subscriptionData.variant_id);
    try {
        // Create or update subscription record
        const { error: subscriptionError } = await supabase_1.default
            .from('subscriptions')
            .upsert({
            user_id: userId,
            lemonsqueezy_subscription_id: payload.data.id,
            lemonsqueezy_variant_id: subscriptionData.variant_id.toString(),
            status: 'active',
            plan_name: planName,
            plan_credits: credits,
            current_period_start: subscriptionData.created_at,
            current_period_end: subscriptionData.renews_at,
            cancel_at_period_end: false
        });
        if (subscriptionError) {
            throw new Error(`Failed to create subscription: ${subscriptionError.message}`);
        }
        // Record payment for subscription with actual price
        const { data: paymentRecord, error: paymentError } = await supabase_1.default
            .from('payment_records')
            .insert({
            user_id: userId,
            lemonsqueezy_order_id: subscriptionData.order_id.toString(),
            lemonsqueezy_subscription_id: payload.data.id,
            amount_usd: priceUsd, // Use actual subscription price based on variant
            credits_purchased: credits,
            status: 'completed',
            payment_method: `Subscription: ${planName}`,
            webhook_data: payload,
            processed_at: new Date().toISOString()
        })
            .select()
            .single();
        if (paymentError) {
            logger_1.default.error('Failed to record subscription payment', paymentError, { requestId });
            // Don't continue if payment record fails - this prevents duplicate processing
            throw new Error(`Failed to record subscription payment: ${paymentError.message}`);
        }
        // Add initial credits using the existing credit system
        const { data: creditResult, error: creditError } = await supabase_1.default.rpc('add_credits', {
            user_uuid: userId,
            credits_amount: credits,
            credit_source: 'subscription',
            description: `Subscription: ${planName}`
        });
        if (creditError) {
            throw new Error(`Failed to add subscription credits: ${creditError.message}`);
        }
        if (!creditResult) {
            throw new Error('Failed to add subscription credits - database operation returned false');
        }
        logger_1.default.info('Subscription created successfully', {
            subscriptionId: payload.data.id,
            userId,
            planName,
            credits,
            requestId
        });
    }
    catch (error) {
        logger_1.default.error('Error processing subscription creation', error, {
            subscriptionId: payload.data.id,
            userId,
            requestId
        });
        throw error;
    }
}
/**
 * Handle subscription updated event
 */
async function handleSubscriptionUpdated(payload, requestId) {
    const subscriptionData = payload.data.attributes;
    const customData = payload.meta.custom_data;
    logger_1.default.info('Processing subscription updated', {
        subscriptionId: payload.data.id,
        status: subscriptionData.status,
        requestId
    });
    try {
        // Get existing subscription to check for renewal
        const { data: existingSubscription, error: fetchError } = await supabase_1.default
            .from('subscriptions')
            .select('*')
            .eq('lemonsqueezy_subscription_id', payload.data.id)
            .single();
        if (fetchError) {
            logger_1.default.error('Failed to fetch existing subscription', fetchError, { requestId });
            // Continue with update anyway
        }
        // Check if this is a renewal (period end date changed and status is active)
        // More strict renewal detection to prevent false positives
        const currentPeriodEnd = new Date(existingSubscription.current_period_end);
        const newPeriodEnd = new Date(subscriptionData.renews_at);
        const timeDifference = newPeriodEnd.getTime() - currentPeriodEnd.getTime();
        const isRenewal = existingSubscription &&
            subscriptionData.status === 'active' &&
            newPeriodEnd > currentPeriodEnd &&
            // Ensure the time difference is reasonable (at least 1 day, max 40 days)
            timeDifference > (24 * 60 * 60 * 1000) &&
            timeDifference < (40 * 24 * 60 * 60 * 1000) &&
            // Ensure this isn't the initial subscription creation
            existingSubscription.status === 'active';
        logger_1.default.info('Renewal check details', {
            subscriptionId: payload.data.id,
            existingStatus: existingSubscription === null || existingSubscription === void 0 ? void 0 : existingSubscription.status,
            currentPeriodEnd: currentPeriodEnd.toISOString(),
            newPeriodEnd: newPeriodEnd.toISOString(),
            timeDifferenceHours: Math.round(timeDifference / (60 * 60 * 1000)),
            isRenewal,
            requestId
        });
        // Update subscription record
        const { error } = await supabase_1.default
            .from('subscriptions')
            .update({
            status: subscriptionData.status === 'active' ? 'active' :
                subscriptionData.status === 'cancelled' ? 'cancelled' :
                    subscriptionData.status === 'expired' ? 'expired' : 'past_due',
            current_period_start: subscriptionData.created_at,
            current_period_end: subscriptionData.renews_at,
            cancel_at_period_end: subscriptionData.cancelled,
            updated_at: new Date().toISOString()
        })
            .eq('lemonsqueezy_subscription_id', payload.data.id);
        if (error) {
            throw new Error(`Failed to update subscription: ${error.message}`);
        }
        // If this is a renewal, add credits for the new period
        if (isRenewal && existingSubscription) {
            const userId = (customData === null || customData === void 0 ? void 0 : customData.user_id) || existingSubscription.user_id;
            const credits = existingSubscription.plan_credits;
            // Check if we've already processed this renewal period
            const renewalDescription = `Subscription Renewal: ${existingSubscription.plan_name} (${subscriptionData.renews_at})`;
            const { data: existingRenewal, error: renewalCheckError } = await supabase_1.default
                .from('credit_transactions')
                .select('id, created_at')
                .eq('user_id', userId)
                .eq('source', 'subscription')
                .ilike('description', `%${subscriptionData.renews_at}%`)
                .single();
            if (renewalCheckError && renewalCheckError.code !== 'PGRST116') {
                logger_1.default.error('Error checking existing renewal', renewalCheckError, { requestId });
            }
            if (existingRenewal) {
                logger_1.default.warn('Renewal already processed, skipping duplicate', {
                    subscriptionId: payload.data.id,
                    userId,
                    existingRenewalId: existingRenewal.id,
                    existingRenewalDate: existingRenewal.created_at,
                    requestId
                });
            }
            else {
                logger_1.default.info('Processing subscription renewal', {
                    subscriptionId: payload.data.id,
                    userId,
                    credits,
                    renewalPeriod: subscriptionData.renews_at,
                    requestId
                });
                // Add renewal credits using the existing credit system
                const { data: creditResult, error: creditError } = await supabase_1.default.rpc('add_credits', {
                    user_uuid: userId,
                    credits_amount: credits,
                    credit_source: 'subscription',
                    description: renewalDescription
                });
                if (creditError) {
                    logger_1.default.error('Failed to add renewal credits', creditError, { requestId });
                    // Don't throw here - subscription update succeeded
                }
                else if (!creditResult) {
                    logger_1.default.error('Failed to add renewal credits - database operation returned false', new Error('Credit operation failed'), { requestId });
                    // Don't throw here - subscription update succeeded
                }
                else {
                    logger_1.default.info('Renewal credits added successfully', {
                        subscriptionId: payload.data.id,
                        userId,
                        credits,
                        requestId
                    });
                }
            }
        }
        logger_1.default.info('Subscription updated successfully', {
            subscriptionId: payload.data.id,
            status: subscriptionData.status,
            isRenewal,
            requestId
        });
    }
    catch (error) {
        logger_1.default.error('Error processing subscription update', error, {
            subscriptionId: payload.data.id,
            requestId
        });
        throw error;
    }
}
/**
 * Handle subscription cancelled event
 */
async function handleSubscriptionCancelled(payload, requestId) {
    const subscriptionData = payload.data.attributes;
    logger_1.default.info('Processing subscription cancelled', {
        subscriptionId: payload.data.id,
        requestId
    });
    try {
        // Update subscription status
        const { error } = await supabase_1.default
            .from('subscriptions')
            .update({
            status: 'cancelled',
            cancel_at_period_end: true,
            updated_at: new Date().toISOString()
        })
            .eq('lemonsqueezy_subscription_id', payload.data.id);
        if (error) {
            throw new Error(`Failed to cancel subscription: ${error.message}`);
        }
        logger_1.default.info('Subscription cancelled successfully', {
            subscriptionId: payload.data.id,
            requestId
        });
    }
    catch (error) {
        logger_1.default.error('Error processing subscription cancellation', error, {
            subscriptionId: payload.data.id,
            requestId
        });
        throw error;
    }
}
/**
 * Handle subscription resumed event
 */
async function handleSubscriptionResumed(payload, requestId) {
    logger_1.default.info('Processing subscription resumed', {
        subscriptionId: payload.data.id,
        requestId
    });
    try {
        // Update subscription status
        const { error } = await supabase_1.default
            .from('subscriptions')
            .update({
            status: 'active',
            cancel_at_period_end: false,
            updated_at: new Date().toISOString()
        })
            .eq('lemonsqueezy_subscription_id', payload.data.id);
        if (error) {
            throw new Error(`Failed to resume subscription: ${error.message}`);
        }
        logger_1.default.info('Subscription resumed successfully', {
            subscriptionId: payload.data.id,
            requestId
        });
    }
    catch (error) {
        logger_1.default.error('Error processing subscription resume', error, {
            subscriptionId: payload.data.id,
            requestId
        });
        throw error;
    }
}
/**
 * Handle subscription expired event
 */
async function handleSubscriptionExpired(payload, requestId) {
    logger_1.default.info('Processing subscription expired', {
        subscriptionId: payload.data.id,
        requestId
    });
    try {
        // Update subscription status
        const { error } = await supabase_1.default
            .from('subscriptions')
            .update({
            status: 'expired',
            updated_at: new Date().toISOString()
        })
            .eq('lemonsqueezy_subscription_id', payload.data.id);
        if (error) {
            throw new Error(`Failed to expire subscription: ${error.message}`);
        }
        logger_1.default.info('Subscription expired successfully', {
            subscriptionId: payload.data.id,
            requestId
        });
    }
    catch (error) {
        logger_1.default.error('Error processing subscription expiration', error, {
            subscriptionId: payload.data.id,
            requestId
        });
        throw error;
    }
}
/**
 * Handle subscription paused event
 */
async function handleSubscriptionPaused(payload, requestId) {
    logger_1.default.info('Processing subscription paused', {
        subscriptionId: payload.data.id,
        requestId
    });
    try {
        // Update subscription status
        const { error } = await supabase_1.default
            .from('subscriptions')
            .update({
            status: 'past_due', // Use past_due for paused subscriptions
            updated_at: new Date().toISOString()
        })
            .eq('lemonsqueezy_subscription_id', payload.data.id);
        if (error) {
            throw new Error(`Failed to pause subscription: ${error.message}`);
        }
        logger_1.default.info('Subscription paused successfully', {
            subscriptionId: payload.data.id,
            requestId
        });
    }
    catch (error) {
        logger_1.default.error('Error processing subscription pause', error, {
            subscriptionId: payload.data.id,
            requestId
        });
        throw error;
    }
}
/**
 * Handle subscription unpaused event
 */
async function handleSubscriptionUnpaused(payload, requestId) {
    logger_1.default.info('Processing subscription unpaused', {
        subscriptionId: payload.data.id,
        requestId
    });
    try {
        // Update subscription status
        const { error } = await supabase_1.default
            .from('subscriptions')
            .update({
            status: 'active',
            updated_at: new Date().toISOString()
        })
            .eq('lemonsqueezy_subscription_id', payload.data.id);
        if (error) {
            throw new Error(`Failed to unpause subscription: ${error.message}`);
        }
        logger_1.default.info('Subscription unpaused successfully', {
            subscriptionId: payload.data.id,
            requestId
        });
    }
    catch (error) {
        logger_1.default.error('Error processing subscription unpause', error, {
            subscriptionId: payload.data.id,
            requestId
        });
        throw error;
    }
}
/**
 * Get credits amount for a variant ID
 */
function getCreditsForVariant(variantId) {
    // These should match the variant IDs configured in environment
    const variantCreditsMap = {
        // Basic plan - $9.9 - 1200 credits
        [config_1.default.lemonsqueezy.basicVariantId || '']: 1200,
        // Pro plan - $19.9 - 3000 credits  
        [config_1.default.lemonsqueezy.proVariantId || '']: 3000,
        // Premium plan - $39.9 - 7200 credits
        [config_1.default.lemonsqueezy.premiumVariantId || '']: 7200
    };
    return variantCreditsMap[variantId.toString()] || 0;
}
/**
 * Get plan name for a variant ID
 */
function getPlanNameForVariant(variantId) {
    const variantPlanMap = {
        [config_1.default.lemonsqueezy.basicVariantId || '']: 'Basic Plan',
        [config_1.default.lemonsqueezy.proVariantId || '']: 'Pro Plan',
        [config_1.default.lemonsqueezy.premiumVariantId || '']: 'Premium Plan'
    };
    return variantPlanMap[variantId.toString()] || 'Unknown Plan';
}
/**
 * Get price (in USD) for a variant ID
 */
function getPriceForVariant(variantId) {
    const variantPriceMap = {
        // Basic plan - $9.9
        [config_1.default.lemonsqueezy.basicVariantId || '']: 9.9,
        // Pro plan - $19.9
        [config_1.default.lemonsqueezy.proVariantId || '']: 19.9,
        // Premium plan - $39.9
        [config_1.default.lemonsqueezy.premiumVariantId || '']: 39.9
    };
    return variantPriceMap[variantId.toString()] || 0;
}
