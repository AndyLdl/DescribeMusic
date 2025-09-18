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
import {
    checkDeviceUsage,
    checkUserUsage,
    consumeDeviceUsage,
    consumeUserUsage,
    logUsageActivity,
    checkTrialCredits,
    consumeTrialCredits,
    refundUserCredits,
    refundTrialCredits
} from './utils/supabase';

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
export { lemonsqueezyWebhook } from './functions/lemonsqueezyWebhook';

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
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Device-Fingerprint, X-User-ID, Accept, Origin, X-Requested-With');

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
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Device-Fingerprint, X-User-ID, Accept, Origin, X-Requested-With');

        if (req.method === 'OPTIONS') {
            res.status(200).end();
            return;
        }

        if (req.method !== 'POST') {
            res.status(405).json({ error: 'Method not allowed' });
            return;
        }

        let userInfo: { userId?: string, deviceFingerprint?: string, creditsConsumed?: number } = {};

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

            // Extract user information for potential refund
            const authHeader = req.get('Authorization');
            const deviceFingerprint = req.get('X-Device-Fingerprint');

            if (authHeader && authHeader.startsWith('Bearer ')) {
                userInfo.userId = req.get('X-User-ID');
            } else if (deviceFingerprint) {
                userInfo.deviceFingerprint = deviceFingerprint;
            }

            // Get duration from frontend (more efficient than downloading entire file)
            const frontendDuration = options.audioDuration || 0;

            console.log('Received request with options:', {
                audioDuration: options.audioDuration,
                frontendDuration,
                fileName,
                optionsKeys: Object.keys(options)
            });

            // Validate duration is reasonable
            if (frontendDuration <= 0) {
                throw new Error(`Audio duration is required and must be greater than 0. Received: ${frontendDuration}`);
            }
            if (frontendDuration > 3600) { // Max 1 hour
                throw new Error('Audio duration exceeds maximum allowed length (1 hour)');
            }

            console.log('Using frontend-detected duration:', { frontendDuration, fileName });

            // Calculate credits needed and store for potential refund
            userInfo.creditsConsumed = Math.ceil(frontendDuration);

            // Check and consume usage limits based on frontend-detected duration
            await checkAndConsumeUsageFromUrl(req, fileName, frontendDuration);

            // Download file only for analysis (not for duration detection)
            const audioFile = await downloadForAnalysis(fileUrl, fileName);

            // Analyze with Gemini using the downloaded file
            const analysisResult = await performAnalysisWithFile(audioFile, options || {});

            res.json({
                success: true,
                data: analysisResult,
                timestamp: new Date().toISOString(),
                requestId: `req_${Date.now()}`
            });

        } catch (error) {
            console.error('Analysis error:', error);

            // Refund credits if analysis failed after consumption
            if (userInfo.creditsConsumed && userInfo.creditsConsumed > 0) {
                try {
                    if (userInfo.userId) {
                        await refundUserCredits(
                            userInfo.userId,
                            userInfo.creditsConsumed,
                            `Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`
                        );
                        logger.info('Credits refunded for failed analysis', {
                            userId: userInfo.userId,
                            creditsRefunded: userInfo.creditsConsumed
                        });
                    } else if (userInfo.deviceFingerprint) {
                        await refundTrialCredits(
                            userInfo.deviceFingerprint,
                            userInfo.creditsConsumed,
                            `Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`
                        );
                        logger.info('Trial credits refunded for failed analysis', {
                            deviceFingerprint: userInfo.deviceFingerprint,
                            creditsRefunded: userInfo.creditsConsumed
                        });
                    }
                } catch (refundError) {
                    logger.error('Failed to refund credits after analysis failure', refundError as Error);
                }
            }

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
 * Download audio file for analysis only (duration already known from frontend)
 */
async function downloadForAnalysis(fileUrl: string, fileName: string): Promise<AudioFile> {
    const startTime = Date.now();
    const requestId = `download_${startTime}`;

    try {
        logger.info('Downloading audio file for analysis', { fileUrl, fileName, requestId });

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

        // Download file content
        const [fileBuffer] = await file.download();

        // Create AudioFile object
        const audioFile: AudioFile = {
            originalName: fileName,
            mimeType: metadata.contentType || 'audio/mpeg',
            size: fileSize,
            buffer: fileBuffer,
            format: fileName.split('.').pop()?.toUpperCase() || 'MP3'
        };

        logger.info('Audio file downloaded for analysis', {
            size: fileSize,
            requestId
        });

        return audioFile;

    } catch (error: any) {
        logger.error(`Download failed: ${error.message}`, error, { fileUrl, fileName }, requestId);
        throw error;
    }
}

/**
 * Perform AI analysis using already downloaded audio file
 */
async function performAnalysisWithFile(audioFile: AudioFile, options: any): Promise<AnalysisResult> {
    const startTime = Date.now();
    const requestId = `analysis_${startTime}`;

    try {
        logger.info('Starting AI analysis with downloaded file', {
            fileName: audioFile.originalName,
            size: audioFile.size,
            requestId
        });

        // Use the unified analysis logic from analyzeAudio.ts
        const result = await performAnalysis(audioFile, options, requestId);

        return result;

    } catch (error: any) {
        logger.error(`Analysis failed: ${error.message}`, error, { fileName: audioFile.originalName }, requestId);
        throw error;
    }
}

/**
 * Perform real AI analysis using Gemini (legacy function, kept for compatibility)
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

/**
 * Check and consume usage limits for URL-based analysis
 */
async function checkAndConsumeUsageFromUrl(req: any, fileName: string, audioDurationSeconds: number): Promise<void> {
    const startTime = Date.now();
    const requestId = `req_${Date.now()}`;

    try {
        // Extract user information from request headers
        const authHeader = req.get('Authorization');
        const deviceFingerprint = req.get('X-Device-Fingerprint');

        let userId: string | undefined;

        // Check if user is authenticated
        if (authHeader && authHeader.startsWith('Bearer ')) {
            // For now, we'll extract user ID from a custom header
            // In a real implementation, you'd verify the JWT token
            userId = req.get('X-User-ID');
        }

        if (userId) {
            // Handle registered user
            logger.info('Checking usage for registered user', { userId, requestId });

            const userUsage = await checkUserUsage(userId);

            if (!userUsage.canAnalyze) {
                throw new Error(
                    `Monthly analysis limit reached. You have used all ${userUsage.monthlyLimit} analyses for this month.`
                );
            }

            // Calculate credits needed based on audio duration (1 credit per second)
            const creditsNeeded = Math.ceil(audioDurationSeconds);

            // Consume user credits based on actual audio duration
            const consumed = await consumeUserUsage(userId, creditsNeeded, `Audio analysis: ${fileName} (${audioDurationSeconds}s)`);
            if (!consumed) {
                throw new Error('Failed to consume user credits. Please try again.');
            }

            logger.info('User credits consumed based on audio duration', {
                userId,
                audioDurationSeconds,
                creditsNeeded,
                requestId
            });

            logger.info('User usage consumed', {
                userId,
                remainingBefore: userUsage.remainingAnalyses,
                requestId
            });

            // Log usage activity
            await logUsageActivity({
                userId,
                analysisType: 'audio',
                fileSize: 0, // We don't have file size here
                processingTime: Date.now() - startTime,
                success: true
            });

        } else if (deviceFingerprint) {
            // Handle trial user
            logger.info('Checking usage for trial user', { deviceFingerprint, requestId });

            const deviceUsage = await checkDeviceUsage(deviceFingerprint);

            if (!deviceUsage.canAnalyze) {
                if (deviceUsage.isRegistered) {
                    throw new Error(
                        'This device is already registered. Please log in to continue using the service.'
                    );
                } else {
                    throw new Error(
                        'Free trial limit reached (5 analyses). Please register for a free account to get 200 credits for audio analysis.'
                    );
                }
            }

            // Calculate credits needed based on audio duration (1 credit per second)
            const creditsNeeded = Math.ceil(audioDurationSeconds);

            // Check if trial user has enough credits
            const hasEnoughCredits = await checkTrialCredits(deviceFingerprint, creditsNeeded);
            if (!hasEnoughCredits.hasEnoughCredits) {
                throw new Error(
                    `Insufficient trial credits. You need ${creditsNeeded} credits but only have ${hasEnoughCredits.currentCredits} remaining.`
                );
            }

            // Consume trial credits based on actual audio duration
            const consumed = await consumeTrialCredits(deviceFingerprint, creditsNeeded, `Audio analysis: ${fileName} (${audioDurationSeconds}s)`);
            if (!consumed.success) {
                throw new Error('Failed to consume trial credits. Please try again.');
            }

            logger.info('Trial credits consumed based on audio duration', {
                deviceFingerprint,
                audioDurationSeconds,
                creditsNeeded,
                remainingCredits: consumed.remainingCredits,
                requestId
            });

            // Log usage activity
            await logUsageActivity({
                deviceFingerprint,
                analysisType: 'audio',
                fileSize: 0, // We don't have file size here
                processingTime: Date.now() - startTime,
                success: true
            });

        } else {
            // No authentication or device fingerprint
            throw new Error(
                'Authentication required. Please provide either user authentication or device fingerprint.'
            );
        }

    } catch (error) {
        logger.error('Error in usage check', error as Error, undefined, requestId);

        // Log failed usage attempt
        if (req.get('X-Device-Fingerprint') || req.get('X-User-ID')) {
            await logUsageActivity({
                userId: req.get('X-User-ID'),
                deviceFingerprint: req.get('X-Device-Fingerprint'),
                analysisType: 'audio',
                fileSize: 0,
                processingTime: Date.now() - startTime,
                success: false,
                errorMessage: error instanceof Error ? error.message : 'Unknown error'
            });
        }

        throw error;
    }
}

logger.info('Cloud Functions initialized', {
    environment: config.environment,
    configValid: configValidation.isValid
});