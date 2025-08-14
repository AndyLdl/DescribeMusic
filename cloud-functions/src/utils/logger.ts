import config from './config';

export enum LogLevel {
    DEBUG = 0,
    INFO = 1,
    WARN = 2,
    ERROR = 3,
}

export interface LogEntry {
    level: LogLevel;
    message: string;
    timestamp: string;
    requestId?: string;
    metadata?: any;
    error?: Error;
}

class Logger {
    private currentLevel: LogLevel;

    constructor() {
        this.currentLevel = config.environment === 'production' ? LogLevel.INFO : LogLevel.DEBUG;
    }

    private log(level: LogLevel, message: string, metadata?: any, error?: Error, requestId?: string): void {
        if (level < this.currentLevel) {
            return;
        }

        const entry: LogEntry = {
            level,
            message,
            timestamp: new Date().toISOString(),
            requestId,
            metadata,
            error: error ? {
                name: error.name,
                message: error.message,
                stack: error.stack,
            } as any : undefined,
        };

        const levelNames = ['DEBUG', 'INFO', 'WARN', 'ERROR'];
        const levelName = levelNames[level];

        const logMessage = `[${entry.timestamp}] ${levelName} ${requestId ? `[${requestId}] ` : ''}${message}`;

        if (metadata) {
            console.log(logMessage, metadata);
        } else {
            console.log(logMessage);
        }

        if (error) {
            console.error('Error details:', error);
        }
    }

    debug(message: string, metadata?: any, requestId?: string): void {
        this.log(LogLevel.DEBUG, message, metadata, undefined, requestId);
    }

    info(message: string, metadata?: any, requestId?: string): void {
        this.log(LogLevel.INFO, message, metadata, undefined, requestId);
    }

    warn(message: string, metadata?: any, requestId?: string): void {
        this.log(LogLevel.WARN, message, metadata, undefined, requestId);
    }

    error(message: string, error?: Error, metadata?: any, requestId?: string): void {
        this.log(LogLevel.ERROR, message, metadata, error, requestId);
    }

    // Helper methods for common patterns
    apiRequest(method: string, path: string, requestId: string, metadata?: any): void {
        this.info(`API Request: ${method} ${path}`, metadata, requestId);
    }

    apiResponse(method: string, path: string, statusCode: number, duration: number, requestId: string): void {
        this.info(`API Response: ${method} ${path} - ${statusCode} (${duration}ms)`, undefined, requestId);
    }

    analysisStart(filename: string, requestId: string): void {
        this.info(`Starting analysis for: ${filename}`, undefined, requestId);
    }

    analysisComplete(filename: string, duration: number, requestId: string): void {
        this.info(`Analysis completed for: ${filename} in ${duration}ms`, undefined, requestId);
    }

    geminiRequest(prompt: string, requestId: string): void {
        this.debug(`Gemini API request`, { promptLength: prompt.length }, requestId);
    }

    geminiResponse(tokens: number, duration: number, requestId: string): void {
        this.debug(`Gemini API response: ${tokens} tokens in ${duration}ms`, undefined, requestId);
    }
}

export const logger = new Logger();
export default logger;