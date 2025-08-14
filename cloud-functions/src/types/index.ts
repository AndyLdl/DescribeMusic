// Export all types from submodules
export * from './analysis';
export * from './gemini';

// Common types
export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    error?: {
        code: string;
        message: string;
        details?: any;
    };
    timestamp: string;
    requestId?: string;
}

export interface RequestMetadata {
    requestId: string;
    timestamp: string;
    userAgent?: string;
    ip?: string;
    origin?: string;
}

export interface RateLimitInfo {
    limit: number;
    remaining: number;
    resetTime: number;
}

export interface ErrorResponse {
    code: string;
    message: string;
    details?: any;
    timestamp: string;
    requestId?: string;
}

// HTTP Status Codes
export enum HttpStatus {
    OK = 200,
    CREATED = 201,
    BAD_REQUEST = 400,
    UNAUTHORIZED = 401,
    FORBIDDEN = 403,
    NOT_FOUND = 404,
    METHOD_NOT_ALLOWED = 405,
    REQUEST_TIMEOUT = 408,
    PAYLOAD_TOO_LARGE = 413,
    UNSUPPORTED_MEDIA_TYPE = 415,
    TOO_MANY_REQUESTS = 429,
    INTERNAL_SERVER_ERROR = 500,
    BAD_GATEWAY = 502,
    SERVICE_UNAVAILABLE = 503,
    GATEWAY_TIMEOUT = 504
}

// Error Codes
export enum ErrorCode {
    // General errors
    INTERNAL_ERROR = 'INTERNAL_ERROR',
    INVALID_REQUEST = 'INVALID_REQUEST',
    MISSING_PARAMETERS = 'MISSING_PARAMETERS',

    // Authentication errors
    UNAUTHORIZED = 'UNAUTHORIZED',
    INVALID_API_KEY = 'INVALID_API_KEY',

    // File errors
    FILE_TOO_LARGE = 'FILE_TOO_LARGE',
    UNSUPPORTED_FILE_TYPE = 'UNSUPPORTED_FILE_TYPE',
    FILE_PROCESSING_ERROR = 'FILE_PROCESSING_ERROR',

    // Analysis errors
    ANALYSIS_FAILED = 'ANALYSIS_FAILED',
    GEMINI_API_ERROR = 'GEMINI_API_ERROR',
    TIMEOUT_ERROR = 'TIMEOUT_ERROR',

    // Rate limiting
    RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED'
}