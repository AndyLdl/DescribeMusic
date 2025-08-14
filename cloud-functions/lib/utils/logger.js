"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = exports.LogLevel = void 0;
const config_1 = __importDefault(require("./config"));
var LogLevel;
(function (LogLevel) {
    LogLevel[LogLevel["DEBUG"] = 0] = "DEBUG";
    LogLevel[LogLevel["INFO"] = 1] = "INFO";
    LogLevel[LogLevel["WARN"] = 2] = "WARN";
    LogLevel[LogLevel["ERROR"] = 3] = "ERROR";
})(LogLevel || (exports.LogLevel = LogLevel = {}));
class Logger {
    constructor() {
        this.currentLevel = config_1.default.environment === 'production' ? LogLevel.INFO : LogLevel.DEBUG;
    }
    log(level, message, metadata, error, requestId) {
        if (level < this.currentLevel) {
            return;
        }
        const entry = {
            level,
            message,
            timestamp: new Date().toISOString(),
            requestId,
            metadata,
            error: error ? {
                name: error.name,
                message: error.message,
                stack: error.stack,
            } : undefined,
        };
        const levelNames = ['DEBUG', 'INFO', 'WARN', 'ERROR'];
        const levelName = levelNames[level];
        const logMessage = `[${entry.timestamp}] ${levelName} ${requestId ? `[${requestId}] ` : ''}${message}`;
        if (metadata) {
            console.log(logMessage, metadata);
        }
        else {
            console.log(logMessage);
        }
        if (error) {
            console.error('Error details:', error);
        }
    }
    debug(message, metadata, requestId) {
        this.log(LogLevel.DEBUG, message, metadata, undefined, requestId);
    }
    info(message, metadata, requestId) {
        this.log(LogLevel.INFO, message, metadata, undefined, requestId);
    }
    warn(message, metadata, requestId) {
        this.log(LogLevel.WARN, message, metadata, undefined, requestId);
    }
    error(message, error, metadata, requestId) {
        this.log(LogLevel.ERROR, message, metadata, error, requestId);
    }
    // Helper methods for common patterns
    apiRequest(method, path, requestId, metadata) {
        this.info(`API Request: ${method} ${path}`, metadata, requestId);
    }
    apiResponse(method, path, statusCode, duration, requestId) {
        this.info(`API Response: ${method} ${path} - ${statusCode} (${duration}ms)`, undefined, requestId);
    }
    analysisStart(filename, requestId) {
        this.info(`Starting analysis for: ${filename}`, undefined, requestId);
    }
    analysisComplete(filename, duration, requestId) {
        this.info(`Analysis completed for: ${filename} in ${duration}ms`, undefined, requestId);
    }
    geminiRequest(prompt, requestId) {
        this.debug(`Gemini API request`, { promptLength: prompt.length }, requestId);
    }
    geminiResponse(tokens, duration, requestId) {
        this.debug(`Gemini API response: ${tokens} tokens in ${duration}ms`, undefined, requestId);
    }
}
exports.logger = new Logger();
exports.default = exports.logger;
