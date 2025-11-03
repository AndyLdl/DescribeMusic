import * as functions from 'firebase-functions/v1';
import * as admin from 'firebase-admin';
import cors from 'cors';
import multer from 'multer';
import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

import {
    AnalysisRequest,
    AnalysisResponse,
    AnalysisResult,
    AudioFile,
    ApiResponse,
    HttpStatus,
    ErrorCode,
    VoiceAnalysis,
    CreditCheckResult,
    CreditConsumptionResult
} from '../types';
import {
    checkDeviceUsage,
    checkUserUsage,
    consumeDeviceUsage,
    consumeUserUsage,
    logUsageActivity,
    checkUserCredits,
    checkTrialCredits,
    consumeUserCredits,
    consumeTrialCredits,
    refundUserCredits,
    refundTrialCredits,
    calculateCreditsRequired
} from '../utils/supabase';
import { vertexAIService } from '../services/vertexAIService';
import { verifyFirebaseToken, rateLimitMiddleware, AuthenticatedRequest } from '../middleware/auth';
import { PromptTemplates } from '../utils/prompts';
import {
    AppError,
    FileError,
    ValidationError,
    CreditError,
    InsufficientCreditsError,
    CreditCalculationError,
    CreditConsumptionError,
    createErrorResponse
} from '../utils/errors';
import logger from '../utils/logger';
import config from '../utils/config';
import mp3Duration = require('mp3-duration');
import * as NodeID3 from 'node-id3';
import { getAudioDurationInSeconds } from 'get-audio-duration';
import * as fs from 'fs';
import * as path from 'path';

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
    admin.initializeApp();
}

// Configure CORS - 更严格的配置
const corsHandler = cors({
    origin: (origin, callback) => {
        // 允许的域名列表
        const allowedOrigins = config.cors.allowedOrigins;

        // 开发环境允许无origin（如Postman）
        if (!origin && config.environment === 'development') {
            return callback(null, true);
        }

        if (allowedOrigins.includes(origin || '')) {
            callback(null, true);
        } else {
            logger.warn('CORS blocked request from unauthorized origin', { origin });
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    optionsSuccessStatus: 200,
    allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-Device-Fingerprint',
        'X-User-ID',
        'Accept',
        'Origin',
        'X-Requested-With'
    ]
});

// Configure Multer for file uploads (simplified for debugging)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 50 * 1024 * 1024, // 50MB
        files: 1,
        fieldSize: 1024 * 1024, // 1MB for form fields
        fields: 10, // Allow more fields
        parts: 100, // Allow more parts
    },
    // Enable defer handling to work around Content-Length issues
    dest: undefined,
    preservePath: false,
    // Additional options for better compatibility
    fileFilter: (req, file, cb) => {
        logger.info('File filter check', {
            filename: file.originalname,
            mimetype: file.mimetype,
            size: file.size,
            requestId: req.headers['x-request-id'] || 'unknown'
        });
        cb(null, true); // Accept all files for now
    }
});

/**
 * Main audio analysis cloud function
 */
export const analyzeAudio = functions
    .region('us-central1')
    .https
    .onRequest(async (req: Request, res: Response) => {
        const requestId = uuidv4();
        const startTime = Date.now();

        // Set request ID header
        res.set('X-Request-ID', requestId);

        try {
            // Handle CORS
            await new Promise<void>((resolve, reject) => {
                corsHandler(req, res, (error?: any) => {
                    if (error) reject(error);
                    else resolve();
                });
            });

            // Handle preflight requests
            if (req.method === 'OPTIONS') {
                res.status(200).send();
                return;
            }

            // Only allow POST requests
            if (req.method !== 'POST') {
                throw new ValidationError('Method not allowed. Use POST.');
            }

            logger.apiRequest(req.method, req.path, requestId, {
                userAgent: req.get('User-Agent'),
                origin: req.get('Origin'),
                contentLength: req.get('Content-Length')
            });

            // Log incoming request details for debugging
            logger.info('Processing request', {
                method: req.method,
                contentType: req.get('Content-Type'),
                contentLength: req.get('Content-Length'),
                userAgent: req.get('User-Agent'),
                origin: req.get('Origin'),
                requestId
            });

            // Process file upload with fallback strategy
            const audioFile = await processFileUploadWithFallback(req, requestId);

            // Validate request
            validateAnalysisRequest(audioFile, requestId);

            // Parse audio metadata to get duration for credit calculation
            const audioMetadata = await parseAudioMetadata(audioFile, requestId);

            logger.info('Audio metadata for credit calculation', {
                duration: audioMetadata.duration,
                format: audioMetadata.format,
                requestId
            });

            // Check and consume credits based on audio duration
            const creditInfo = await checkAndConsumeCredits(req, audioFile, audioMetadata.duration, requestId);

            // Perform actual AI analysis
            let analysisResult: AnalysisResult;
            try {
                analysisResult = await performAnalysis(audioFile, {}, requestId);
            } catch (analysisError) {
                // If analysis fails, refund the consumed credits
                logger.error('Analysis failed, refunding credits', analysisError as Error, undefined, requestId);

                if (creditInfo.userId) {
                    const refundReason = `Analysis failed: ${(analysisError as Error).message}`;
                    const refunded = await refundUserCredits(
                        creditInfo.userId,
                        creditInfo.creditsConsumed,
                        refundReason,
                        requestId
                    );

                    if (refunded) {
                        logger.creditRefund(creditInfo.userId, undefined, creditInfo.creditsConsumed, refundReason, requestId);
                    } else {
                        logger.creditError(creditInfo.userId, undefined, 'REFUND_FAILED',
                            `Failed to refund ${creditInfo.creditsConsumed} credits`, requestId);
                    }
                } else if (creditInfo.deviceFingerprint) {
                    const refundReason = `Analysis failed: ${(analysisError as Error).message}`;
                    const refunded = await refundTrialCredits(
                        creditInfo.deviceFingerprint,
                        creditInfo.creditsConsumed,
                        refundReason,
                        requestId
                    );

                    if (refunded) {
                        logger.creditRefund(undefined, creditInfo.deviceFingerprint, creditInfo.creditsConsumed, refundReason, requestId);
                    } else {
                        logger.creditError(undefined, creditInfo.deviceFingerprint, 'REFUND_FAILED',
                            `Failed to refund ${creditInfo.creditsConsumed} credits`, requestId);
                    }
                }

                throw analysisError;
            }

            const processingTime = Date.now() - startTime;
            logger.apiResponse(req.method, req.path, 200, processingTime, requestId);

            // Return successful response
            const response: ApiResponse<AnalysisResult> = {
                success: true,
                data: analysisResult,
                timestamp: new Date().toISOString(),
                requestId
            };

            res.status(HttpStatus.OK).json(response);

        } catch (error: any) {
            const processingTime = Date.now() - startTime;
            const { statusCode, body } = createErrorResponse(error, requestId);

            logger.apiResponse(req.method, req.path, statusCode, processingTime, requestId);

            res.status(statusCode).json({
                success: false,
                error: body,
                timestamp: new Date().toISOString(),
                requestId
            } as ApiResponse);
        }
    });

