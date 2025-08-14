/**
 * Describe Music - Cloud Functions
 * 
 * Main entry point for all cloud functions.
 * This file exports all available functions for Firebase deployment.
 */

import * as admin from 'firebase-admin';
import config, { validateConfig } from './utils/config';
import logger from './utils/logger';
import { AudioFile, AnalysisResult } from './types/analysis';
import { performAnalysis } from './functions/analyzeAudio';

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
    admin.initializeApp({
        projectId: config.firebase.projectId,
        storageBucket: config.firebase.storageBucket,
    });
}

// Validate configuration on startup
const configValidation = validateConfig();
if (!configValidation.isValid) {
    logger.error('Configuration validation failed', new Error('Invalid configuration'), {
        errors: configValidation.errors
    });

    // In production, we might want to fail fast
    if (config.environment === 'production') {
        throw new Error(`Configuration errors: ${configValidation.errors.join(', ')}`);
    } else {
        logger.warn('Continuing with invalid configuration in development mode');
    }
} else {
    logger.info('Configuration validation passed');
}

// Export all cloud functions
export { analyzeAudio } from './functions/analyzeAudio';

// Health check function
import * as functions from 'firebase-functions/v1';

export const healthCheck = functions
    .region('us-central1')
    .https
    .onRequest((req, res) => {
        const configValidation = validateConfig();

        res.json({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            version: '1.0.0',
            environment: config.environment,
            config: {
                isValid: configValidation.isValid,
                errors: configValidation.errors
            },
            services: {
                firebase: admin.apps.length > 0,
                gemini: !!config.googleAI.apiKey
            }
        });
    });

// Version info function
export const version = functions
    .region('us-central1')
    .https
    .onRequest((req, res) => {
        res.json({
            name: 'describe-music-cloud-functions',
            version: '1.0.0',
            description: 'Cloud functions for Describe Music - AI-powered audio analysis platform',
            timestamp: new Date().toISOString(),
            environment: config.environment,
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
export const generateUploadUrl = functions
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

        } catch (error) {
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
export const analyzeAudioFromUrl = functions
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

        } catch (error) {
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
async function performRealAnalysis(
    fileUrl: string,
    fileName: string,
    options: any
): Promise<AnalysisResult> {
    const startTime = Date.now();
    const requestId = `analysis_${startTime}`;

    try {
        logger.info('Starting real audio analysis', { fileUrl, fileName, requestId });

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
        const audioFile: AudioFile = {
            originalName: fileName,
            mimeType: metadata.contentType || 'audio/mpeg',
            size: fileSize,
            buffer: fileBuffer,
            format: fileName.split('.').pop()?.toUpperCase() || 'MP3'
        };

        logger.info('File downloaded successfully', {
            size: fileSize,
            mimeType: audioFile.mimeType,
            requestId
        });

        // Use the unified analysis logic from analyzeAudio.ts
        const result = await performAnalysis(audioFile, options, requestId);

        return result;

    } catch (error: any) {
        logger.error(`Analysis failed: ${error.message}`, error, { fileUrl, fileName }, requestId);
        throw error;
    }
}

/**
 * Extract file path from GCS signed URL
 */
function extractFilePathFromUrl(url: string): string {
    try {
        const urlObj = new URL(url);
        const pathname = urlObj.pathname;
        // Remove leading slash and bucket name
        const parts = pathname.split('/');
        if (parts.length >= 3) {
            return parts.slice(2).join('/'); // Remove '' and bucket name
        }
        return pathname.substring(1); // Remove leading slash
    } catch (error) {
        // Fallback: assume it's just the file path
        return url.split('/').pop() || url;
    }
}

logger.info('Cloud Functions initialized', {
    environment: config.environment,
    configValid: configValidation.isValid
});