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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeAudio = void 0;
exports.performAnalysis = performAnalysis;
const functions = __importStar(require("firebase-functions/v1"));
const admin = __importStar(require("firebase-admin"));
const cors_1 = __importDefault(require("cors"));
const multer_1 = __importDefault(require("multer"));
const uuid_1 = require("uuid");
const types_1 = require("../types");
const supabase_1 = require("../utils/supabase");
const vertexAIService_1 = require("../services/vertexAIService");
const prompts_1 = require("../utils/prompts");
const errors_1 = require("../utils/errors");
const logger_1 = __importDefault(require("../utils/logger"));
const config_1 = __importDefault(require("../utils/config"));
const mp3Duration = require("mp3-duration");
const NodeID3 = __importStar(require("node-id3"));
const get_audio_duration_1 = require("get-audio-duration");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
    admin.initializeApp();
}
// Configure CORS - 更严格的配置
const corsHandler = (0, cors_1.default)({
    origin: (origin, callback) => {
        // 允许的域名列表
        const allowedOrigins = config_1.default.cors.allowedOrigins;
        // 开发环境允许无origin（如Postman）
        if (!origin && config_1.default.environment === 'development') {
            return callback(null, true);
        }
        if (allowedOrigins.includes(origin || '')) {
            callback(null, true);
        }
        else {
            logger_1.default.warn('CORS blocked request from unauthorized origin', { origin });
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
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
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
        logger_1.default.info('File filter check', {
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
exports.analyzeAudio = functions
    .region('us-central1')
    .https
    .onRequest(async (req, res) => {
    const requestId = (0, uuid_1.v4)();
    const startTime = Date.now();
    // Set request ID header
    res.set('X-Request-ID', requestId);
    try {
        // Handle CORS
        await new Promise((resolve, reject) => {
            corsHandler(req, res, (error) => {
                if (error)
                    reject(error);
                else
                    resolve();
            });
        });
        // Handle preflight requests
        if (req.method === 'OPTIONS') {
            res.status(200).send();
            return;
        }
        // Only allow POST requests
        if (req.method !== 'POST') {
            throw new errors_1.ValidationError('Method not allowed. Use POST.');
        }
        logger_1.default.apiRequest(req.method, req.path, requestId, {
            userAgent: req.get('User-Agent'),
            origin: req.get('Origin'),
            contentLength: req.get('Content-Length')
        });
        // Log incoming request details for debugging
        logger_1.default.info('Processing request', {
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
        logger_1.default.info('Audio metadata for credit calculation', {
            duration: audioMetadata.duration,
            format: audioMetadata.format,
            requestId
        });
        // Check and consume credits based on audio duration
        const creditInfo = await checkAndConsumeCredits(req, audioFile, audioMetadata.duration, requestId);
        // Perform actual AI analysis
        let analysisResult;
        try {
            analysisResult = await performAnalysis(audioFile, {}, requestId);
        }
        catch (analysisError) {
            // If analysis fails, refund the consumed credits
            logger_1.default.error('Analysis failed, refunding credits', analysisError, undefined, requestId);
            if (creditInfo.userId) {
                const refundReason = `Analysis failed: ${analysisError.message}`;
                const refunded = await (0, supabase_1.refundUserCredits)(creditInfo.userId, creditInfo.creditsConsumed, refundReason, requestId);
                if (refunded) {
                    logger_1.default.creditRefund(creditInfo.userId, undefined, creditInfo.creditsConsumed, refundReason, requestId);
                }
                else {
                    logger_1.default.creditError(creditInfo.userId, undefined, 'REFUND_FAILED', `Failed to refund ${creditInfo.creditsConsumed} credits`, requestId);
                }
            }
            else if (creditInfo.deviceFingerprint) {
                const refundReason = `Analysis failed: ${analysisError.message}`;
                const refunded = await (0, supabase_1.refundTrialCredits)(creditInfo.deviceFingerprint, creditInfo.creditsConsumed, refundReason, requestId);
                if (refunded) {
                    logger_1.default.creditRefund(undefined, creditInfo.deviceFingerprint, creditInfo.creditsConsumed, refundReason, requestId);
                }
                else {
                    logger_1.default.creditError(undefined, creditInfo.deviceFingerprint, 'REFUND_FAILED', `Failed to refund ${creditInfo.creditsConsumed} credits`, requestId);
                }
            }
            throw analysisError;
        }
        const processingTime = Date.now() - startTime;
        logger_1.default.apiResponse(req.method, req.path, 200, processingTime, requestId);
        // Return successful response
        const response = {
            success: true,
            data: analysisResult,
            timestamp: new Date().toISOString(),
            requestId
        };
        res.status(types_1.HttpStatus.OK).json(response);
    }
    catch (error) {
        const processingTime = Date.now() - startTime;
        const { statusCode, body } = (0, errors_1.createErrorResponse)(error, requestId);
        logger_1.default.apiResponse(req.method, req.path, statusCode, processingTime, requestId);
        res.status(statusCode).json({
            success: false,
            error: body,
            timestamp: new Date().toISOString(),
            requestId
        });
    }
});
/**
 * Alternative file upload processing without multer
 */
async function processFileUploadAlternative(req, requestId) {
    return new Promise((resolve, reject) => {
        let body = [];
        req.on('data', (chunk) => {
            body.push(chunk);
        });
        req.on('end', () => {
            try {
                logger_1.default.info('Processing uploaded data', { bodyLength: body.length, requestId });
                const buffer = Buffer.concat(body);
                logger_1.default.info('Buffer created', { bufferSize: buffer.length, requestId });
                // Parse multipart manually
                const contentType = req.get('Content-Type') || '';
                const boundaryMatch = contentType.match(/boundary=([^;]+)/);
                if (!boundaryMatch) {
                    reject(new errors_1.ValidationError('Invalid multipart form data - no boundary'));
                    return;
                }
                const boundary = boundaryMatch[1];
                logger_1.default.info('Boundary extracted', { boundary, requestId });
                // Convert buffer to string for parsing (using latin1 to preserve binary data)
                const bufferString = buffer.toString('latin1');
                const parts = bufferString.split(`--${boundary}`);
                logger_1.default.info('Parts found', { partsCount: parts.length, requestId });
                let audioFile = null;
                for (let i = 0; i < parts.length; i++) {
                    const part = parts[i];
                    if (part.includes('name="audioFile"') && part.includes('Content-Type:')) {
                        logger_1.default.info('Found audio file part', { partIndex: i, requestId });
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
                            logger_1.default.info('Audio file processed', {
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
                    reject(new errors_1.ValidationError('No audio file found in request'));
                    return;
                }
                logger_1.default.info('File uploaded successfully (alternative method)', {
                    filename: audioFile.originalName,
                    size: audioFile.size,
                    mimeType: audioFile.mimeType,
                    requestId
                });
                resolve(audioFile);
            }
            catch (error) {
                logger_1.default.error('Alternative file upload error', error, undefined, requestId);
                reject(new errors_1.FileError(types_1.ErrorCode.FILE_PROCESSING_ERROR, `File upload failed: ${error.message}`));
            }
        });
        req.on('error', (error) => {
            logger_1.default.error('Request error', error, undefined, requestId);
            reject(new errors_1.FileError(types_1.ErrorCode.FILE_PROCESSING_ERROR, `Request error: ${error.message}`));
        });
    });
}
/**
 * Process file upload with intelligent fallback
 * Try multer first, fall back to manual parsing if Content-Length issues
 */
async function processFileUploadWithFallback(req, requestId) {
    const contentLength = req.get('Content-Length');
    logger_1.default.info('File upload strategy decision', {
        hasContentLength: !!contentLength,
        contentLength,
        requestId
    });
    // Always try multer first - Google Cloud Functions has issues with manual stream parsing
    try {
        logger_1.default.info('Attempting multer upload', { requestId });
        const result = await processFileUpload(req, requestId);
        logger_1.default.info('Multer upload successful', {
            filename: result.originalName,
            size: result.size,
            requestId
        });
        return result;
    }
    catch (error) {
        logger_1.default.error('Multer failed completely', error, undefined, requestId);
        throw new errors_1.FileError(types_1.ErrorCode.FILE_PROCESSING_ERROR, `File upload failed: ${error.message}. This appears to be a Cloud Functions limitation with multipart data without Content-Length headers.`);
    }
}
/**
 * Manual multipart parsing (improved version with timeout and debugging)
 */
async function processFileUploadManual(req, requestId) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        let totalSize = 0;
        const maxSize = 50 * 1024 * 1024; // 50MB limit
        // Add timeout protection
        const timeout = setTimeout(() => {
            logger_1.default.error('Manual parsing timeout after 30 seconds', undefined, undefined, requestId);
            reject(new errors_1.FileError(types_1.ErrorCode.FILE_PROCESSING_ERROR, 'Manual parsing timeout'));
        }, 30000); // 30 second timeout
        let dataCount = 0;
        req.on('data', (chunk) => {
            dataCount++;
            totalSize += chunk.length;
            logger_1.default.info('Received data chunk', {
                chunkNumber: dataCount,
                chunkSize: chunk.length,
                totalSize,
                requestId
            });
            if (totalSize > maxSize) {
                clearTimeout(timeout);
                reject(new errors_1.FileError(types_1.ErrorCode.FILE_TOO_LARGE, 'File too large'));
                return;
            }
            chunks.push(chunk);
        });
        req.on('end', () => {
            clearTimeout(timeout);
            logger_1.default.info('Request stream ended', {
                totalChunks: chunks.length,
                totalSize,
                requestId
            });
            try {
                logger_1.default.info('Manual parsing started', {
                    chunksCount: chunks.length,
                    totalSize,
                    requestId
                });
                const buffer = Buffer.concat(chunks);
                const contentType = req.get('Content-Type') || '';
                // Extract boundary
                const boundaryMatch = contentType.match(/boundary=([^;]+)/);
                if (!boundaryMatch) {
                    reject(new errors_1.ValidationError('Invalid multipart form data - no boundary'));
                    return;
                }
                const boundary = `--${boundaryMatch[1]}`;
                logger_1.default.info('Parsing with boundary', { boundary, requestId });
                // Convert to string with binary-safe encoding
                const content = buffer.toString('latin1');
                // Split by boundary
                const parts = content.split(boundary);
                logger_1.default.info('Found parts', { partsCount: parts.length, requestId });
                // Find the audio file part
                for (let i = 0; i < parts.length; i++) {
                    const part = parts[i].trim();
                    if (part.includes('name="audioFile"') && part.includes('Content-Type:')) {
                        logger_1.default.info('Processing audio file part', { partIndex: i, requestId });
                        // Extract headers and content
                        const headerEndIndex = part.indexOf('\r\n\r\n');
                        if (headerEndIndex === -1)
                            continue;
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
                        const audioFile = {
                            originalName: filename,
                            mimeType: mimeType,
                            size: fileBuffer.length,
                            buffer: fileBuffer,
                            format: mimeType.split('/')[1].toUpperCase()
                        };
                        logger_1.default.info('Manual parsing successful', {
                            filename: audioFile.originalName,
                            mimeType: audioFile.mimeType,
                            size: audioFile.size,
                            requestId
                        });
                        resolve(audioFile);
                        return;
                    }
                }
                reject(new errors_1.ValidationError('No audio file found in multipart data'));
            }
            catch (error) {
                logger_1.default.error('Manual parsing failed', error, undefined, requestId);
                reject(new errors_1.FileError(types_1.ErrorCode.FILE_PROCESSING_ERROR, `Manual parsing failed: ${error.message}`));
            }
        });
        req.on('error', (error) => {
            clearTimeout(timeout);
            logger_1.default.error('Request stream error', error, undefined, requestId);
            reject(new errors_1.FileError(types_1.ErrorCode.FILE_PROCESSING_ERROR, `Request error: ${error.message}`));
        });
        req.on('close', () => {
            clearTimeout(timeout);
            logger_1.default.info('Request connection closed', { requestId });
        });
        // Log when we start listening
        logger_1.default.info('Manual parser initialized, waiting for data', { requestId });
    });
}
/**
 * Generate default voice analysis for non-speech content
 */
function getDefaultVoiceAnalysis() {
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
async function createMockAnalysisResult(audioFile, requestId) {
    logger_1.default.info('Creating mock analysis result', {
        filename: audioFile.originalName,
        size: audioFile.size,
        requestId
    });
    const result = {
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
async function processFileUpload(req, requestId) {
    return new Promise((resolve, reject) => {
        const uploadSingle = upload.single('audioFile');
        uploadSingle(req, {}, (error) => {
            if (error) {
                logger_1.default.error('File upload error', error, undefined, requestId);
                if (error.code === 'LIMIT_FILE_SIZE') {
                    reject(new errors_1.FileError(types_1.ErrorCode.FILE_TOO_LARGE, `File size exceeds ${config_1.default.rateLimit.maxFileSizeMB}MB limit`));
                }
                else {
                    reject(new errors_1.FileError(types_1.ErrorCode.FILE_PROCESSING_ERROR, `File upload failed: ${error.message || error.code || 'Unknown error'}`));
                }
                return;
            }
            if (!req.file) {
                reject(new errors_1.ValidationError('No audio file provided'));
                return;
            }
            const audioFile = {
                originalName: req.file.originalname,
                mimeType: req.file.mimetype,
                size: req.file.size,
                buffer: req.file.buffer,
                format: req.file.mimetype.split('/')[1].toUpperCase()
            };
            logger_1.default.info('File uploaded successfully', {
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
function validateAnalysisRequest(audioFile, requestId) {
    if (!audioFile.originalName) {
        throw new errors_1.ValidationError('Audio file name is required');
    }
    if (audioFile.size === 0) {
        throw new errors_1.ValidationError('Audio file is empty');
    }
    if (audioFile.size > config_1.default.rateLimit.maxFileSizeMB * 1024 * 1024) {
        throw new errors_1.FileError(types_1.ErrorCode.FILE_TOO_LARGE, `File size ${(audioFile.size / (1024 * 1024)).toFixed(2)}MB exceeds ${config_1.default.rateLimit.maxFileSizeMB}MB limit`);
    }
    logger_1.default.debug('Request validation passed', { filename: audioFile.originalName }, requestId);
}
/**
 * Parse audio metadata to get accurate duration and format information
 * Supports multiple audio formats: MP3, WAV, M4A, AAC, OGG, FLAC, WebM
 */
async function parseAudioMetadata(audioFile, requestId) {
    var _a;
    try {
        // Determine format from MIME type or file extension
        const mimeType = audioFile.mimeType.toLowerCase();
        const fileExtension = ((_a = audioFile.originalName.split('.').pop()) === null || _a === void 0 ? void 0 : _a.toLowerCase()) || '';
        // Map MIME types and extensions to format names
        let format = 'unknown';
        if (mimeType.includes('mp3') || fileExtension === 'mp3') {
            format = 'mp3';
        }
        else if (mimeType.includes('wav') || fileExtension === 'wav') {
            format = 'wav';
        }
        else if (mimeType.includes('m4a') || fileExtension === 'm4a') {
            format = 'm4a';
        }
        else if (mimeType.includes('aac') || fileExtension === 'aac') {
            format = 'aac';
        }
        else if (mimeType.includes('ogg') || fileExtension === 'ogg') {
            format = 'ogg';
        }
        else if (mimeType.includes('flac') || fileExtension === 'flac') {
            format = 'flac';
        }
        else if (mimeType.includes('webm') || fileExtension === 'webm') {
            format = 'webm';
        }
        else {
            format = audioFile.format || fileExtension || 'unknown';
        }
        let duration = 0;
        let bitrate;
        // Method 1: Try to use get-audio-duration for all formats (most reliable)
        try {
            const tempFilePath = await writeTemporaryFile(audioFile, requestId);
            try {
                duration = await (0, get_audio_duration_1.getAudioDurationInSeconds)(tempFilePath);
                logger_1.default.info('Successfully parsed audio duration using get-audio-duration', {
                    filename: audioFile.originalName,
                    format,
                    duration
                }, requestId);
            }
            finally {
                // Clean up temporary file
                try {
                    await fs.promises.unlink(tempFilePath);
                }
                catch (cleanupError) {
                    logger_1.default.warn('Failed to clean up temporary file', {
                        tempFilePath,
                        error: cleanupError
                    }, requestId);
                }
            }
        }
        catch (generalError) {
            logger_1.default.warn('get-audio-duration failed, trying format-specific parsers', {
                filename: audioFile.originalName,
                format,
                error: generalError.message
            }, requestId);
            // Method 2: Format-specific parsers as fallback
            if (format === 'mp3') {
                try {
                    duration = await new Promise((resolve, reject) => {
                        mp3Duration(audioFile.buffer, (err, durationInSeconds) => {
                            if (err) {
                                reject(err);
                            }
                            else {
                                resolve(durationInSeconds);
                            }
                        });
                    });
                    logger_1.default.info('Successfully parsed MP3 duration using mp3-duration', {
                        filename: audioFile.originalName,
                        duration
                    }, requestId);
                }
                catch (mp3Error) {
                    logger_1.default.warn('Failed to parse MP3 duration with mp3-duration', {
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
                logger_1.default.debug('Parsed ID3 tags for MP3', {
                    filename: audioFile.originalName,
                    estimatedBitrate: bitrate
                }, requestId);
            }
            catch (id3Error) {
                logger_1.default.warn('Failed to parse ID3 tags', {
                    filename: audioFile.originalName,
                    error: id3Error.message
                }, requestId);
            }
        }
        // Fallback to estimation if all parsers failed
        if (duration === 0) {
            duration = estimateAudioDuration(audioFile.size, format);
            logger_1.default.info('Using estimated duration for audio file', {
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
    }
    catch (error) {
        logger_1.default.warn('Failed to parse audio metadata, using estimated values', {
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
async function writeTemporaryFile(audioFile, requestId) {
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
function estimateAudioDuration(fileSize, format) {
    // Different formats have different compression ratios
    let bytesPerSecond;
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
async function performAnalysis(audioFile, options = {}, requestId) {
    const analysisStartTime = Date.now();
    logger_1.default.analysisStart(audioFile.originalName, requestId);
    try {
        // Parse real audio metadata
        const audioMetadata = await parseAudioMetadata(audioFile, requestId);
        logger_1.default.info('Audio metadata parsed', {
            duration: audioMetadata.duration,
            format: audioMetadata.format,
            bitrate: audioMetadata.bitrate,
            sampleRate: audioMetadata.sampleRate
        }, requestId);
        // Create analysis prompt with real metadata
        const prompt = prompts_1.PromptTemplates.createAnalysisPrompt(audioFile.originalName, audioMetadata.duration, audioMetadata.format, audioFile.size);
        // Call Vertex AI Gemini API
        const geminiResponse = await vertexAIService_1.vertexAIService.analyzeAudio(prompt, requestId);
        if (!geminiResponse.success || !geminiResponse.data) {
            throw new errors_1.AppError(types_1.ErrorCode.ANALYSIS_FAILED, 'Analysis failed: No data returned from AI service');
        }
        const analysisData = geminiResponse.data.analysis;
        const processingTime = Date.now() - analysisStartTime;
        // Log the raw AI response for debugging
        logger_1.default.info('Raw AI analysis response', {
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
            logger_1.default.info('Generated fallback tags', {
                filename: audioFile.originalName,
                generatedTags: analysisData.tags
            }, requestId);
        }
        else {
            // Clean up AI-generated tags - remove any unwanted prefixes
            const originalTags = [...analysisData.tags]; // Save original
            analysisData.tags = analysisData.tags.map((tag) => {
                // Remove # prefix if present
                let cleanTag = tag.replace(/^#+\s*/, '');
                // Remove any extra whitespace
                cleanTag = cleanTag.trim();
                // Ensure lowercase with hyphens
                cleanTag = cleanTag.toLowerCase().replace(/\s+/g, '-');
                return cleanTag;
            }).filter((tag) => tag.length > 0); // Remove empty tags
            logger_1.default.info('Using AI-generated tags (cleaned)', {
                filename: audioFile.originalName,
                originalTags: originalTags,
                cleanedTags: analysisData.tags
            }, requestId);
        }
        // Generate AI description if not provided
        if (!analysisData.aiDescription) {
            analysisData.aiDescription = generateAIDescription(analysisData);
        }
        // Create final result with real audio metadata
        const result = {
            id: (0, uuid_1.v4)(),
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
                    location_type: 'unknown',
                    setting: 'unknown',
                    activity_level: 'unknown',
                    acoustic_space: 'unknown',
                    time_of_day: 'unknown',
                    weather: 'unknown'
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
        logger_1.default.analysisComplete(audioFile.originalName, processingTime, requestId);
        return result;
    }
    catch (error) {
        const processingTime = Date.now() - analysisStartTime;
        logger_1.default.error(`Analysis failed after ${processingTime}ms`, error, { filename: audioFile.originalName }, requestId);
        if (error instanceof errors_1.AppError) {
            throw error;
        }
        throw new errors_1.AppError(types_1.ErrorCode.ANALYSIS_FAILED, `Audio analysis failed: ${error.message}`, types_1.HttpStatus.INTERNAL_SERVER_ERROR, { originalError: error.message, processingTime });
    }
}
/**
 * Generate tags based on basic info
 */
function generateTags(basicInfo, filename) {
    var _a;
    const tags = [];
    if (basicInfo.genre)
        tags.push(basicInfo.genre.toLowerCase().replace(/\s+/g, '-'));
    if (basicInfo.mood)
        tags.push(basicInfo.mood.toLowerCase().replace(/\s+/g, '-'));
    // Energy tags
    if (basicInfo.energy > 0.8)
        tags.push('high-energy', 'energetic');
    else if (basicInfo.energy > 0.6)
        tags.push('medium-energy');
    else
        tags.push('low-energy', 'calm');
    // BPM tags
    if (basicInfo.bpm > 140)
        tags.push('fast-tempo', 'dance');
    else if (basicInfo.bpm > 100)
        tags.push('moderate-tempo');
    else
        tags.push('slow-tempo', 'chill');
    // File format
    const extension = (_a = filename.split('.').pop()) === null || _a === void 0 ? void 0 : _a.toLowerCase();
    if (extension)
        tags.push(`${extension}-file`);
    // Default tags
    tags.push('ai-analyzed', 'audio-analysis');
    return [...new Set(tags)]; // Remove duplicates
}
/**
 * Generate AI description
 */
function generateAIDescription(analysisData) {
    const { basicInfo, emotions } = analysisData;
    const topEmotion = Object.entries(emotions).reduce((a, b) => emotions[a[0]] > emotions[b[0]] ? a : b)[0];
    return `A ${topEmotion} ${basicInfo.genre.toLowerCase()} track with ${basicInfo.bpm} BPM in ${basicInfo.key}, featuring ${basicInfo.mood.toLowerCase()} energy and ${Math.round(basicInfo.danceability * 100)}% danceability.`;
}
/**
 * Check and consume credits based on audio duration
 */
async function checkAndConsumeCredits(req, audioFile, audioDuration, requestId) {
    const startTime = Date.now();
    try {
        // Extract user information from request headers
        const authHeader = req.get('Authorization');
        const deviceFingerprint = req.get('X-Device-Fingerprint');
        let userId;
        // Check if user is authenticated
        if (authHeader && authHeader.startsWith('Bearer ')) {
            try {
                // 验证 Supabase JWT token
                const token = authHeader.substring(7);
                const { verifySupabaseToken } = await Promise.resolve().then(() => __importStar(require('../utils/supabase')));
                const decodedToken = await verifySupabaseToken(token);
                userId = decodedToken.sub; // Supabase 使用 'sub' 作为用户ID
                logger_1.default.info('User authenticated via Supabase', { userId, requestId });
            }
            catch (tokenError) {
                logger_1.default.error('Invalid Supabase token', tokenError, { requestId });
                throw new Error('Invalid authentication token');
            }
        }
        // Calculate required credits based on audio duration
        let requiredCredits;
        try {
            requiredCredits = (0, supabase_1.calculateCreditsRequired)(audioDuration);
        }
        catch (error) {
            throw new errors_1.CreditCalculationError(`Failed to calculate required credits for audio duration: ${audioDuration}s`, { audioDuration, error: error.message });
        }
        logger_1.default.info('Credit calculation', {
            audioDuration,
            requiredCredits,
            userId,
            deviceFingerprint,
            requestId
        });
        if (userId) {
            // Handle registered user
            logger_1.default.info('Checking credits for registered user', { userId, requiredCredits, requestId });
            const creditStatus = await (0, supabase_1.checkUserCredits)(userId, requiredCredits);
            // Log credit check result
            logger_1.default.creditCheck(userId, undefined, requiredCredits, creditStatus.currentCredits, requestId);
            if (!creditStatus.hasEnoughCredits) {
                logger_1.default.creditError(userId, undefined, 'INSUFFICIENT_CREDITS', `Required: ${requiredCredits}, Available: ${creditStatus.currentCredits}`, requestId);
                throw new errors_1.InsufficientCreditsError(requiredCredits, creditStatus.currentCredits, false);
            }
            // Consume user credits
            logger_1.default.info('About to consume user credits', { userId, requiredCredits, requestId });
            const consumption = await (0, supabase_1.consumeUserCredits)(userId, requiredCredits, `Audio analysis: ${audioFile.originalName}`, requestId);
            if (!consumption.success) {
                logger_1.default.creditError(userId, undefined, 'CREDIT_CONSUMPTION_FAILED', 'Failed to consume credits', requestId);
                throw new errors_1.CreditConsumptionError('Failed to consume credits. Please try again.', { userId, requiredCredits, requestId });
            }
            // Log successful credit consumption
            logger_1.default.creditConsumption(userId, undefined, requiredCredits, consumption.remainingCredits, requestId);
            // Log usage activity
            await (0, supabase_1.logUsageActivity)({
                userId,
                analysisType: 'audio',
                fileSize: audioFile.size,
                processingTime: Date.now() - startTime,
                success: true
            });
            return { userId, creditsConsumed: requiredCredits };
        }
        else if (deviceFingerprint) {
            // Handle trial user
            logger_1.default.info('Checking credits for trial user', { deviceFingerprint, requiredCredits, requestId });
            const creditStatus = await (0, supabase_1.checkTrialCredits)(deviceFingerprint, requiredCredits);
            // Log trial credit check result
            logger_1.default.creditCheck(undefined, deviceFingerprint, requiredCredits, creditStatus.currentCredits, requestId);
            if (!creditStatus.hasEnoughCredits) {
                logger_1.default.creditError(undefined, deviceFingerprint, 'INSUFFICIENT_CREDITS', `Required: ${requiredCredits}, Available: ${creditStatus.currentCredits}`, requestId);
                throw new errors_1.InsufficientCreditsError(requiredCredits, creditStatus.currentCredits, true);
            }
            // Consume trial credits
            const consumption = await (0, supabase_1.consumeTrialCredits)(deviceFingerprint, requiredCredits, `Audio analysis: ${audioFile.originalName}`, requestId);
            if (!consumption.success) {
                logger_1.default.creditError(undefined, deviceFingerprint, 'CREDIT_CONSUMPTION_FAILED', 'Failed to consume trial credits', requestId);
                throw new errors_1.CreditConsumptionError('Failed to consume trial credits. Please try again.', { deviceFingerprint, requiredCredits, requestId });
            }
            // Log successful trial credit consumption
            logger_1.default.creditConsumption(undefined, deviceFingerprint, requiredCredits, consumption.remainingCredits, requestId);
            // Log usage activity
            await (0, supabase_1.logUsageActivity)({
                deviceFingerprint,
                analysisType: 'audio',
                fileSize: audioFile.size,
                processingTime: Date.now() - startTime,
                success: true
            });
            return { deviceFingerprint, creditsConsumed: requiredCredits };
        }
        else {
            // No authentication or device fingerprint
            throw new errors_1.ValidationError('Authentication required. Please provide either user authentication or device fingerprint.');
        }
    }
    catch (error) {
        logger_1.default.error('Error in credit check', error, undefined, requestId);
        // Log failed usage attempt
        if (req.get('X-Device-Fingerprint') || req.get('X-User-ID')) {
            await (0, supabase_1.logUsageActivity)({
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
exports.default = exports.analyzeAudio;