/**
 * Alternative file upload processing without multer
 */
async function processFileUploadAlternative(req: Request, requestId: string): Promise<AudioFile> {
    return new Promise((resolve, reject) => {
        let body: Buffer[] = [];

        req.on('data', (chunk: Buffer) => {
            body.push(chunk);
        });

        req.on('end', () => {
            try {
                logger.info('Processing uploaded data', { bodyLength: body.length, requestId });

                const buffer = Buffer.concat(body);
                logger.info('Buffer created', { bufferSize: buffer.length, requestId });

                // Parse multipart manually
                const contentType = req.get('Content-Type') || '';
                const boundaryMatch = contentType.match(/boundary=([^;]+)/);

                if (!boundaryMatch) {
                    reject(new ValidationError('Invalid multipart form data - no boundary'));
                    return;
                }

                const boundary = boundaryMatch[1];
                logger.info('Boundary extracted', { boundary, requestId });

                // Convert buffer to string for parsing (using latin1 to preserve binary data)
                const bufferString = buffer.toString('latin1');
                const parts = bufferString.split(`--${boundary}`);

                logger.info('Parts found', { partsCount: parts.length, requestId });

                let audioFile: AudioFile | null = null;

                for (let i = 0; i < parts.length; i++) {
                    const part = parts[i];

                    if (part.includes('name="audioFile"') && part.includes('Content-Type:')) {
                        logger.info('Found audio file part', { partIndex: i, requestId });

                        // Extract filename from Content-Disposition header
                        const filenameMatch = part.match(/filename="([^"]+)"/);
                        const filename = filenameMatch ? filenameMatch[1] : 'unknown.mp3';

                        // Extract content type
                        const contentTypeMatch = part.match(/Content-Type:\s*([^\r\n]+)/);
                        const mimeType = contentTypeMatch ? contentTypeMatch[1].trim() : 'audio/mpeg';

                        // Find the start of binary data (after double CRLF)
                        const headerEnd = part.indexOf('\r\n\r\n');
                        if (headerEnd > -1) {
                            const binaryStart = headerEnd + 4;
                            let binaryEnd = part.length;

                            // Find the end of this part (next boundary or end boundary)
                            const nextBoundaryIndex = part.indexOf(`\r\n--${boundary}`, binaryStart);
                            if (nextBoundaryIndex > -1) {
                                binaryEnd = nextBoundaryIndex;
                            }

                            const binaryData = part.substring(binaryStart, binaryEnd);
                            const cleanBuffer = Buffer.from(binaryData, 'latin1');

                            audioFile = {
                                originalName: filename,
                                mimeType: mimeType,
                                size: cleanBuffer.length,
                                buffer: cleanBuffer,
                                format: mimeType.split('/')[1].toUpperCase()
                            };

                            logger.info('Audio file processed', {
                                filename,
                                mimeType,
                                size: cleanBuffer.length,
                                requestId
                            });
                            break;
                        }
                    }
                }

                if (!audioFile) {
                    reject(new ValidationError('No audio file found in request'));
                    return;
                }

                logger.info('File uploaded successfully (alternative method)', {
                    filename: audioFile.originalName,
                    size: audioFile.size,
                    mimeType: audioFile.mimeType,
                    requestId
                });

                resolve(audioFile);

            } catch (error: any) {
                logger.error('Alternative file upload error', error, undefined, requestId);
                reject(new FileError(
                    ErrorCode.FILE_PROCESSING_ERROR,
                    `File upload failed: ${error.message}`
                ));
            }
        });

        req.on('error', (error: any) => {
            logger.error('Request error', error, undefined, requestId);
            reject(new FileError(
                ErrorCode.FILE_PROCESSING_ERROR,
                `Request error: ${error.message}`
            ));
        });
    });
}

