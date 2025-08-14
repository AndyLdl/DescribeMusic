"use strict";
/**
 * Describe Music - Cloud Functions
 *
 * Main entry point for all cloud functions.
 * This file exports all available functions for Firebase deployment.
 */
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeAudioFromUrl = exports.generateUploadUrl = exports.version = exports.healthCheck = exports.analyzeAudio = void 0;
const admin = __importStar(require("firebase-admin"));
const config_1 = __importStar(require("./utils/config"));
const logger_1 = __importDefault(require("./utils/logger"));
const analyzeAudio_1 = require("./functions/analyzeAudio");
// Initialize Firebase Admin SDK
if (!admin.apps.length) {
    admin.initializeApp({
        projectId: config_1.default.firebase.projectId,
        storageBucket: config_1.default.firebase.storageBucket,
    });
}
// Validate configuration on startup
const configValidation = (0, config_1.validateConfig)();
if (!configValidation.isValid) {
    logger_1.default.error('Configuration validation failed', new Error('Invalid configuration'), {
        errors: configValidation.errors
    });
    // In production, we might want to fail fast
    if (config_1.default.environment === 'production') {
        throw new Error(`Configuration errors: ${configValidation.errors.join(', ')}`);
    }
    else {
        logger_1.default.warn('Continuing with invalid configuration in development mode');
    }
}
else {
    logger_1.default.info('Configuration validation passed');
}
// Export all cloud functions
var analyzeAudio_2 = require("./functions/analyzeAudio");
Object.defineProperty(exports, "analyzeAudio", { enumerable: true, get: function () { return analyzeAudio_2.analyzeAudio; } });
// Health check function
const functions = __importStar(require("firebase-functions/v1"));
exports.healthCheck = functions
    .region('us-central1')
    .https
    .onRequest((req, res) => {
    const configValidation = (0, config_1.validateConfig)();
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        environment: config_1.default.environment,
        config: {
            isValid: configValidation.isValid,
            errors: configValidation.errors
        },
        services: {
            firebase: admin.apps.length > 0,
            gemini: !!config_1.default.googleAI.apiKey
        }
    });
});
// Version info function
exports.version = functions
    .region('us-central1')
    .https
    .onRequest((req, res) => {
    res.json({
        name: 'describe-music-cloud-functions',
        version: '1.0.0',
        description: 'Cloud functions for Describe Music - AI-powered audio analysis platform',
        timestamp: new Date().toISOString(),
        environment: config_1.default.environment,
        features: [
            'Audio Analysis with Gemini AI',
            'Multi-format Audio Support',
            'Comprehensive Music Analysis',
            'AI-Generated Tags',
            'Quality Assessment',
            'Emotional Analysis',
            'Structural Analysis'
        ]
    });
});
// Generate signed URL for direct GCS upload
exports.generateUploadUrl = functions
    .region('us-central1')
    .https
    .onRequest(async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }
    try {
        const { fileName, contentType } = req.body;
        if (!fileName) {
            res.status(400).json({
                success: false,
                error: { code: 'MISSING_FILENAME', message: 'File name is required' }
            });
            return;
        }
        // Generate unique file path
        const timestamp = Date.now();
        const randomId = Math.random().toString(36).substring(2, 15);
        const fileExtension = fileName.split('.').pop() || 'mp3';
        const uniqueFileName = `audio/${timestamp}_${randomId}.${fileExtension}`;
        // Get storage bucket (use default bucket name for Firebase project)
        const bucket = admin.storage().bucket('describe-music');
        const file = bucket.file(uniqueFileName);
        // Generate signed URL for upload (valid for 15 minutes)
        const [uploadUrl] = await file.getSignedUrl({
            version: 'v4',
            action: 'write',
            expires: Date.now() + 15 * 60 * 1000, // 15 minutes
            contentType: contentType || 'audio/mpeg'
        });
        // Generate download URL for later analysis
        const [downloadUrl] = await file.getSignedUrl({
            version: 'v4',
            action: 'read',
            expires: Date.now() + 24 * 60 * 60 * 1000 // 24 hours
        });
        console.log('Generated upload URL for:', { fileName, uniqueFileName });
        res.json({
            success: true,
            data: {
                uploadUrl,
                downloadUrl,
                fileName: uniqueFileName,
                originalName: fileName,
                expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString()
            },
            timestamp: new Date().toISOString(),
            requestId: `upload_${timestamp}`
        });
    }
    catch (error) {
        console.error('Upload URL generation error:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'URL_GENERATION_ERROR',
                message: error instanceof Error ? error.message : 'Unknown error'
            }
        });
    }
});
// Analyze audio from GCS URL (renamed from analyzeAudioBase64)
exports.analyzeAudioFromUrl = functions
    .region('us-central1')
    .https
    .onRequest(async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }
    try {
        const { fileUrl, fileName, options } = req.body;
        if (!fileUrl) {
            res.status(400).json({
                success: false,
                error: { code: 'MISSING_FILE_URL', message: 'File URL is required' }
            });
            return;
        }
        console.log('Analyzing audio from GCS URL:', { fileUrl, fileName });
        // Download file from GCS and analyze with Gemini
        const analysisResult = await performRealAnalysis(fileUrl, fileName, options || {});
        res.json({
            success: true,
            data: analysisResult,
            timestamp: new Date().toISOString(),
            requestId: `req_${Date.now()}`
        });
    }
    catch (error) {
        console.error('Analysis error:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'ANALYSIS_ERROR',
                message: error instanceof Error ? error.message : 'Unknown error'
            }
        });
    }
});
/**
 * Perform real AI analysis using Gemini
 */
