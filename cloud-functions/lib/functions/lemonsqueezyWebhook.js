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
    WebhookEventType["SUBSCRIPTION_PAYMENT_SUCCESS"] = "subscription_payment_success";
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
        // Check if this webhook was already processed
        if (await isWebhookAlreadyProcessed(payload, requestId)) {
            logger_1.default.error('Replay attack detected', new Error('Duplicate webhook'), { requestId });
            res.status(409).json({ error: 'Duplicate webhook' });
            return;
        }
        logger_1.default.info('Processing webhook event', {
            eventType,
            dataId: payload.data.id,
            requestId
        });
        // Route to appropriate handler
        await handleWebhookEvent(payload, requestId);
        // Only record as processed after successful handling
        await recordWebhookAsProcessed(payload, requestId);
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
 * Check if webhook was already processed (read-only check)
 */
async function isWebhookAlreadyProcessed(payload, requestId) {
    try {
        // Create a unique identifier for this webhook
        const webhookId = `${payload.data.id}_${payload.meta.event_name}_${payload.data.attributes.created_at || payload.data.attributes.updated_at}`;
        logger_1.default.info('Checking if webhook already processed', {
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
            logger_1.default.warn('Webhook already processed', {
                webhookId,
                existingProcessedAt: existingWebhook.processed_at,
                requestId
            });
            return true; // This webhook was already processed
        }
        return false; // Not processed yet
    }
    catch (error) {
        logger_1.default.error('Error checking if webhook was processed', error, { requestId });
        // In case of error, allow the webhook to proceed but log the issue
        return false;
    }
}
/**
 * Record webhook as successfully processed (call this AFTER successful handling)
 */
async function recordWebhookAsProcessed(payload, requestId) {
    try {
        // Create a unique identifier for this webhook
        const webhookId = `${payload.data.id}_${payload.meta.event_name}_${payload.data.attributes.created_at || payload.data.attributes.updated_at}`;
        logger_1.default.info('Recording webhook as processed', {
            webhookId,
            requestId
        });
        // Record this webhook as successfully processed
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
            // If insert fails due to unique constraint violation, it means another instance processed it
            // This is fine - log and continue
            logger_1.default.warn('Webhook already recorded by another instance (race condition)', {
                webhookId,
                error: insertError.message,
                requestId
            });
        }
        else {
            logger_1.default.info('Webhook successfully recorded as processed', {
                webhookId,
                requestId
            });
        }
    }
    catch (error) {
        // Don't throw error here - webhook was already processed successfully
        // Just log the recording failure
        logger_1.default.error('Failed to record webhook as processed (non-critical)', error, { requestId });
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
        case WebhookEventType.SUBSCRIPTION_PAYMENT_SUCCESS:
            await handleSubscriptionPaymentSuccess(payload, requestId);
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
 * Note: For subscription orders, this event is followed by subscription_created
 * We skip subscription orders here and let subscription_created handle them
 */
async function handleOrderCreated(payload, requestId) {
    const orderData = payload.data.attributes;
    const customData = payload.meta.custom_data;
    logger_1.default.info('Processing order created', {
        orderId: payload.data.id,
        orderNumber: orderData.order_number,
        total: orderData.total_usd,
        userId: customData === null || customData === void 0 ? void 0 : customData.user_id,
        productId: orderData.first_order_item.product_id,
        variantId: orderData.first_order_item.variant_id,
        requestId
    });
    // Extract user ID from custom data
    const userId = customData === null || customData === void 0 ? void 0 : customData.user_id;
    if (!userId) {
        logger_1.default.error('No user ID in order custom data', new Error('Missing user ID'), { requestId });
        return;
    }
    // Filter by product ID - only process orders for the configured product
    const productId = orderData.first_order_item.product_id;
    const configuredProductId = config_1.default.lemonsqueezy.productId;
    if ((productId === null || productId === void 0 ? void 0 : productId.toString()) !== configuredProductId) {
        logger_1.default.info('Order is not for configured product, skipping', {
            orderId: payload.data.id,
            productId,
            configuredProductId,
            productName: orderData.first_order_item.product_name,
            requestId
        });
        return;
    }
    // Check if this is a subscription order by checking the variant
    // Subscription orders will be handled by subscription_created event
    const variantId = orderData.first_order_item.variant_id;
    const isSubscriptionVariant = [
        config_1.default.lemonsqueezy.basicVariantId,
        config_1.default.lemonsqueezy.proVariantId,
        config_1.default.lemonsqueezy.premiumVariantId
    ].includes((variantId === null || variantId === void 0 ? void 0 : variantId.toString()) || '');
    if (isSubscriptionVariant) {
        logger_1.default.info('Order is for subscription product, will be handled by subscription_created event', {
            orderId: payload.data.id,
            variantId,
            userId,
            requestId
        });
        return; // Skip processing, let subscription_created handle it
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
    // Determine credits based on variant ID (variantId already declared above)
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
 * Creates subscription record ONLY - payment and credits are handled by subscription_payment_success
 */
async function handleSubscriptionCreated(payload, requestId) {
    const subscriptionData = payload.data.attributes;
    const customData = payload.meta.custom_data;
    logger_1.default.info('Processing subscription created', {
        subscriptionId: payload.data.id,
        userId: customData === null || customData === void 0 ? void 0 : customData.user_id,
        productId: subscriptionData.product_id,
        variantId: subscriptionData.variant_id,
        requestId
    });
    const userId = customData === null || customData === void 0 ? void 0 : customData.user_id;
    if (!userId) {
        logger_1.default.error('No user ID in subscription custom data', new Error('Missing user ID'), { requestId });
        return;
    }
    // Filter by product ID - only process subscriptions for the configured product
    const productId = subscriptionData.product_id;
    const configuredProductId = config_1.default.lemonsqueezy.productId;
    if ((productId === null || productId === void 0 ? void 0 : productId.toString()) !== configuredProductId) {
        logger_1.default.info('Subscription is not for configured product, skipping', {
            subscriptionId: payload.data.id,
            productId,
            configuredProductId,
            productName: subscriptionData.product_name,
            requestId
        });
        return;
    }
    // Check if this subscription already exists
    const { data: existingSubscription, error: subCheckError } = await supabase_1.default
        .from('subscriptions')
        .select('id, lemonsqueezy_subscription_id, user_id')
        .eq('lemonsqueezy_subscription_id', payload.data.id)
        .eq('user_id', userId)
        .single();
    if (subCheckError && subCheckError.code !== 'PGRST116') {
        logger_1.default.error('Error checking existing subscription', subCheckError, { requestId });
        throw new Error(`Failed to check existing subscription: ${subCheckError.message}`);
    }
    if (existingSubscription) {
        logger_1.default.info('Subscription already exists, skipping creation', {
            subscriptionId: payload.data.id,
            userId,
            requestId
        });
        return;
    }
    const credits = getCreditsForVariant(subscriptionData.variant_id);
    const planName = getPlanNameForVariant(subscriptionData.variant_id);
    try {
        // Create subscription record
        const { error: subscriptionError } = await supabase_1.default
            .from('subscriptions')
            .insert({
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
        logger_1.default.info('Subscription record created successfully (payment and credits will be handled by subscription_payment_success)', {
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
 * Updates subscription status and period - credits are handled by subscription_payment_success
 */
async function handleSubscriptionUpdated(payload, requestId) {
    const subscriptionData = payload.data.attributes;
    logger_1.default.info('Processing subscription updated', {
        subscriptionId: payload.data.id,
        productId: subscriptionData.product_id,
        status: subscriptionData.status,
        requestId
    });
    // Filter by product ID - only process subscriptions for the configured product
    const productId = subscriptionData.product_id;
    const configuredProductId = config_1.default.lemonsqueezy.productId;
    if ((productId === null || productId === void 0 ? void 0 : productId.toString()) !== configuredProductId) {
        logger_1.default.info('Subscription update is not for configured product, skipping', {
            subscriptionId: payload.data.id,
            productId,
            configuredProductId,
            requestId
        });
        return;
    }
    try {
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
        logger_1.default.info('Subscription updated successfully (renewal credits will be handled by subscription_payment_success)', {
            subscriptionId: payload.data.id,
            status: subscriptionData.status,
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
 * Handle subscription payment success event
 * This fires for both initial subscription and renewals
 * This is the ONLY place where subscription credits are added
 */
async function handleSubscriptionPaymentSuccess(payload, requestId) {
    var _a, _b;
    // Note: subscription_payment_success payload is of type "subscription-invoices"
    const invoiceData = payload.data.attributes;
    const customData = payload.meta.custom_data;
    // Extract IDs: data.id is invoice ID, attributes.subscription_id is the actual subscription ID
    const invoiceId = payload.data.id;
    const subscriptionId = (_a = invoiceData.subscription_id) === null || _a === void 0 ? void 0 : _a.toString();
    logger_1.default.info('Processing subscription payment success', {
        invoiceId,
        subscriptionId,
        userId: customData === null || customData === void 0 ? void 0 : customData.user_id,
        requestId
    });
    const userId = customData === null || customData === void 0 ? void 0 : customData.user_id;
    if (!userId) {
        logger_1.default.error('No user ID in subscription payment custom data', new Error('Missing user ID'), { requestId });
        return;
    }
    if (!subscriptionId) {
        logger_1.default.error('No subscription ID in payment webhook', new Error('Missing subscription ID'), { requestId });
        return;
    }
    try {
        // Check if this payment has already been recorded (idempotency check using invoice ID)
        const { data: existingPayment, error: payCheckError } = await supabase_1.default
            .from('payment_records')
            .select('id, created_at, credits_purchased')
            .eq('lemonsqueezy_subscription_id', subscriptionId)
            .eq('lemonsqueezy_order_id', invoiceId)
            .eq('user_id', userId)
            .single();
        if (payCheckError && payCheckError.code !== 'PGRST116') {
            logger_1.default.error('Error checking existing payment', payCheckError, { requestId });
        }
        if (existingPayment) {
            logger_1.default.info('Payment already recorded, skipping duplicate', {
                invoiceId,
                subscriptionId,
                existingPaymentId: existingPayment.id,
                existingPaymentDate: existingPayment.created_at,
                existingCredits: existingPayment.credits_purchased,
                requestId
            });
            return;
        }
        // Get subscription info (should exist from subscription_created, but handle race condition)
        let { data: subscription, error: subError } = await supabase_1.default
            .from('subscriptions')
            .select('*')
            .eq('lemonsqueezy_subscription_id', subscriptionId)
            .single();
        if (subError || !subscription) {
            // Rare case: payment arrived before subscription_created
            // Wait a bit and retry once
            logger_1.default.warn('Subscription not found for payment, waiting and retrying...', {
                subscriptionId,
                error: subError === null || subError === void 0 ? void 0 : subError.message,
                requestId
            });
            await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
            const retryResult = await supabase_1.default
                .from('subscriptions')
                .select('*')
                .eq('lemonsqueezy_subscription_id', subscriptionId)
                .single();
            if (retryResult.error || !retryResult.data) {
                // Subscription not found even after retry
                // This could mean:
                // 1. The subscription was filtered out by product_id check in subscription_created
                // 2. There was a genuine error
                // We skip processing and return successfully to avoid webhook retries
                logger_1.default.info('Subscription not found in database (likely filtered by product_id), skipping payment processing', {
                    subscriptionId,
                    invoiceId,
                    error: (_b = retryResult.error) === null || _b === void 0 ? void 0 : _b.message,
                    requestId
                });
                return;
            }
            // Use the retried subscription
            subscription = retryResult.data;
        }
        const credits = subscription.plan_credits;
        const planName = subscription.plan_name;
        const priceUsd = getPriceForVariant(parseInt(subscription.lemonsqueezy_variant_id));
        // Determine if this is initial or renewal (for logging/description)
        const { data: existingPayments, error: countError } = await supabase_1.default
            .from('payment_records')
            .select('id')
            .eq('lemonsqueezy_subscription_id', subscriptionId)
            .eq('user_id', userId);
        const isInitialPayment = !existingPayments || existingPayments.length === 0;
        const paymentType = isInitialPayment ? 'Initial Subscription' : 'Subscription Renewal';
        logger_1.default.info(`Processing subscription payment (${paymentType})`, {
            invoiceId,
            subscriptionId,
            userId,
            credits,
            isInitialPayment,
            requestId
        });
        // Record payment (use invoice ID as order ID)
        const { error: paymentError } = await supabase_1.default
            .from('payment_records')
            .insert({
            user_id: userId,
            lemonsqueezy_order_id: invoiceId,
            lemonsqueezy_subscription_id: subscriptionId,
            amount_usd: priceUsd,
            credits_purchased: credits,
            status: 'completed',
            payment_method: `${paymentType}: ${planName}`,
            webhook_data: payload,
            processed_at: new Date().toISOString()
        });
        if (paymentError) {
            logger_1.default.error('Failed to record payment', paymentError, { requestId });
            throw new Error(`Failed to record payment: ${paymentError.message}`);
        }
        // Add credits
        const { data: creditResult, error: creditError } = await supabase_1.default.rpc('add_credits', {
            user_uuid: userId,
            credits_amount: credits,
            credit_source: 'subscription',
            description: `${paymentType}: ${planName}`
        });
        if (creditError) {
            logger_1.default.error('Failed to add credits', creditError, { requestId });
            throw new Error(`Failed to add credits: ${creditError.message}`);
        }
        if (!creditResult) {
            throw new Error('Failed to add credits - database operation returned false');
        }
        logger_1.default.info(`Subscription payment processed successfully (${paymentType})`, {
            invoiceId,
            subscriptionId,
            userId,
            credits,
            isInitialPayment,
            requestId
        });
    }
    catch (error) {
        logger_1.default.error('Error processing subscription payment', error, {
            invoiceId,
            subscriptionId,
            userId,
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
        productId: subscriptionData.product_id,
        requestId
    });
    // Filter by product ID - only process subscriptions for the configured product
    const productId = subscriptionData.product_id;
    const configuredProductId = config_1.default.lemonsqueezy.productId;
    if ((productId === null || productId === void 0 ? void 0 : productId.toString()) !== configuredProductId) {
        logger_1.default.info('Subscription cancellation is not for configured product, skipping', {
            subscriptionId: payload.data.id,
            productId,
            configuredProductId,
            requestId
        });
        return;
    }
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
    const subscriptionData = payload.data.attributes;
    logger_1.default.info('Processing subscription resumed', {
        subscriptionId: payload.data.id,
        productId: subscriptionData.product_id,
        requestId
    });
    // Filter by product ID - only process subscriptions for the configured product
    const productId = subscriptionData.product_id;
    const configuredProductId = config_1.default.lemonsqueezy.productId;
    if ((productId === null || productId === void 0 ? void 0 : productId.toString()) !== configuredProductId) {
        logger_1.default.info('Subscription resume is not for configured product, skipping', {
            subscriptionId: payload.data.id,
            productId,
            configuredProductId,
            requestId
        });
        return;
    }
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
    const subscriptionData = payload.data.attributes;
    logger_1.default.info('Processing subscription expired', {
        subscriptionId: payload.data.id,
        productId: subscriptionData.product_id,
        requestId
    });
    // Filter by product ID - only process subscriptions for the configured product
    const productId = subscriptionData.product_id;
    const configuredProductId = config_1.default.lemonsqueezy.productId;
    if ((productId === null || productId === void 0 ? void 0 : productId.toString()) !== configuredProductId) {
        logger_1.default.info('Subscription expiration is not for configured product, skipping', {
            subscriptionId: payload.data.id,
            productId,
            configuredProductId,
            requestId
        });
        return;
    }
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
    const subscriptionData = payload.data.attributes;
    logger_1.default.info('Processing subscription paused', {
        subscriptionId: payload.data.id,
        productId: subscriptionData.product_id,
        requestId
    });
    // Filter by product ID - only process subscriptions for the configured product
    const productId = subscriptionData.product_id;
    const configuredProductId = config_1.default.lemonsqueezy.productId;
    if ((productId === null || productId === void 0 ? void 0 : productId.toString()) !== configuredProductId) {
        logger_1.default.info('Subscription pause is not for configured product, skipping', {
            subscriptionId: payload.data.id,
            productId,
            configuredProductId,
            requestId
        });
        return;
    }
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
    const subscriptionData = payload.data.attributes;
    logger_1.default.info('Processing subscription unpaused', {
        subscriptionId: payload.data.id,
        productId: subscriptionData.product_id,
        requestId
    });
    // Filter by product ID - only process subscriptions for the configured product
    const productId = subscriptionData.product_id;
    const configuredProductId = config_1.default.lemonsqueezy.productId;
    if ((productId === null || productId === void 0 ? void 0 : productId.toString()) !== configuredProductId) {
        logger_1.default.info('Subscription unpause is not for configured product, skipping', {
            subscriptionId: payload.data.id,
            productId,
            configuredProductId,
            requestId
        });
        return;
    }
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