/**
 * Process file upload with intelligent fallback
 * Try multer first, fall back to manual parsing if Content-Length issues
 */
async function processFileUploadWithFallback(req: Request, requestId: string): Promise<AudioFile> {
    const contentLength = req.get('Content-Length');

    logger.info('File upload strategy decision', {
        hasContentLength: !!contentLength,
        contentLength,
        requestId
    });

    // Always try multer first - Google Cloud Functions has issues with manual stream parsing
    try {
        logger.info('Attempting multer upload', { requestId });
        const result = await processFileUpload(req, requestId);
        logger.info('Multer upload successful', {
            filename: result.originalName,
            size: result.size,
            requestId
        });
        return result;
    } catch (error: any) {
        logger.error('Multer failed completely', error, undefined, requestId);
        throw new FileError(
            ErrorCode.FILE_PROCESSING_ERROR,
            `File upload failed: ${error.message}. This appears to be a Cloud Functions limitation with multipart data without Content-Length headers.`
        );
    }
}

/**
 * Manual multipart parsing (improved version with timeout and debugging)
 */
async function processFileUploadManual(req: Request, requestId: string): Promise<AudioFile> {
    return new Promise((resolve, reject) => {
        const chunks: Buffer[] = [];
        let totalSize = 0;
        const maxSize = 50 * 1024 * 1024; // 50MB limit

        // Add timeout protection
        const timeout = setTimeout(() => {
            logger.error('Manual parsing timeout after 30 seconds', undefined, undefined, requestId);
            reject(new FileError(ErrorCode.FILE_PROCESSING_ERROR, 'Manual parsing timeout'));
        }, 30000); // 30 second timeout

        let dataCount = 0;

        req.on('data', (chunk: Buffer) => {
            dataCount++;
            totalSize += chunk.length;

            logger.info('Received data chunk', {
                chunkNumber: dataCount,
                chunkSize: chunk.length,
                totalSize,
                requestId
            });

            if (totalSize > maxSize) {
                clearTimeout(timeout);
                reject(new FileError(ErrorCode.FILE_TOO_LARGE, 'File too large'));
                return;
            }
            chunks.push(chunk);
        });

        req.on('end', () => {
            clearTimeout(timeout);
            logger.info('Request stream ended', {
                totalChunks: chunks.length,
                totalSize,
                requestId
            });
            try {
                logger.info('Manual parsing started', {
                    chunksCount: chunks.length,
                    totalSize,
                    requestId
                });

                const buffer = Buffer.concat(chunks);
                const contentType = req.get('Content-Type') || '';

                // Extract boundary
                const boundaryMatch = contentType.match(/boundary=([^;]+)/);
                if (!boundaryMatch) {
                    reject(new ValidationError('Invalid multipart form data - no boundary'));
                    return;
                }

                const boundary = `--${boundaryMatch[1]}`;
                logger.info('Parsing with boundary', { boundary, requestId });

                // Convert to string with binary-safe encoding
                const content = buffer.toString('latin1');

                // Split by boundary
                const parts = content.split(boundary);
                logger.info('Found parts', { partsCount: parts.length, requestId });

                // Find the audio file part
                for (let i = 0; i < parts.length; i++) {
                    const part = parts[i].trim();

                    if (part.includes('name="audioFile"') && part.includes('Content-Type:')) {
                        logger.info('Processing audio file part', { partIndex: i, requestId });

                        // Extract headers and content
                        const headerEndIndex = part.indexOf('\r\n\r\n');
                        if (headerEndIndex === -1) continue;

                        const headers = part.substring(0, headerEndIndex);
                        const fileContent = part.substring(headerEndIndex + 4);

                        // Extract filename
                        const filenameMatch = headers.match(/filename="([^"]+)"/);
                        const filename = filenameMatch ? filenameMatch[1] : 'unknown.mp3';

                        // Extract Content-Type
                        const contentTypeMatch = headers.match(/Content-Type:\s*([^\r\n]+)/);
                        const mimeType = contentTypeMatch ? contentTypeMatch[1].trim() : 'audio/mpeg';

                        // Clean up file content (remove trailing boundary markers)
                        let cleanContent = fileContent;
                        const endBoundaryIndex = cleanContent.lastIndexOf('\r\n--');
                        if (endBoundaryIndex > 0) {
                            cleanContent = cleanContent.substring(0, endBoundaryIndex);
                        }

                        // Convert back to binary
                        const fileBuffer = Buffer.from(cleanContent, 'latin1');

                        const audioFile: AudioFile = {
                            originalName: filename,
                            mimeType: mimeType,
                            size: fileBuffer.length,
                            buffer: fileBuffer,
                            format: mimeType.split('/')[1].toUpperCase()
                        };

                        logger.info('Manual parsing successful', {
                            filename: audioFile.originalName,
                            mimeType: audioFile.mimeType,
                            size: audioFile.size,
                            requestId
                        });

                        resolve(audioFile);
                        return;
                    }
                }

                reject(new ValidationError('No audio file found in multipart data'));

            } catch (error: any) {
                logger.error('Manual parsing failed', error, undefined, requestId);
                reject(new FileError(ErrorCode.FILE_PROCESSING_ERROR, `Manual parsing failed: ${error.message}`));
            }
        });

        req.on('error', (error: any) => {
            clearTimeout(timeout);
            logger.error('Request stream error', error, undefined, requestId);
            reject(new FileError(ErrorCode.FILE_PROCESSING_ERROR, `Request error: ${error.message}`));
        });

        req.on('close', () => {
            clearTimeout(timeout);
            logger.info('Request connection closed', { requestId });
        });

        // Log when we start listening
        logger.info('Manual parser initialized, waiting for data', { requestId });
    });
}

