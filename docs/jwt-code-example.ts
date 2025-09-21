// JWT 验证的完整实现示例

import * as admin from 'firebase-admin';

/**
 * Firebase JWT 验证的完整流程
 */
async function verifyFirebaseJWT(token: string): Promise<admin.auth.DecodedIdToken> {
    try {
        // 1. Firebase Admin SDK 内部会做以下验证：

        // a) 解析JWT结构
        const [headerB64, payloadB64, signatureB64] = token.split('.');

        // b) 解码Header和Payload
        const header = JSON.parse(Buffer.from(headerB64, 'base64url').toString());
        const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString());

        // c) 验证Header
        if (header.alg !== 'RS256') {
            throw new Error('Invalid algorithm');
        }

        // d) 验证Payload基本字段
        const now = Math.floor(Date.now() / 1000);
        if (payload.exp < now) {
            throw new Error('Token expired');
        }
        if (payload.iat > now) {
            throw new Error('Token used before issued');
        }
        if (payload.aud !== 'your-project-id') {
            throw new Error('Invalid audience');
        }

        // e) 获取Firebase公钥并验证签名
        // Firebase会从 https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com
        // 获取最新的公钥来验证签名

        // f) 这一行代码包含了上述所有验证
        const decodedToken = await admin.auth().verifyIdToken(token);

        return decodedToken;

    } catch (error) {
        console.error('JWT verification failed:', error);
        throw error;
    }
}

/**
 * 在你的云函数中使用
 */
export async function authenticateRequest(authHeader: string): Promise<string> {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new Error('Missing or invalid authorization header');
    }

    const token = authHeader.substring(7); // 移除 "Bearer " 前缀

    try {
        const decodedToken = await admin.auth().verifyIdToken(token);

        // 验证成功，返回用户ID
        return decodedToken.uid;

    } catch (error: any) {
        // 常见的验证失败原因：
        if (error.code === 'auth/id-token-expired') {
            throw new Error('Token expired, please login again');
        } else if (error.code === 'auth/id-token-revoked') {
            throw new Error('Token revoked, please login again');
        } else if (error.code === 'auth/invalid-id-token') {
            throw new Error('Invalid token format');
        } else {
            throw new Error('Authentication failed');
        }
    }
}

/**
 * 为什么攻击者无法绕过？
 */
class JWTSecurityExplanation {

    // ❌ 攻击者尝试1：伪造整个token
    static cannotForgeToken() {
        // 攻击者可能尝试：
        const fakeToken = "eyJhbGciOiJSUzI1NiJ9.eyJ1aWQiOiJoYWNrZXIifQ.fake_signature";

        // 但是：
        // 1. 没有Firebase私钥，无法生成有效签名
        // 2. Firebase会用公钥验证签名，必然失败
        // 3. 即使猜对了算法，也无法伪造RSA签名
    }

    // ❌ 攻击者尝试2：修改现有token
    static cannotModifyToken() {
        // 攻击者可能尝试修改payload中的用户ID：
        // 原始: {"uid": "user123", "exp": 1634571490}
        // 修改: {"uid": "admin", "exp": 1634571490}

        // 但是：
        // 1. 修改payload后，签名就不匹配了
        // 2. Firebase验证时会重新计算签名
        // 3. 发现签名不匹配，验证失败
    }

    // ❌ 攻击者尝试3：重放攻击
    static cannotReplayToken() {
        // 攻击者可能尝试重复使用截获的token

        // 但是：
        // 1. Token有过期时间（通常1小时）
        // 2. 过期后Firebase会拒绝验证
        // 3. 用户重新登录会生成新token
    }

    // ❌ 攻击者尝试4：算法降级攻击
    static cannotDowngradeAlgorithm() {
        // 攻击者可能尝试修改header中的算法：
        // {"alg": "none"} 或 {"alg": "HS256"}

        // 但是：
        // 1. Firebase只接受RS256算法
        // 2. 修改算法后签名验证会失败
        // 3. Firebase有严格的算法白名单
    }
}

/**
 * Firebase JWT的额外安全特性
 */
class FirebaseJWTSecurity {

    // 🔐 密钥轮换
    static keyRotation() {
        // Firebase定期更换签名密钥
        // 即使某个密钥泄露，影响也是有限的
        // 旧token会自动失效
    }

    // 🔐 撤销机制
    static tokenRevocation() {
        // 管理员可以撤销特定用户的所有token
        // admin.auth().revokeRefreshTokens(uid)
        // 被撤销的token即使未过期也无法通过验证
    }

    // 🔐 自定义声明
    static customClaims() {
        // 可以在token中添加自定义权限信息
        // 例如：{"role": "admin", "permissions": ["read", "write"]}
        // 这些信息也受到签名保护，无法伪造
    }
}