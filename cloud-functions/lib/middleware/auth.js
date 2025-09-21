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
exports.verifyFirebaseToken = verifyFirebaseToken;
exports.rateLimitMiddleware = rateLimitMiddleware;
exports.ipWhitelistMiddleware = ipWhitelistMiddleware;
const admin = __importStar(require("firebase-admin"));
const logger_1 = __importDefault(require("../utils/logger"));
const errors_1 = require("../utils/errors");
/**
 * 真正的JWT验证中间件
 */
async function verifyFirebaseToken(req, res, next) {
    const requestId = req.headers['x-request-id'] || 'unknown';
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
                logger_1.default.info('User authenticated via Firebase token', {
                    uid: decodedToken.uid,
                    email: decodedToken.email,
                    requestId
                });
                return next();
            }
            catch (tokenError) {
                logger_1.default.error('Invalid Firebase token', tokenError, { token: token.substring(0, 20) + '...', requestId });
                // Token无效，但如果有设备指纹，允许试用
                if (deviceFingerprint && isValidDeviceFingerprint(deviceFingerprint)) {
                    req.deviceFingerprint = deviceFingerprint;
                    logger_1.default.info('Fallback to device fingerprint authentication', { deviceFingerprint, requestId });
                    return next();
                }
                throw new errors_1.ValidationError('Invalid authentication token');
            }
        }
        // 如果没有token，检查设备指纹（试用用户）
        if (deviceFingerprint && isValidDeviceFingerprint(deviceFingerprint)) {
            req.deviceFingerprint = deviceFingerprint;
            logger_1.default.info('Device fingerprint authentication', { deviceFingerprint, requestId });
            return next();
        }
        // 都没有，拒绝访问
        throw new errors_1.ValidationError('Authentication required. Please provide valid Firebase token or device fingerprint.');
    }
    catch (error) {
        logger_1.default.error('Authentication failed', error, undefined, requestId);
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
function isValidDeviceFingerprint(fingerprint) {
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
const requestCounts = new Map();
function rateLimitMiddleware(maxRequests = 10, windowMs = 60000) {
    return (req, res, next) => {
        var _a;
        const identifier = ((_a = req.user) === null || _a === void 0 ? void 0 : _a.uid) || req.deviceFingerprint || req.ip || 'unknown';
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
            logger_1.default.warn('Rate limit exceeded', {
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
function ipWhitelistMiddleware(allowedIPs = []) {
    return (req, res, next) => {
        if (allowedIPs.length === 0) {
            return next(); // 没有配置白名单，跳过
        }
        const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
        if (!allowedIPs.includes(clientIP)) {
            logger_1.default.warn('IP not in whitelist', { clientIP, allowedIPs });
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
