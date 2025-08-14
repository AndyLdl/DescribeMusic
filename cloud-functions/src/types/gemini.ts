// Gemini API Types
export interface GeminiConfig {
    apiKey: string;
    model: string;
    maxTokens: number;
    temperature: number;
}

export interface AudioAnalysisPrompt {
    systemPrompt: string;
    userPrompt: string;
    audioMetadata: {
        filename: string;
        duration: number;
        format: string;
        size: number;
    };
}

export interface GeminiResponse {
    success: boolean;
    data?: {
        analysis: any;
        usage?: {
            promptTokens: number;
            completionTokens: number;
            totalTokens: number;
        };
    };
    error?: {
        message: string;
        code?: string;
        type?: string;
    };
}

export interface AudioFeatures {
    // Spectral features
    spectral_centroid: number[];
    spectral_bandwidth: number[];
    spectral_rolloff: number[];
    zero_crossing_rate: number[];

    // Rhythm features
    tempo: number;
    beat_track: number[];

    // Harmonic features
    chroma: number[][];
    tonnetz: number[][];

    // Timbral features
    mfcc: number[][];
    spectral_contrast: number[][];

    // Energy features
    rms: number[];

    // Statistical summary
    summary: {
        mean: { [key: string]: number };
        std: { [key: string]: number };
        max: { [key: string]: number };
        min: { [key: string]: number };
    };
}