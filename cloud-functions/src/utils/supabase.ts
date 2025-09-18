/**
 * Supabase client configuration for cloud functions
 * Used for user authentication and usage limit management
 */

import { createClient } from '@supabase/supabase-js';
import config from './config';
import logger from './logger';

// Create Supabase client with service role key for server-side operations
const supabase = createClient(
    config.supabase.url,
    config.supabase.serviceRoleKey,
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    }
);

/**
 * Device usage status interface
 */
export interface DeviceUsageStatus {
    canAnalyze: boolean;
    remainingTrials: number;
    isRegistered: boolean;
}

/**
 * User usage status interface
 */
export interface UserUsageStatus {
    canAnalyze: boolean;
    remainingAnalyses: number;
    monthlyLimit: number;
    resetDate?: Date;
}

/**
 * Check device fingerprint usage for trial users
 */
export async function checkDeviceUsage(fingerprint: string): Promise<DeviceUsageStatus> {
    try {
        const { data, error } = await supabase.rpc('check_device_fingerprint_usage', {
            fingerprint_hash_param: fingerprint
        });

        if (error) {
            logger.error('Error checking device usage', error as Error);
            throw new Error(`Failed to check device usage: ${error.message}`);
        }

        const result = data?.[0];
        return {
            canAnalyze: result?.can_analyze ?? false,
            remainingTrials: result?.remaining_trials ?? 0,
            isRegistered: result?.is_registered ?? false
        };
    } catch (error) {
        logger.error('Error in checkDeviceUsage', error as Error);
        throw error;
    }
}

/**
 * Check user monthly usage for registered users
 * Updated to use user_credits table instead of user_profiles
 */
export async function checkUserUsage(userId: string): Promise<UserUsageStatus> {
    try {
        // 直接查询 user_credits 表，避免依赖可能有问题的数据库函数
        const { data, error } = await supabase
            .from('user_credits')
            .select('credits')
            .eq('id', userId)
            .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 是 "not found" 错误
            logger.error('Error checking user usage', error as Error);
            throw new Error(`Failed to check user usage: ${error.message}`);
        }

        let totalCredits = 0;

        if (data) {
            totalCredits = data.credits || 0;
        } else {
            // 用户不存在，创建默认积分记录
            logger.info('User not found, creating default credit record', { userId });

            const { data: insertData, error: insertError } = await supabase
                .from('user_credits')
                .insert({
                    id: userId,
                    credits: 200,
                    trial_credits: 0,
                    monthly_credits: 200,
                    purchased_credits: 0
                })
                .select('credits')
                .single();

            if (insertError) {
                logger.error('Error creating user credits', insertError as Error);
                // 如果插入失败，假设用户有默认积分
                totalCredits = 200;
            } else {
                totalCredits = insertData?.credits || 200;
            }
        }

        return {
            canAnalyze: totalCredits > 0,
            remainingAnalyses: totalCredits,
            monthlyLimit: 999999, // Effectively unlimited for registered users
            resetDate: undefined // No monthly reset for credit-based system
        };
    } catch (error) {
        logger.error('Error in checkUserUsage', error as Error);
        throw error;
    }
}

/**
 * Consume device trial usage
 */
export async function consumeDeviceUsage(fingerprint: string): Promise<boolean> {
    try {
        const { data, error } = await supabase.rpc('consume_device_trial', {
            fingerprint_hash_param: fingerprint
        });

        if (error) {
            logger.error('Error consuming device usage', error as Error);
            return false;
        }

        const success = data === true;
        if (success) {
            logger.info('Device trial usage consumed', { fingerprint });
        }

        return success;
    } catch (error) {
        logger.error('Error in consumeDeviceUsage', error as Error);
        return false;
    }
}

/**
 * Consume user credits (updated to use credit system)
 */
