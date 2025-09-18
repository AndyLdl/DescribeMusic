# 环境变量加载问题修复指南

## 问题描述

在 Astro + Vite 项目中，`VITE_LEMONSQUEEZY_*` 环境变量无法正确加载到前端代码中。

## 问题原因

1. **长字符串问题**: Lemonsqueezy API Key 过长（890+ 字符），可能导致 .env 文件解析问题
2. **Vite 环境变量加载时机**: 某些情况下 Vite 可能无法正确读取 .env 文件
3. **文件编码问题**: .env 文件的编码或格式可能有问题

## 临时解决方案

目前使用 `src/config/lemonsqueezy.ts` 文件直接管理配置，优先使用环境变量，回退到硬编码值。

## 永久解决方案

### 方案 1: 使用 Astro 配置

在 `astro.config.mjs` 中添加：

```javascript
export default defineConfig({
  // ... 其他配置
  vite: {
    define: {
      'import.meta.env.VITE_LEMONSQUEEZY_API_KEY': JSON.stringify(process.env.VITE_LEMONSQUEEZY_API_KEY),
      'import.meta.env.VITE_LEMONSQUEEZY_STORE_ID': JSON.stringify(process.env.VITE_LEMONSQUEEZY_STORE_ID),
      // ... 其他变量
    }
  }
});
```

### 方案 2: 使用环境变量文件

确保 .env 文件格式正确：

```bash
# 使用引号包围长字符串
VITE_LEMONSQUEEZY_API_KEY="very-long-jwt-token-here"
VITE_LEMONSQUEEZY_STORE_ID=76046
```

### 方案 3: 使用 dotenv 手动加载

在项目根目录创建 `load-env.js`:

```javascript
import { config } from 'dotenv';
config();
```

然后在 `astro.config.mjs` 中导入：

```javascript
import './load-env.js';
```

## 验证步骤

1. 重启开发服务器
2. 检查浏览器控制台中的环境变量值
3. 测试支付功能

## 注意事项

- 确保 .env 文件在 .gitignore 中
- 生产环境需要在部署平台设置环境变量
- API Key 等敏感信息不要提交到代码仓库

## 相关文件

- `src/config/lemonsqueezy.ts` - 当前的配置管理
- `src/config/env.ts` - 原始的环境变量配置
- `astro.config.mjs` - Astro 配置文件
- `.env` - 环境变量文件