async function performRealAnalysis(fileUrl, fileName, options) {
    var _a;
    const startTime = Date.now();
    const requestId = `analysis_${startTime}`;
    try {
        logger_1.default.info('Starting real audio analysis', { fileUrl, fileName, requestId });
        // Download file from GCS
        const bucket = admin.storage().bucket('describe-music');
        const filePath = extractFilePathFromUrl(fileUrl);
        const file = bucket.file(filePath);
        // Check if file exists
        const [exists] = await file.exists();
        if (!exists) {
            throw new Error(`File not found: ${filePath}`);
        }
        // Get file metadata
        const [metadata] = await file.getMetadata();
        const fileSize = metadata.size || 0;
        // Download file content for analysis
        const [fileBuffer] = await file.download();
        // Create AudioFile object
        const audioFile = {
            originalName: fileName,
            mimeType: metadata.contentType || 'audio/mpeg',
            size: fileSize,
            buffer: fileBuffer,
            format: ((_a = fileName.split('.').pop()) === null || _a === void 0 ? void 0 : _a.toUpperCase()) || 'MP3'
        };
        logger_1.default.info('File downloaded successfully', {
            size: fileSize,
            mimeType: audioFile.mimeType,
            requestId
        });
        // Use the unified analysis logic from analyzeAudio.ts
        const result = await (0, analyzeAudio_1.performAnalysis)(audioFile, options, requestId);
        return result;
    }
    catch (error) {
        logger_1.default.error(`Analysis failed: ${error.message}`, error, { fileUrl, fileName }, requestId);
        throw error;
    }
}
/**
 * Extract file path from GCS signed URL
 */
function extractFilePathFromUrl(url) {
    try {
        const urlObj = new URL(url);
        const pathname = urlObj.pathname;
        // Remove leading slash and bucket name
        const parts = pathname.split('/');
        if (parts.length >= 3) {
            return parts.slice(2).join('/'); // Remove '' and bucket name
        }
        return pathname.substring(1); // Remove leading slash
    }
    catch (error) {
        // Fallback: assume it's just the file path
        return url.split('/').pop() || url;
    }
}
logger_1.default.info('Cloud Functions initialized', {
    environment: config_1.default.environment,
    configValid: configValidation.isValid
});
