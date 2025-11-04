/**
 * Lemonsqueezy Webhook Handler
 * 
 * Handles payment events from Lemonsqueezy and processes credit additions
 * and subscription management.
 */

import * as functions from 'firebase-functions/v1';
import * as crypto from 'crypto';
import config from '../utils/config';
import logger from '../utils/logger';
import supabase from '../utils/supabase';

// Webhook event types we handle
export enum WebhookEventType {
    ORDER_CREATED = 'order_created',
    SUBSCRIPTION_CREATED = 'subscription_created',
    SUBSCRIPTION_UPDATED = 'subscription_updated',
    SUBSCRIPTION_PAYMENT_SUCCESS = 'subscription_payment_success',
    SUBSCRIPTION_CANCELLED = 'subscription_cancelled',
    SUBSCRIPTION_RESUMED = 'subscription_resumed',
    SUBSCRIPTION_EXPIRED = 'subscription_expired',
    SUBSCRIPTION_PAUSED = 'subscription_paused',
    SUBSCRIPTION_UNPAUSED = 'subscription_unpaused'
}

// Lemonsqueezy webhook payload interfaces
interface WebhookPayload {
    meta: {
        event_name: string;
        custom_data?: {
            user_id?: string;
            plan_id?: string;
        };
    };
    data: {
        id: string;
        type: string;
        attributes: any;
        relationships?: any;
    };
}

interface OrderAttributes {
    store_id: number;
    customer_id: number;
    identifier: string;
    order_number: number;
    user_name: string;
    user_email: string;
    currency: string;
    currency_rate: string;
    subtotal: number;
    discount_total: number;
    tax: number;
    total: number;
    subtotal_usd: number;
    discount_total_usd: number;
    tax_usd: number;
    total_usd: number;
    tax_name: string;
    tax_rate: string;
    status: string;
    status_formatted: string;
    refunded: boolean;
    refunded_at: string | null;
    subtotal_formatted: string;
    discount_total_formatted: string;
    tax_formatted: string;
    total_formatted: string;
    first_order_item: {
        id: number;
        order_id: number;
        product_id: number;
        variant_id: number;
        product_name: string;
        variant_name: string;
        price: number;
        created_at: string;
        updated_at: string;
    };
    urls: {
        receipt: string;
    };
    created_at: string;
    updated_at: string;
}

interface SubscriptionAttributes {
    store_id: number;
    customer_id: number;
    order_id: number;
    order_item_id: number;
    product_id: number;
    variant_id: number;
    product_name: string;
    variant_name: string;
    user_name: string;
    user_email: string;
    status: string;
    status_formatted: string;
    card_brand: string;
    card_last_four: string;
    pause: any;
    cancelled: boolean;
    trial_ends_at: string | null;
    billing_anchor: number;
    first_subscription_item: {
        id: number;
        subscription_id: number;
        price_id: number;
        quantity: number;
        created_at: string;
        updated_at: string;
    };
    urls: {
        update_payment_method: string;
        customer_portal: string;
    };
    renews_at: string;
    ends_at: string | null;
    created_at: string;
    updated_at: string;
}

/**
 * Main webhook handler function
 */
