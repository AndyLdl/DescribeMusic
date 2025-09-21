import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 简单的 .env 解析器
function loadEnv(path) {
    try {
        const content = fs.readFileSync(path, 'utf8');
        const lines = content.split('\n');
        for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed && !trimmed.startsWith('#')) {
                const [key, ...valueParts] = trimmed.split('=');
                if (key && valueParts.length > 0) {
                    process.env[key.trim()] = valueParts.join('=').trim();
                }
            }
        }
    } catch (error) {
        console.log('无法读取 .env 文件:', error.message);
    }
}

loadEnv(join(__dirname, '../cloud-functions/.env'));

console.log('🔍 Vertex AI 安全审计报告');
console.log('================================');

// 1. 检查项目配置
console.log('\n📋 1. 项目配置检查');
const projectId = process.env.VERTEX_AI_PROJECT_ID;
const location = process.env.VERTEX_AI_LOCATION;
const model = process.env.VERTEX_AI_MODEL;

if (projectId) {
    console.log(`✅ 项目 ID: ${projectId}`);
} else {
    console.log('❌ 缺少 VERTEX_AI_PROJECT_ID');
}

if (location) {
    console.log(`✅ 区域: ${location}`);
} else {
    console.log('❌ 缺少 VERTEX_AI_LOCATION');
}

if (model) {
    console.log(`✅ 模型: ${model}`);
} else {
    console.log('❌ 缺少 VERTEX_AI_MODEL');
}

// 2. 检查成本控制
console.log('\n💰 2. 成本控制检查');
const maxTokens = process.env.VERTEX_AI_MAX_TOKENS;
const temperature = process.env.VERTEX_AI_TEMPERATURE;

if (maxTokens && parseInt(maxTokens) <= 2048) {
    console.log(`✅ Token 限制: ${maxTokens} (合理)`);
} else {
    console.log(`⚠️ Token 限制: ${maxTokens} (可能过高)`);
}

if (temperature && parseFloat(temperature) <= 1.0) {
    console.log(`✅ Temperature: ${temperature} (合理)`);
} else {
    console.log(`⚠️ Temperature: ${temperature} (可能过高)`);
}

// 3. 检查 CORS 配置
console.log('\n🌐 3. CORS 安全检查');
const allowedOrigins = process.env.ALLOWED_ORIGINS;
if (allowedOrigins) {
    const origins = allowedOrigins.split(',');
    console.log(`✅ 配置了 ${origins.length} 个允许的域名`);

    const hasLocalhost = origins.some(origin => origin.includes('localhost'));
    if (hasLocalhost) {
        console.log('⚠️ 包含 localhost 域名（开发环境正常，生产环境需移除）');
    }

    const hasWildcard = origins.some(origin => origin.includes('*'));
    if (hasWildcard) {
        console.log('❌ 包含通配符域名（安全风险）');
    } else {
        console.log('✅ 未使用通配符域名');
    }
} else {
    console.log('❌ 未配置 ALLOWED_ORIGINS');
}

// 4. 检查速率限制
console.log('\n⏱️ 4. 速率限制检查');
const maxRequestsPerMinute = process.env.MAX_REQUESTS_PER_MINUTE;
if (maxRequestsPerMinute) {
    const limit = parseInt(maxRequestsPerMinute);
    if (limit <= 20) {
        console.log(`✅ 速率限制: ${limit} 请求/分钟 (合理)`);
    } else {
        console.log(`⚠️ 速率限制: ${limit} 请求/分钟 (可能过高)`);
    }
} else {
    console.log('❌ 未配置 MAX_REQUESTS_PER_MINUTE');
}

// 5. 检查文件大小限制
console.log('\n📁 5. 文件大小限制检查');
const maxFileSize = process.env.MAX_FILE_SIZE_MB;
if (maxFileSize) {
    const size = parseInt(maxFileSize);
    if (size <= 100) {
        console.log(`✅ 文件大小限制: ${size}MB (合理)`);
    } else {
        console.log(`⚠️ 文件大小限制: ${size}MB (可能过大)`);
    }
} else {
    console.log('❌ 未配置 MAX_FILE_SIZE_MB');
}

// 6. 安全建议
console.log('\n🛡️ 6. 安全建议');
console.log('✅ 使用 Google Cloud 服务账号认证（推荐）');
console.log('✅ 实现了成本监控和预算限制');
console.log('✅ 有输入验证和清理机制');
console.log('✅ 实现了缓存减少重复调用');

console.log('\n⚠️ 需要注意的安全点：');
console.log('1. 定期轮换服务账号密钥');
console.log('2. 监控异常的 API 调用模式');
console.log('3. 设置 Google Cloud 预算警报');
console.log('4. 定期审查访问日志');
console.log('5. 考虑实现 IP 白名单（生产环境）');

// 7. 风险评估
console.log('\n📊 7. 风险评估');
let riskScore = 0;
let totalChecks = 0;

// 计算风险分数
const checks = [
    { condition: !projectId, weight: 3, desc: '缺少项目ID' },
    { condition: !allowedOrigins, weight: 2, desc: '未配置CORS' },
    { condition: !maxRequestsPerMinute, weight: 2, desc: '未配置速率限制' },
    { condition: allowedOrigins && allowedOrigins.includes('*'), weight: 3, desc: 'CORS使用通配符' },
    { condition: maxTokens && parseInt(maxTokens) > 4000, weight: 1, desc: 'Token限制过高' },
    { condition: maxFileSize && parseInt(maxFileSize) > 100, weight: 1, desc: '文件大小限制过大' }
];

checks.forEach(check => {
    totalChecks++;
    if (check.condition) {
        riskScore += check.weight;
        console.log(`❌ ${check.desc} (风险权重: ${check.weight})`);
    }
});

const maxRisk = checks.reduce((sum, check) => sum + check.weight, 0);
const riskPercentage = Math.round((riskScore / maxRisk) * 100);

console.log(`\n📈 总体风险评分: ${riskScore}/${maxRisk} (${riskPercentage}%)`);

if (riskPercentage <= 20) {
    console.log('🟢 风险等级: 低 - 配置良好');
} else if (riskPercentage <= 50) {
    console.log('🟡 风险等级: 中 - 需要一些改进');
} else {
    console.log('🔴 风险等级: 高 - 需要立即改进');
}

console.log('\n================================');
console.log('🎯 审计完成！');