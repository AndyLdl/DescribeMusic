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
exports.vertexAIService = exports.VertexAIService = void 0;
const vertexai_1 = require("@google-cloud/vertexai");
const errors_1 = require("../utils/errors");
const logger_1 = __importDefault(require("../utils/logger"));
const config_1 = __importDefault(require("../utils/config"));
const security_1 = require("../utils/security");
const crypto = __importStar(require("crypto"));
class VertexAIService {
    constructor(vertexConfig) {
        this.cache = new Map();
        this.CACHE_TTL = 3600000; // 1小时缓存
        this.MAX_PROMPT_LENGTH = 8000; // 限制prompt长度以控制成本
        this.MAX_RETRIES = 3;
        // 验证配置
        if (!vertexConfig.projectId) {
            throw new Error('Vertex AI project ID is required');
        }
        if (!vertexConfig.location) {
            throw new Error('Vertex AI location is required');
        }
        // 初始化Vertex AI客户端
        this.vertexAI = new vertexai_1.VertexAI({
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
        logger_1.default.info('Vertex AI service initialized', {
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
    async analyzeAudio(prompt, requestId, userId) {
        var _a;
        const startTime = Date.now();
        try {
            // 输入验证和清理
            const sanitizedPrompt = this.sanitizePrompt(prompt);
            // 检查缓存
            const cacheKey = this.generateCacheKey(sanitizedPrompt);
            const cachedResult = this.getFromCache(cacheKey);
            if (cachedResult) {
                logger_1.default.info('Cache hit for audio analysis', { requestId, cacheKey: cacheKey.substring(0, 16) });
                return cachedResult;
            }
            logger_1.default.geminiRequest(sanitizedPrompt.userPrompt.substring(0, 100) + '...', requestId);
            const fullPrompt = this.buildOptimizedPrompt(sanitizedPrompt);
            // 成本预检查
            const estimatedCost = this.estimateVertexAICost(fullPrompt);
            if (userId) {
                security_1.CostMonitor.recordCost(userId, estimatedCost, 'vertex-ai-gemini');
            }
            // 带重试的API调用
            const { text, actualCost } = await this.callVertexAIWithRetry(fullPrompt, requestId);
            const duration = Date.now() - startTime;
            logger_1.default.geminiResponse(text.length, duration, requestId);
            // 记录实际成本
            if (userId && actualCost > estimatedCost) {
                security_1.CostMonitor.recordCost(userId, actualCost - estimatedCost, 'vertex-ai-adjustment');
            }
            // Parse the response
            const analysis = this.parseAnalysisResponse(text, requestId);
            const result = {
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
        }
        catch (error) {
            const duration = Date.now() - startTime;
            logger_1.default.error(`Vertex AI error after ${duration}ms`, error, {
                requestId,
                promptLength: ((_a = prompt.userPrompt) === null || _a === void 0 ? void 0 : _a.length) || 0,
            });
            throw new errors_1.GeminiError(`Vertex AI request failed: ${error.message}`, { originalError: error.message, duration, requestId });
        }
    }
    /**
     * 清理和验证输入prompt
     */
    sanitizePrompt(prompt) {
        const sanitizedFilename = security_1.SecurityUtils.sanitizeFileName(prompt.audioMetadata.filename);
        let sanitizedUserPrompt = prompt.userPrompt;
        if (sanitizedUserPrompt.length > this.MAX_PROMPT_LENGTH) {
            sanitizedUserPrompt = sanitizedUserPrompt.substring(0, this.MAX_PROMPT_LENGTH) + '...';
            logger_1.default.warn('Prompt truncated due to length limit', {
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
    buildOptimizedPrompt(prompt) {
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
    async callVertexAIWithRetry(fullPrompt, requestId) {
        let lastError;
        for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
            try {
                const result = await this.model.generateContent(fullPrompt);
                const response = result.response;
                // Vertex AI 响应结构不同，需要获取文本内容
                let text;
                if (typeof response.text === 'function') {
                    text = response.text();
                }
                else if (response.candidates && response.candidates[0] && response.candidates[0].content) {
                    // Vertex AI 的响应结构
                    const candidate = response.candidates[0];
                    if (candidate.content.parts && candidate.content.parts[0]) {
                        text = candidate.content.parts[0].text || '';
                    }
                    else {
                        text = candidate.content.text || '';
                    }
                }
                else {
                    // 备用方案：尝试直接获取文本
                    text = response.text || response.content || JSON.stringify(response);
                }
                // 计算实际成本
                const actualCost = this.calculateVertexAICost(fullPrompt, text);
                logger_1.default.info('Vertex AI call successful', {
                    attempt,
                    promptLength: fullPrompt.length,
                    responseLength: text.length,
                    cost: actualCost,
                    requestId
                });
                return { text, actualCost };
            }
            catch (error) {
                lastError = error;
                if (this.isRetryableError(error) && attempt < this.MAX_RETRIES) {
                    const delay = Math.pow(2, attempt) * 1000;
                    logger_1.default.warn(`Vertex AI call failed, retrying in ${delay}ms`, {
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
    isRetryableError(error) {
        const retryableErrors = [
            'RATE_LIMIT_EXCEEDED',
            'INTERNAL_ERROR',
            'SERVICE_UNAVAILABLE',
            'TIMEOUT',
            'QUOTA_EXCEEDED'
        ];
        return retryableErrors.some(errorType => { var _a, _b; return ((_a = error.message) === null || _a === void 0 ? void 0 : _a.includes(errorType)) || ((_b = error.code) === null || _b === void 0 ? void 0 : _b.includes(errorType)); });
    }
    /**
     * 估算Vertex AI成本
     */
    estimateVertexAICost(prompt) {
        const inputTokens = Math.ceil(prompt.length / 4);
        const estimatedOutputTokens = 500;
        // Vertex AI Gemini 1.5 Flash 定价 (通常比直接API便宜)
        const inputCostPer1M = 0.075; // $0.075 per 1M tokens
        const outputCostPer1M = 0.30; // $0.30 per 1M tokens
        const inputCost = (inputTokens / 1000000) * inputCostPer1M;
        const outputCost = (estimatedOutputTokens / 1000000) * outputCostPer1M;
        return inputCost + outputCost;
    }
    /**
     * 计算Vertex AI实际成本
     */
    calculateVertexAICost(prompt, response) {
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
    parseAnalysisResponse(responseText, requestId) {
        try {
            logger_1.default.info('Vertex AI response received', {
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
        }
        catch (error) {
            logger_1.default.error(`Failed to parse Vertex AI response`, error, {
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
                }
                catch (fallbackError) {
                    // 继续到下面的错误处理
                }
            }
            throw new errors_1.GeminiError('Failed to parse analysis response from Vertex AI', {
                responseLength: responseText.length,
                requestId,
            });
        }
    }
    // 缓存和工具方法 (复用之前的实现)
    generateCacheKey(prompt) {
        const content = JSON.stringify({
            userPrompt: prompt.userPrompt,
            systemPrompt: prompt.systemPrompt,
            duration: prompt.audioMetadata.duration,
            format: prompt.audioMetadata.format
        });
        return crypto.createHash('sha256').update(content).digest('hex');
    }
    getFromCache(key) {
        const cached = this.cache.get(key);
        if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
            return cached.response;
        }
        return null;
    }
    setCache(key, response) {
        this.cache.set(key, {
            response,
            timestamp: Date.now()
        });
    }
    cleanCache() {
        const now = Date.now();
        for (const [key, value] of this.cache.entries()) {
            if (now - value.timestamp > this.CACHE_TTL) {
                this.cache.delete(key);
            }
        }
    }
    sanitizeResponseText(text) {
        return text
            .replace(/<script[^>]*>.*?<\/script>/gi, '')
            .replace(/javascript:/gi, '')
            .replace(/on\w+\s*=/gi, '')
            .replace(/eval\s*\(/gi, '')
            .replace(/Function\s*\(/gi, '');
    }
    sanitizeAnalysisData(data) {
        if (typeof data !== 'object' || data === null) {
            return data;
        }
        const sanitized = {};
        for (const [key, value] of Object.entries(data)) {
            if (typeof key === 'string' && key.length < 100) {
                const cleanKey = key.replace(/[^\w_-]/g, '');
                if (typeof value === 'string') {
                    sanitized[cleanKey] = this.sanitizeStringValue(value);
                }
                else if (typeof value === 'number') {
                    sanitized[cleanKey] = this.sanitizeNumberValue(value);
                }
                else if (Array.isArray(value)) {
                    sanitized[cleanKey] = value.slice(0, 50).map(item => typeof item === 'string' ? this.sanitizeStringValue(item) :
                        typeof item === 'number' ? this.sanitizeNumberValue(item) :
                            typeof item === 'object' ? this.sanitizeAnalysisData(item) : item);
                }
                else if (typeof value === 'object') {
                    sanitized[cleanKey] = this.sanitizeAnalysisData(value);
                }
                else {
                    sanitized[cleanKey] = value;
                }
            }
        }
        return sanitized;
    }
    sanitizeStringValue(value) {
        if (typeof value !== 'string')
            return '';
        return value
            .substring(0, 500)
            .replace(/[<>]/g, '')
            .replace(/javascript:/gi, '')
            .trim();
    }
    sanitizeNumberValue(value) {
        if (typeof value !== 'number' || !isFinite(value))
            return 0;
        return Math.max(-1000, Math.min(1000, value));
    }
    validateAnalysisResponse(analysis, requestId) {
        const requiredFields = ['basicInfo', 'emotions', 'structure', 'quality', 'similarity', 'tags'];
        const missingFields = requiredFields.filter(field => !analysis[field]);
        if (missingFields.length > 0) {
            logger_1.default.warn(`Analysis response missing fields: ${missingFields.join(', ')}`, { analysis }, requestId);
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
    // 默认值方法
    getDefaultBasicInfo() {
        return {
            genre: 'Unknown', mood: 'Neutral', bpm: 120, key: 'C Major',
            energy: 0.5, valence: 0.5, danceability: 0.5, instrumentalness: 0.5,
            speechiness: 0.1, acousticness: 0.5, liveness: 0.1, loudness: -10
        };
    }
    getDefaultEmotions() {
        return {
            happy: 0.3, sad: 0.2, angry: 0.1, calm: 0.4, excited: 0.2,
            melancholic: 0.2, energetic: 0.3, peaceful: 0.3, tense: 0.2, relaxed: 0.4
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
            overall: 7.0, clarity: 7.0, loudness: -10,
            dynamic_range: 6.0, noise_level: 2.0, distortion: 1.0, frequency_balance: 7.0
        };
    }
    getDefaultSimilarity() {
        return {
            similar_tracks: [], similar_sounds: [],
            style_influences: ['Unknown'], genre_confidence: 0.5
        };
    }
    getDefaultTags() {
        return ['audio', 'music', 'ai-analyzed'];
    }
}
exports.VertexAIService = VertexAIService;
// 创建Vertex AI服务实例
exports.vertexAIService = new VertexAIService({
    apiKey: '', // Vertex AI使用服务账号认证，不需要API key
    model: config_1.default.vertexAI.model,
    maxTokens: config_1.default.vertexAI.maxTokens,
    temperature: config_1.default.vertexAI.temperature,
    projectId: config_1.default.vertexAI.projectId,
    location: config_1.default.vertexAI.location
});
exports.default = exports.vertexAIService;
