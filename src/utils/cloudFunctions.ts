/**
 * Cloud Functions API Client
 * 
 * This module provides a client for interacting with the Describe Music cloud functions.
 * It handles API calls, error handling, and response parsing.
 */

// Types matching the cloud function responses
export interface ContentType {
    primary: 'music' | 'speech' | 'sound-effects' | 'ambient' | 'mixed';
    confidence: number;
    description: string;
}

export interface DetectedSound {
    category: 'nature' | 'urban' | 'indoor' | 'mechanical' | 'human' | 'animal' | 'event';
    type: string;
    confidence: number;
    timestamp: { start: number; end: number };
    description: string;
}

export interface EnvironmentAnalysis {
    location_type: 'indoor' | 'outdoor' | 'mixed';
    setting: 'urban' | 'rural' | 'natural' | 'domestic' | 'commercial';
    activity_level: 'busy' | 'moderate' | 'calm' | 'isolated';
    acoustic_space: 'small' | 'medium' | 'large' | 'open';
    time_of_day: 'unknown' | 'morning' | 'day' | 'evening' | 'night';
    weather: 'unknown' | 'clear' | 'rain' | 'wind' | 'storm';
}

export interface VoiceAnalysis {
    hasVoice: boolean;
    speakerCount: number;
    genderDetection: {
        primary: 'male' | 'female' | 'unknown';
        confidence: number;
        multipleGenders: boolean;
    };
    speakerEmotion: {
        primary: 'happy' | 'sad' | 'angry' | 'calm' | 'excited' | 'nervous' | 'confident' | 'stressed' | 'neutral';
        confidence: number;
        emotions: {
            happy: number;
            sad: number;
            angry: number;
            calm: number;
            excited: number;
            nervous: number;
            confident: number;
            stressed: number;
        };
    };
    speechClarity: {
        score: number;
        pronunciation: number;
        articulation: number;
        pace: 'slow' | 'normal' | 'fast';
        volume: 'quiet' | 'normal' | 'loud';
    };
    vocalCharacteristics: {
        pitchRange: 'low' | 'medium' | 'high';
        speakingRate: number;
        pauseFrequency: 'low' | 'medium' | 'high';
        intonationVariation: number;
    };
    languageAnalysis: {
        language: string;
        confidence: number;
        accent: string;
    };
    audioQuality: {
        backgroundNoise: number;
        echo: number;
        compression: number;
        overall: number;
    };
}

export interface SoundEffectAnalysis {
    detected: DetectedSound[];
    environment: EnvironmentAnalysis;
}

export interface AudioEvent {
    type: string;
    timestamp: { start: number; end: number };
    description: string;
}

export interface CloudAnalysisResult {
    id: string;
    filename: string;
    timestamp: string;
    duration: number;
    fileSize: string;
    format: string;
    contentType: ContentType;
    basicInfo: {
        genre: string;
        mood: string;
        bpm: number;
        key: string;
        energy: number;
        valence: number;
        danceability: number;
        instrumentalness: number;
        speechiness: number;
        acousticness: number;
        liveness: number;
        loudness: number;
    };
    voiceAnalysis: VoiceAnalysis;
    soundEffects: SoundEffectAnalysis;
    emotions: {
        happy: number;
        sad: number;
        angry: number;
        calm: number;
        excited: number;
        melancholic: number;
        energetic: number;
        peaceful: number;
        tense: number;
        relaxed: number;
    };
    structure: {
        events?: AudioEvent[];
        [key: string]: { start: number; end: number } | AudioEvent[] | undefined;
    };
    quality: {
        overall: number;
        clarity: number;
        loudness: number;
        dynamic_range: number;
        noise_level: number;
        distortion: number;
        frequency_balance: number;
    };
    similarity: {
        similar_tracks: Array<{
            title: string;
            artist: string;
            similarity: number;
            genre?: string;
        }>;
        similar_sounds: Array<{
            category: string;
            description: string;
            similarity: number;
        }>;
        style_influences: string[];
        genre_confidence: number;
    };
    tags: string[];
    aiDescription: string;
    processingTime: number;
    audioUrl?: string; // Firebase Storage URL for audio playback
}

