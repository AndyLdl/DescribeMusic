import * as dotenv from 'dotenv';
import * as functions from 'firebase-functions';

// Load environment variables for local development
dotenv.config();

// Get Firebase Functions config (for production)
const firebaseConfig = functions.config();

export interface Config {
    // Vertex AI (替代Google AI)
    vertexAI: {
        projectId: string;
        location: string;
        model: string;
        maxTokens: number;
        temperature: number;
    };

    // 保留Google AI配置作为备用
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

    // Supabase
    supabase: {
        url: string;
        serviceRoleKey: string;
    };

    // Lemonsqueezy
    lemonsqueezy: {
        apiKey: string;
        storeId: string;
        webhookSecret: string;
        basicVariantId: string;
        proVariantId: string;
        premiumVariantId: string;
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
    vertexAI: {
        projectId: firebaseConfig?.vertex_ai?.project_id || process.env.VERTEX_AI_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT || 'describe-music',
        location: firebaseConfig?.vertex_ai?.location || process.env.VERTEX_AI_LOCATION || 'us-central1',
        model: process.env.VERTEX_AI_MODEL || 'gemini-1.5-flash',
        maxTokens: parseInt(process.env.VERTEX_AI_MAX_TOKENS || '2048'),
        temperature: parseFloat(process.env.VERTEX_AI_TEMPERATURE || '0.7'),
    },

    googleAI: {
        // 保留作为备用
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

    supabase: {
        url: firebaseConfig?.supabase?.url || process.env.SUPABASE_URL || '',
        serviceRoleKey: firebaseConfig?.supabase?.service_role_key || process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    },

    lemonsqueezy: {
        apiKey: firebaseConfig?.lemonsqueezy?.api_key || process.env.LEMONSQUEEZY_API_KEY || '',
        storeId: firebaseConfig?.lemonsqueezy?.store_id || process.env.LEMONSQUEEZY_STORE_ID || '',
        webhookSecret: firebaseConfig?.lemonsqueezy?.webhook_secret || process.env.LEMONSQUEEZY_WEBHOOK_SECRET || '',
        basicVariantId: firebaseConfig?.lemonsqueezy?.basic_variant_id || process.env.LEMONSQUEEZY_BASIC_VARIANT_ID || '',
        proVariantId: firebaseConfig?.lemonsqueezy?.pro_variant_id || process.env.LEMONSQUEEZY_PRO_VARIANT_ID || '',
        premiumVariantId: firebaseConfig?.lemonsqueezy?.premium_variant_id || process.env.LEMONSQUEEZY_PREMIUM_VARIANT_ID || '',
    },

    cors: {
        allowedOrigins: (firebaseConfig?.cors?.allowed_origins || process.env.ALLOWED_ORIGINS || '')
            .split(',')
            .filter(Boolean) || [
                'http://localhost:4321',
                'https://localhost:4321',
                'http://localhost:4322',
                'https://localhost:4322',
                'http://localhost:4323',
                'https://localhost:4323',
                'http://localhost:4327',
                'https://localhost:4327',
                'http://localhost:3000',
                'https://localhost:3000',
                'https://www.describemusic.net/',
                'https://describemusic.net'
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

    if (!config.supabase.url) {
        errors.push('SUPABASE_URL is required');
    }

    if (!config.supabase.serviceRoleKey) {
        errors.push('SUPABASE_SERVICE_ROLE_KEY is required');
    }

    if (!config.lemonsqueezy.apiKey) {
        errors.push('LEMONSQUEEZY_API_KEY is required');
    }

    if (!config.lemonsqueezy.storeId) {
        errors.push('LEMONSQUEEZY_STORE_ID is required');
    }

    if (!config.lemonsqueezy.webhookSecret) {
        errors.push('LEMONSQUEEZY_WEBHOOK_SECRET is required');
    }

    if (config.vertexAI.maxTokens <= 0) {
        errors.push('VERTEX_AI_MAX_TOKENS must be a positive number');
    }

    if (!config.vertexAI.projectId) {
        errors.push('VERTEX_AI_PROJECT_ID is required');
    }

    if (!config.vertexAI.location) {
        errors.push('VERTEX_AI_LOCATION is required');
    }

    // 保留Google AI验证作为备用
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