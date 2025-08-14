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
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var _a, _b, _c, _d;
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateConfig = validateConfig;
const dotenv = __importStar(require("dotenv"));
const functions = __importStar(require("firebase-functions"));
// Load environment variables for local development
dotenv.config();
// Get Firebase Functions config (for production)
const firebaseConfig = functions.config();
const config = {
    googleAI: {
        // Try Firebase config first, then environment variables
        apiKey: ((_a = firebaseConfig === null || firebaseConfig === void 0 ? void 0 : firebaseConfig.google_ai) === null || _a === void 0 ? void 0 : _a.api_key) || process.env.GOOGLE_AI_API_KEY || '',
        model: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
        maxTokens: parseInt(process.env.GEMINI_MAX_TOKENS || '2048'),
        temperature: parseFloat(process.env.GEMINI_TEMPERATURE || '0.7'),
    },
    firebase: {
        // Try Firebase config first, then defaults for emulator
        projectId: ((_b = firebaseConfig === null || firebaseConfig === void 0 ? void 0 : firebaseConfig.app) === null || _b === void 0 ? void 0 : _b.project_id) || 'describe-music',
        storageBucket: ((_c = firebaseConfig === null || firebaseConfig === void 0 ? void 0 : firebaseConfig.app) === null || _c === void 0 ? void 0 : _c.storage_bucket) || 'describe-music.appspot.com',
    },
    cors: {
        allowedOrigins: (((_d = firebaseConfig === null || firebaseConfig === void 0 ? void 0 : firebaseConfig.cors) === null || _d === void 0 ? void 0 : _d.allowed_origins) || process.env.ALLOWED_ORIGINS || '')
            .split(',')
            .filter(Boolean) || [
            'http://localhost:4321',
            'https://localhost:4321',
            'http://localhost:4327',
            'https://localhost:4327'
        ],
    },
    rateLimit: {
        maxRequestsPerMinute: parseInt(process.env.MAX_REQUESTS_PER_MINUTE || '10'),
        maxFileSizeMB: parseInt(process.env.MAX_FILE_SIZE_MB || '50'),
    },
    environment: process.env.NODE_ENV || 'development',
};
// Validation
function validateConfig() {
    const errors = [];
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
exports.default = config;