export interface CloudApiResponse<T = any> {
    success: boolean;
    data?: T;
    error?: {
        code: string;
        message: string;
        details?: any;
        timestamp: string;
        requestId?: string;
    };
    timestamp: string;
    requestId?: string;
}

export interface AnalysisOptions {
    includeStructure?: boolean;
    includeSimilarity?: boolean;
    detailedAnalysis?: boolean;
    generateTags?: boolean;
    audioDuration?: number; // Duration in seconds, detected by frontend
    onProgress?: (progress: ProgressUpdate) => void;
}

export interface ProgressUpdate {
    phase: 'uploading' | 'analyzing';
    percentage: number; // Unified 0-100 progress
    message: string;
}

export class CloudFunctionsError extends Error {
    public code: string;
    public details?: any;
    public requestId?: string;

    constructor(code: string, message: string, details?: any, requestId?: string) {
        super(message);
        this.name = 'CloudFunctionsError';
        this.code = code;
        this.details = details;
        this.requestId = requestId;
    }

    /**
     * Check if this is a usage limit error
     */
    isUsageLimitError(): boolean {
        return this.code === 'USAGE_LIMIT_EXCEEDED' ||
            this.code === 'TRIAL_LIMIT_EXCEEDED' ||
            this.code === 'MONTHLY_LIMIT_EXCEEDED';
    }

    /**
     * Check if this is an authentication error
     */
    isAuthError(): boolean {
        return this.code === 'AUTHENTICATION_REQUIRED' ||
            this.code === 'INVALID_TOKEN' ||
            this.code === 'SESSION_EXPIRED';
    }

    /**
     * Get user-friendly error message
     */
    getUserFriendlyMessage(): string {
        switch (this.code) {
            case 'USAGE_LIMIT_EXCEEDED':
            case 'TRIAL_LIMIT_EXCEEDED':
                return 'Free trial exhausted, sign up to get 200 credits for audio analysis';
            case 'MONTHLY_LIMIT_EXCEEDED':
                return 'Monthly analyses exhausted, will reset next month';
            case 'AUTHENTICATION_REQUIRED':
                return 'Please login to continue';
            case 'INVALID_TOKEN':
            case 'SESSION_EXPIRED':
                return 'Login expired, please login again';
            case 'NETWORK_ERROR':
                return 'Network connection failed, please check your network and try again';
            case 'TIMEOUT':
                return 'Request timeout, please try again';
            default:
                return this.message || 'Analysis failed, please try again';
        }
    }
}

export class CloudFunctionsClient {
    private baseUrl: string;
    private timeout: number;

    constructor(baseUrl?: string, timeout: number = 300000) { // 5 minutes default
        // Use environment variable or default to production URL
        this.baseUrl = baseUrl ||
            import.meta.env.VITE_CLOUD_FUNCTIONS_URL ||
            'https://us-central1-describe-music.cloudfunctions.net'; // Changed to production URL
        this.timeout = timeout;

        // Debug log to see what URL is being used
        console.log('CloudFunctionsClient initialized with URL:', this.baseUrl);
        console.log('Environment variable VITE_CLOUD_FUNCTIONS_URL:', import.meta.env.VITE_CLOUD_FUNCTIONS_URL);
    }

