import * as crypto from 'crypto';
import logger from './logger';

/**
 * 安全工具类
 */
export class SecurityUtils {

    /**
     * 生成安全的API密钥
     */
    static generateApiKey(): string {
        return crypto.randomBytes(32).toString('hex');
    }

    /**
     * 哈希敏感数据
     */
    static hashSensitiveData(data: string, salt?: string): string {
        const actualSalt = salt || crypto.randomBytes(16).toString('hex');
        const hash = crypto.pbkdf2Sync(data, actualSalt, 10000, 64, 'sha512');
        return `${actualSalt}:${hash.toString('hex')}`;
    }

    /**
     * 验证哈希数据
     */
    static verifyHashedData(data: string, hashedData: string): boolean {
        const [salt, hash] = hashedData.split(':');
        const verifyHash = crypto.pbkdf2Sync(data, salt, 10000, 64, 'sha512');
        return hash === verifyHash.toString('hex');
    }

    /**
     * 检测可疑的请求模式
     */
    static detectSuspiciousActivity(
        requests: Array<{ timestamp: number; ip: string; userAgent?: string }>
    ): boolean {
        if (requests.length < 5) return false;

        const now = Date.now();
        const recentRequests = requests.filter(req => now - req.timestamp < 60000); // 1分钟内

        // 检查是否有过多相同IP的请求
        const ipCounts = new Map<string, number>();
        recentRequests.forEach(req => {
            ipCounts.set(req.ip, (ipCounts.get(req.ip) || 0) + 1);
        });

        // 如果单个IP在1分钟内超过20次请求，标记为可疑
        for (const [ip, count] of ipCounts) {
            if (count > 20) {
                logger.warn('Suspicious activity detected', { ip, requestCount: count });
                return true;
            }
        }

        // 检查是否有相同User-Agent的大量请求
        const userAgentCounts = new Map<string, number>();
        recentRequests.forEach(req => {
            if (req.userAgent) {
                userAgentCounts.set(req.userAgent, (userAgentCounts.get(req.userAgent) || 0) + 1);
            }
        });

        for (const [userAgent, count] of userAgentCounts) {
            if (count > 15 && userAgent.includes('bot')) {
                logger.warn('Bot activity detected', { userAgent, requestCount: count });
                return true;
            }
        }

        return false;
    }

    /**
     * 验证设备指纹的复杂度
     */
    static validateDeviceFingerprintComplexity(fingerprint: string): boolean {
        // 检查长度
        if (fingerprint.length < 32) return false;

        // 检查字符多样性
        const uniqueChars = new Set(fingerprint.toLowerCase()).size;
        if (uniqueChars < 8) return false;

        // 检查是否包含数字和字母
        const hasNumbers = /\d/.test(fingerprint);
        const hasLetters = /[a-zA-Z]/.test(fingerprint);
        if (!hasNumbers || !hasLetters) return false;

        // 检查重复模式
        const repeatingPattern = /(.{3,})\1{2,}/.test(fingerprint);
        if (repeatingPattern) return false;

        return true;
    }

    /**
     * 生成请求签名（用于API调用验证）
     */
    static generateRequestSignature(
        method: string,
        url: string,
        body: string,
        timestamp: number,
        secretKey: string
    ): string {
        const message = `${method}|${url}|${body}|${timestamp}`;
        return crypto.createHmac('sha256', secretKey).update(message).digest('hex');
    }

    /**
     * 验证请求签名
     */
    static verifyRequestSignature(
        method: string,
        url: string,
        body: string,
        timestamp: number,
        signature: string,
        secretKey: string
    ): boolean {
        // 检查时间戳是否在合理范围内（5分钟）
        const now = Date.now();
        if (Math.abs(now - timestamp) > 300000) {
            logger.warn('Request timestamp too old or too new', { timestamp, now });
            return false;
        }

        const expectedSignature = this.generateRequestSignature(method, url, body, timestamp, secretKey);
        return crypto.timingSafeEqual(
            Buffer.from(signature, 'hex'),
            Buffer.from(expectedSignature, 'hex')
        );
    }

    /**
     * 清理和验证文件名
     */
    static sanitizeFileName(fileName: string): string {
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
    static isAllowedFileType(mimeType: string, fileName: string): boolean {
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

/**
 * 成本监控工具
 */
export class CostMonitor {
    private static dailyCosts = new Map<string, number>();
    private static monthlyCosts = new Map<string, number>();

    /**
     * 记录API调用成本
     */
    static recordCost(userId: string, cost: number, service: string): void {
        const today = new Date().toISOString().split('T')[0];
        const month = today.substring(0, 7);

        const dailyKey = `${userId}:${today}`;
        const monthlyKey = `${userId}:${month}`;

        this.dailyCosts.set(dailyKey, (this.dailyCosts.get(dailyKey) || 0) + cost);
        this.monthlyCosts.set(monthlyKey, (this.monthlyCosts.get(monthlyKey) || 0) + cost);

        logger.info('Cost recorded', {
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
    private static checkBudgetLimits(userId: string, currentCost: number): void {
        const today = new Date().toISOString().split('T')[0];
        const month = today.substring(0, 7);

        const dailyLimit = 10; // $10 per day
        const monthlyLimit = 100; // $100 per month

        const dailyTotal = this.dailyCosts.get(`${userId}:${today}`) || 0;
        const monthlyTotal = this.monthlyCosts.get(`${userId}:${month}`) || 0;

        if (dailyTotal > dailyLimit) {
            logger.error('Daily budget exceeded', new Error('Daily budget exceeded'), {
                userId,
                dailyTotal,
                dailyLimit,
                currentCost
            });
            // 这里可以发送警报或暂停服务
        }

        if (monthlyTotal > monthlyLimit) {
            logger.error('Monthly budget exceeded', new Error('Monthly budget exceeded'), {
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
    static getUserCostStats(userId: string): {
        dailyCost: number;
        monthlyCost: number;
        dailyLimit: number;
        monthlyLimit: number;
    } {
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