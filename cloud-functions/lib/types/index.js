"use strict";
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
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ErrorCode = exports.HttpStatus = void 0;
// Export all types from submodules
__exportStar(require("./analysis"), exports);
__exportStar(require("./gemini"), exports);
// HTTP Status Codes
var HttpStatus;
(function (HttpStatus) {
    HttpStatus[HttpStatus["OK"] = 200] = "OK";
    HttpStatus[HttpStatus["CREATED"] = 201] = "CREATED";
    HttpStatus[HttpStatus["BAD_REQUEST"] = 400] = "BAD_REQUEST";
    HttpStatus[HttpStatus["UNAUTHORIZED"] = 401] = "UNAUTHORIZED";
    HttpStatus[HttpStatus["PAYMENT_REQUIRED"] = 402] = "PAYMENT_REQUIRED";
    HttpStatus[HttpStatus["FORBIDDEN"] = 403] = "FORBIDDEN";
    HttpStatus[HttpStatus["NOT_FOUND"] = 404] = "NOT_FOUND";
    HttpStatus[HttpStatus["METHOD_NOT_ALLOWED"] = 405] = "METHOD_NOT_ALLOWED";
    HttpStatus[HttpStatus["REQUEST_TIMEOUT"] = 408] = "REQUEST_TIMEOUT";
    HttpStatus[HttpStatus["PAYLOAD_TOO_LARGE"] = 413] = "PAYLOAD_TOO_LARGE";
    HttpStatus[HttpStatus["UNSUPPORTED_MEDIA_TYPE"] = 415] = "UNSUPPORTED_MEDIA_TYPE";
    HttpStatus[HttpStatus["TOO_MANY_REQUESTS"] = 429] = "TOO_MANY_REQUESTS";
    HttpStatus[HttpStatus["INTERNAL_SERVER_ERROR"] = 500] = "INTERNAL_SERVER_ERROR";
    HttpStatus[HttpStatus["BAD_GATEWAY"] = 502] = "BAD_GATEWAY";
    HttpStatus[HttpStatus["SERVICE_UNAVAILABLE"] = 503] = "SERVICE_UNAVAILABLE";
    HttpStatus[HttpStatus["GATEWAY_TIMEOUT"] = 504] = "GATEWAY_TIMEOUT";
})(HttpStatus || (exports.HttpStatus = HttpStatus = {}));
// Error Codes
var ErrorCode;
(function (ErrorCode) {
    // General errors
    ErrorCode["INTERNAL_ERROR"] = "INTERNAL_ERROR";
    ErrorCode["INVALID_REQUEST"] = "INVALID_REQUEST";
    ErrorCode["MISSING_PARAMETERS"] = "MISSING_PARAMETERS";
    // Authentication errors
    ErrorCode["UNAUTHORIZED"] = "UNAUTHORIZED";
    ErrorCode["INVALID_API_KEY"] = "INVALID_API_KEY";
    // File errors
    ErrorCode["FILE_TOO_LARGE"] = "FILE_TOO_LARGE";
    ErrorCode["UNSUPPORTED_FILE_TYPE"] = "UNSUPPORTED_FILE_TYPE";
    ErrorCode["FILE_PROCESSING_ERROR"] = "FILE_PROCESSING_ERROR";
    // Analysis errors
    ErrorCode["ANALYSIS_FAILED"] = "ANALYSIS_FAILED";
    ErrorCode["GEMINI_API_ERROR"] = "GEMINI_API_ERROR";
    ErrorCode["TIMEOUT_ERROR"] = "TIMEOUT_ERROR";
    // Rate limiting
    ErrorCode["RATE_LIMIT_EXCEEDED"] = "RATE_LIMIT_EXCEEDED";
    // Credit system errors
    ErrorCode["INSUFFICIENT_CREDITS"] = "INSUFFICIENT_CREDITS";
    ErrorCode["CREDIT_CALCULATION_ERROR"] = "CREDIT_CALCULATION_ERROR";
    ErrorCode["CREDIT_CONSUMPTION_FAILED"] = "CREDIT_CONSUMPTION_FAILED";
})(ErrorCode || (exports.ErrorCode = ErrorCode = {}));
