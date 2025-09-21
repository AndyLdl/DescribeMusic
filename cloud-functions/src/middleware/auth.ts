import * as admin from 'firebase-admin';
import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';
import { ValidationError } from '../utils/errors';

export interface AuthenticatedRequest extends Request {
    user?: {
        uid: string;
        email?: string;
        emailVerified?: boolean;
    };
    deviceFingerprint?: string;
}

/**
 * 真正的JWT验证中间件
 */
export async function verifyFirebaseToken(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
): Promise<void> {
    const requestId = req.headers['x-request-id'] as string || 'unknown';

    try {
        const authHeader = req.get('Authorization');
        const deviceFingerprint = req.get('X-Device-Fingerprint');

        // 优先验证Firebase JWT token
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.substring(7);

            try {
                // 真正验证Firebase JWT token
                const decodedToken = await admin.auth().verifyIdToken(token);

                req.user = {
                    uid: decodedToken.uid,
                    email: decodedToken.email,
                    emailVerified: decodedToken.email_verified || false
                };

                logger.info('User authenticated via Firebase token', {
                    uid: decodedToken.uid,
                    email: decodedToken.email,
                    requestId
                });

                return next();

            } catch (tokenError: any) {
                logger.error('Invalid Firebase token', tokenError, { token: token.substring(0, 20) + '...', requestId });

                // Token无效，但如果有设备指纹，允许试用
                if (deviceFingerprint && isValidDeviceFingerprint(deviceFingerprint)) {
                    req.deviceFingerprint = deviceFingerprint;
                    logger.info('Fallback to device fingerprint authentication', { deviceFingerprint, requestId });
                    return next();
                }

                throw new ValidationError('Invalid authentication token');
            }
        }

        // 如果没有token，检查设备指纹（试用用户）
        if (deviceFingerprint && isValidDeviceFingerprint(deviceFingerprint)) {
            req.deviceFingerprint = deviceFingerprint;
            logger.info('Device fingerprint authentication', { deviceFingerprint, requestId });
            return next();
        }

        // 都没有，拒绝访问
        throw new ValidationError('Authentication required. Please provide valid Firebase token or device fingerprint.');

    } catch (error: any) {
        logger.error('Authentication failed', error, undefined, requestId);
        res.status(401).json({
            success: false,
            error: {
                code: 'AUTHENTICATION_FAILED',
                message: error.message || 'Authentication required'
            },
            timestamp: new Date().toISOString(),
            requestId
        });
    }
}

/**
 * 验证设备指纹的有效性
 */
function isValidDeviceFingerprint(fingerprint: string): boolean {
    // 基本格式验证
    if (!fingerprint || fingerprint.length < 32) {
        return false;
    }

    // 检查是否包含必要的组件（可以根据你的指纹生成算法调整）
    const parts = fingerprint.split('-');
    if (parts.length < 3) {
        return false;
    }

    // 检查是否为明显的假指纹
    const suspiciousPatterns = [
        'test', 'fake', 'dummy', 'mock', '000000', '111111',
        'aaaaa', 'bbbbb', 'admin', 'hacker'
    ];

    const lowerFingerprint = fingerprint.toLowerCase();
    for (const pattern of suspiciousPatterns) {
        if (lowerFingerprint.includes(pattern)) {
            return false;
        }
    }

    return true;
}

/**
 * 速率限制中间件
 */
const requestCounts = new Map<string, { count: number; resetTime: number }>();

export function rateLimitMiddleware(maxRequests: number = 10, windowMs: number = 60000) {
    return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        const identifier = req.user?.uid || req.deviceFingerprint || req.ip || 'unknown';
        const now = Date.now();

        const userLimit = requestCounts.get(identifier);

        if (!userLimit || now > userLimit.resetTime) {
            // 重置计数器
            requestCounts.set(identifier, {
                count: 1,
                resetTime: now + windowMs
            });
            return next();
        }

        if (userLimit.count >= maxRequests) {
            logger.warn('Rate limit exceeded', {
                identifier,
                count: userLimit.count,
                maxRequests
            });

            return res.status(429).json({
                success: false,
                error: {
                    code: 'RATE_LIMIT_EXCEEDED',
                    message: `Too many requests. Maximum ${maxRequests} requests per minute.`
                },
                timestamp: new Date().toISOString()
            });
        }

        userLimit.count++;
        next();
    };
}

/**
 * IP白名单中间件（可选）
 */
export function ipWhitelistMiddleware(allowedIPs: string[] = []) {
    return (req: Request, res: Response, next: NextFunction) => {
        if (allowedIPs.length === 0) {
            return next(); // 没有配置白名单，跳过
        }

        const clientIP = req.ip || req.connection.remoteAddress || 'unknown';

        if (!allowedIPs.includes(clientIP)) {
            logger.warn('IP not in whitelist', { clientIP, allowedIPs });

            return res.status(403).json({
                success: false,
                error: {
                    code: 'IP_NOT_ALLOWED',
                    message: 'Your IP address is not authorized to access this service.'
                },
                timestamp: new Date().toISOString()
            });
        }

        next();
    };
}