export async function consumeUserUsage(userId: string, creditsAmount: number = 1, description: string = 'Audio analysis'): Promise<boolean> {
    try {
        logger.info('Attempting to consume user credits', { userId, creditsAmount });

        const { data, error } = await supabase.rpc('consume_credits', {
            user_uuid: userId,
            credits_amount: creditsAmount,
            analysis_description: description
        });

        logger.info('Supabase RPC response', {
            userId,
            creditsAmount,
            data,
            error: error ? {
                message: error.message,
                code: error.code,
                details: error.details,
                hint: error.hint
            } : null
        });

        if (error) {
            logger.error('Error consuming user credits', error as Error, {
                userId,
                creditsAmount,
                errorCode: error.code,
                errorDetails: error.details,
                errorHint: error.hint
            });
            return false;
        }

        const success = data === true;
        if (success) {
            logger.info('User credits consumed successfully', { userId, creditsAmount });
        } else {
            logger.warn('User credit consumption failed', { userId, creditsAmount, data });
        }

        return success;
    } catch (error) {
        logger.error('Error in consumeUserUsage', error as Error, { userId, creditsAmount });
        return false;
    }
}

/**
 * Log usage activity
 */
export async function logUsageActivity(params: {
    userId?: string;
    deviceFingerprint?: string;
    analysisType: string;
    fileSize: number;
    processingTime: number;
    success: boolean;
    errorMessage?: string;
}): Promise<void> {
    try {
        const { error } = await supabase
            .from('usage_logs')
            .insert({
                user_id: params.userId || null,
                device_fingerprint: params.deviceFingerprint || null,
                analysis_type: params.analysisType,
                file_size: params.fileSize,
                processing_time_ms: params.processingTime,
                success: params.success,
                error_message: params.errorMessage || null,
                created_at: new Date().toISOString()
            });

        if (error) {
            logger.error('Error logging usage activity', error as Error);
            // Don't throw here - logging failure shouldn't break the main flow
        } else {
            logger.info('Usage activity logged', params);
        }
    } catch (error) {
        logger.error('Error in logUsageActivity', error as Error);
        // Don't throw here - logging failure shouldn't break the main flow
    }
}

/**
 * Credit system interfaces
 */
export interface CreditStatus {
    hasEnoughCredits: boolean;
    currentCredits: number;
    isTrialUser: boolean;
}

export interface CreditConsumption {
    success: boolean;
    remainingCredits: number;
    transactionId?: string;
}

/**
 * Check user credit balance
 */
export async function checkUserCredits(userId: string, requiredCredits: number): Promise<CreditStatus> {
    try {
        const { data, error } = await supabase.rpc('check_user_credits', {
            user_uuid: userId,
            required_credits: requiredCredits
        });

        if (error) {
            logger.error('Error checking user credits', error as Error);
            throw new Error(`Failed to check user credits: ${error.message}`);
        }

        // Get detailed credit information
        const { data: creditDetails, error: detailsError } = await supabase.rpc('get_user_credit_details', {
            user_uuid: userId
        });

        if (detailsError) {
            logger.error('Error getting user credit details', detailsError as Error);
            throw new Error(`Failed to get credit details: ${detailsError.message}`);
        }

        const details = creditDetails?.[0];
        return {
            hasEnoughCredits: data === true,
            currentCredits: details?.total_credits ?? 0,
            isTrialUser: false
        };
    } catch (error) {
        logger.error('Error in checkUserCredits', error as Error);
        throw error;
    }
}

/**
 * Check trial user credit balance
 */
export async function checkTrialCredits(fingerprint: string, requiredCredits: number): Promise<CreditStatus> {
    try {
        const { data, error } = await supabase.rpc('check_trial_credits', {
            fingerprint_hash_param: fingerprint,
            required_credits: requiredCredits
        });

        if (error) {
            logger.error('Error checking trial credits', error as Error);
            throw new Error(`Failed to check trial credits: ${error.message}`);
        }

        // Get current trial credit status
        const { data: deviceData, error: deviceError } = await supabase
            .from('device_fingerprints')
            .select('trial_credits, credits_used')
            .eq('fingerprint_hash', fingerprint)
            .eq('deleted_at', null)
            .is('user_id', null)
            .single();

        let currentCredits = 100; // Default for new devices
        if (!deviceError && deviceData) {
            currentCredits = deviceData.trial_credits - (deviceData.credits_used || 0);
        }

        return {
            hasEnoughCredits: data === true,
            currentCredits: Math.max(0, currentCredits),
            isTrialUser: true
        };
    } catch (error) {
        logger.error('Error in checkTrialCredits', error as Error);
        throw error;
    }
}

/**
 * Consume user credits
 */
