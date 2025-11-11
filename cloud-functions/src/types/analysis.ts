// Audio Analysis Types
export interface AudioFile {
    originalName: string;
    mimeType: string;
    size: number;
    buffer: Buffer;
    duration?: number;
    format?: string;
}

export interface BasicInfo {
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
}

export interface EmotionalAnalysis {
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
}

export interface StructuralAnalysis {
    intro?: { start: number; end: number };
    verse1?: { start: number; end: number };
    chorus1?: { start: number; end: number };
    verse2?: { start: number; end: number };
    chorus2?: { start: number; end: number };
    bridge?: { start: number; end: number };
    outro?: { start: number; end: number };
    events?: AudioEvent[];
    [key: string]: { start: number; end: number } | AudioEvent[] | undefined;
}

export interface AudioEvent {
    type: string;
    timestamp: { start: number; end: number };
    description: string;
}

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
        speakingRate: number; // words per minute
        pauseFrequency: 'low' | 'medium' | 'high';
        intonationVariation: number; // 0.0 to 1.0
    };
    languageAnalysis: {
        language: string;
        confidence: number;
        accent: string;
    };
    audioQuality: {
        backgroundNoise: number; // 0.0 to 1.0
        echo: number; // 0.0 to 1.0
        compression: number; // 0.0 to 1.0
        overall: number; // 0.0 to 1.0
    };
}

export interface SoundEffectAnalysis {
    detected: DetectedSound[];
    environment: EnvironmentAnalysis;
}

export interface QualityMetrics {
    overall: number;
    clarity: number;
    loudness: number;
    dynamic_range: number;
    noise_level: number;
    distortion: number;
    frequency_balance: number;
}

export interface SimilarTrack {
    title: string;
    artist: string;
    similarity: number;
    genre?: string;
    year?: number;
}

export interface SimilarSound {
    category: string;
    description: string;
    similarity: number;
}

export interface SimilarityAnalysis {
    similar_tracks: SimilarTrack[];
    similar_sounds: SimilarSound[];
    style_influences: string[];
    genre_confidence: number;
}

export interface AnalysisResult {
    id: string;
    filename: string;
    timestamp: string;
    duration: number;
    fileSize: string;
    format: string;
    contentType: ContentType;
    basicInfo: BasicInfo;
    voiceAnalysis: VoiceAnalysis;
    soundEffects: SoundEffectAnalysis;
    emotions: EmotionalAnalysis;
    transcription: string;  // 音频转文字内容
    quality: QualityMetrics;
    similarity: SimilarityAnalysis;
    tags: string[];
    aiDescription: string;
    processingTime: number;
    audioUrl?: string; // Firebase Storage URL for audio playback
}

export interface AnalysisRequest {
    audioFile: AudioFile;
    options?: {
        includeStructure?: boolean;
        includeSimilarity?: boolean;
        detailedAnalysis?: boolean;
        generateTags?: boolean;
    };
}

export interface AnalysisResponse {
    success: boolean;
    data?: AnalysisResult;
    error?: {
        code: string;
        message: string;
        details?: any;
    };
    processingTime: number;
}