/**
 * Generate default voice analysis for non-speech content
 */
function getDefaultVoiceAnalysis(): VoiceAnalysis {
    return {
        hasVoice: false,
        speakerCount: 0,
        genderDetection: {
            primary: 'unknown',
            confidence: 0.0,
            multipleGenders: false
        },
        speakerEmotion: {
            primary: 'neutral',
            confidence: 0.0,
            emotions: {
                happy: 0.0,
                sad: 0.0,
                angry: 0.0,
                calm: 0.0,
                excited: 0.0,
                nervous: 0.0,
                confident: 0.0,
                stressed: 0.0
            }
        },
        speechClarity: {
            score: 0.0,
            pronunciation: 0.0,
            articulation: 0.0,
            pace: 'normal',
            volume: 'normal'
        },
        vocalCharacteristics: {
            pitchRange: 'medium',
            speakingRate: 0,
            pauseFrequency: 'low',
            intonationVariation: 0.0
        },
        languageAnalysis: {
            language: 'unknown',
            confidence: 0.0,
            accent: 'unknown'
        },
        audioQuality: {
            backgroundNoise: 0.0,
            echo: 0.0,
            compression: 0.0,
            overall: 0.0
        }
    };
}

/**
 * Create mock analysis result for testing
 */
async function createMockAnalysisResult(audioFile: AudioFile, requestId: string): Promise<AnalysisResult> {
    logger.info('Creating mock analysis result', {
        filename: audioFile.originalName,
        size: audioFile.size,
        requestId
    });

    const result: AnalysisResult = {
        id: requestId,
        filename: audioFile.originalName,
        timestamp: new Date().toISOString(),
        duration: 180.5,
        fileSize: `${audioFile.size} bytes`,
        format: audioFile.format || 'MP3',
        contentType: {
            primary: 'music',
            confidence: 0.95,
            description: 'Electronic music track'
        },
        basicInfo: {
            genre: 'Electronic',
            mood: 'Energetic',
            bpm: 128,
            key: 'C major',
            energy: 0.9,
            valence: 0.75,
            danceability: 0.8,
            instrumentalness: 0.7,
            speechiness: 0.1,
            acousticness: 0.2,
            liveness: 0.15,
            loudness: -5.2
        },
        emotions: {
            happy: 0.8,
            sad: 0.1,
            angry: 0.05,
            calm: 0.2,
            excited: 0.9,
            melancholic: 0.1,
            energetic: 0.9,
            peaceful: 0.15,
            tense: 0.1,
            relaxed: 0.6
        },
        voiceAnalysis: {
            hasVoice: false,
            speakerCount: 0,
            genderDetection: {
                primary: 'unknown',
                confidence: 0.0,
                multipleGenders: false
            },
            speakerEmotion: {
                primary: 'neutral',
                confidence: 0.0,
                emotions: {
                    happy: 0.0,
                    sad: 0.0,
                    angry: 0.0,
                    calm: 0.0,
                    excited: 0.0,
                    nervous: 0.0,
                    confident: 0.0,
                    stressed: 0.0
                }
            },
            speechClarity: {
                score: 0.0,
                pronunciation: 0.0,
                articulation: 0.0,
                pace: 'normal',
                volume: 'normal'
            },
            vocalCharacteristics: {
                pitchRange: 'medium',
                speakingRate: 0,
                pauseFrequency: 'low',
                intonationVariation: 0.0
            },
            languageAnalysis: {
                language: 'unknown',
                confidence: 0.0,
                accent: 'unknown'
            },
            audioQuality: {
                backgroundNoise: 0.0,
                echo: 0.0,
                compression: 0.0,
                overall: 0.0
            }
        },
        soundEffects: {
            detected: [],
            environment: {
                location_type: 'indoor',
                setting: 'commercial',
                activity_level: 'moderate',
                acoustic_space: 'medium',
                time_of_day: 'unknown',
                weather: 'unknown'
            }
        },
        structure: {
            intro: { start: 0, end: 15.2 },
            verse1: { start: 15.2, end: 45.8 },
            chorus1: { start: 45.8, end: 75.3 },
            verse2: { start: 75.3, end: 105.7 },
            chorus2: { start: 105.7, end: 135.2 },
            outro: { start: 135.2, end: 180.5 }
        },
        quality: {
            overall: 0.85,
            clarity: 0.88,
            loudness: -5.2,
            dynamic_range: 8.5,
            noise_level: 0.18,
            distortion: 0.12,
            frequency_balance: 0.82
        },
        similarity: {
            similar_tracks: [
                { title: 'One More Time', artist: 'Daft Punk', similarity: 0.75, genre: 'Electronic', year: 2001 },
                { title: 'D.A.N.C.E.', artist: 'Justice', similarity: 0.68, genre: 'Electronic', year: 2007 }
            ],
            similar_sounds: [],
            style_influences: ['French House', 'Disco', 'Electronic Dance'],
            genre_confidence: 0.92
        },
        tags: ['electronic', 'dance', 'energetic', 'upbeat', 'synthesizer'],
        aiDescription: `An energetic electronic track with a driving beat at 128 BPM. Features bright synthesizers and a catchy melody with strong dance music influences.`,
        processingTime: 2.5
    };

    return result;
}

