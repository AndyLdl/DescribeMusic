"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreditConsumptionError = exports.CreditCalculationError = exports.InsufficientCreditsError = exports.CreditError = exports.TimeoutError = exports.RateLimitError = exports.GeminiError = exports.FileError = exports.ValidationError = exports.AppError = void 0;
exports.errorHandler = errorHandler;
exports.createErrorResponse = createErrorResponse;
const types_1 = require("../types");
const logger_1 = __importDefault(require("./logger"));
class AppError extends Error {
    constructor(code, message, statusCode = types_1.HttpStatus.INTERNAL_SERVER_ERROR, details) {
        super(message);
        this.name = 'AppError';
        this.code = code;
        this.statusCode = statusCode;
        this.details = details;
        // Maintains proper stack trace for where error was thrown
        Error.captureStackTrace(this, AppError);
    }
}
exports.AppError = AppError;
class ValidationError extends AppError {
    constructor(message, details) {
        super(types_1.ErrorCode.INVALID_REQUEST, message, types_1.HttpStatus.BAD_REQUEST, details);
        this.name = 'ValidationError';
    }
}
exports.ValidationError = ValidationError;
class FileError extends AppError {
    constructor(code, message, details) {
        const statusCode = code === types_1.ErrorCode.FILE_TOO_LARGE
            ? types_1.HttpStatus.PAYLOAD_TOO_LARGE
            : code === types_1.ErrorCode.UNSUPPORTED_FILE_TYPE
                ? types_1.HttpStatus.UNSUPPORTED_MEDIA_TYPE
                : types_1.HttpStatus.BAD_REQUEST;
        super(code, message, statusCode, details);
        this.name = 'FileError';
    }
}
exports.FileError = FileError;
class GeminiError extends AppError {
    constructor(message, details) {
        super(types_1.ErrorCode.GEMINI_API_ERROR, message, types_1.HttpStatus.BAD_GATEWAY, details);
        this.name = 'GeminiError';
    }
}
exports.GeminiError = GeminiError;
class RateLimitError extends AppError {
    constructor(message = 'Rate limit exceeded') {
        super(types_1.ErrorCode.RATE_LIMIT_EXCEEDED, message, types_1.HttpStatus.TOO_MANY_REQUESTS);
        this.name = 'RateLimitError';
    }
}
exports.RateLimitError = RateLimitError;
class TimeoutError extends AppError {
    constructor(message = 'Request timeout') {
        super(types_1.ErrorCode.TIMEOUT_ERROR, message, types_1.HttpStatus.REQUEST_TIMEOUT);
        this.name = 'TimeoutError';
    }
}
exports.TimeoutError = TimeoutError;
class CreditError extends AppError {
    constructor(code, message, details) {
        const statusCode = code === types_1.ErrorCode.INSUFFICIENT_CREDITS
            ? types_1.HttpStatus.PAYMENT_REQUIRED
            : types_1.HttpStatus.BAD_REQUEST;
        super(code, message, statusCode, details);
        this.name = 'CreditError';
    }
}
exports.CreditError = CreditError;
class InsufficientCreditsError extends CreditError {
    constructor(required, available, isTrialUser = false) {
        const userType = isTrialUser ? 'trial' : 'registered';
        const message = isTrialUser
            ? `Insufficient trial credits. Required: ${required}, Available: ${available}. Please register for a free account to get more credits.`
            : `Insufficient credits. Required: ${required}, Available: ${available}. Please purchase more credits to continue.`;
        super(types_1.ErrorCode.INSUFFICIENT_CREDITS, message, {
            required,
            available,
            isTrialUser,
            userType
        });
        this.name = 'InsufficientCreditsError';
    }
}
exports.InsufficientCreditsError = InsufficientCreditsError;
class CreditCalculationError extends CreditError {
    constructor(message, details) {
        super(types_1.ErrorCode.CREDIT_CALCULATION_ERROR, message, details);
        this.name = 'CreditCalculationError';
    }
}
exports.CreditCalculationError = CreditCalculationError;
class CreditConsumptionError extends CreditError {
    constructor(message, details) {
        super(types_1.ErrorCode.CREDIT_CONSUMPTION_FAILED, message, details);
        this.name = 'CreditConsumptionError';
    }
}
exports.CreditConsumptionError = CreditConsumptionError;
// Error handler for Express middleware
function errorHandler(error, requestId) {
    const timestamp = new Date().toISOString();
    // Log the error
    logger_1.default.error(`Error occurred`, error, { requestId }, requestId);
    // Handle known application errors
    if (error instanceof AppError) {
        return {
            code: error.code,
            message: error.message,
            details: error.details,
            timestamp,
            requestId,
        };
    }
    // Handle common Node.js errors
    if (error.name === 'ValidationError') {
        return {
            code: types_1.ErrorCode.INVALID_REQUEST,
            message: error.message,
            timestamp,
            requestId,
        };
    }
    if (error.name === 'MulterError') {
        const multerError = error;
        if (multerError.code === 'LIMIT_FILE_SIZE') {
            return {
                code: types_1.ErrorCode.FILE_TOO_LARGE,
                message: 'File size exceeds the maximum allowed limit',
                timestamp,
                requestId,
            };
        }
    }
    // Handle timeout errors
    if (error.name === 'TimeoutError' || error.message.includes('timeout')) {
        return {
            code: types_1.ErrorCode.TIMEOUT_ERROR,
            message: 'Request timeout',
            timestamp,
            requestId,
        };
    }
    // Handle network errors
    if (error.message.includes('ECONNREFUSED') || error.message.includes('ENOTFOUND')) {
        return {
            code: types_1.ErrorCode.GEMINI_API_ERROR,
            message: 'Unable to connect to external service',
            timestamp,
            requestId,
        };
    }
    // Handle credit-related errors
    if (error.message.includes('Insufficient credits') || error.message.includes('Insufficient trial credits')) {
        return {
            code: types_1.ErrorCode.INSUFFICIENT_CREDITS,
            message: error.message,
            timestamp,
            requestId,
        };
    }
    if (error.message.includes('Failed to consume credits') || error.message.includes('Failed to consume trial credits')) {
        return {
            code: types_1.ErrorCode.CREDIT_CONSUMPTION_FAILED,
            message: error.message,
            timestamp,
            requestId,
        };
    }
    // Default internal server error
    return {
        code: types_1.ErrorCode.INTERNAL_ERROR,
        message: 'An unexpected error occurred',
        timestamp,
        requestId,
    };
}
// Helper function to create standardized error responses
function createErrorResponse(error, requestId) {
    const errorResponse = errorHandler(error, requestId);
    const statusCode = error instanceof AppError
        ? error.statusCode
        : types_1.HttpStatus.INTERNAL_SERVER_ERROR;
    return {
        statusCode,
        body: errorResponse,
    };
}
