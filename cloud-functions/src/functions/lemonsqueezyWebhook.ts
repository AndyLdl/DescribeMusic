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

            // Check for replay attacks
            if (await checkReplayAttack(payload, requestId)) {
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
 * Check for replay attacks by tracking processed webhook IDs in database
 */
async function checkReplayAttack(payload: WebhookPayload, requestId: string): Promise<boolean> {
    try {
        // Create a unique identifier for this webhook
        const webhookId = `${payload.data.id}_${payload.meta.event_name}_${payload.data.attributes.created_at || payload.data.attributes.updated_at}`;

        logger.info('Checking for replay attack', {
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
            logger.error('Replay attack detected', new Error('Duplicate webhook'), {
                webhookId,
                existingProcessedAt: existingWebhook.processed_at,
                requestId
            });
            return true; // This is a replay attack
        }

        // Record this webhook as being processed
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
            logger.error('Failed to record webhook processing', insertError as Error, { requestId });
            // If we can't record it, there might be a race condition
            // Check again if another instance already processed it
            const { data: raceCheck } = await supabase
                .from('webhook_processing_log')
                .select('id')
                .eq('webhook_id', webhookId)
                .single();

            if (raceCheck) {
                logger.warn('Race condition detected - webhook already processed by another instance', {
                    webhookId,
                    requestId
                });
                return true; // Treat as replay attack
            }
        }

        logger.info('Webhook marked as processing', {
            webhookId,
            requestId
        });

        return false; // Not a replay attack
    } catch (error) {
        logger.error('Error checking replay attack', error as Error, { requestId });
        // In case of error, allow the webhook to proceed but log the issue
        return false;
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
 */
async function handleOrderCreated(payload: WebhookPayload, requestId: string): Promise<void> {
    const orderData = payload.data.attributes as OrderAttributes;
    const customData = payload.meta.custom_data;

    logger.info('Processing order created', {
        orderId: payload.data.id,
        orderNumber: orderData.order_number,
        total: orderData.total_usd,
        userId: customData?.user_id,
        requestId
    });

    // Extract user ID from custom data
    const userId = customData?.user_id;
    if (!userId) {
        logger.error('No user ID in order custom data', new Error('Missing user ID'), { requestId });
        return;
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

    // Determine credits based on variant ID
    const variantId = orderData.first_order_item.variant_id;
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

    // Check if this subscription has already been processed
    const { data: existingPayment, error: checkError } = await supabase
        .from('payment_records')
        .select('id, credits_purchased, processed_at')
        .eq('lemonsqueezy_subscription_id', payload.data.id)
        .eq('user_id', userId)
        .eq('status', 'completed')
        .single();

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows found
        logger.error('Error checking existing subscription payment', checkError as Error, { requestId });
        throw new Error(`Failed to check existing subscription payment: ${checkError.message}`);
    }

    if (existingPayment) {
        logger.warn('Subscription already processed, skipping duplicate', {
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
        const { error: subscriptionError } = await supabase
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
        const { data: paymentRecord, error: paymentError } = await supabase
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
            logger.error('Failed to record subscription payment', paymentError as Error, { requestId });
            // Don't continue if payment record fails - this prevents duplicate processing
            throw new Error(`Failed to record subscription payment: ${paymentError.message}`);
        }

        // Add initial credits using the existing credit system
        const { data: creditResult, error: creditError } = await supabase.rpc('add_credits', {
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

        logger.info('Subscription created successfully', {
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
 */
async function handleSubscriptionUpdated(payload: WebhookPayload, requestId: string): Promise<void> {
    const subscriptionData = payload.data.attributes as SubscriptionAttributes;
    const customData = payload.meta.custom_data;

    logger.info('Processing subscription updated', {
        subscriptionId: payload.data.id,
        status: subscriptionData.status,
        requestId
    });

    try {
        // Get existing subscription to check for renewal
        const { data: existingSubscription, error: fetchError } = await supabase
            .from('subscriptions')
            .select('*')
            .eq('lemonsqueezy_subscription_id', payload.data.id)
            .single();

        if (fetchError) {
            logger.error('Failed to fetch existing subscription', fetchError as Error, { requestId });
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

        logger.info('Renewal check details', {
            subscriptionId: payload.data.id,
            existingStatus: existingSubscription?.status,
            currentPeriodEnd: currentPeriodEnd.toISOString(),
            newPeriodEnd: newPeriodEnd.toISOString(),
            timeDifferenceHours: Math.round(timeDifference / (60 * 60 * 1000)),
            isRenewal,
            requestId
        });

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

        // If this is a renewal, add credits for the new period
        if (isRenewal && existingSubscription) {
            const userId = customData?.user_id || existingSubscription.user_id;
            const credits = existingSubscription.plan_credits;

            // Check if we've already processed this renewal period
            const renewalDescription = `Subscription Renewal: ${existingSubscription.plan_name} (${subscriptionData.renews_at})`;
            const { data: existingRenewal, error: renewalCheckError } = await supabase
                .from('credit_transactions')
                .select('id, created_at')
                .eq('user_id', userId)
                .eq('source', 'subscription')
                .ilike('description', `%${subscriptionData.renews_at}%`)
                .single();

            if (renewalCheckError && renewalCheckError.code !== 'PGRST116') {
                logger.error('Error checking existing renewal', renewalCheckError as Error, { requestId });
            }

            if (existingRenewal) {
                logger.warn('Renewal already processed, skipping duplicate', {
                    subscriptionId: payload.data.id,
                    userId,
                    existingRenewalId: existingRenewal.id,
                    existingRenewalDate: existingRenewal.created_at,
                    requestId
                });
            } else {
                logger.info('Processing subscription renewal', {
                    subscriptionId: payload.data.id,
                    userId,
                    credits,
                    renewalPeriod: subscriptionData.renews_at,
                    requestId
                });

                // Add renewal credits using the existing credit system
                const { data: creditResult, error: creditError } = await supabase.rpc('add_credits', {
                    user_uuid: userId,
                    credits_amount: credits,
                    credit_source: 'subscription',
                    description: renewalDescription
                });

                if (creditError) {
                    logger.error('Failed to add renewal credits', creditError as Error, { requestId });
                    // Don't throw here - subscription update succeeded
                } else if (!creditResult) {
                    logger.error('Failed to add renewal credits - database operation returned false', new Error('Credit operation failed'), { requestId });
                    // Don't throw here - subscription update succeeded
                } else {
                    logger.info('Renewal credits added successfully', {
                        subscriptionId: payload.data.id,
                        userId,
                        credits,
                        requestId
                    });
                }
            }
        }

        logger.info('Subscription updated successfully', {
            subscriptionId: payload.data.id,
            status: subscriptionData.status,
            isRenewal,
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