/**
 * Process file upload using multer (original method)
 */
async function processFileUpload(req: Request, requestId: string): Promise<AudioFile> {
    return new Promise((resolve, reject) => {
        const uploadSingle = upload.single('audioFile');

        uploadSingle(req, {} as any, (error?: any) => {
            if (error) {
                logger.error('File upload error', error, undefined, requestId);

                if (error.code === 'LIMIT_FILE_SIZE') {
                    reject(new FileError(
                        ErrorCode.FILE_TOO_LARGE,
                        `File size exceeds ${config.rateLimit.maxFileSizeMB}MB limit`
                    ));
                } else {
                    reject(new FileError(
                        ErrorCode.FILE_PROCESSING_ERROR,
                        `File upload failed: ${error.message || error.code || 'Unknown error'}`
                    ));
                }
                return;
            }

            if (!req.file) {
                reject(new ValidationError('No audio file provided'));
                return;
            }

            const audioFile: AudioFile = {
                originalName: req.file.originalname,
                mimeType: req.file.mimetype,
                size: req.file.size,
                buffer: req.file.buffer,
                format: req.file.mimetype.split('/')[1].toUpperCase()
            };

            logger.info('File uploaded successfully', {
                filename: audioFile.originalName,
                size: audioFile.size,
                mimeType: audioFile.mimeType
            }, requestId);

            resolve(audioFile);
        });
    });
}

/**
 * Validate analysis request
 */
function validateAnalysisRequest(audioFile: AudioFile, requestId: string): void {
    if (!audioFile.originalName) {
        throw new ValidationError('Audio file name is required');
    }

    if (audioFile.size === 0) {
        throw new ValidationError('Audio file is empty');
    }

    if (audioFile.size > config.rateLimit.maxFileSizeMB * 1024 * 1024) {
        throw new FileError(
            ErrorCode.FILE_TOO_LARGE,
            `File size ${(audioFile.size / (1024 * 1024)).toFixed(2)}MB exceeds ${config.rateLimit.maxFileSizeMB}MB limit`
        );
    }

    logger.debug('Request validation passed', { filename: audioFile.originalName }, requestId);
}

/**
 * Parse audio metadata to get accurate duration and format information
 * Supports multiple audio formats: MP3, WAV, M4A, AAC, OGG, FLAC, WebM
 */
async function parseAudioMetadata(audioFile: AudioFile, requestId: string): Promise<{
    duration: number;
    format: string;
    bitrate?: number;
    sampleRate?: number;
}> {
    try {
        // Determine format from MIME type or file extension
        const mimeType = audioFile.mimeType.toLowerCase();
        const fileExtension = audioFile.originalName.split('.').pop()?.toLowerCase() || '';

        // Map MIME types and extensions to format names
        let format = 'unknown';
        if (mimeType.includes('mp3') || fileExtension === 'mp3') {
            format = 'mp3';
        } else if (mimeType.includes('wav') || fileExtension === 'wav') {
            format = 'wav';
        } else if (mimeType.includes('m4a') || fileExtension === 'm4a') {
            format = 'm4a';
        } else if (mimeType.includes('aac') || fileExtension === 'aac') {
            format = 'aac';
        } else if (mimeType.includes('ogg') || fileExtension === 'ogg') {
            format = 'ogg';
        } else if (mimeType.includes('flac') || fileExtension === 'flac') {
            format = 'flac';
        } else if (mimeType.includes('webm') || fileExtension === 'webm') {
            format = 'webm';
        } else {
            format = audioFile.format || fileExtension || 'unknown';
        }

        let duration = 0;
        let bitrate: number | undefined;

        // Method 1: Try to use get-audio-duration for all formats (most reliable)
        try {
            const tempFilePath = await writeTemporaryFile(audioFile, requestId);
            try {
                duration = await getAudioDurationInSeconds(tempFilePath);
                logger.info('Successfully parsed audio duration using get-audio-duration', {
                    filename: audioFile.originalName,
                    format,
                    duration
                }, requestId);
            } finally {
                // Clean up temporary file
                try {
                    await fs.promises.unlink(tempFilePath);
                } catch (cleanupError) {
                    logger.warn('Failed to clean up temporary file', {
                        tempFilePath,
                        error: cleanupError
                    }, requestId);
                }
            }
        } catch (generalError: any) {
            logger.warn('get-audio-duration failed, trying format-specific parsers', {
                filename: audioFile.originalName,
                format,
                error: generalError.message
            }, requestId);

            // Method 2: Format-specific parsers as fallback
            if (format === 'mp3') {
                try {
                    duration = await new Promise<number>((resolve, reject) => {
                        mp3Duration(audioFile.buffer, (err: any, durationInSeconds: number) => {
                            if (err) {
                                reject(err);
                            } else {
                                resolve(durationInSeconds);
                            }
                        });
                    });
                    logger.info('Successfully parsed MP3 duration using mp3-duration', {
                        filename: audioFile.originalName,
                        duration
                    }, requestId);
                } catch (mp3Error: any) {
                    logger.warn('Failed to parse MP3 duration with mp3-duration', {
                        filename: audioFile.originalName,
                        error: mp3Error.message
                    }, requestId);
                }
            }
        }

        // Try to get additional metadata for MP3 files
        if (format === 'mp3') {
            try {
                const id3Tags = NodeID3.read(audioFile.buffer);
                // Estimate bitrate from file size and duration
                if (duration > 0) {
                    bitrate = Math.round((audioFile.size * 8) / duration / 1000); // kbps
                }
                logger.debug('Parsed ID3 tags for MP3', {
                    filename: audioFile.originalName,
                    estimatedBitrate: bitrate
                }, requestId);
            } catch (id3Error: any) {
                logger.warn('Failed to parse ID3 tags', {
                    filename: audioFile.originalName,
                    error: id3Error.message
                }, requestId);
            }
        }

        // Fallback to estimation if all parsers failed
        if (duration === 0) {
            duration = estimateAudioDuration(audioFile.size, format);
            logger.info('Using estimated duration for audio file', {
                filename: audioFile.originalName,
                format,
                estimatedDuration: duration,
                method: 'size-based estimation'
            }, requestId);
        }

        return {
            duration,
            format,
            bitrate
        };
    } catch (error: any) {
        logger.warn('Failed to parse audio metadata, using estimated values', {
            filename: audioFile.originalName,
            error: error.message
        }, requestId);

        // Final fallback to estimation
        const estimatedDuration = estimateAudioDuration(audioFile.size, 'unknown');
        return {
            duration: estimatedDuration,
            format: audioFile.format || 'unknown'
        };
    }
}

