# Cloud Functions Setup Guide

## 🚀 Quick Start

### 1. Prerequisites

- **Node.js 18+** (云函数运行时要求)
- **Firebase CLI**: `npm install -g firebase-tools`
- **Google AI Studio Account**: 获取 Gemini API 密钥
- **Firebase Project**: 创建或使用现有项目

### 2. Firebase 项目设置

**重要：由于我们已经有了完整的云函数代码结构，请按以下步骤操作，避免使用 `firebase init functions`**

```bash
# 1. 登录Firebase
firebase login

# 2. 进入cloud-functions目录
cd cloud-functions

# 3. 关联现有Firebase项目
firebase use --add your-project-id

# 4. 验证配置
firebase projects:list
```

**注意：不要运行 `firebase init functions`，这会创建新的目录结构并覆盖我们现有的代码！**

### 3. 获取 Gemini API 密钥

1. 访问 [Google AI Studio](https://aistudio.google.com/)
2. 登录 Google 账户
3. 创建新的 API 密钥
4. 保存密钥备用

### 4. 配置环境变量

#### 云函数环境变量（生产环境）

```bash
cd cloud-functions

# 设置Firebase云函数环境变量
firebase functions:config:set \
  google_ai.api_key="AIzaSyAbtn_9WkG8sGQTKLyLI5F67KOdh2wi26o" \
  app.project_id="describe-music" \
  app.storage_bucket="describe-music.appspot.com" \
  cors.allowed_origins="https://your-domain.com,http://localhost:4321"

# 获取配置（验证）
firebase functions:config:get
```

#### 本地开发环境变量

```bash
cd cloud-functions

# 复制环境变量模板
cp env.example .env

# 编辑.env文件，填入你的配置
vim .env
```

#### 前端环境变量

```bash
# 在项目根目录
cp env.example .env

# 编辑.env文件，填入云函数URL等配置
vim .env
```

### 5. 本地开发

```bash
# 在cloud-functions目录
cd cloud-functions

# 安装依赖
npm install

# 构建代码
npm run build

# 启动本地模拟器
npm run serve

# 在另一个终端窗口，启动前端
cd ..
pnpm dev
```

访问：

- **前端**: http://localhost:4321
- **云函数模拟器**: http://localhost:5001
- **Firebase 模拟器 UI**: http://localhost:4000

### 6. 部署到生产环境

```bash
cd cloud-functions

# 部署所有函数
npm run deploy

# 或部署特定函数
npm run deploy:analyze

# 查看部署后的日志
npm run logs
```

## 🔧 开发工作流

### 本地测试

1. **启动模拟器**:

   ```bash
   cd cloud-functions
   npm run serve
   ```

2. **测试健康检查**:

   ```bash
   curl http://localhost:5001/your-project-id/us-central1/healthCheck
   ```

3. **测试音频分析**:
   ```bash
   curl -X POST \
     -F "audioFile=@path/to/test.mp3" \
     http://localhost:5001/your-project-id/us-central1/analyzeAudio
   ```

### 前端集成

在前端代码中使用云函数：

```typescript
import { cloudFunctions, validateAudioFile } from "@/utils/cloudFunctions";

// 分析音频文件
async function analyzeFile(file: File) {
  // 验证文件
  const validation = validateAudioFile(file);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  try {
    // 调用云函数
    const result = await cloudFunctions.analyzeAudio(file, {
      includeStructure: true,
      includeSimilarity: true,
      detailedAnalysis: true,
      generateTags: true,
    });

    console.log("Analysis result:", result);
    return result;
  } catch (error) {
    console.error("Analysis failed:", error);
    throw error;
  }
}
```

### 监控和调试

```bash
# 查看实时日志
firebase functions:log --only analyzeAudio

# 查看特定时间范围的日志
firebase functions:log --since 1h

# 查看错误日志
firebase functions:log --only analyzeAudio --filter ERROR
```

## 📊 API 文档

### 分析音频 - POST /analyzeAudio

**请求**:

- Content-Type: `multipart/form-data`
- Body: 音频文件 (字段名: `audioFile`)

**响应**:

```json
{
  "success": true,
  "data": {
    "id": "unique-id",
    "filename": "song.mp3",
    "duration": 180,
    "basicInfo": {
      "genre": "Electronic",
      "mood": "Energetic",
      "bpm": 128,
      "key": "C Major",
      "energy": 0.85
    },
    "emotions": {
      "happy": 0.78,
      "excited": 0.82
    },
    "tags": ["electronic", "energetic", "dance"],
    "aiDescription": "A high-energy electronic track..."
  }
}
```

### 健康检查 - GET /healthCheck

**响应**:

```json
{
  "status": "healthy",
  "timestamp": "2024-01-08T12:00:00.000Z",
  "services": {
    "firebase": true,
    "gemini": true
  }
}
```

## 🚨 故障排除

### 常见问题

1. **意外运行了 `firebase init functions`**:

   如果你已经运行了这个命令，会创建额外的目录结构，需要清理：

   ```bash
   # 删除意外创建的目录（根据实际创建的目录名调整）
   rm -rf describe_music
   rm -rf functions

   # 修复firebase.json配置
   # 确保只有一个functions配置，source指向"./"
   ```

2. **API 密钥错误**:

   ```
   Error: GOOGLE_AI_API_KEY is required
   ```

   解决：检查环境变量配置

3. **文件上传失败**:

   ```
   Error: FILE_TOO_LARGE
   ```

   解决：检查文件大小，最大 50MB

4. **超时错误**:

   ```
   Error: TIMEOUT_ERROR
   ```

   解决：增加 timeout 设置或优化文件大小

5. **CORS 错误**:
   ```
   Error: CORS policy
   ```
   解决：检查 allowed_origins 配置

### 调试步骤

1. **检查配置**:

   ```bash
   firebase functions:config:get
   ```

2. **查看日志**:

   ```bash
   firebase functions:log
   ```

3. **本地测试**:

   ```bash
   npm run serve
   ```

4. **验证 API 密钥**:
   ```bash
   curl -H "Authorization: Bearer $GOOGLE_AI_API_KEY" \
     https://generativelanguage.googleapis.com/v1/models
   ```

## 📈 性能优化

### 建议配置

- **内存**: 2GB (处理大音频文件)
- **超时**: 9 分钟 (AI 分析需要时间)
- **并发**: 根据需要调整

### 成本优化

- 使用合适的 Gemini 模型
- 优化 prompt 长度
- 实现请求缓存
- 监控 API 使用量

## 🔐 安全最佳实践

1. **API 密钥安全**:

   - 不要将密钥提交到代码库
   - 使用 Firebase Functions 配置存储密钥
   - 定期轮换 API 密钥

2. **访问控制**:

   - 配置适当的 CORS 策略
   - 实现速率限制
   - 添加身份验证（如需要）

3. **数据保护**:
   - 不存储用户上传的音频文件
   - 限制文件大小和类型
   - 实现适当的错误处理

## 📞 支持

如需帮助，请查看：

- [Firebase Functions 文档](https://firebase.google.com/docs/functions)
- [Google AI Studio 文档](https://ai.google.dev/)
- [项目 GitHub 仓库](https://github.com/your-repo)
