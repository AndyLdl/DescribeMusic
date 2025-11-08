#!/usr/bin/env node

/**
 * 设备指纹盐值生成器
 * 生成一个强随机盐值用于 VITE_DEVICE_FINGERPRINT_SALT
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log(`
╔═══════════════════════════════════════════════════════════════╗
║           设备指纹盐值生成器                                    ║
╚═══════════════════════════════════════════════════════════════╝
`);

// 生成强随机盐值
const salt = crypto.randomBytes(32).toString('hex');

console.log(`✅ 已生成强随机盐值：\n`);
console.log(`   ${salt}\n`);

// 检查 .env 文件
const envPath = path.join(__dirname, '..', '.env');
const envLocalPath = path.join(__dirname, '..', '.env.local');

let envContent = '';
let envFilePath = '';

// 优先使用 .env.local
if (fs.existsSync(envLocalPath)) {
    envFilePath = envLocalPath;
    envContent = fs.readFileSync(envLocalPath, 'utf8');
} else if (fs.existsSync(envPath)) {
    envFilePath = envPath;
    envContent = fs.readFileSync(envPath, 'utf8');
}

console.log(`📋 使用说明：\n`);
console.log(`1. 复制上面的盐值`);
console.log(`2. 添加到你的 .env 文件：\n`);
console.log(`   VITE_DEVICE_FINGERPRINT_SALT=${salt}\n`);

// 检查是否已经设置
if (envContent.includes('VITE_DEVICE_FINGERPRINT_SALT')) {
    console.log(`⚠️  警告：检测到你的 ${path.basename(envFilePath)} 文件中已经有 VITE_DEVICE_FINGERPRINT_SALT 配置\n`);
    console.log(`   当前值可能已经在使用中。`);
    console.log(`   更改盐值会导致所有现有设备指纹失效！\n`);
    console.log(`   如果这是新项目或测试环境，可以安全替换。`);
    console.log(`   如果是生产环境，请谨慎操作！\n`);
} else {
    // 询问是否自动添加
    console.log(`❓ 是否要自动添加到 ${envFilePath || '.env'} 文件？\n`);
    console.log(`   如果手动操作，请复制上述配置到你的 .env 文件中。\n`);
}

console.log(`
🔒 安全提示：

1. 盐值应该保密，不要提交到 git
2. 不同环境可以使用不同的盐值
3. 生产环境的盐值至少 32 个字符
4. 一旦设置，不要随意更改（会导致所有指纹失效）

📚 更多信息：
   docs/device-fingerprint-v2-upgrade.md

╔═══════════════════════════════════════════════════════════════╗
║  生成完成！                                                     ║
╚═══════════════════════════════════════════════════════════════╝
`);

// 退出
process.exit(0);

