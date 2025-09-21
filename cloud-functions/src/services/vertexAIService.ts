import { VertexAI } from '@google-cloud/vertexai';
import {
    GeminiConfig,
    GeminiResponse,
    AudioAnalysisPrompt,
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

export interface VertexAIConfig extends GeminiConfig {
    projectId: string;
    location: string;
}

export class VertexAIService {
    private vertexAI: VertexAI;
    private model: any;
    private cache: Map<string, { response: any; timestamp: number }> = new Map();
    private readonly CACHE_TTL = 3600000; // 1小时缓存
    private readonly MAX_PROMPT_LENGTH = 8000; // 限制prompt长度以控制成本
    private readonly MAX_RETRIES = 3;

    constructor(vertexConfig: VertexAIConfig) {
        // 验证配置
        if (!vertexConfig.projectId) {
            throw new Error('Vertex AI project ID is required');
        }
        if (!vertexConfig.location) {
            throw new Error('Vertex AI location is required');
        }

        // 初始化Vertex AI客户端
        this.vertexAI = new VertexAI({
            project: vertexConfig.projectId,
            location: vertexConfig.location,
        });

        this.model = this.vertexAI.getGenerativeModel({
            model: vertexConfig.model,
            generationConfig: {
                maxOutputTokens: Math.min(vertexConfig.maxTokens, 2048),
                temperature: Math.max(0.1, Math.min(vertexConfig.temperature, 1.0)),
                topP: 0.8,
                topK: 40,
            }
        });

        logger.info('Vertex AI service initialized', {
            projectId: vertexConfig.projectId,
            location: vertexConfig.location,
            model: vertexConfig.model
        });

        // 定期清理缓存
        setInterval(() => this.cleanCache(), 300000); // 每5分钟清理一次
    }

    /**
     * Generate audio analysis using Vertex AI Gemini with security and cost controls
     */
    async analyzeAudio(
        prompt: AudioAnalysisPrompt,
        requestId: string,
        userId?: string
    ): Promise<GeminiResponse> {
        const startTime = Date.now();

        try {
            // 输入验证和清理
            const sanitizedPrompt = this.sanitizePrompt(prompt);

            // 检查缓存
            const cacheKey = this.generateCacheKey(sanitizedPrompt);
            const cachedResult = this.getFromCache(cacheKey);
            if (cachedResult) {
                logger.info('Cache hit for audio analysis', { requestId, cacheKey: cacheKey.substring(0, 16) });
                return cachedResult;
            }

            logger.geminiRequest(sanitizedPrompt.userPrompt.substring(0, 100) + '...', requestId);

            const fullPrompt = this.buildOptimizedPrompt(sanitizedPrompt);

            // 成本预检查
            const estimatedCost = this.estimateVertexAICost(fullPrompt);
            if (userId) {
                CostMonitor.recordCost(userId, estimatedCost, 'vertex-ai-gemini');
            }

            // 带重试的API调用
            const { text, actualCost } = await this.callVertexAIWithRetry(fullPrompt, requestId);

            const duration = Date.now() - startTime;
            logger.geminiResponse(text.length, duration, requestId);

            // 记录实际成本
            if (userId && actualCost > estimatedCost) {
                CostMonitor.recordCost(userId, actualCost - estimatedCost, 'vertex-ai-adjustment');
            }

            // Parse the response
            const analysis = this.parseAnalysisResponse(text, requestId);

            const result: GeminiResponse = {
                success: true,
                data: {
                    analysis,
                    usage: {
                        promptTokens: Math.ceil(fullPrompt.length / 4),
                        completionTokens: Math.ceil(text.length / 4),
                        totalTokens: Math.ceil((fullPrompt.length + text.length) / 4),
                    }
                }
            };

            // 缓存结果
            this.setCache(cacheKey, result);

            return result;

        } catch (error: any) {
            const duration = Date.now() - startTime;
            logger.error(`Vertex AI error after ${duration}ms`, error, {
                requestId,
                promptLength: prompt.userPrompt?.length || 0,
            });

            throw new GeminiError(
                `Vertex AI request failed: ${error.message}`,
                { originalError: error.message, duration, requestId }
            );
        }
    }

    /**
     * 清理和验证输入prompt
     */
    private sanitizePrompt(prompt: AudioAnalysisPrompt): AudioAnalysisPrompt {
        const sanitizedFilename = SecurityUtils.sanitizeFileName(prompt.audioMetadata.filename);

        let sanitizedUserPrompt = prompt.userPrompt;
        if (sanitizedUserPrompt.length > this.MAX_PROMPT_LENGTH) {
            sanitizedUserPrompt = sanitizedUserPrompt.substring(0, this.MAX_PROMPT_LENGTH) + '...';
            logger.warn('Prompt truncated due to length limit', {
                originalLength: prompt.userPrompt.length,
                maxLength: this.MAX_PROMPT_LENGTH
            });
        }

        // 移除潜在的注入攻击
        sanitizedUserPrompt = sanitizedUserPrompt
            .replace(/```/g, '')
            .replace(/<script[^>]*>.*?<\/script>/gi, '')
            .replace(/javascript:/gi, '')
            .replace(/on\w+\s*=/gi, '');

        return {
            ...prompt,
            userPrompt: sanitizedUserPrompt,
            audioMetadata: {
                ...prompt.audioMetadata,
                filename: sanitizedFilename
            }
        };
    }

    /**
     * 构建优化的prompt以降低成本
     */
    private buildOptimizedPrompt(prompt: AudioAnalysisPrompt): string {
        return `Analyze this audio file and return JSON only:

File: ${prompt.audioMetadata.filename}
Duration: ${prompt.audioMetadata.duration}s
Format: ${prompt.audioMetadata.format}
Size: ${(prompt.audioMetadata.size / (1024 * 1024)).toFixed(1)}MB

${prompt.userPrompt}

Return JSON with: basicInfo, emotions, structure, quality, similarity, tags, aiDescription.`;
    }

    /**
     * 带重试机制的Vertex AI调用
     */
    private async callVertexAIWithRetry(
        fullPrompt: string,
        requestId: string
    ): Promise<{ text: string; actualCost: number }> {
        let lastError: any;

        for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
            try {
                const result = await this.model.generateContent(fullPrompt);
                const response = result.response;

                // Vertex AI 响应结构不同，需要获取文本内容
                let text: string;
                if (typeof response.text === 'function') {
                    text = response.text();
                } else if (response.candidates && response.candidates[0] && response.candidates[0].content) {
                    // Vertex AI 的响应结构
                    const candidate = response.candidates[0];
                    if (candidate.content.parts && candidate.content.parts[0]) {
                        text = candidate.content.parts[0].text || '';
                    } else {
                        text = candidate.content.text || '';
                    }
                } else {
                    // 备用方案：尝试直接获取文本
                    text = response.text || response.content || JSON.stringify(response);
                }

                // 计算实际成本
                const actualCost = this.calculateVertexAICost(fullPrompt, text);

                logger.info('Vertex AI call successful', {
                    attempt,
                    promptLength: fullPrompt.length,
                    responseLength: text.length,
                    cost: actualCost,
                    requestId
                });

                return { text, actualCost };

            } catch (error: any) {
                lastError = error;

                if (this.isRetryableError(error) && attempt < this.MAX_RETRIES) {
                    const delay = Math.pow(2, attempt) * 1000;
                    logger.warn(`Vertex AI call failed, retrying in ${delay}ms`, {
                        attempt,
                        error: error.message,
                        requestId
                    });
                    await new Promise(resolve => setTimeout(resolve, delay));
                    continue;
                }

                throw error;
            }
        }

        throw lastError;
    }

    /**
     * 检查错误是否可重试
     */
    private isRetryableError(error: any): boolean {
        const retryableErrors = [
            'RATE_LIMIT_EXCEEDED',
            'INTERNAL_ERROR',
            'SERVICE_UNAVAILABLE',
            'TIMEOUT',
            'QUOTA_EXCEEDED'
        ];

        return retryableErrors.some(errorType =>
            error.message?.includes(errorType) || error.code?.includes(errorType)
        );
    }

    /**
     * 估算Vertex AI成本
     */
    private estimateVertexAICost(prompt: string): number {
        const inputTokens = Math.ceil(prompt.length / 4);
        const estimatedOutputTokens = 500;

        // Vertex AI Gemini 1.5 Flash 定价 (通常比直接API便宜)
        const inputCostPer1M = 0.075; // $0.075 per 1M tokens
        const outputCostPer1M = 0.30;  // $0.30 per 1M tokens

        const inputCost = (inputTokens / 1000000) * inputCostPer1M;
        const outputCost = (estimatedOutputTokens / 1000000) * outputCostPer1M;

        return inputCost + outputCost;
    }

    /**
     * 计算Vertex AI实际成本
     */
    private calculateVertexAICost(prompt: string, response: string): number {
        const inputTokens = Math.ceil(prompt.length / 4);
        const outputTokens = Math.ceil(response.length / 4);

        const inputCostPer1M = 0.075;
        const outputCostPer1M = 0.30;

        const inputCost = (inputTokens / 1000000) * inputCostPer1M;
        const outputCost = (outputTokens / 1000000) * outputCostPer1M;

        return inputCost + outputCost;
    }

    /**
     * Parse response with enhanced security
     */
    private parseAnalysisResponse(responseText: string, requestId: string): any {
        try {
            logger.info('Vertex AI response received', {
                responseLength: responseText.length,
                requestId,
                responsePreview: responseText.substring(0, 100).replace(/[^\w\s\{\}\[\]:,."'-]/g, '?')
            });

            let cleanedText = responseText.trim();
            cleanedText = cleanedText.replace(/```json\s*/g, '').replace(/```\s*$/g, '');
            cleanedText = cleanedText.replace(/```\s*/g, '');
            cleanedText = this.sanitizeResponseText(cleanedText);

            const parsed = JSON.parse(cleanedText);
            const sanitizedAnalysis = this.sanitizeAnalysisData(parsed);
            this.validateAnalysisResponse(sanitizedAnalysis, requestId);

            return sanitizedAnalysis;

        } catch (error: any) {
            logger.error(`Failed to parse Vertex AI response`, error, {
                responseLength: responseText.length,
                requestId,
            });

            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                try {
                    const cleanedMatch = this.sanitizeResponseText(jsonMatch[0]);
                    const parsed = JSON.parse(cleanedMatch);
                    const sanitized = this.sanitizeAnalysisData(parsed);
                    this.validateAnalysisResponse(sanitized, requestId);
                    return sanitized;
                } catch (fallbackError) {
                    // 继续到下面的错误处理
                }
            }

            throw new GeminiError(
                'Failed to parse analysis response from Vertex AI',
                {
                    responseLength: responseText.length,
                    requestId,
                }
            );
        }
    }

    // 缓存和工具方法 (复用之前的实现)
    private generateCacheKey(prompt: AudioAnalysisPrompt): string {
        const content = JSON.stringify({
            userPrompt: prompt.userPrompt,
            systemPrompt: prompt.systemPrompt,
            duration: prompt.audioMetadata.duration,
            format: prompt.audioMetadata.format
        });

        return crypto.createHash('sha256').update(content).digest('hex');
    }

    private getFromCache(key: string): GeminiResponse | null {
        const cached = this.cache.get(key);
        if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
            return cached.response;
        }
        return null;
    }

    private setCache(key: string, response: GeminiResponse): void {
        this.cache.set(key, {
            response,
            timestamp: Date.now()
        });
    }

    private cleanCache(): void {
        const now = Date.now();
        for (const [key, value] of this.cache.entries()) {
            if (now - value.timestamp > this.CACHE_TTL) {
                this.cache.delete(key);
            }
        }
    }

    private sanitizeResponseText(text: string): string {
        return text
            .replace(/<script[^>]*>.*?<\/script>/gi, '')
            .replace(/javascript:/gi, '')
            .replace(/on\w+\s*=/gi, '')
            .replace(/eval\s*\(/gi, '')
            .replace(/Function\s*\(/gi, '');
    }

    private sanitizeAnalysisData(data: any): any {
        if (typeof data !== 'object' || data === null) {
            return data;
        }

        const sanitized: any = {};

        for (const [key, value] of Object.entries(data)) {
            if (typeof key === 'string' && key.length < 100) {
                const cleanKey = key.replace(/[^\w_-]/g, '');

                if (typeof value === 'string') {
                    sanitized[cleanKey] = this.sanitizeStringValue(value);
                } else if (typeof value === 'number') {
                    sanitized[cleanKey] = this.sanitizeNumberValue(value);
                } else if (Array.isArray(value)) {
                    sanitized[cleanKey] = value.slice(0, 50).map(item =>
                        typeof item === 'string' ? this.sanitizeStringValue(item) :
                            typeof item === 'number' ? this.sanitizeNumberValue(item) :
                                typeof item === 'object' ? this.sanitizeAnalysisData(item) : item
                    );
                } else if (typeof value === 'object') {
                    sanitized[cleanKey] = this.sanitizeAnalysisData(value);
                } else {
                    sanitized[cleanKey] = value;
                }
            }
        }

        return sanitized;
    }

    private sanitizeStringValue(value: string): string {
        if (typeof value !== 'string') return '';

        return value
            .substring(0, 500)
            .replace(/[<>]/g, '')
            .replace(/javascript:/gi, '')
            .trim();
    }

    private sanitizeNumberValue(value: number): number {
        if (typeof value !== 'number' || !isFinite(value)) return 0;
        return Math.max(-1000, Math.min(1000, value));
    }

    private validateAnalysisResponse(analysis: any, requestId: string): void {
        const requiredFields = ['basicInfo', 'emotions', 'structure', 'quality', 'similarity', 'tags'];
        const missingFields = requiredFields.filter(field => !analysis[field]);

        if (missingFields.length > 0) {
            logger.warn(`Analysis response missing fields: ${missingFields.join(', ')}`, { analysis }, requestId);

            if (!analysis.basicInfo) analysis.basicInfo = this.getDefaultBasicInfo();
            if (!analysis.emotions) analysis.emotions = this.getDefaultEmotions();
            if (!analysis.structure) analysis.structure = this.getDefaultStructure();
            if (!analysis.quality) analysis.quality = this.getDefaultQuality();
            if (!analysis.similarity) analysis.similarity = this.getDefaultSimilarity();
            if (!analysis.tags) analysis.tags = this.getDefaultTags();
        }
    }

    // 默认值方法
    private getDefaultBasicInfo(): BasicInfo {
        return {
            genre: 'Unknown', mood: 'Neutral', bpm: 120, key: 'C Major',
            energy: 0.5, valence: 0.5, danceability: 0.5, instrumentalness: 0.5,
            speechiness: 0.1, acousticness: 0.5, liveness: 0.1, loudness: -10
        };
    }

    private getDefaultEmotions(): EmotionalAnalysis {
        return {
            happy: 0.3, sad: 0.2, angry: 0.1, calm: 0.4, excited: 0.2,
            melancholic: 0.2, energetic: 0.3, peaceful: 0.3, tense: 0.2, relaxed: 0.4
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
            overall: 7.0, clarity: 7.0, loudness: -10,
            dynamic_range: 6.0, noise_level: 2.0, distortion: 1.0, frequency_balance: 7.0
        };
    }

    private getDefaultSimilarity(): SimilarityAnalysis {
        return {
            similar_tracks: [], similar_sounds: [],
            style_influences: ['Unknown'], genre_confidence: 0.5
        };
    }

    private getDefaultTags(): string[] {
        return ['audio', 'music', 'ai-analyzed'];
    }
}

// 创建Vertex AI服务实例
export const vertexAIService = new VertexAIService({
    apiKey: '', // Vertex AI使用服务账号认证，不需要API key
    model: config.vertexAI.model,
    maxTokens: config.vertexAI.maxTokens,
    temperature: config.vertexAI.temperature,
    projectId: config.vertexAI.projectId,
    location: config.vertexAI.location
});

export default vertexAIService;