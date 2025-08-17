import * as dotenv from 'dotenv';
import * as functions from 'firebase-functions';

// Load environment variables for local development
dotenv.config();

// Get Firebase Functions config (for production)
const firebaseConfig = functions.config();

export interface Config {
    // Google AI
    googleAI: {
        apiKey: string;
        model: string;
        maxTokens: number;
        temperature: number;
    };

    // Firebase
    firebase: {
        projectId: string;
        storageBucket: string;
    };

    // CORS
    cors: {
        allowedOrigins: string[];
    };

    // Rate Limiting
    rateLimit: {
        maxRequestsPerMinute: number;
        maxFileSizeMB: number;
    };

    // Environment
    environment: 'development' | 'production' | 'test';
}

const config: Config = {
    googleAI: {
        // Try Firebase config first, then environment variables
        apiKey: firebaseConfig?.google_ai?.api_key || process.env.GOOGLE_AI_API_KEY || '',
        model: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
        maxTokens: parseInt(process.env.GEMINI_MAX_TOKENS || '2048'),
        temperature: parseFloat(process.env.GEMINI_TEMPERATURE || '0.7'),
    },

    firebase: {
        // Try Firebase config first, then defaults for emulator
        projectId: firebaseConfig?.app?.project_id || 'describe-music',
        storageBucket: firebaseConfig?.app?.storage_bucket || 'describe-music.appspot.com',
    },

    cors: {
        allowedOrigins: (firebaseConfig?.cors?.allowed_origins || process.env.ALLOWED_ORIGINS || '')
            .split(',')
            .filter(Boolean) || [
                'http://localhost:4321',
                'https://localhost:4321',
                'http://localhost:4327',
                'https://localhost:4327',
                'https://www.describemusic.net/'
            ],
    },

    rateLimit: {
        maxRequestsPerMinute: parseInt(process.env.MAX_REQUESTS_PER_MINUTE || '10'),
        maxFileSizeMB: parseInt(process.env.MAX_FILE_SIZE_MB || '50'),
    },

    environment: (process.env.NODE_ENV as 'development' | 'production' | 'test') || 'development',
};

// Validation
export function validateConfig(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!config.googleAI.apiKey) {
        errors.push('GOOGLE_AI_API_KEY is required');
    }

    if (!config.firebase.projectId) {
        errors.push('FIREBASE_PROJECT_ID is required (set via app.project_id in Firebase config or FIREBASE_PROJECT_ID env var)');
    }

    if (config.googleAI.maxTokens <= 0) {
        errors.push('GEMINI_MAX_TOKENS must be a positive number');
    }

    if (config.googleAI.temperature < 0 || config.googleAI.temperature > 2) {
        errors.push('GEMINI_TEMPERATURE must be between 0 and 2');
    }

    if (config.rateLimit.maxRequestsPerMinute <= 0) {
        errors.push('MAX_REQUESTS_PER_MINUTE must be a positive number');
    }

    if (config.rateLimit.maxFileSizeMB <= 0) {
        errors.push('MAX_FILE_SIZE_MB must be a positive number');
    }

    return {
        isValid: errors.length === 0,
        errors
    };
}

export default config;