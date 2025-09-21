"use strict";
/**
 * Supabase client configuration for cloud functions
 * Used for user authentication and usage limit management
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkDeviceUsage = checkDeviceUsage;
exports.checkUserUsage = checkUserUsage;
exports.consumeDeviceUsage = consumeDeviceUsage;
exports.consumeUserUsage = consumeUserUsage;
exports.logUsageActivity = logUsageActivity;
exports.checkUserCredits = checkUserCredits;
exports.checkTrialCredits = checkTrialCredits;
exports.consumeUserCredits = consumeUserCredits;
exports.consumeTrialCredits = consumeTrialCredits;
exports.refundUserCredits = refundUserCredits;
exports.refundTrialCredits = refundTrialCredits;
exports.calculateCreditsRequired = calculateCreditsRequired;
exports.verifySupabaseToken = verifySupabaseToken;
const supabase_js_1 = require("@supabase/supabase-js");
const config_1 = __importDefault(require("./config"));
const logger_1 = __importDefault(require("./logger"));
// Create Supabase client with service role key for server-side operations
const supabase = (0, supabase_js_1.createClient)(config_1.default.supabase.url, config_1.default.supabase.serviceRoleKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});
/**
 * Check device fingerprint usage for trial users
 */
async function checkDeviceUsage(fingerprint) {
    var _a, _b, _c;
    try {
        const { data, error } = await supabase.rpc('check_device_fingerprint_usage', {
            fingerprint_hash_param: fingerprint
        });
        if (error) {
            logger_1.default.error('Error checking device usage', error);
            throw new Error(`Failed to check device usage: ${error.message}`);
        }
        const result = data === null || data === void 0 ? void 0 : data[0];
        return {
            canAnalyze: (_a = result === null || result === void 0 ? void 0 : result.can_analyze) !== null && _a !== void 0 ? _a : false,
            remainingTrials: (_b = result === null || result === void 0 ? void 0 : result.remaining_trials) !== null && _b !== void 0 ? _b : 0,
            isRegistered: (_c = result === null || result === void 0 ? void 0 : result.is_registered) !== null && _c !== void 0 ? _c : false
        };
    }
    catch (error) {
        logger_1.default.error('Error in checkDeviceUsage', error);
        throw error;
    }
}
/**
 * Check user monthly usage for registered users
 * Updated to use user_credits table instead of user_profiles
 */
async function checkUserUsage(userId) {
    try {
        // 直接查询 user_credits 表，避免依赖可能有问题的数据库函数
        const { data, error } = await supabase
            .from('user_credits')
            .select('credits')
            .eq('id', userId)
            .single();
        if (error && error.code !== 'PGRST116') { // PGRST116 是 "not found" 错误
            logger_1.default.error('Error checking user usage', error);
            throw new Error(`Failed to check user usage: ${error.message}`);
        }
        let totalCredits = 0;
        if (data) {
            totalCredits = data.credits || 0;
        }
        else {
            // 用户不存在，创建默认积分记录
            logger_1.default.info('User not found, creating default credit record', { userId });
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
                logger_1.default.error('Error creating user credits', insertError);
                // 如果插入失败，假设用户有默认积分
                totalCredits = 200;
            }
            else {
                totalCredits = (insertData === null || insertData === void 0 ? void 0 : insertData.credits) || 200;
            }
        }
        return {
            canAnalyze: totalCredits > 0,
            remainingAnalyses: totalCredits,
            monthlyLimit: 999999, // Effectively unlimited for registered users
            resetDate: undefined // No monthly reset for credit-based system
        };
    }
    catch (error) {
        logger_1.default.error('Error in checkUserUsage', error);
        throw error;
    }
}
/**
 * Consume device trial usage
 */
async function consumeDeviceUsage(fingerprint) {
    try {
        const { data, error } = await supabase.rpc('consume_device_trial', {
            fingerprint_hash_param: fingerprint
        });
        if (error) {
            logger_1.default.error('Error consuming device usage', error);
            return false;
        }
        const success = data === true;
        if (success) {
            logger_1.default.info('Device trial usage consumed', { fingerprint });
        }
        return success;
    }
    catch (error) {
        logger_1.default.error('Error in consumeDeviceUsage', error);
        return false;
    }
}
/**
 * Consume user credits (updated to use credit system)
 */