/**
 * Write audio buffer to a temporary file for processing
 */
async function writeTemporaryFile(audioFile: AudioFile, requestId: string): Promise<string> {
    const tempDir = '/tmp';
    const fileExtension = audioFile.originalName.split('.').pop() || 'audio';
    const tempFileName = `audio_${requestId}_${Date.now()}.${fileExtension}`;
    const tempFilePath = path.join(tempDir, tempFileName);

    await fs.promises.writeFile(tempFilePath, audioFile.buffer);
    return tempFilePath;
}

/**
 * Estimate audio duration based on file size and format
 */
function estimateAudioDuration(fileSize: number, format: string): number {
    // Different formats have different compression ratios
    let bytesPerSecond: number;

    switch (format.toLowerCase()) {
        case 'flac':
            bytesPerSecond = 100 * 1024; // FLAC is lossless, larger files
            break;
        case 'wav':
            bytesPerSecond = 176 * 1024; // Uncompressed, very large
            break;
        case 'mp3':
            bytesPerSecond = 32 * 1024; // 256kbps average
            break;
        case 'm4a':
        case 'aac':
            bytesPerSecond = 24 * 1024; // AAC is more efficient
            break;
        case 'ogg':
            bytesPerSecond = 28 * 1024; // Vorbis compression
            break;
        case 'webm':
            bytesPerSecond = 20 * 1024; // Opus codec is very efficient
            break;
        default:
            bytesPerSecond = 32 * 1024; // Default assumption
    }

    const estimatedDuration = fileSize / bytesPerSecond;
    // Clamp between reasonable bounds
    return Math.max(10, Math.min(7200, estimatedDuration)); // 10 seconds to 2 hours
}

/**
 * Perform audio analysis using Gemini AI
 */
