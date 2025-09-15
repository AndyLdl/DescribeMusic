# 配置检查清单

在开始测试用户认证功能之前，请确保以下配置都已正确设置：

## ✅ Supabase 项目配置

### 1. Supabase 控制台设置
- [ ] 已创建 Supabase 项目
- [ ] 已获取项目 URL (`https://your-project-id.supabase.co`)
- [ ] 已获取 `anon` 公钥
- [ ] 已获取 `service_role` 密钥
- [ ] 已设置认证重定向 URL

### 2. 数据库表创建
- [ ] 已执行 `database/supabase-schema.sql` 脚本
- [ ] 已执行 `database/supabase-rls-policies.sql` 脚本
- [ ] 数据库中存在以下表：
  - [ ] `user_profiles`
  - [ ] `device_fingerprints`
  - [ ] `usage_logs`

## ✅ 环境变量配置

### 前端配置 (项目根目录 `.env`)
```env
# 必需的 Supabase 配置
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# 必需的应用配置
VITE_DEVICE_FINGERPRINT_SALT=your-random-salt-string
VITE_CLOUD_FUNCTIONS_URL=https://us-central1-describe-music.cloudfunctions.net

# 可选配置（有默认值）
VITE_TRIAL_LIMIT=5
VITE_MONTHLY_LIMIT=10
NODE_ENV=development
```

### 云函数配置 (`cloud-functions/.env`)
```env
# Supabase 配置（用于使用限制验证）
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# 现有配置保持不变
GOOGLE_AI_API_KEY=your_google_ai_api_key_here
FIREBASE_PROJECT_ID=your_firebase_project_id
# ... 其他现有配置
```

## ✅ 依赖安装

### 前端依赖
- [ ] 已运行 `npm install`
- [ ] 已安装以下新依赖：
  - [ ] `@supabase/supabase-js`
  - [ ] `react-hook-form`
  - [ ] `zod`
  - [ ] `js-sha256`

### 云函数依赖（如果需要后端集成）
- [ ] 已在 `cloud-functions/` 目录运行 `npm install @supabase/supabase-js`

## ✅ 功能测试

### 基本功能测试
- [ ] 启动开发服务器 (`npm run dev`)
- [ ] 访问 `/analyze` 页面
- [ ] 能看到使用次数指示器
- [ ] 能打开登录/注册模态框
- [ ] 浏览器控制台无错误

### 认证功能测试
- [ ] 用户注册功能正常
- [ ] 用户登录功能正常
- [ ] 用户菜单显示正常
- [ ] 使用次数正确显示
- [ ] 试用限制正常工作

## 🔧 故障排除

### 常见问题

**1. "Invalid API key" 错误**
- 检查 `.env` 文件中的 `VITE_SUPABASE_URL` 和 `VITE_SUPABASE_ANON_KEY`
- 确保使用的是 `anon` 密钥而不是 `service_role` 密钥

**2. "Row Level Security" 错误**
- 确保已执行 `database/supabase-rls-policies.sql` 脚本
- 检查 Supabase 控制台中的 RLS 策略是否正确创建

**3. 设备指纹生成失败**
- 检查 `VITE_DEVICE_FINGERPRINT_SALT` 是否已设置
- 查看浏览器控制台是否有 JavaScript 错误

**4. 认证重定向问题**
- 在 Supabase 控制台的 Authentication > Settings 中检查重定向 URL
- 确保包含 `http://localhost:4321/analyze`（开发环境）

### 调试技巧

1. **查看浏览器控制台**：
   ```javascript
   // 检查 Supabase 连接
   console.log('Supabase URL:', import.meta.env.VITE_SUPABASE_URL);
   
   // 检查设备指纹
   import { DeviceFingerprint } from './src/utils/deviceFingerprint';
   DeviceFingerprint.generate().then(console.log);
   ```

2. **查看 Supabase 控制台日志**：
   - Authentication > Users（查看注册用户）
   - Database > Tables（查看数据记录）
   - Logs（查看错误日志）

3. **查看网络请求**：
   - 打开浏览器开发者工具 > Network
   - 查看对 Supabase API 的请求和响应

## 📞 获取帮助

如果遇到问题：

1. 检查 [Supabase 官方文档](https://supabase.com/docs)
2. 查看项目的 `docs/supabase-setup.md` 详细指南
3. 检查浏览器控制台和 Supabase 控制台的错误信息
4. 确保所有环境变量都已正确设置

## 🎯 下一步

配置完成后，你可以：

1. 测试用户注册和登录功能
2. 验证试用次数限制
3. 检查使用状态显示
4. 继续实施后端集成（任务 7-12）

---

**提示**：建议先在开发环境中完全测试所有功能，然后再考虑生产环境部署。