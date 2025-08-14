import { ErrorCode, HttpStatus, ErrorResponse } from '../types';
import logger from './logger';

export class AppError extends Error {
    public readonly code: ErrorCode;
    public readonly statusCode: HttpStatus;
    public readonly details?: any;

    constructor(
        code: ErrorCode,
        message: string,
        statusCode: HttpStatus = HttpStatus.INTERNAL_SERVER_ERROR,
        details?: any
    ) {
        super(message);
        this.name = 'AppError';
        this.code = code;
        this.statusCode = statusCode;
        this.details = details;

        // Maintains proper stack trace for where error was thrown
        Error.captureStackTrace(this, AppError);
    }
}

export class ValidationError extends AppError {
    constructor(message: string, details?: any) {
        super(ErrorCode.INVALID_REQUEST, message, HttpStatus.BAD_REQUEST, details);
        this.name = 'ValidationError';
    }
}

export class FileError extends AppError {
    constructor(code: ErrorCode, message: string, details?: any) {
        const statusCode = code === ErrorCode.FILE_TOO_LARGE
            ? HttpStatus.PAYLOAD_TOO_LARGE
            : code === ErrorCode.UNSUPPORTED_FILE_TYPE
                ? HttpStatus.UNSUPPORTED_MEDIA_TYPE
                : HttpStatus.BAD_REQUEST;

        super(code, message, statusCode, details);
        this.name = 'FileError';
    }
}

export class GeminiError extends AppError {
    constructor(message: string, details?: any) {
        super(ErrorCode.GEMINI_API_ERROR, message, HttpStatus.BAD_GATEWAY, details);
        this.name = 'GeminiError';
    }
}

export class RateLimitError extends AppError {
    constructor(message: string = 'Rate limit exceeded') {
        super(ErrorCode.RATE_LIMIT_EXCEEDED, message, HttpStatus.TOO_MANY_REQUESTS);
        this.name = 'RateLimitError';
    }
}

export class TimeoutError extends AppError {
    constructor(message: string = 'Request timeout') {
        super(ErrorCode.TIMEOUT_ERROR, message, HttpStatus.REQUEST_TIMEOUT);
        this.name = 'TimeoutError';
    }
}

// Error handler for Express middleware
export function errorHandler(
    error: Error,
    requestId?: string
): ErrorResponse {
    const timestamp = new Date().toISOString();

    // Log the error
    logger.error(`Error occurred`, error, { requestId }, requestId);

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
            code: ErrorCode.INVALID_REQUEST,
            message: error.message,
            timestamp,
            requestId,
        };
    }

    if (error.name === 'MulterError') {
        const multerError = error as any;
        if (multerError.code === 'LIMIT_FILE_SIZE') {
            return {
                code: ErrorCode.FILE_TOO_LARGE,
                message: 'File size exceeds the maximum allowed limit',
                timestamp,
                requestId,
            };
        }
    }

    // Handle timeout errors
    if (error.name === 'TimeoutError' || error.message.includes('timeout')) {
        return {
            code: ErrorCode.TIMEOUT_ERROR,
            message: 'Request timeout',
            timestamp,
            requestId,
        };
    }

    // Handle network errors
    if (error.message.includes('ECONNREFUSED') || error.message.includes('ENOTFOUND')) {
        return {
            code: ErrorCode.GEMINI_API_ERROR,
            message: 'Unable to connect to external service',
            timestamp,
            requestId,
        };
    }

    // Default internal server error
    return {
        code: ErrorCode.INTERNAL_ERROR,
        message: 'An unexpected error occurred',
        timestamp,
        requestId,
    };
}

// Helper function to create standardized error responses
export function createErrorResponse(
    error: AppError | Error,
    requestId?: string
): { statusCode: number; body: ErrorResponse } {
    const errorResponse = errorHandler(error, requestId);

    const statusCode = error instanceof AppError
        ? error.statusCode
        : HttpStatus.INTERNAL_SERVER_ERROR;

    return {
        statusCode,
        body: errorResponse,
    };
}