    /**
     * Get authentication headers for requests
     */
    private async getAuthHeaders(): Promise<Record<string, string>> {
        const headers: Record<string, string> = {};

        try {
            // Import DeviceFingerprint dynamically to avoid circular dependencies
            const { DeviceFingerprint } = await import('./deviceFingerprint');

            // Get device fingerprint (always required)
            const deviceFingerprint = await DeviceFingerprint.generate();
            headers['X-Device-Fingerprint'] = deviceFingerprint;

            // Try to get user information from Supabase
            const { supabase } = await import('../lib/supabase');

            // Check current session first
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();

            if (sessionError) {
                console.warn('Error getting session:', sessionError);
                return headers; // Return with just device fingerprint
            }

            if (session?.user) {
                headers['X-User-ID'] = session.user.id;

                // Check if token is still valid (not expired)
                const now = Math.floor(Date.now() / 1000);
                const tokenExpiry = session.expires_at || 0;

                if (tokenExpiry > now + 60) { // Token valid for at least 1 more minute
                    headers['Authorization'] = `Bearer ${session.access_token}`;
                } else {
                    console.log('Token is expiring soon, attempting refresh...');

                    // Try to refresh the token
                    const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();

                    if (refreshError) {
                        console.warn('Failed to refresh session:', refreshError);
                        // Continue with expired token, let the server handle it
                        headers['Authorization'] = `Bearer ${session.access_token}`;
                    } else if (refreshData.session) {
                        console.log('Session refreshed successfully');
                        headers['Authorization'] = `Bearer ${refreshData.session.access_token}`;
                        headers['X-User-ID'] = refreshData.session.user.id;
                    }
                }
            }

        } catch (error) {
            console.warn('Failed to get authentication headers:', error);
            // Continue without auth headers - the cloud function will handle this
        }

        return headers;
    }

    /**
     * Handle authentication errors and provide user guidance
     */
    private handleAuthError(error: CloudFunctionsError): void {
        if (error.isUsageLimitError()) {
            // Dispatch custom event for usage limit errors
            window.dispatchEvent(new CustomEvent('usageLimitExceeded', {
                detail: {
                    error,
                    message: error.getUserFriendlyMessage()
                }
            }));
        } else if (error.isAuthError()) {
            // Dispatch custom event for auth errors
            window.dispatchEvent(new CustomEvent('authenticationRequired', {
                detail: {
                    error,
                    message: error.getUserFriendlyMessage()
                }
            }));
        }
    }

    /**
     * Analyze audio file using cloud function
     */
    /**
     * Generate signed URL for direct GCS upload
     */
    async generateUploadUrl(fileName: string, contentType?: string): Promise<{
        uploadUrl: string;
        downloadUrl: string;
        fileName: string;
        originalName: string;
        expiresAt: string;
    }> {
        const response = await this.makeRequest('/generateUploadUrl', {
            method: 'POST',
            body: JSON.stringify({ fileName, contentType }),
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!response.success || !response.data) {
            throw new CloudFunctionsError(
                response.error?.code || 'UNKNOWN_ERROR',
                response.error?.message || 'Failed to generate upload URL',
                response.error?.details,
                response.requestId
            );
        }

        return response.data;
    }

    /**
     * Upload file directly to Google Cloud Storage with progress tracking
     */
    async uploadToGCS(file: File, uploadUrl: string, onProgress?: (progress: ProgressUpdate) => void): Promise<void> {
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();

            // Track upload progress (0-30% of total progress)
            xhr.upload.addEventListener('progress', (event) => {
                if (event.lengthComputable && onProgress) {
                    const uploadProgress = (event.loaded / event.total) * 100;
                    const totalProgress = Math.round(uploadProgress * 0.3); // Upload takes 30% of total
                    onProgress({
                        phase: 'uploading',
                        percentage: totalProgress,
                        message: `Uploading file... ${Math.round(uploadProgress)}%`
                    });
                }
            });

            // Handle upload completion
            xhr.addEventListener('load', () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    if (onProgress) {
                        onProgress({
                            phase: 'uploading',
                            percentage: 30, // Upload completed, now 30% of total
                            message: 'Upload completed'
                        });
                    }
                    resolve();
                } else {
                    reject(new CloudFunctionsError(
                        'GCS_UPLOAD_ERROR',
                        `Upload failed with status ${xhr.status}`,
                        { status: xhr.status, statusText: xhr.statusText }
                    ));
                }
            });

            // Handle upload errors
            xhr.addEventListener('error', () => {
                reject(new CloudFunctionsError(
                    'GCS_UPLOAD_ERROR',
                    'Upload failed due to network error'
                ));
            });

