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
 */
async function checkUserUsage(userId) {
    var _a, _b, _c;
    try {
        const { data, error } = await supabase.rpc('check_user_monthly_limit', {
            user_uuid: userId
        });
        if (error) {
            logger_1.default.error('Error checking user usage', error);
            throw new Error(`Failed to check user usage: ${error.message}`);
        }
        const result = data === null || data === void 0 ? void 0 : data[0];
        return {
            canAnalyze: (_a = result === null || result === void 0 ? void 0 : result.can_analyze) !== null && _a !== void 0 ? _a : false,
            remainingAnalyses: (_b = result === null || result === void 0 ? void 0 : result.remaining_analyses) !== null && _b !== void 0 ? _b : 0,
            monthlyLimit: (_c = result === null || result === void 0 ? void 0 : result.monthly_limit) !== null && _c !== void 0 ? _c : 10,
            resetDate: (result === null || result === void 0 ? void 0 : result.reset_date) ? new Date(result.reset_date) : undefined
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
 * Consume user monthly usage
 */
async function consumeUserUsage(userId) {
    try {
        const { data, error } = await supabase.rpc('consume_user_monthly_usage', {
            user_uuid: userId
        });
        if (error) {
            logger_1.default.error('Error consuming user usage', error);
            return false;
        }
        const success = data === true;
        if (success) {
            logger_1.default.info('User monthly usage consumed', { userId });
        }
        return success;
    }
    catch (error) {
        logger_1.default.error('Error in consumeUserUsage', error);
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
exports.default = supabase;