export async function performAnalysis(
    audioFile: AudioFile,
    options: any = {},
    requestId: string
): Promise<AnalysisResult> {
    const analysisStartTime = Date.now();

    logger.analysisStart(audioFile.originalName, requestId);

    try {
        // Parse real audio metadata
        const audioMetadata = await parseAudioMetadata(audioFile, requestId);

        logger.info('Audio metadata parsed', {
            duration: audioMetadata.duration,
            format: audioMetadata.format,
            bitrate: audioMetadata.bitrate,
            sampleRate: audioMetadata.sampleRate
        }, requestId);

        // Create analysis prompt with real metadata and audio buffer
        const basePrompt = PromptTemplates.createAnalysisPrompt(
            audioFile.originalName,
            audioMetadata.duration,
            audioMetadata.format,
            audioFile.size
        );

        // Add audio buffer for actual analysis
        const prompt = {
            ...basePrompt,
            audioBuffer: audioFile.buffer, // 传递音频文件buffer给 Vertex AI
            audioMimeType: audioFile.mimeType // 传递音频 MIME 类型
        };

        // Call Vertex AI Gemini API (现在会包含实际音频文件)
        const geminiResponse = await vertexAIService.analyzeAudio(prompt, requestId);

        if (!geminiResponse.success || !geminiResponse.data) {
            throw new AppError(
                ErrorCode.ANALYSIS_FAILED,
                'Analysis failed: No data returned from AI service'
            );
        }

        const analysisData = geminiResponse.data.analysis;
        const processingTime = Date.now() - analysisStartTime;

        // Log the raw AI response for debugging
        logger.info('Raw AI analysis response', {
            filename: audioFile.originalName,
            analysisData: {
                basicInfo: analysisData.basicInfo,
                tags: analysisData.tags,
                aiDescription: analysisData.aiDescription,
                emotions: analysisData.emotions,
                quality: analysisData.quality,
                similarity: analysisData.similarity
            }
        }, requestId);

        // Generate tags if not provided
        if (!analysisData.tags || analysisData.tags.length === 0) {
            analysisData.tags = generateTags(analysisData.basicInfo, audioFile.originalName);
            logger.info('Generated fallback tags', {
                filename: audioFile.originalName,
                generatedTags: analysisData.tags
            }, requestId);
        } else {
            // Clean up AI-generated tags - remove any unwanted prefixes
            const originalTags = [...analysisData.tags]; // Save original
            analysisData.tags = analysisData.tags.map((tag: string) => {
                // Remove # prefix if present
                let cleanTag = tag.replace(/^#+\s*/, '');
                // Remove any extra whitespace
                cleanTag = cleanTag.trim();
                // Ensure lowercase with hyphens
                cleanTag = cleanTag.toLowerCase().replace(/\s+/g, '-');
                return cleanTag;
            }).filter((tag: string) => tag.length > 0); // Remove empty tags

            logger.info('Using AI-generated tags (cleaned)', {
                filename: audioFile.originalName,
                originalTags: originalTags,
                cleanedTags: analysisData.tags
            }, requestId);
        }

        // Generate description using getDescriptionPrompt (not included in main analysis to save tokens)
        // 传入音频文件以获得更准确的描述
        try {
            logger.info('Generating description using getDescriptionPrompt', { requestId });
            const descriptionPrompt = PromptTemplates.getDescriptionPrompt(audioFile.originalName);
            const descriptionResult = await vertexAIService.generateDescription(
                descriptionPrompt,
                requestId,
                audioFile.buffer,    // 传递音频文件以获得更准确的描述
                audioFile.mimeType   // 传递音频MIME类型
            );
            if (descriptionResult.success && descriptionResult.description && descriptionResult.description.length > 50) {
                analysisData.aiDescription = descriptionResult.description;
                logger.info('Description generated successfully', {
                    requestId,
                    descriptionLength: analysisData.aiDescription.length
                });
            } else {
                logger.warn('Description generation returned short or empty result, using fallback', {
                    requestId,
                    hasResult: descriptionResult.success,
                    resultLength: descriptionResult.description?.length || 0
                });
                // Fallback to simple generation if dedicated prompt fails or returns short result
                analysisData.aiDescription = generateAIDescription(analysisData);
            }
        } catch (descError) {
            logger.error('Failed to generate description, using fallback', descError as Error);
            // Fallback to simple generation if dedicated prompt fails
            analysisData.aiDescription = generateAIDescription(analysisData);
        }

        // Create final result with real audio metadata
        const result: AnalysisResult = {
            id: uuidv4(),
            filename: audioFile.originalName,
            timestamp: new Date().toISOString(),
            duration: audioMetadata.duration, // Use real parsed duration
            fileSize: (audioFile.size / (1024 * 1024)).toFixed(2) + ' MB',
            format: audioMetadata.format, // Use real parsed format
            contentType: analysisData.contentType || {
                primary: 'music',
                confidence: 0.8,
                description: 'Music content (default)'
            },
            basicInfo: analysisData.basicInfo,
            voiceAnalysis: analysisData.voiceAnalysis || getDefaultVoiceAnalysis(),
            soundEffects: analysisData.soundEffects || {
                detected: [],
                environment: {
                    location_type: 'unknown' as const,
                    setting: 'unknown' as const,
                    activity_level: 'unknown' as const,
                    acoustic_space: 'unknown' as const,
                    time_of_day: 'unknown' as const,
                    weather: 'unknown' as const
                }
            },
            emotions: analysisData.emotions,
            structure: analysisData.structure,
            quality: analysisData.quality,
            similarity: analysisData.similarity,
            tags: analysisData.tags,
            aiDescription: analysisData.aiDescription,
            processingTime
        };

        logger.analysisComplete(audioFile.originalName, processingTime, requestId);

        return result;

    } catch (error: any) {
        const processingTime = Date.now() - analysisStartTime;
        logger.error(`Analysis failed after ${processingTime}ms`, error, { filename: audioFile.originalName }, requestId);

        if (error instanceof AppError) {
            throw error;
        }

        throw new AppError(
            ErrorCode.ANALYSIS_FAILED,
            `Audio analysis failed: ${error.message}`,
            HttpStatus.INTERNAL_SERVER_ERROR,
            { originalError: error.message, processingTime }
        );
    }
}

/**
 * Generate tags based on basic info
 */
function generateTags(basicInfo: any, filename: string): string[] {
    const tags: string[] = [];

    if (basicInfo.genre) tags.push(basicInfo.genre.toLowerCase().replace(/\s+/g, '-'));
    if (basicInfo.mood) tags.push(basicInfo.mood.toLowerCase().replace(/\s+/g, '-'));

    // Energy tags
    if (basicInfo.energy > 0.8) tags.push('high-energy', 'energetic');
    else if (basicInfo.energy > 0.6) tags.push('medium-energy');
    else tags.push('low-energy', 'calm');

    // BPM tags
    if (basicInfo.bpm > 140) tags.push('fast-tempo', 'dance');
    else if (basicInfo.bpm > 100) tags.push('moderate-tempo');
    else tags.push('slow-tempo', 'chill');

    // File format
    const extension = filename.split('.').pop()?.toLowerCase();
    if (extension) tags.push(`${extension}-file`);

    // Default tags
    tags.push('ai-analyzed', 'audio-analysis');

    return [...new Set(tags)]; // Remove duplicates
}

/**
 * Generate AI description
 */
function generateAIDescription(analysisData: any): string {
    const { basicInfo, emotions } = analysisData;
    const topEmotion = Object.entries(emotions).reduce((a: any, b: any) =>
        emotions[a[0]] > emotions[b[0]] ? a : b
    )[0];

    return `A ${topEmotion} ${basicInfo.genre.toLowerCase()} track with ${basicInfo.bpm} BPM in ${basicInfo.key}, featuring ${basicInfo.mood.toLowerCase()} energy and ${Math.round(basicInfo.danceability * 100)}% danceability.`;
}

/**
 * Check and consume credits based on audio duration
 */
async function checkAndConsumeCredits(
    req: Request,
    audioFile: AudioFile,
    audioDuration: number,
    requestId: string
): Promise<{ userId?: string; deviceFingerprint?: string; creditsConsumed: number }> {
    const startTime = Date.now();

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
                const { verifySupabaseToken } = await import('../utils/supabase');
                const decodedToken = await verifySupabaseToken(token);
                userId = decodedToken.sub; // Supabase 使用 'sub' 作为用户ID

                logger.info('User authenticated via Supabase', { userId, requestId });
            } catch (tokenError) {
                logger.error('Invalid Supabase token', tokenError as Error, { requestId });
                throw new Error('Invalid authentication token');
            }
        }

        // Calculate required credits based on audio duration
        let requiredCredits: number;
        try {
            requiredCredits = calculateCreditsRequired(audioDuration);
        } catch (error) {
            throw new CreditCalculationError(
                `Failed to calculate required credits for audio duration: ${audioDuration}s`,
                { audioDuration, error: (error as Error).message }
            );
        }

        logger.info('Credit calculation', {
            audioDuration,
            requiredCredits,
            userId,
            deviceFingerprint,
            requestId
        });

        if (userId) {
            // Handle registered user
            logger.info('Checking credits for registered user', { userId, requiredCredits, requestId });

            const creditStatus = await checkUserCredits(userId, requiredCredits);

            // Log credit check result
            logger.creditCheck(userId, undefined, requiredCredits, creditStatus.currentCredits, requestId);

            if (!creditStatus.hasEnoughCredits) {
                logger.creditError(userId, undefined, 'INSUFFICIENT_CREDITS',
                    `Required: ${requiredCredits}, Available: ${creditStatus.currentCredits}`, requestId);
                throw new InsufficientCreditsError(
                    requiredCredits,
                    creditStatus.currentCredits,
                    false
                );
            }

            // Consume user credits
            logger.info('About to consume user credits', { userId, requiredCredits, requestId });
            const consumption = await consumeUserCredits(
                userId,
                requiredCredits,
                `Audio analysis: ${audioFile.originalName}`,
                requestId
            );

            if (!consumption.success) {
                logger.creditError(userId, undefined, 'CREDIT_CONSUMPTION_FAILED',
                    'Failed to consume credits', requestId);
                throw new CreditConsumptionError(
                    'Failed to consume credits. Please try again.',
                    { userId, requiredCredits, requestId }
                );
            }

            // Log successful credit consumption
            logger.creditConsumption(userId, undefined, requiredCredits, consumption.remainingCredits, requestId);

            // Log usage activity
            await logUsageActivity({
                userId,
                analysisType: 'audio',
                fileSize: audioFile.size,
                processingTime: Date.now() - startTime,
                success: true
            });

            return { userId, creditsConsumed: requiredCredits };

        } else if (deviceFingerprint) {
            // Handle trial user
            logger.info('Checking credits for trial user', { deviceFingerprint, requiredCredits, requestId });

            const creditStatus = await checkTrialCredits(deviceFingerprint, requiredCredits);

            // Log trial credit check result
            logger.creditCheck(undefined, deviceFingerprint, requiredCredits, creditStatus.currentCredits, requestId);

            if (!creditStatus.hasEnoughCredits) {
                logger.creditError(undefined, deviceFingerprint, 'INSUFFICIENT_CREDITS',
                    `Required: ${requiredCredits}, Available: ${creditStatus.currentCredits}`, requestId);
                throw new InsufficientCreditsError(
                    requiredCredits,
                    creditStatus.currentCredits,
                    true
                );
            }

            // Consume trial credits
            const consumption = await consumeTrialCredits(
                deviceFingerprint,
                requiredCredits,
                `Audio analysis: ${audioFile.originalName}`,
                requestId
            );

            if (!consumption.success) {
                logger.creditError(undefined, deviceFingerprint, 'CREDIT_CONSUMPTION_FAILED',
                    'Failed to consume trial credits', requestId);
                throw new CreditConsumptionError(
                    'Failed to consume trial credits. Please try again.',
                    { deviceFingerprint, requiredCredits, requestId }
                );
            }

            // Log successful trial credit consumption
            logger.creditConsumption(undefined, deviceFingerprint, requiredCredits, consumption.remainingCredits, requestId);

            // Log usage activity
            await logUsageActivity({
                deviceFingerprint,
                analysisType: 'audio',
                fileSize: audioFile.size,
                processingTime: Date.now() - startTime,
                success: true
            });

            return { deviceFingerprint, creditsConsumed: requiredCredits };

        } else {
            // No authentication or device fingerprint
            throw new ValidationError(
                'Authentication required. Please provide either user authentication or device fingerprint.'
            );
        }

    } catch (error) {
        logger.error('Error in credit check', error as Error, undefined, requestId);

        // Log failed usage attempt
        if (req.get('X-Device-Fingerprint') || req.get('X-User-ID')) {
            await logUsageActivity({
                userId: req.get('X-User-ID'),
                deviceFingerprint: req.get('X-Device-Fingerprint'),
                analysisType: 'audio',
                fileSize: audioFile.size,
                processingTime: Date.now() - startTime,
                success: false,
                errorMessage: error instanceof Error ? error.message : 'Unknown error'
            });
        }

        throw error;
    }
}

export default analyzeAudio;