            // Start the upload
            xhr.open('PUT', uploadUrl);
            xhr.setRequestHeader('Content-Type', file.type || 'audio/mpeg');
            xhr.send(file);
        });
    }

    /**
     * Analyze audio file using GCS URL (new approach)
     */
    async analyzeAudioFromGCS(
        fileUrl: string,
        fileName: string,
        options: AnalysisOptions = {}
    ): Promise<CloudAnalysisResult> {
        const response = await this.makeRequest('/analyzeAudioFromUrl', {
            method: 'POST',
            body: JSON.stringify({ fileUrl, fileName, options }),
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!response.success || !response.data) {
            throw new CloudFunctionsError(
                response.error?.code || 'UNKNOWN_ERROR',
                response.error?.message || 'Analysis failed',
                response.error?.details,
                response.requestId
            );
        }

        return response.data;
    }

    /**
     * Analyze audio file (new GCS-based approach)
     */
    async analyzeAudio(
        audioFile: File,
        options: AnalysisOptions = {}
    ): Promise<CloudAnalysisResult> {
        try {
            const { onProgress } = options;

            // Step 1: Generate signed upload URL
            if (onProgress) {
                onProgress({
                    phase: 'uploading',
                    percentage: 0,
                    message: 'Preparing upload...'
                });
            }
            console.log('Step 1: Generating upload URL...');
            const uploadInfo = await this.generateUploadUrl(audioFile.name, audioFile.type);

            // Step 2: Upload file directly to GCS with progress
            console.log('Step 2: Uploading file to GCS...');
            await this.uploadToGCS(audioFile, uploadInfo.uploadUrl, onProgress);

            // Step 3: Trigger analysis using the GCS URL
            if (onProgress) {
                onProgress({
                    phase: 'analyzing',
                    percentage: 30, // Analysis starts at 30%
                    message: 'Starting analysis...'
                });
            }
            console.log('Step 3: Starting analysis...');

            // Simulate analysis progress updates
            const analysisPromise = this.analyzeAudioFromGCS(
                uploadInfo.downloadUrl,
                uploadInfo.originalName,
                options
            );

            // Create a progress simulation for analysis
            if (onProgress) {
                this.simulateAnalysisProgress(onProgress);
            }

            const result = await analysisPromise;

            if (onProgress) {
                onProgress({
                    phase: 'analyzing',
                    percentage: 100,
                    message: 'Analysis completed!'
                });
            }

            console.log('Analysis completed successfully!');
            return result;

        } catch (error) {
            console.error('Audio analysis failed:', error);

            // Handle specific error types
            if (error instanceof CloudFunctionsError) {
                this.handleAuthError(error);
            }

            throw error;
        }
    }

    /**
     * Simulate analysis progress (since we can't track real cloud function progress)
     * Analysis takes 30% to 100% of total progress (70% of the total range)
     */
    private simulateAnalysisProgress(onProgress: (progress: ProgressUpdate) => void): void {
        const phases = [
            { percentage: 40, message: 'Processing audio data...' },      // 30% + 10% = 40%
            { percentage: 50, message: 'Extracting features...' },        // 30% + 20% = 50%
            { percentage: 65, message: 'Analyzing patterns...' },         // 30% + 35% = 65%
            { percentage: 80, message: 'Generating insights...' },        // 30% + 50% = 80%
            { percentage: 95, message: 'Finalizing results...' }          // 30% + 65% = 95%
        ];

        let phaseIndex = 0;
        const updateProgress = () => {
            if (phaseIndex < phases.length) {
                const phase = phases[phaseIndex];
                onProgress({
                    phase: 'analyzing',
                    percentage: phase.percentage,
                    message: phase.message
                });
                phaseIndex++;
                setTimeout(updateProgress, 800 + Math.random() * 400); // 800-1200ms intervals
            }
        };

        setTimeout(updateProgress, 500); // Start after 500ms
    }

    /**
     * Check health of cloud functions
     */
    async healthCheck(): Promise<any> {
        const response = await this.makeRequest('/healthCheck', {
            method: 'GET',
        });

        return response;
    }

    /**
     * Get version information
     */
    async getVersion(): Promise<any> {
        const response = await this.makeRequest('/version', {
            method: 'GET',
        });

        return response;
    }

    /**
     * Make HTTP request to cloud function with retry logic
     */
    private async makeRequest(
        endpoint: string,
        options: RequestInit,
        retryCount: number = 0
    ): Promise<CloudApiResponse> {
        const url = `${this.baseUrl}${endpoint}`;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        // Get authentication headers
        const authHeaders = await this.getAuthHeaders();

        try {
            const response = await fetch(url, {
                ...options,
                signal: controller.signal,
                headers: {
                    'Accept': 'application/json',
                    // Don't set Content-Type for FormData - let browser set it automatically
                    ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
                    ...authHeaders,
                    ...options.headers,
                },
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));

                // Map specific HTTP status codes to error types
                let errorCode = errorData.error?.code || 'HTTP_ERROR';
                let errorMessage = errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`;

                // Handle specific status codes
                if (response.status === 429) {
                    errorCode = 'USAGE_LIMIT_EXCEEDED';
                    errorMessage = errorMessage || 'Usage limit reached';
                } else if (response.status === 401) {
                    errorCode = 'AUTHENTICATION_REQUIRED';
                    errorMessage = errorMessage || 'Authentication required';
                } else if (response.status === 403) {
                    errorCode = 'ACCESS_DENIED';
                    errorMessage = errorMessage || 'Access denied';
                }

                throw new CloudFunctionsError(
                    errorCode,
                    errorMessage,
                    errorData.error?.details || { status: response.status, statusText: response.statusText },
                    errorData.requestId
                );
            }

            const data = await response.json();
            return data;

        } catch (error: any) {
            clearTimeout(timeoutId);

            if (error.name === 'AbortError') {
                throw new CloudFunctionsError(
                    'TIMEOUT',
                    `Request timeout after ${this.timeout}ms`
                );
            }

            if (error instanceof CloudFunctionsError) {
                // Retry logic for specific errors
                if (error.isAuthError() && retryCount < 1) {
                    console.log('Authentication error, refreshing session and retrying...');
                    try {
                        // Try to refresh the session
                        const { supabase } = await import('../lib/supabase');
                        await supabase.auth.refreshSession();

                        // Retry the request with fresh auth headers
                        return this.makeRequest(endpoint, options, retryCount + 1);
                    } catch (refreshError) {
                        console.error('Failed to refresh session:', refreshError);
                        // Fall through to throw the original error
                    }
                }

                throw error;
            }

            throw new CloudFunctionsError(
                'NETWORK_ERROR',
                `Network error: ${error.message}`,
                { originalError: error.message }
            );
        }
    }
}

// Create default client instance
export const cloudFunctions = new CloudFunctionsClient();

// Helper function to convert cloud function result to frontend format
export function convertToFrontendFormat(cloudResult: CloudAnalysisResult): any {
    return {
        id: cloudResult.id,
        filename: cloudResult.filename,
        timestamp: cloudResult.timestamp,
        duration: cloudResult.duration,
        fileSize: cloudResult.fileSize,
        format: cloudResult.format,
        contentType: cloudResult.contentType,
        basicInfo: cloudResult.basicInfo,
        voiceAnalysis: cloudResult.voiceAnalysis,
        soundEffects: cloudResult.soundEffects,
        emotions: cloudResult.emotions,
        structure: cloudResult.structure,
        quality: cloudResult.quality,
        similarity: cloudResult.similarity,
        tags: cloudResult.tags,
        aiDescription: cloudResult.aiDescription,
        processingTime: cloudResult.processingTime,
    };
}

// Helper function to validate file before upload
export function validateAudioFile(file: File): { valid: boolean; error?: string } {
    const allowedTypes = [
        'audio/mpeg',
        'audio/mp3',
        'audio/wav',
        'audio/m4a',
        'audio/aac',
        'audio/ogg',
        'audio/webm',
        'audio/flac'
    ];

    if (!allowedTypes.includes(file.type)) {
        return {
            valid: false,
            error: `Unsupported file type: ${file.type}. Supported formats: MP3, WAV, M4A, AAC, OGG, WebM, FLAC`
        };
    }

    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
        return {
            valid: false,
            error: `File size ${(file.size / (1024 * 1024)).toFixed(2)}MB exceeds 50MB limit`
        };
    }

    if (file.size === 0) {
        return {
            valid: false,
            error: 'File is empty'
        };
    }

    return { valid: true };
}

export default cloudFunctions;