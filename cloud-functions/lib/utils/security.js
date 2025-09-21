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
exports.CostMonitor = exports.SecurityUtils = void 0;
const crypto = __importStar(require("crypto"));
const logger_1 = __importDefault(require("./logger"));
/**
 * 安全工具类
 */
class SecurityUtils {
    /**
     * 生成安全的API密钥
     */
    static generateApiKey() {
        return crypto.randomBytes(32).toString('hex');
    }
    /**
     * 哈希敏感数据
     */
    static hashSensitiveData(data, salt) {
        const actualSalt = salt || crypto.randomBytes(16).toString('hex');
        const hash = crypto.pbkdf2Sync(data, actualSalt, 10000, 64, 'sha512');
        return `${actualSalt}:${hash.toString('hex')}`;
    }
    /**
     * 验证哈希数据
     */
    static verifyHashedData(data, hashedData) {
        const [salt, hash] = hashedData.split(':');
        const verifyHash = crypto.pbkdf2Sync(data, salt, 10000, 64, 'sha512');
        return hash === verifyHash.toString('hex');
    }
    /**
     * 检测可疑的请求模式
     */
    static detectSuspiciousActivity(requests) {
        if (requests.length < 5)
            return false;
        const now = Date.now();
        const recentRequests = requests.filter(req => now - req.timestamp < 60000); // 1分钟内
        // 检查是否有过多相同IP的请求
        const ipCounts = new Map();
        recentRequests.forEach(req => {
            ipCounts.set(req.ip, (ipCounts.get(req.ip) || 0) + 1);
        });
        // 如果单个IP在1分钟内超过20次请求，标记为可疑
        for (const [ip, count] of ipCounts) {
            if (count > 20) {
                logger_1.default.warn('Suspicious activity detected', { ip, requestCount: count });
                return true;
            }
        }
        // 检查是否有相同User-Agent的大量请求
        const userAgentCounts = new Map();
        recentRequests.forEach(req => {
            if (req.userAgent) {
                userAgentCounts.set(req.userAgent, (userAgentCounts.get(req.userAgent) || 0) + 1);
            }
        });
        for (const [userAgent, count] of userAgentCounts) {
            if (count > 15 && userAgent.includes('bot')) {
                logger_1.default.warn('Bot activity detected', { userAgent, requestCount: count });
                return true;
            }
        }
        return false;
    }
    /**
     * 验证设备指纹的复杂度
     */
    static validateDeviceFingerprintComplexity(fingerprint) {
        // 检查长度
        if (fingerprint.length < 32)
            return false;
        // 检查字符多样性
        const uniqueChars = new Set(fingerprint.toLowerCase()).size;
        if (uniqueChars < 8)
            return false;
        // 检查是否包含数字和字母
        const hasNumbers = /\d/.test(fingerprint);
        const hasLetters = /[a-zA-Z]/.test(fingerprint);
        if (!hasNumbers || !hasLetters)
            return false;
        // 检查重复模式
        const repeatingPattern = /(.{3,})\1{2,}/.test(fingerprint);
        if (repeatingPattern)
            return false;
        return true;
    }
    /**
     * 生成请求签名（用于API调用验证）
     */
    static generateRequestSignature(method, url, body, timestamp, secretKey) {
        const message = `${method}|${url}|${body}|${timestamp}`;
        return crypto.createHmac('sha256', secretKey).update(message).digest('hex');
    }
    /**
     * 验证请求签名
     */
    static verifyRequestSignature(method, url, body, timestamp, signature, secretKey) {
        // 检查时间戳是否在合理范围内（5分钟）
        const now = Date.now();
        if (Math.abs(now - timestamp) > 300000) {
            logger_1.default.warn('Request timestamp too old or too new', { timestamp, now });
            return false;
        }
        const expectedSignature = this.generateRequestSignature(method, url, body, timestamp, secretKey);
        return crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expectedSignature, 'hex'));
    }
    /**
     * 清理和验证文件名
     */
    static sanitizeFileName(fileName) {
        // 移除危险字符
        const cleaned = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
        // 限制长度
        const maxLength = 100;
        if (cleaned.length > maxLength) {
            const ext = cleaned.split('.').pop() || '';
            const name = cleaned.substring(0, maxLength - ext.length - 1);
            return `${name}.${ext}`;
        }
        return cleaned;
    }
    /**
     * 检查文件类型是否安全
     */
    static isAllowedFileType(mimeType, fileName) {
        const allowedMimeTypes = [
            'audio/mpeg',
            'audio/mp3',
            'audio/wav',
            'audio/x-wav',
            'audio/mp4',
            'audio/m4a',
            'audio/aac',
            'audio/ogg',
            'audio/flac',
            'audio/webm'
        ];
        const allowedExtensions = [
            '.mp3', '.wav', '.m4a', '.aac', '.ogg', '.flac', '.webm'
        ];
        const fileExtension = fileName.toLowerCase().split('.').pop();
        return allowedMimeTypes.includes(mimeType.toLowerCase()) &&
            allowedExtensions.includes(`.${fileExtension}`);
    }
}
exports.SecurityUtils = SecurityUtils;
/**
 * 成本监控工具
 */
class CostMonitor {
    /**
     * 记录API调用成本
     */
    static recordCost(userId, cost, service) {
        const today = new Date().toISOString().split('T')[0];
        const month = today.substring(0, 7);
        const dailyKey = `${userId}:${today}`;
        const monthlyKey = `${userId}:${month}`;
        this.dailyCosts.set(dailyKey, (this.dailyCosts.get(dailyKey) || 0) + cost);
        this.monthlyCosts.set(monthlyKey, (this.monthlyCosts.get(monthlyKey) || 0) + cost);
        logger_1.default.info('Cost recorded', {
            userId,
            cost,
            service,
            dailyTotal: this.dailyCosts.get(dailyKey),
            monthlyTotal: this.monthlyCosts.get(monthlyKey)
        });
        // 检查是否超过预算
        this.checkBudgetLimits(userId, cost);
    }
    /**
     * 检查预算限制
     */
    static checkBudgetLimits(userId, currentCost) {
        const today = new Date().toISOString().split('T')[0];
        const month = today.substring(0, 7);
        const dailyLimit = 10; // $10 per day
        const monthlyLimit = 100; // $100 per month
        const dailyTotal = this.dailyCosts.get(`${userId}:${today}`) || 0;
        const monthlyTotal = this.monthlyCosts.get(`${userId}:${month}`) || 0;
        if (dailyTotal > dailyLimit) {
            logger_1.default.error('Daily budget exceeded', new Error('Daily budget exceeded'), {
                userId,
                dailyTotal,
                dailyLimit,
                currentCost
            });
            // 这里可以发送警报或暂停服务
        }
        if (monthlyTotal > monthlyLimit) {
            logger_1.default.error('Monthly budget exceeded', new Error('Monthly budget exceeded'), {
                userId,
                monthlyTotal,
                monthlyLimit,
                currentCost
            });
            // 这里可以发送警报或暂停服务
        }
    }
    /**
     * 获取用户成本统计
     */
    static getUserCostStats(userId) {
        const today = new Date().toISOString().split('T')[0];
        const month = today.substring(0, 7);
        return {
            dailyCost: this.dailyCosts.get(`${userId}:${today}`) || 0,
            monthlyCost: this.monthlyCosts.get(`${userId}:${month}`) || 0,
            dailyLimit: 10,
            monthlyLimit: 100
        };
    }
}
exports.CostMonitor = CostMonitor;
CostMonitor.dailyCosts = new Map();
CostMonitor.monthlyCosts = new Map();
