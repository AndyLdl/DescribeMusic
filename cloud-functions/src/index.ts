/**
 * Describe Music - Cloud Functions
 * 
 * Main entry point for all cloud functions.
 * This file exports all available functions for Firebase deployment.
 */

import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions/v1';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import config, { validateConfig } from './utils/config';
import logger from './utils/logger';
import { AudioFile, AnalysisResult } from './types/analysis';
import { vertexAIService } from './services/vertexAIService';
import { PromptTemplates } from './utils/prompts';
import {
    checkDeviceUsage,
    checkUserUsage,
    consumeDeviceUsage,
    consumeUserUsage,
    logUsageActivity,
    checkTrialCredits,
    consumeTrialCredits,
    refundUserCredits,
    refundTrialCredits,
    verifySupabaseToken
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
export { lemonsqueezyWebhook } from './functions/lemonsqueezyWebhook';

// Health check function

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
                vertexAI: !!config.vertexAI.projectId && !!config.vertexAI.location,
                gemini: !!config.googleAI.apiKey // 备用
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

            // Generate download URL for later analysis (valid for 7 days - GCS limit)
            const [downloadUrl] = await file.getSignedUrl({
                version: 'v4',
                action: 'read',
                expires: Date.now() + 7 * 24 * 60 * 60 * 1000 // 7 days (GCS maximum)
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

// Secure audio analysis from GCS URL
export const analyzeAudioFromUrl = functions
    .region('us-central1')
    .https
    .onRequest(async (req, res) => {
        const requestId = uuidv4();

        // 安全的CORS配置
        const origin = req.get('Origin');
        const allowedOrigins = [
            'https://describemusic.net',
            'https://www.describemusic.net',
            'https://describemusic.net/',
            'https://www.describemusic.net/',
            'http://localhost:4321',
            'http://localhost:4322',
            'http://localhost:4323',
            'http://localhost:4327',
            'https://localhost:4321',
            'https://localhost:4322',
            'https://localhost:4323',
            'https://localhost:4327'
        ];

        if (allowedOrigins.includes(origin || '')) {
            res.setHeader('Access-Control-Allow-Origin', origin || '');
            res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Device-Fingerprint, X-User-ID, Accept, Origin, X-Requested-With');
            res.setHeader('Access-Control-Allow-Credentials', 'true');
        } else {
            logger.warn('CORS blocked unauthorized origin', { origin, requestId });
            res.status(403).json({
                success: false,
                error: { code: 'CORS_NOT_ALLOWED', message: 'Origin not allowed' },
                requestId
            });
            return;
        }

        // CORS验证已完成

        if (req.method === 'OPTIONS') {
            res.status(200).end();
            return;
        }

        if (req.method !== 'POST') {
            res.status(405).json({
                success: false,
                error: { code: 'METHOD_NOT_ALLOWED', message: 'Only POST method allowed' },
                requestId
            });
            return;
        }

        let userInfo: { userId?: string, deviceFingerprint?: string, creditsConsumed?: number } = {};

        try {
            // 额外的安全检查
            const userAgent = req.get('User-Agent') || '';
            const referer = req.get('Referer') || '';

            // 检查是否来自可信的referer
            if (referer && !allowedOrigins.some(origin => referer.startsWith(origin))) {
                logger.warn('Suspicious referer detected', { referer, origin, requestId });
            }

            // 检查User-Agent是否可疑
            if (userAgent.toLowerCase().includes('bot') || userAgent.toLowerCase().includes('crawler')) {
                logger.warn('Bot detected, blocking request', { userAgent, origin, requestId });
                res.status(403).json({
                    success: false,
                    error: { code: 'BOT_NOT_ALLOWED', message: 'Automated requests not allowed' },
                    requestId
                });
                return;
            }

            const { fileUrl, fileName, options } = req.body;

            // 验证必需参数
            if (!fileUrl || !fileName) {
                res.status(400).json({
                    success: false,
                    error: {
                        code: 'MISSING_REQUIRED_FIELDS',
                        message: 'fileUrl and fileName are required'
                    },
                    requestId
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

            // Extract file path and construct GCS URI (no need to download for analysis)
            const filePath = extractFilePathFromUrl(fileUrl);
            const gcsUri = `gs://describe-music/${filePath}`;

            // Get file metadata (without downloading the entire file)
            const bucket = admin.storage().bucket('describe-music');
            const file = bucket.file(filePath);
            const [metadata] = await file.getMetadata();
            const fileSize = metadata.size || 0;

            // 构建分析prompt，使用 GCS URI（不需要下载文件）
            const prompt = {
                systemPrompt: PromptTemplates.getSystemPrompt(),
                userPrompt: PromptTemplates.getUserPrompt(fileName, 'Comprehensive audio analysis requested'),
                audioMetadata: {
                    filename: fileName,
                    duration: frontendDuration,
                    format: fileName.split('.').pop()?.toUpperCase() || 'Unknown',
                    size: fileSize
                },
                audioFileUri: gcsUri, // 使用 GCS URI，支持任意大小的文件
                audioMimeType: metadata.contentType || 'audio/mpeg' // 从元数据获取 MIME 类型
            };

            // 使用 Vertex AI 服务进行分析（现在会包含实际音频文件）
            const vertexResponse = await vertexAIService.analyzeAudio(prompt, requestId);

            if (!vertexResponse.success || !vertexResponse.data) {
                throw new Error('Vertex AI analysis failed: No valid response received');
            }

            const analysis = vertexResponse.data.analysis;
            const processingTime = (Date.now() - Date.now()) / 1000;

            // Generate description using getDescriptionPrompt (not included in main analysis to save tokens)
            // 传入 GCS URI 以获得更准确的描述（不需要下载文件）
            let finalDescription = 'Audio content analyzed using Vertex AI Gemini.';
            try {
                logger.info('Generating description using getDescriptionPrompt', { requestId });
                const descriptionPrompt = PromptTemplates.getDescriptionPrompt(fileName);
                const descriptionResult = await vertexAIService.generateDescription(
                    descriptionPrompt,
                    requestId,
                    undefined,           // 不使用 buffer
                    metadata.contentType || 'audio/mpeg',
                    undefined,           // userId
                    gcsUri              // 使用 GCS URI
                );
                if (descriptionResult.success && descriptionResult.description && descriptionResult.description.length > 50) {
                    finalDescription = descriptionResult.description;
                    logger.info('Description generated successfully', {
                        requestId,
                        descriptionLength: finalDescription.length,
                        descriptionResult: finalDescription
                    });
                } else {
                    logger.warn('Description generation returned short or empty result', {
                        requestId,
                        hasResult: descriptionResult.success,
                        resultLength: descriptionResult.description?.length || 0
                    });
                }
            } catch (descError) {
                logger.error('Failed to generate description', descError as Error);
                // Keep default fallback description
            }

            // Generate audio transcription (speech-to-text)
            // 提取音频中的文字内容（语音识别）
            let transcription = '';
            try {
                logger.info('Generating audio transcription', { requestId });
                const transcriptionResult = await vertexAIService.generateTranscription(
                    fileName,
                    requestId,
                    undefined,           // 不使用 buffer
                    metadata.contentType || 'audio/mpeg',
                    undefined,           // userId
                    gcsUri              // 使用 GCS URI
                );
                if (transcriptionResult.success && transcriptionResult.transcription) {
                    transcription = transcriptionResult.transcription;
                    logger.info('Transcription generated successfully', {
                        requestId,
                        transcriptionLength: transcription.length,
                        hasTranscription: transcription.length > 0
                    });
                } else {
                    logger.warn('Transcription generation returned empty result', {
                        requestId,
                        hasResult: transcriptionResult.success
                    });
                }
            } catch (transError) {
                logger.error('Failed to generate transcription', transError as Error);
                // Keep empty transcription as fallback
            }

            // Generate a new signed URL for playback (7 days validity - GCS limit)
            let audioPlaybackUrl: string | undefined;
            try {
                const bucket = admin.storage().bucket('describe-music');
                const filePath = extractFilePathFromUrl(fileUrl);
                const file = bucket.file(filePath);

                const [playbackUrl] = await file.getSignedUrl({
                    version: 'v4',
                    action: 'read',
                    expires: Date.now() + 7 * 24 * 60 * 60 * 1000 // 7 days (GCS maximum)
                });

                audioPlaybackUrl = playbackUrl;
                logger.info('Generated playback URL for audio (7 days validity)', { filePath, requestId });
            } catch (urlError) {
                logger.warn('Failed to generate playback URL, using original fileUrl', urlError as Error);
                audioPlaybackUrl = fileUrl; // Fallback to original URL
            }

            // 构建标准的分析结果
            const fileFormat = fileName.split('.').pop()?.toUpperCase() || 'Unknown';
            const analysisResult: AnalysisResult = {
                id: requestId,
                filename: fileName,
                timestamp: new Date().toISOString(),
                duration: frontendDuration,
                fileSize: `${(fileSize / (1024 * 1024)).toFixed(2)} MB`,
                format: fileFormat,
                audioUrl: audioPlaybackUrl, // Add audio URL for playback

                contentType: analysis.contentType || {
                    primary: 'music',
                    confidence: 0.8,
                    description: 'AI-analyzed audio content'
                },

                basicInfo: analysis.basicInfo || {
                    genre: 'Unknown', mood: 'Neutral', bpm: 120, key: 'C Major',
                    energy: 0.5, valence: 0.5, danceability: 0.5, instrumentalness: 0.5,
                    speechiness: 0.1, acousticness: 0.5, liveness: 0.1, loudness: -10
                },

                emotions: analysis.emotions || {
                    happy: 0.3, sad: 0.2, angry: 0.1, calm: 0.4, excited: 0.2,
                    melancholic: 0.2, energetic: 0.3, peaceful: 0.3, tense: 0.2, relaxed: 0.4
                },

                voiceAnalysis: analysis.voiceAnalysis || {
                    hasVoice: false, speakerCount: 0,
                    genderDetection: { primary: 'unknown', confidence: 0.0, multipleGenders: false },
                    speakerEmotion: {
                        primary: 'neutral', confidence: 0.0,
                        emotions: { happy: 0.0, sad: 0.0, angry: 0.0, calm: 0.0, excited: 0.0, nervous: 0.0, confident: 0.0, stressed: 0.0 }
                    },
                    speechClarity: { score: 0.0, pronunciation: 0.0, articulation: 0.0, pace: 'normal', volume: 'normal' },
                    vocalCharacteristics: { pitchRange: 'medium', speakingRate: 0, pauseFrequency: 'low', intonationVariation: 0.0 },
                    languageAnalysis: { language: 'unknown', confidence: 0.0, accent: 'unknown' },
                    audioQuality: { backgroundNoise: 0.0, echo: 0.0, compression: 0.0, overall: 0.0 }
                },

                soundEffects: analysis.soundEffects || {
                    detected: [],
                    environment: {
                        location_type: 'indoor', setting: 'commercial', activity_level: 'moderate',
                        acoustic_space: 'medium', time_of_day: 'unknown', weather: 'unknown'
                    }
                },

                transcription: transcription || '',  // 音频转文字内容

                quality: analysis.quality || {
                    overall: 7.0, clarity: 7.0, loudness: -10, dynamic_range: 6.0,
                    noise_level: 2.0, distortion: 1.0, frequency_balance: 7.0
                },

                similarity: analysis.similarity || {
                    similar_tracks: [], similar_sounds: [], style_influences: ['AI-analyzed'], genre_confidence: 0.7
                },

                tags: analysis.tags || ['audio', 'music', 'vertex-ai-analyzed'],
                aiDescription: finalDescription || analysis.aiDescription || 'Audio content analyzed using Vertex AI Gemini.',
                processingTime: processingTime
            };

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
            try {
                // 验证 Supabase JWT token
                const token = authHeader.substring(7);
                const decodedToken = await verifySupabaseToken(token);
                userId = decodedToken.sub; // Supabase 使用 'sub' 作为用户ID

                logger.info('User authenticated via Supabase', { userId, requestId });
            } catch (tokenError) {
                logger.error('Invalid Supabase token', tokenError as Error, { requestId });
                throw new Error('Invalid authentication token');
            }
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