export const lemonsqueezyWebhook = functions
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
        logger.info('Received Lemonsqueezy webhook', { requestId });

        try {
            // Get raw body for signature verification
            // Use req.rawBody if available, otherwise fallback to JSON.stringify
            const rawBody = req.rawBody ? req.rawBody.toString('utf8') : JSON.stringify(req.body);
            const signature = req.get('X-Signature') || '';

            logger.info('Webhook signature verification details', {
                hasRawBody: !!req.rawBody,
                bodyLength: rawBody.length,
                signaturePresent: !!signature,
                requestId
            });

            // Verify webhook signature
            if (!verifyWebhookSignature(rawBody, signature)) {
                logger.error('Invalid webhook signature', new Error('Signature verification failed'), {
                    requestId,
                    bodyPreview: rawBody.substring(0, 100),
                    signaturePreview: signature.substring(0, 20)
                });
                res.status(401).json({ error: 'Invalid signature' });
                return;
            }

            // Validate payload structure
            if (!validateWebhookPayload(req.body)) {
                logger.error('Invalid webhook payload structure', new Error('Malformed payload'), { requestId });
                res.status(400).json({ error: 'Invalid payload structure' });
                return;
            }

            // Parse webhook payload
            const payload: WebhookPayload = req.body;
            const eventType = payload.meta.event_name;

            // Check if this webhook was already processed
            if (await isWebhookAlreadyProcessed(payload, requestId)) {
                logger.error('Replay attack detected', new Error('Duplicate webhook'), { requestId });
                res.status(409).json({ error: 'Duplicate webhook' });
                return;
            }

            logger.info('Processing webhook event', {
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

        } catch (error) {
            logger.error('Webhook processing error', error as Error, { requestId });
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
function verifyWebhookSignature(payload: string, signature: string): boolean {
    try {
        const webhookSecret = config.lemonsqueezy.webhookSecret;

        if (!webhookSecret) {
            logger.error('Webhook secret not configured', new Error('Missing webhook secret'));
            return false;
        }

        if (!signature) {
            logger.error('No signature provided', new Error('Missing signature'));
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
        logger.info('Signature verification details', {
            expectedLength: expectedSignature.length,
            providedLength: providedSignature.length,
            expectedSignature: expectedSignature.substring(0, 8) + '...',
            providedSignature: providedSignature.substring(0, 8) + '...',
            hasPrefix: signature.startsWith('sha256=')
        });

        if (providedSignature.length !== expectedSignature.length) {
            logger.error('Signature length mismatch', new Error('Invalid signature format'), {
                expected: expectedSignature.length,
                provided: providedSignature.length
            });
            return false;
        }

        // Use timing-safe comparison
        const isValid = crypto.timingSafeEqual(
            Buffer.from(expectedSignature, 'hex'),
            Buffer.from(providedSignature, 'hex')
        );

        logger.info('Signature verification result', { isValid });
        return isValid;

    } catch (error) {
        logger.error('Signature verification error', error as Error);
        return false;
    }
}

/**
 * Check if webhook was already processed (read-only check)
 */
async function isWebhookAlreadyProcessed(payload: WebhookPayload, requestId: string): Promise<boolean> {
    try {
        // Create a unique identifier for this webhook
        const webhookId = `${payload.data.id}_${payload.meta.event_name}_${payload.data.attributes.created_at || payload.data.attributes.updated_at}`;

        logger.info('Checking if webhook already processed', {
            webhookId,
            eventName: payload.meta.event_name,
            dataId: payload.data.id,
            requestId
        });

        // Check if we've already processed this webhook using database
        const { data: existingWebhook, error: checkError } = await supabase
            .from('webhook_processing_log')
            .select('id, processed_at')
            .eq('webhook_id', webhookId)
            .single();

        if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows found
            logger.error('Error checking webhook processing log', checkError as Error, { requestId });
            // In case of database error, allow the webhook to proceed but log the issue
            return false;
        }

        if (existingWebhook) {
            logger.warn('Webhook already processed', {
                webhookId,
                existingProcessedAt: existingWebhook.processed_at,
                requestId
            });
            return true; // This webhook was already processed
        }

        return false; // Not processed yet
    } catch (error) {
        logger.error('Error checking if webhook was processed', error as Error, { requestId });
        // In case of error, allow the webhook to proceed but log the issue
        return false;
    }
}

/**
 * Record webhook as successfully processed (call this AFTER successful handling)
 */
async function recordWebhookAsProcessed(payload: WebhookPayload, requestId: string): Promise<void> {
    try {
        // Create a unique identifier for this webhook
        const webhookId = `${payload.data.id}_${payload.meta.event_name}_${payload.data.attributes.created_at || payload.data.attributes.updated_at}`;

        logger.info('Recording webhook as processed', {
            webhookId,
            requestId
        });

        // Record this webhook as successfully processed
        const { error: insertError } = await supabase
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
            logger.warn('Webhook already recorded by another instance (race condition)', {
                webhookId,
                error: insertError.message,
                requestId
            });
        } else {
            logger.info('Webhook successfully recorded as processed', {
                webhookId,
                requestId
            });
        }
    } catch (error) {
        // Don't throw error here - webhook was already processed successfully
        // Just log the recording failure
        logger.error('Failed to record webhook as processed (non-critical)', error as Error, { requestId });
    }
}

/**
 * Validate webhook payload structure
 */
function validateWebhookPayload(payload: any): payload is WebhookPayload {
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
async function handleWebhookEvent(payload: WebhookPayload, requestId: string): Promise<void> {
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
            logger.info('Unhandled webhook event type', { eventType, requestId });
    }
}

/**
 * Handle order created event (one-time payment)
 * Note: For subscription orders, this event is followed by subscription_created
 * We skip subscription orders here and let subscription_created handle them
 */
async function handleOrderCreated(payload: WebhookPayload, requestId: string): Promise<void> {
    const orderData = payload.data.attributes as OrderAttributes;
    const customData = payload.meta.custom_data;

    logger.info('Processing order created', {
        orderId: payload.data.id,
        orderNumber: orderData.order_number,
        total: orderData.total_usd,
        userId: customData?.user_id,
        variantId: orderData.first_order_item.variant_id,
        requestId
    });

    // Extract user ID from custom data
    const userId = customData?.user_id;
    if (!userId) {
        logger.error('No user ID in order custom data', new Error('Missing user ID'), { requestId });
        return;
    }

    // Check if this is a subscription order by checking the variant
    // Subscription orders will be handled by subscription_created event
    const variantId = orderData.first_order_item.variant_id;
    const isSubscriptionVariant = [
        config.lemonsqueezy.basicVariantId,
        config.lemonsqueezy.proVariantId,
        config.lemonsqueezy.premiumVariantId
    ].includes(variantId?.toString() || '');

    if (isSubscriptionVariant) {
        logger.info('Order is for subscription product, will be handled by subscription_created event', {
            orderId: payload.data.id,
            variantId,
            userId,
            requestId
        });
        return; // Skip processing, let subscription_created handle it
    }

    // Check if this order has already been processed
    const { data: existingPayment, error: checkError } = await supabase
        .from('payment_records')
        .select('id, credits_purchased, processed_at')
        .eq('lemonsqueezy_order_id', payload.data.id)
        .eq('user_id', userId)
        .eq('status', 'completed')
        .single();

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows found
        logger.error('Error checking existing payment', checkError as Error, { requestId });
        throw new Error(`Failed to check existing payment: ${checkError.message}`);
    }

    if (existingPayment) {
        logger.warn('Order already processed, skipping duplicate', {
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
        logger.error('Unknown variant ID', new Error(`Unknown variant: ${variantId}`), { requestId });
        return;
    }

    try {
        // Record payment in database
        const { error: paymentError } = await supabase
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
        const { data: creditResult, error: creditError } = await supabase.rpc('add_credits', {
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

        logger.info('Order processed successfully', {
            orderId: payload.data.id,
            userId,
            credits,
            requestId
        });

    } catch (error) {
        logger.error('Error processing order', error as Error, {
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
async function handleSubscriptionCreated(payload: WebhookPayload, requestId: string): Promise<void> {
    const subscriptionData = payload.data.attributes as SubscriptionAttributes;
    const customData = payload.meta.custom_data;

    logger.info('Processing subscription created', {
        subscriptionId: payload.data.id,
        userId: customData?.user_id,
        variantId: subscriptionData.variant_id,
        requestId
    });

    const userId = customData?.user_id;
    if (!userId) {
        logger.error('No user ID in subscription custom data', new Error('Missing user ID'), { requestId });
        return;
    }

    // Check if this subscription already exists
    const { data: existingSubscription, error: subCheckError } = await supabase
        .from('subscriptions')
        .select('id, lemonsqueezy_subscription_id, user_id')
        .eq('lemonsqueezy_subscription_id', payload.data.id)
        .eq('user_id', userId)
        .single();

    if (subCheckError && subCheckError.code !== 'PGRST116') {
        logger.error('Error checking existing subscription', subCheckError as Error, { requestId });
        throw new Error(`Failed to check existing subscription: ${subCheckError.message}`);
    }

    if (existingSubscription) {
        logger.info('Subscription already exists, skipping creation', {
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
        const { error: subscriptionError } = await supabase
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

        logger.info('Subscription record created successfully (payment and credits will be handled by subscription_payment_success)', {
            subscriptionId: payload.data.id,
            userId,
            planName,
            credits,
            requestId
        });

    } catch (error) {
        logger.error('Error processing subscription creation', error as Error, {
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
async function handleSubscriptionUpdated(payload: WebhookPayload, requestId: string): Promise<void> {
    const subscriptionData = payload.data.attributes as SubscriptionAttributes;

    logger.info('Processing subscription updated', {
        subscriptionId: payload.data.id,
        status: subscriptionData.status,
        requestId
    });

    try {
        // Update subscription record
        const { error } = await supabase
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

        logger.info('Subscription updated successfully (renewal credits will be handled by subscription_payment_success)', {
            subscriptionId: payload.data.id,
            status: subscriptionData.status,
            requestId
        });

    } catch (error) {
        logger.error('Error processing subscription update', error as Error, {
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
async function handleSubscriptionPaymentSuccess(payload: WebhookPayload, requestId: string): Promise<void> {
    // Note: subscription_payment_success payload is of type "subscription-invoices"
    const invoiceData = payload.data.attributes as any;
    const customData = payload.meta.custom_data;

    // Extract IDs: data.id is invoice ID, attributes.subscription_id is the actual subscription ID
    const invoiceId = payload.data.id;
    const subscriptionId = invoiceData.subscription_id?.toString();

    logger.info('Processing subscription payment success', {
        invoiceId,
        subscriptionId,
        userId: customData?.user_id,
        requestId
    });

    const userId = customData?.user_id;
    if (!userId) {
        logger.error('No user ID in subscription payment custom data', new Error('Missing user ID'), { requestId });
        return;
    }

    if (!subscriptionId) {
        logger.error('No subscription ID in payment webhook', new Error('Missing subscription ID'), { requestId });
        return;
    }

    try {
        // Check if this payment has already been recorded (idempotency check using invoice ID)
        const { data: existingPayment, error: payCheckError } = await supabase
            .from('payment_records')
            .select('id, created_at, credits_purchased')
            .eq('lemonsqueezy_subscription_id', subscriptionId)
            .eq('lemonsqueezy_order_id', invoiceId)
            .eq('user_id', userId)
            .single();

        if (payCheckError && payCheckError.code !== 'PGRST116') {
            logger.error('Error checking existing payment', payCheckError as Error, { requestId });
        }

        if (existingPayment) {
            logger.info('Payment already recorded, skipping duplicate', {
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
        let { data: subscription, error: subError } = await supabase
            .from('subscriptions')
            .select('*')
            .eq('lemonsqueezy_subscription_id', subscriptionId)
            .single();

        if (subError || !subscription) {
            // Rare case: payment arrived before subscription_created
            // Wait a bit and retry once
            logger.warn('Subscription not found for payment, waiting and retrying...', {
                subscriptionId,
                error: subError?.message,
                requestId
            });

            await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds

            const retryResult = await supabase
                .from('subscriptions')
                .select('*')
                .eq('lemonsqueezy_subscription_id', subscriptionId)
                .single();

            if (retryResult.error || !retryResult.data) {
                logger.error('Subscription still not found after retry, payment cannot be processed', retryResult.error as Error, { requestId });
                throw new Error(`Subscription not found for payment after retry: ${retryResult.error?.message}`);
            }

            // Use the retried subscription
            subscription = retryResult.data;
        }

        const credits = subscription.plan_credits;
        const planName = subscription.plan_name;
        const priceUsd = getPriceForVariant(parseInt(subscription.lemonsqueezy_variant_id));

        // Determine if this is initial or renewal (for logging/description)
        const { data: existingPayments, error: countError } = await supabase
            .from('payment_records')
            .select('id')
            .eq('lemonsqueezy_subscription_id', subscriptionId)
            .eq('user_id', userId);

        const isInitialPayment = !existingPayments || existingPayments.length === 0;
        const paymentType = isInitialPayment ? 'Initial Subscription' : 'Subscription Renewal';

        logger.info(`Processing subscription payment (${paymentType})`, {
            invoiceId,
            subscriptionId,
            userId,
            credits,
            isInitialPayment,
            requestId
        });

        // Record payment (use invoice ID as order ID)
        const { error: paymentError } = await supabase
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
            logger.error('Failed to record payment', paymentError as Error, { requestId });
            throw new Error(`Failed to record payment: ${paymentError.message}`);
        }

        // Add credits
        const { data: creditResult, error: creditError } = await supabase.rpc('add_credits', {
            user_uuid: userId,
            credits_amount: credits,
            credit_source: 'subscription',
            description: `${paymentType}: ${planName}`
        });

        if (creditError) {
            logger.error('Failed to add credits', creditError as Error, { requestId });
            throw new Error(`Failed to add credits: ${creditError.message}`);
        }

        if (!creditResult) {
            throw new Error('Failed to add credits - database operation returned false');
        }

        logger.info(`Subscription payment processed successfully (${paymentType})`, {
            invoiceId,
            subscriptionId,
            userId,
            credits,
            isInitialPayment,
            requestId
        });

    } catch (error) {
        logger.error('Error processing subscription payment', error as Error, {
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
async function handleSubscriptionCancelled(payload: WebhookPayload, requestId: string): Promise<void> {
    const subscriptionData = payload.data.attributes as SubscriptionAttributes;

    logger.info('Processing subscription cancelled', {
        subscriptionId: payload.data.id,
        requestId
    });

    try {
        // Update subscription status
        const { error } = await supabase
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

        logger.info('Subscription cancelled successfully', {
            subscriptionId: payload.data.id,
            requestId
        });

    } catch (error) {
        logger.error('Error processing subscription cancellation', error as Error, {
            subscriptionId: payload.data.id,
            requestId
        });
        throw error;
    }
}

/**
 * Handle subscription resumed event
 */
async function handleSubscriptionResumed(payload: WebhookPayload, requestId: string): Promise<void> {
    logger.info('Processing subscription resumed', {
        subscriptionId: payload.data.id,
        requestId
    });

    try {
        // Update subscription status
        const { error } = await supabase
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

        logger.info('Subscription resumed successfully', {
            subscriptionId: payload.data.id,
            requestId
        });

    } catch (error) {
        logger.error('Error processing subscription resume', error as Error, {
            subscriptionId: payload.data.id,
            requestId
        });
        throw error;
    }
}

/**
 * Handle subscription expired event
 */
async function handleSubscriptionExpired(payload: WebhookPayload, requestId: string): Promise<void> {
    logger.info('Processing subscription expired', {
        subscriptionId: payload.data.id,
        requestId
    });

    try {
        // Update subscription status
        const { error } = await supabase
            .from('subscriptions')
            .update({
                status: 'expired',
                updated_at: new Date().toISOString()
            })
            .eq('lemonsqueezy_subscription_id', payload.data.id);

        if (error) {
            throw new Error(`Failed to expire subscription: ${error.message}`);
        }

        logger.info('Subscription expired successfully', {
            subscriptionId: payload.data.id,
            requestId
        });

    } catch (error) {
        logger.error('Error processing subscription expiration', error as Error, {
            subscriptionId: payload.data.id,
            requestId
        });
        throw error;
    }
}

/**
 * Handle subscription paused event
 */
async function handleSubscriptionPaused(payload: WebhookPayload, requestId: string): Promise<void> {
    logger.info('Processing subscription paused', {
        subscriptionId: payload.data.id,
        requestId
    });

    try {
        // Update subscription status
        const { error } = await supabase
            .from('subscriptions')
            .update({
                status: 'past_due', // Use past_due for paused subscriptions
                updated_at: new Date().toISOString()
            })
            .eq('lemonsqueezy_subscription_id', payload.data.id);

        if (error) {
            throw new Error(`Failed to pause subscription: ${error.message}`);
        }

        logger.info('Subscription paused successfully', {
            subscriptionId: payload.data.id,
            requestId
        });

    } catch (error) {
        logger.error('Error processing subscription pause', error as Error, {
            subscriptionId: payload.data.id,
            requestId
        });
        throw error;
    }
}

/**
 * Handle subscription unpaused event
 */
async function handleSubscriptionUnpaused(payload: WebhookPayload, requestId: string): Promise<void> {
    logger.info('Processing subscription unpaused', {
        subscriptionId: payload.data.id,
        requestId
    });

    try {
        // Update subscription status
        const { error } = await supabase
            .from('subscriptions')
            .update({
                status: 'active',
                updated_at: new Date().toISOString()
            })
            .eq('lemonsqueezy_subscription_id', payload.data.id);

        if (error) {
            throw new Error(`Failed to unpause subscription: ${error.message}`);
        }

        logger.info('Subscription unpaused successfully', {
            subscriptionId: payload.data.id,
            requestId
        });

    } catch (error) {
        logger.error('Error processing subscription unpause', error as Error, {
            subscriptionId: payload.data.id,
            requestId
        });
        throw error;
    }
}

/**
 * Get credits amount for a variant ID
 */
function getCreditsForVariant(variantId: number): number {
    // These should match the variant IDs configured in environment
    const variantCreditsMap: Record<string, number> = {
        // Basic plan - $9.9 - 1200 credits
        [config.lemonsqueezy.basicVariantId || '']: 1200,
        // Pro plan - $19.9 - 3000 credits  
        [config.lemonsqueezy.proVariantId || '']: 3000,
        // Premium plan - $39.9 - 7200 credits
        [config.lemonsqueezy.premiumVariantId || '']: 7200
    };

    return variantCreditsMap[variantId.toString()] || 0;
}

/**
 * Get plan name for a variant ID
 */
function getPlanNameForVariant(variantId: number): string {
    const variantPlanMap: Record<string, string> = {
        [config.lemonsqueezy.basicVariantId || '']: 'Basic Plan',
        [config.lemonsqueezy.proVariantId || '']: 'Pro Plan',
        [config.lemonsqueezy.premiumVariantId || '']: 'Premium Plan'
    };

    return variantPlanMap[variantId.toString()] || 'Unknown Plan';
}

/**
 * Get price (in USD) for a variant ID
 */
function getPriceForVariant(variantId: number): number {
    const variantPriceMap: Record<string, number> = {
        // Basic plan - $9.9
        [config.lemonsqueezy.basicVariantId || '']: 9.9,
        // Pro plan - $19.9
        [config.lemonsqueezy.proVariantId || '']: 19.9,
        // Premium plan - $39.9
        [config.lemonsqueezy.premiumVariantId || '']: 39.9
    };

    return variantPriceMap[variantId.toString()] || 0;
}