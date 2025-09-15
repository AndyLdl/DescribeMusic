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
 */
export async function checkUserUsage(userId: string): Promise<UserUsageStatus> {
    try {
        const { data, error } = await supabase.rpc('check_user_monthly_limit', {
            user_uuid: userId
        });

        if (error) {
            logger.error('Error checking user usage', error as Error);
            throw new Error(`Failed to check user usage: ${error.message}`);
        }

        const result = data?.[0];
        return {
            canAnalyze: result?.can_analyze ?? false,
            remainingAnalyses: result?.remaining_analyses ?? 0,
            monthlyLimit: result?.monthly_limit ?? 10,
            resetDate: result?.reset_date ? new Date(result.reset_date) : undefined
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
 * Consume user monthly usage
 */
export async function consumeUserUsage(userId: string): Promise<boolean> {
    try {
        logger.info('Attempting to consume user usage', { userId });

        const { data, error } = await supabase.rpc('consume_user_monthly_usage', {
            user_uuid: userId
        });

        logger.info('Supabase RPC response', {
            userId,
            data,
            error: error ? {
                message: error.message,
                code: error.code,
                details: error.details,
                hint: error.hint
            } : null
        });

        if (error) {
            logger.error('Error consuming user usage', error as Error, {
                userId,
                errorCode: error.code,
                errorDetails: error.details,
                errorHint: error.hint
            });
            return false;
        }

        const success = data === true;
        if (success) {
            logger.info('User monthly usage consumed successfully', { userId });
        } else {
            logger.warn('User monthly usage consumption failed', { userId, data });
        }

        return success;
    } catch (error) {
        logger.error('Error in consumeUserUsage', error as Error, { userId });
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

export default supabase;