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
}

export interface StructuralAnalysis {
    intro?: { start: number; end: number };
    verse1?: { start: number; end: number };
    chorus1?: { start: number; end: number };
    verse2?: { start: number; end: number };
    chorus2?: { start: number; end: number };
    bridge?: { start: number; end: number };
    outro?: { start: number; end: number };
    [key: string]: { start: number; end: number } | undefined;
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

export interface SimilarityAnalysis {
    similar_tracks: SimilarTrack[];
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
    basicInfo: BasicInfo;
    emotions: EmotionalAnalysis;
    structure: StructuralAnalysis;
    quality: QualityMetrics;
    similarity: SimilarityAnalysis;
    tags: string[];
    aiDescription: string;
    processingTime: number;
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