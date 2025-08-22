"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.geminiService = exports.GeminiService = void 0;
const generative_ai_1 = require("@google/generative-ai");
const errors_1 = require("../utils/errors");
const logger_1 = __importDefault(require("../utils/logger"));
const config_1 = __importDefault(require("../utils/config"));
class GeminiService {
    constructor(geminiConfig) {
        this.genAI = new generative_ai_1.GoogleGenerativeAI(geminiConfig.apiKey);
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
    async analyzeAudio(prompt, requestId) {
        const startTime = Date.now();
        try {
            logger_1.default.geminiRequest(prompt.userPrompt, requestId);
            const fullPrompt = this.buildFullPrompt(prompt);
            const result = await this.model.generateContent(fullPrompt);
            const response = await result.response;
            const text = response.text();
            const duration = Date.now() - startTime;
            logger_1.default.geminiResponse(text.length, duration, requestId);
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
        }
        catch (error) {
            const duration = Date.now() - startTime;
            logger_1.default.error(`Gemini API error after ${duration}ms`, error, undefined, requestId);
            throw new errors_1.GeminiError(`Gemini API request failed: ${error.message}`, { originalError: error.message, duration });
        }
    }
    /**
     * Build the complete prompt for Gemini
     */
    buildFullPrompt(prompt) {
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
    parseAnalysisResponse(responseText, requestId) {
        try {
            // Log the raw response for debugging
            logger_1.default.info('Raw Gemini response', {
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
        }
        catch (error) {
            logger_1.default.error(`Failed to parse Gemini response`, error, { responseText }, requestId);
            // Fallback: try to extract JSON from the response
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                try {
                    const parsed = JSON.parse(jsonMatch[0]);
                    this.validateAnalysisResponse(parsed, requestId);
                    return parsed;
                }
                catch (fallbackError) {
                    // Continue to error below
                }
            }
            throw new errors_1.GeminiError('Failed to parse analysis response from Gemini', { responseText: responseText.substring(0, 500) });
        }
    }
    /**
     * Validate the structure of the analysis response
     */
    validateAnalysisResponse(analysis, requestId) {
        const requiredFields = ['basicInfo', 'emotions', 'structure', 'quality', 'similarity', 'tags'];
        const missingFields = requiredFields.filter(field => !analysis[field]);
        if (missingFields.length > 0) {
            logger_1.default.warn(`Analysis response missing fields: ${missingFields.join(', ')}`, { analysis }, requestId);
            // Provide defaults for missing fields
            if (!analysis.basicInfo)
                analysis.basicInfo = this.getDefaultBasicInfo();
            if (!analysis.emotions)
                analysis.emotions = this.getDefaultEmotions();
            if (!analysis.structure)
                analysis.structure = this.getDefaultStructure();
            if (!analysis.quality)
                analysis.quality = this.getDefaultQuality();
            if (!analysis.similarity)
                analysis.similarity = this.getDefaultSimilarity();
            if (!analysis.tags)
                analysis.tags = this.getDefaultTags();
        }
    }
    // Default values for missing analysis fields
    getDefaultBasicInfo() {
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
    getDefaultEmotions() {
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
    getDefaultStructure() {
        return {
            intro: { start: 0, end: 8 },
            verse1: { start: 8, end: 32 },
            chorus1: { start: 32, end: 56 },
            outro: { start: 56, end: 80 }
        };
    }
    getDefaultQuality() {
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
    getDefaultSimilarity() {
        return {
            similar_tracks: [],
            similar_sounds: [],
            style_influences: ['Unknown'],
            genre_confidence: 0.5
        };
    }
    getDefaultTags() {
        return ['audio', 'music', 'ai-analyzed'];
    }
}
exports.GeminiService = GeminiService;
// Create a singleton instance
exports.geminiService = new GeminiService({
    apiKey: config_1.default.googleAI.apiKey,
    model: config_1.default.googleAI.model,
    maxTokens: config_1.default.googleAI.maxTokens,
    temperature: config_1.default.googleAI.temperature,
});
exports.default = exports.geminiService;
