# Supabase设置指南

本指南将帮助你设置Supabase项目并配置用户认证和使用限制功能。

## 1. 创建Supabase项目

1. 访问 [Supabase控制台](https://supabase.com/dashboard)
2. 点击 "New Project" 创建新项目
3. 选择组织并填写项目信息：
   - **Name**: describe-music-auth (或你喜欢的名称)
   - **Database Password**: 设置一个强密码并保存
   - **Region**: 选择离你最近的区域
4. 点击 "Create new project" 并等待项目创建完成

## 2. 获取项目配置信息

项目创建完成后：

1. 进入项目控制台
2. 点击左侧菜单的 "Settings" > "API"
3. 复制以下信息：
   - **Project URL**: `https://your-project-id.supabase.co`
   - **anon public key**: 用于前端的公钥
   - **service_role secret**: 用于服务端的密钥（保密！）

## 3. 配置环境变量

1. 复制项目根目录的 `.env.example` 文件为 `.env`：
   ```bash
   cp .env.example .env
   ```

2. 编辑 `.env` 文件，填入你的Supabase配置：
   ```env
   # Supabase配置（从Supabase控制台 Settings > API 获取）
   VITE_SUPABASE_URL=https://your-project-id.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   
   # 设备指纹盐值（生成一个随机字符串，用于增强安全性）
   VITE_DEVICE_FINGERPRINT_SALT=my-random-salt-12345
   
   # 现有配置保持不变
   VITE_CLOUD_FUNCTIONS_URL=https://us-central1-describe-music.cloudfunctions.net
   
   # 使用限制配置
   VITE_TRIAL_LIMIT=5
   VITE_MONTHLY_LIMIT=10
   
   # 开发环境
   NODE_ENV=development
   ```

   **配置说明**：
   - `VITE_SUPABASE_URL`: 你的 Supabase 项目 URL
   - `VITE_SUPABASE_ANON_KEY`: 匿名公钥，用于前端认证
   - `SUPABASE_SERVICE_ROLE_KEY`: 服务端密钥，仅用于云函数（保密！）
   - `VITE_DEVICE_FINGERPRINT_SALT`: 随机字符串，用于设备指纹加密

## 4. 创建数据库表

1. 在Supabase控制台中，点击左侧菜单的 "SQL Editor"
2. 点击 "New query" 创建新查询
3. 复制 `database/supabase-schema.sql` 文件的内容
4. 粘贴到SQL编辑器中
5. 点击 "Run" 执行SQL脚本

这将创建以下表：
- `user_profiles`: 用户配置和使用限制
- `device_fingerprints`: 设备指纹和试用次数
- `usage_logs`: 使用记录和统计

## 5. 设置Row Level Security (RLS)

1. 在SQL编辑器中创建新查询
2. 复制 `database/supabase-rls-policies.sql` 文件的内容
3. 粘贴到SQL编辑器中
4. 点击 "Run" 执行SQL脚本

这将设置安全策略，确保用户只能访问自己的数据。

## 6. 配置认证设置

1. 在Supabase控制台中，点击左侧菜单的 "Authentication" > "Settings"
2. 在 "Site URL" 中设置你的应用URL：
   - 开发环境: `http://localhost:4321`
   - 生产环境: `https://your-domain.com`
3. 在 "Redirect URLs" 中添加：
   - `http://localhost:4321/analyze` (开发环境)
   - `https://your-domain.com/analyze` (生产环境)

## 7. 启用邮箱确认（可选）

如果你想要求用户确认邮箱：

1. 在 "Authentication" > "Settings" 中
2. 启用 "Enable email confirmations"
3. 配置邮件模板（可选）

## 8. 设置定时任务（可选）

为了自动重置月度使用次数和清理过期数据：

1. 在Supabase控制台中，点击左侧菜单的 "Database" > "Extensions"
2. 启用 "pg_cron" 扩展
3. 在SQL编辑器中执行以下命令：

```sql
-- 每月1号重置用户使用次数
SELECT cron.schedule('reset-monthly-usage', '0 0 1 * *', 'SELECT reset_monthly_usage();');

-- 每周日清理过期设备指纹
SELECT cron.schedule('cleanup-device-fingerprints', '0 2 * * 0', 'SELECT cleanup_old_device_fingerprints();');
```

## 9. 验证设置

1. 安装依赖：
   ```bash
   npm install
   ```

2. 启动开发服务器：
   ```bash
   npm run dev
   ```

3. 访问 `http://localhost:4321/analyze`
4. 尝试上传音频文件，应该能看到试用次数显示

## 10. 云函数配置

为了在云函数中使用Supabase进行使用限制验证，需要配置环境变量：

1. 在云函数目录中安装Supabase：
   ```bash
   cd cloud-functions
   npm install @supabase/supabase-js
   ```

2. 配置云函数环境变量：
   
   **方法一：使用 .env 文件（推荐用于开发）**
   ```bash
   cd cloud-functions
   cp env.example .env
   ```
   然后编辑 `.env` 文件，添加你的 Supabase 配置：
   ```env
   SUPABASE_URL=https://your-project-id.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
   ```

   **方法二：使用 Firebase 配置（用于生产环境）**
   ```bash
   firebase functions:config:set supabase.url="https://your-project-id.supabase.co"
   firebase functions:config:set supabase.service_role_key="your-service-role-key"
   ```

3. 部署云函数：
   ```bash
   firebase deploy --only functions
   ```

**重要提示**：
- `service_role_key` 是服务端密钥，具有完全访问权限，请妥善保管
- 不要将 `service_role_key` 暴露在前端代码中
- 在生产环境中使用 Firebase 配置而不是 .env 文件

## 故障排除

### 常见问题

1. **"Invalid API key" 错误**
   - 检查 `.env` 文件中的Supabase URL和密钥是否正确
   - 确保使用的是 `anon` 密钥而不是 `service_role` 密钥

2. **"Row Level Security" 错误**
   - 确保已执行RLS策略SQL脚本
   - 检查用户是否已正确认证

3. **数据库连接错误**
   - 检查Supabase项目是否正常运行
   - 验证网络连接

4. **认证重定向问题**
   - 检查Supabase认证设置中的重定向URL
   - 确保URL与你的应用地址匹配

### 调试技巧

1. 在浏览器开发者工具中查看网络请求
2. 检查Supabase控制台的日志
3. 使用 `console.log` 调试认证状态

## 下一步

设置完成后，你可以：

1. 测试用户注册和登录功能
2. 验证试用次数限制
3. 检查使用记录是否正确保存
4. 自定义认证UI和用户体验

如果遇到问题，请参考 [Supabase官方文档](https://supabase.com/docs) 或查看项目的故障排除指南。