async function consumeUserUsage(userId, creditsAmount = 1, description = 'Audio analysis') {
    try {
        logger_1.default.info('Attempting to consume user credits', { userId, creditsAmount });
        const { data, error } = await supabase.rpc('consume_credits', {
            user_uuid: userId,
            credits_amount: creditsAmount,
            analysis_description: description
        });
        logger_1.default.info('Supabase RPC response', {
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
            logger_1.default.error('Error consuming user credits', error, {
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
            logger_1.default.info('User credits consumed successfully', { userId, creditsAmount });
        }
        else {
            logger_1.default.warn('User credit consumption failed', { userId, creditsAmount, data });
        }
        return success;
    }
    catch (error) {
        logger_1.default.error('Error in consumeUserUsage', error, { userId, creditsAmount });
        return false;
    }
}
/**
 * Log usage activity
 */
async function logUsageActivity(params) {
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
            logger_1.default.error('Error logging usage activity', error);
            // Don't throw here - logging failure shouldn't break the main flow
        }
        else {
            logger_1.default.info('Usage activity logged', params);
        }
    }
    catch (error) {
        logger_1.default.error('Error in logUsageActivity', error);
        // Don't throw here - logging failure shouldn't break the main flow
    }
}
/**
 * Check user credit balance
 */
async function checkUserCredits(userId, requiredCredits) {
    var _a;
    try {
        const { data, error } = await supabase.rpc('check_user_credits', {
            user_uuid: userId,
            required_credits: requiredCredits
        });
        if (error) {
            logger_1.default.error('Error checking user credits', error);
            throw new Error(`Failed to check user credits: ${error.message}`);
        }
        // Get detailed credit information
        const { data: creditDetails, error: detailsError } = await supabase.rpc('get_user_credit_details', {
            user_uuid: userId
        });
        if (detailsError) {
            logger_1.default.error('Error getting user credit details', detailsError);
            throw new Error(`Failed to get credit details: ${detailsError.message}`);
        }
        const details = creditDetails === null || creditDetails === void 0 ? void 0 : creditDetails[0];
        return {
            hasEnoughCredits: data === true,
            currentCredits: (_a = details === null || details === void 0 ? void 0 : details.total_credits) !== null && _a !== void 0 ? _a : 0,
            isTrialUser: false
        };
    }
    catch (error) {
        logger_1.default.error('Error in checkUserCredits', error);
        throw error;
    }
}
/**
 * Check trial user credit balance
 */
async function checkTrialCredits(fingerprint, requiredCredits) {
    try {
        const { data, error } = await supabase.rpc('check_trial_credits', {
            fingerprint_hash_param: fingerprint,
            required_credits: requiredCredits
        });
        if (error) {
            logger_1.default.error('Error checking trial credits', error);
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
    }
    catch (error) {
        logger_1.default.error('Error in checkTrialCredits', error);
        throw error;
    }
}
/**
 * Consume user credits
 */
async function consumeUserCredits(userId, creditsAmount, description, analysisId) {
    var _a, _b;
    try {
        const { data, error } = await supabase.rpc('consume_credits', {
            user_uuid: userId,
            credits_amount: creditsAmount,
            analysis_description: description,
            analysis_id: analysisId
        });
        if (error) {
            logger_1.default.error('Error consuming user credits', error);
            return { success: false, remainingCredits: 0 };
        }
        if (data !== true) {
            logger_1.default.warn('Credit consumption failed', { userId, creditsAmount });
            return { success: false, remainingCredits: 0 };
        }
        // Get updated credit balance
        const { data: creditDetails } = await supabase.rpc('get_user_credit_details', {
            user_uuid: userId
        });
        const remainingCredits = (_b = (_a = creditDetails === null || creditDetails === void 0 ? void 0 : creditDetails[0]) === null || _a === void 0 ? void 0 : _a.total_credits) !== null && _b !== void 0 ? _b : 0;
        logger_1.default.info('User credits consumed successfully', {
            userId,
            creditsAmount,
            remainingCredits
        });
        return {
            success: true,
            remainingCredits,
            transactionId: analysisId
        };
    }
    catch (error) {
        logger_1.default.error('Error in consumeUserCredits', error);
        return { success: false, remainingCredits: 0 };
    }
}
/**
 * Consume trial credits
 */
async function consumeTrialCredits(fingerprint, creditsAmount, description, analysisId) {
    try {
        const { data, error } = await supabase.rpc('consume_trial_credits', {
            fingerprint_hash_param: fingerprint,
            credits_amount: creditsAmount,
            analysis_description: description,
            analysis_id: analysisId
        });
        if (error) {
            logger_1.default.error('Error consuming trial credits', error);
            return { success: false, remainingCredits: 0 };
        }
        if (data !== true) {
            logger_1.default.warn('Trial credit consumption failed', { fingerprint, creditsAmount });
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
        logger_1.default.info('Trial credits consumed successfully', {
            fingerprint,
            creditsAmount,
            remainingCredits
        });
        return {
            success: true,
            remainingCredits: Math.max(0, remainingCredits),
            transactionId: analysisId
        };
    }
    catch (error) {
        logger_1.default.error('Error in consumeTrialCredits', error);
        return { success: false, remainingCredits: 0 };
    }
}
/**
 * Refund user credits (for failed analysis)
 */
async function refundUserCredits(userId, creditsAmount, reason, analysisId) {
    try {
        const { data, error } = await supabase.rpc('refund_credits', {
            user_uuid: userId,
            credits_amount: creditsAmount,
            refund_reason: reason,
            original_analysis_id: analysisId
        });
        if (error) {
            logger_1.default.error('Error refunding user credits', error);
            return false;
        }
        const success = data === true;
        if (success) {
            logger_1.default.info('User credits refunded successfully', {
                userId,
                creditsAmount,
                reason
            });
        }
        return success;
    }
    catch (error) {
        logger_1.default.error('Error in refundUserCredits', error);
        return false;
    }
}
/**
 * Refund trial credits (for failed analysis)
 */
async function refundTrialCredits(fingerprint, creditsAmount, reason, analysisId) {
    try {
        const { data, error } = await supabase.rpc('refund_trial_credits', {
            fingerprint_hash_param: fingerprint,
            credits_amount: creditsAmount,
            refund_reason: reason,
            original_analysis_id: analysisId
        });
        if (error) {
            logger_1.default.error('Error refunding trial credits', error);
            return false;
        }
        const success = data === true;
        if (success) {
            logger_1.default.info('Trial credits refunded successfully', {
                fingerprint,
                creditsAmount,
                reason
            });
        }
        return success;
    }
    catch (error) {
        logger_1.default.error('Error in refundTrialCredits', error);
        return false;
    }
}
/**
 * Calculate credits required based on audio duration
 */
function calculateCreditsRequired(durationSeconds) {
    // 1 second = 1 credit, rounded up to nearest second
    return Math.ceil(durationSeconds);
}
/**
 * 验证 Supabase JWT token
 */
async function verifySupabaseToken(token) {
    try {
        // 使用 Supabase 客户端验证 JWT token
        const { data: { user }, error } = await supabase.auth.getUser(token);
        if (error) {
            logger_1.default.error('Supabase token verification failed', error);
            throw new Error(`Invalid token: ${error.message}`);
        }
        if (!user) {
            throw new Error('No user found for token');
        }
        logger_1.default.info('Supabase token verified successfully', {
            userId: user.id,
            email: user.email
        });
        return {
            sub: user.id, // 用户ID
            email: user.email, // 邮箱
            aud: user.aud, // 受众
            user_metadata: user.user_metadata,
            app_metadata: user.app_metadata
        };
    }
    catch (error) {
        logger_1.default.error('Error verifying Supabase token', error);
        throw error;
    }
}
exports.default = supabase;
