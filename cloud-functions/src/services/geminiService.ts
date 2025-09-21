import { GoogleGenerativeAI } from '@google/generative-ai';
import {
    GeminiConfig,
    GeminiResponse,
    AudioAnalysisPrompt,
    AnalysisResult,
    BasicInfo,
    EmotionalAnalysis,
    StructuralAnalysis,
    QualityMetrics,
    SimilarityAnalysis
} from '../types';
import { GeminiError } from '../utils/errors';
import logger from '../utils/logger';
import config from '../utils/config';
import { SecurityUtils, CostMonitor } from '../utils/security';
import * as crypto from 'crypto';

export class GeminiService {
    private genAI: GoogleGenerativeAI;
    private model: any;

    constructor(geminiConfig: GeminiConfig) {
        this.genAI = new GoogleGenerativeAI(geminiConfig.apiKey);
        this.model = this.genAI.getGenerativeModel({
            model: geminiConfig.model,
            generationConfig: {
                maxOutputTokens: geminiConfig.maxTokens,
                temperature: geminiConfig.temperature,
            }
        });
    }

    /**
     * Generate audio analysis using Gemini AI
     */
    async analyzeAudio(
        prompt: AudioAnalysisPrompt,
        requestId: string
    ): Promise<GeminiResponse> {
        const startTime = Date.now();

        try {
            logger.geminiRequest(prompt.userPrompt, requestId);

            const fullPrompt = this.buildFullPrompt(prompt);

            const result = await this.model.generateContent(fullPrompt);
            const response = await result.response;
            const text = response.text();

            const duration = Date.now() - startTime;
            logger.geminiResponse(text.length, duration, requestId);

            // Parse the response
            const analysis = this.parseAnalysisResponse(text, requestId);

            return {
                success: true,
                data: {
                    analysis,
                    usage: {
                        promptTokens: 0, // Gemini doesn't provide token counts in the same way
                        completionTokens: text.length,
                        totalTokens: text.length,
                    }
                }
            };

        } catch (error: any) {
            const duration = Date.now() - startTime;
            logger.error(`Gemini API error after ${duration}ms`, error, undefined, requestId);

            throw new GeminiError(
                `Gemini API request failed: ${error.message}`,
                { originalError: error.message, duration }
            );
        }
    }

    /**
     * Build the complete prompt for Gemini
     */
    private buildFullPrompt(prompt: AudioAnalysisPrompt): string {
        return `${prompt.systemPrompt}

Audio File Metadata:
- Filename: ${prompt.audioMetadata.filename}
- Duration: ${prompt.audioMetadata.duration} seconds
- Format: ${prompt.audioMetadata.format}
- File Size: ${(prompt.audioMetadata.size / (1024 * 1024)).toFixed(2)} MB

${prompt.userPrompt}

Please provide your analysis in valid JSON format only, without any markdown formatting or additional text.`;
    }

    /**
     * Parse Gemini's response into structured analysis data
     */
    private parseAnalysisResponse(responseText: string, requestId: string): any {
        try {
            // Log the raw response for debugging
            logger.info('Raw Gemini response', {
                responseLength: responseText.length,
                rawResponse: responseText.substring(0, 1000) + (responseText.length > 1000 ? '...' : '')
            }, requestId);

            // Clean the response text
            let cleanedText = responseText.trim();

            // Remove markdown code blocks if present
            cleanedText = cleanedText.replace(/```json\s*/g, '').replace(/```\s*$/g, '');
            cleanedText = cleanedText.replace(/```\s*/g, '');

            // Try to parse as JSON
            const parsed = JSON.parse(cleanedText);

            // Validate the structure
            this.validateAnalysisResponse(parsed, requestId);

            return parsed;

        } catch (error: any) {
            logger.error(`Failed to parse Gemini response`, error, { responseText }, requestId);

            // Fallback: try to extract JSON from the response
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                try {
                    const parsed = JSON.parse(jsonMatch[0]);
                    this.validateAnalysisResponse(parsed, requestId);
                    return parsed;
                } catch (fallbackError) {
                    // Continue to error below
                }
            }

            throw new GeminiError(
                'Failed to parse analysis response from Gemini',
                { responseText: responseText.substring(0, 500) }
            );
        }
    }

    /**
     * Validate the structure of the analysis response
     */
    private validateAnalysisResponse(analysis: any, requestId: string): void {
        const requiredFields = ['basicInfo', 'emotions', 'structure', 'quality', 'similarity', 'tags'];
        const missingFields = requiredFields.filter(field => !analysis[field]);

        if (missingFields.length > 0) {
            logger.warn(`Analysis response missing fields: ${missingFields.join(', ')}`, { analysis }, requestId);

            // Provide defaults for missing fields
            if (!analysis.basicInfo) analysis.basicInfo = this.getDefaultBasicInfo();
            if (!analysis.emotions) analysis.emotions = this.getDefaultEmotions();
            if (!analysis.structure) analysis.structure = this.getDefaultStructure();
            if (!analysis.quality) analysis.quality = this.getDefaultQuality();
            if (!analysis.similarity) analysis.similarity = this.getDefaultSimilarity();
            if (!analysis.tags) analysis.tags = this.getDefaultTags();
        }
    }

    // Default values for missing analysis fields
    private getDefaultBasicInfo(): BasicInfo {
        return {
            genre: 'Unknown',
            mood: 'Neutral',
            bpm: 120,
            key: 'C Major',
            energy: 0.5,
            valence: 0.5,
            danceability: 0.5,
            instrumentalness: 0.5,
            speechiness: 0.1,
            acousticness: 0.5,
            liveness: 0.1,
            loudness: -10
        };
    }

    private getDefaultEmotions(): EmotionalAnalysis {
        return {
            happy: 0.3,
            sad: 0.2,
            angry: 0.1,
            calm: 0.4,
            excited: 0.2,
            melancholic: 0.2,
            energetic: 0.3,
            peaceful: 0.3,
            tense: 0.2,
            relaxed: 0.4
        };
    }

    private getDefaultStructure(): StructuralAnalysis {
        return {
            intro: { start: 0, end: 8 },
            verse1: { start: 8, end: 32 },
            chorus1: { start: 32, end: 56 },
            outro: { start: 56, end: 80 }
        };
    }

    private getDefaultQuality(): QualityMetrics {
        return {
            overall: 7.0,
            clarity: 7.0,
            loudness: -10,
            dynamic_range: 6.0,
            noise_level: 2.0,
            distortion: 1.0,
            frequency_balance: 7.0
        };
    }

    private getDefaultSimilarity(): SimilarityAnalysis {
        return {
            similar_tracks: [],
            similar_sounds: [],
            style_influences: ['Unknown'],
            genre_confidence: 0.5
        };
    }

    private getDefaultTags(): string[] {
        return ['audio', 'music', 'ai-analyzed'];
    }
}

// Create a singleton instance
export const geminiService = new GeminiService({
    apiKey: config.googleAI.apiKey,
    model: config.googleAI.model,
    maxTokens: config.googleAI.maxTokens,
    temperature: config.googleAI.temperature,
});

export default geminiService;