export async function consumeUserCredits(
    userId: string,
    creditsAmount: number,
    description: string,
    analysisId?: string
): Promise<CreditConsumption> {
    try {
        const { data, error } = await supabase.rpc('consume_credits', {
            user_uuid: userId,
            credits_amount: creditsAmount,
            analysis_description: description,
            analysis_id: analysisId
        });

        if (error) {
            logger.error('Error consuming user credits', error as Error);
            return { success: false, remainingCredits: 0 };
        }

        if (data !== true) {
            logger.warn('Credit consumption failed', { userId, creditsAmount });
            return { success: false, remainingCredits: 0 };
        }

        // Get updated credit balance
        const { data: creditDetails } = await supabase.rpc('get_user_credit_details', {
            user_uuid: userId
        });

        const remainingCredits = creditDetails?.[0]?.total_credits ?? 0;

        logger.info('User credits consumed successfully', {
            userId,
            creditsAmount,
            remainingCredits
        });

        return {
            success: true,
            remainingCredits,
            transactionId: analysisId
        };
    } catch (error) {
        logger.error('Error in consumeUserCredits', error as Error);
        return { success: false, remainingCredits: 0 };
    }
}

/**
 * Consume trial credits
 */
export async function consumeTrialCredits(
    fingerprint: string,
    creditsAmount: number,
    description: string,
    analysisId?: string
): Promise<CreditConsumption> {
    try {
        const { data, error } = await supabase.rpc('consume_trial_credits', {
            fingerprint_hash_param: fingerprint,
            credits_amount: creditsAmount,
            analysis_description: description,
            analysis_id: analysisId
        });

        if (error) {
            logger.error('Error consuming trial credits', error as Error);
            return { success: false, remainingCredits: 0 };
        }

        if (data !== true) {
            logger.warn('Trial credit consumption failed', { fingerprint, creditsAmount });
            return { success: false, remainingCredits: 0 };
        }

        // Get updated trial credit balance
        const { data: deviceData } = await supabase
            .from('device_fingerprints')
            .select('trial_credits, credits_used')
            .eq('fingerprint_hash', fingerprint)
            .eq('deleted_at', null)
            .is('user_id', null)
            .single();

        let remainingCredits = 0;
        if (deviceData) {
            remainingCredits = deviceData.trial_credits - (deviceData.credits_used || 0);
        }

        logger.info('Trial credits consumed successfully', {
            fingerprint,
            creditsAmount,
            remainingCredits
        });

        return {
            success: true,
            remainingCredits: Math.max(0, remainingCredits),
            transactionId: analysisId
        };
    } catch (error) {
        logger.error('Error in consumeTrialCredits', error as Error);
        return { success: false, remainingCredits: 0 };
    }
}

/**
 * Refund user credits (for failed analysis)
 */
export async function refundUserCredits(
    userId: string,
    creditsAmount: number,
    reason: string,
    analysisId?: string
): Promise<boolean> {
    try {
        const { data, error } = await supabase.rpc('refund_credits', {
            user_uuid: userId,
            credits_amount: creditsAmount,
            refund_reason: reason,
            original_analysis_id: analysisId
        });

        if (error) {
            logger.error('Error refunding user credits', error as Error);
            return false;
        }

        const success = data === true;
        if (success) {
            logger.info('User credits refunded successfully', {
                userId,
                creditsAmount,
                reason
            });
        }

        return success;
    } catch (error) {
        logger.error('Error in refundUserCredits', error as Error);
        return false;
    }
}

/**
 * Refund trial credits (for failed analysis)
 */
export async function refundTrialCredits(
    fingerprint: string,
    creditsAmount: number,
    reason: string,
    analysisId?: string
): Promise<boolean> {
    try {
        const { data, error } = await supabase.rpc('refund_trial_credits', {
            fingerprint_hash_param: fingerprint,
            credits_amount: creditsAmount,
            refund_reason: reason,
            original_analysis_id: analysisId
        });

        if (error) {
            logger.error('Error refunding trial credits', error as Error);
            return false;
        }

        const success = data === true;
        if (success) {
            logger.info('Trial credits refunded successfully', {
                fingerprint,
                creditsAmount,
                reason
            });
        }

        return success;
    } catch (error) {
        logger.error('Error in refundTrialCredits', error as Error);
        return false;
    }
}

/**
 * Calculate credits required based on audio duration
 */
export function calculateCreditsRequired(durationSeconds: number): number {
    // 1 second = 1 credit, rounded up to nearest second
    return Math.ceil(durationSeconds);
}

export default supabase;