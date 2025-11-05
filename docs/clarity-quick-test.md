# Clarity 标识符快速测试指南

## 🚀 快速开始（3分钟测试）

### 方法 1：使用测试工具（推荐）

1. **打开网站并加载测试工具**
   - 访问：`http://localhost:4321/?test=clarity`（开发环境）
   - 或访问：`https://yoursite.com/?test=clarity`（生产环境）

2. **打开浏览器控制台（F12）**
   - 应该自动看到测试结果

3. **手动运行测试**
   在控制台输入：
   ```javascript
   window.testClarityIdentity()
   ```

### 方法 2：手动检查（5分钟）

#### 步骤 1：检查 Clarity 是否加载
```javascript
typeof window.clarity  // 应该返回 "function"
```

#### 步骤 2：查看标识符设置
```javascript
// 查看 Clarity 调用队列
const calls = window.clarity.q || [];
const identifyCalls = calls.filter(call => call && call[0] === 'identify');
console.log('最新的标识符:', identifyCalls[identifyCalls.length - 1]);
```

#### 步骤 3：验证标识符类型

**未登录用户应该看到：**
```javascript
["identify", "device_abc123...", "session_...", "/", "Anonymous User"]
```

**登录用户应该看到：**
```javascript
["identify", "user-uuid-123-456", "eyJhbGc...", "/analyze", "user@example.com"]
```

## 📋 完整测试流程

### 测试场景 1：未登录用户

1. **清除缓存**（可选）
   ```javascript
   localStorage.clear();
   location.reload();
   ```

2. **访问网站首页**（未登录）

3. **检查控制台日志**
   应该看到：
   ```
   ✅ Clarity identity set: {
     identifier: "device_xxx...",
     type: "device",
     ...
   }
   ```

4. **验证标识符**
   ```javascript
   window.testClarityIdentity()
   ```

### 测试场景 2：登录用户

1. **登录账户**

2. **检查控制台日志**
   应该看到标识符从 `device_xxx` 切换到用户UUID

3. **验证切换**
   ```javascript
   window.testClarityIdentity()
   ```
   应该显示类型为 `"user"`

### 测试场景 3：登出

1. **登出账户**

2. **检查控制台日志**
   应该看到标识符切换回 `device_xxx`

## 🔍 验证 Clarity 仪表板（需要等待15-30分钟）

1. **登录 Clarity**
   - 访问：https://clarity.microsoft.com
   - 选择你的项目

2. **查看会话记录**
   - 进入 "Recordings" 页面
   - 查看最近的会话

3. **检查自定义标识符**
   - 在会话详情中查看 Custom ID
   - 应该看到 `device_xxx` 或用户UUID

4. **使用过滤器**
   - 在 Filters 中搜索 Custom ID
   - `device_*` 应该找到未登录用户
   - 用户UUID应该找到登录用户

## ✅ 验证清单

- [ ] 未登录时显示 `device_` 开头的标识符
- [ ] 登录后标识符切换到用户UUID
- [ ] 登出后标识符切换回 `device_` 开头
- [ ] 控制台没有错误日志
- [ ] Clarity 仪表板能正确显示标识符

## 🐛 常见问题

**Q: 看不到测试工具？**
A: 确保 URL 包含 `?test=clarity`，或手动在控制台运行 `window.testClarityIdentity()`

**Q: 标识符没有切换？**
A: 检查控制台是否有错误，确认用户登录状态已更新

**Q: Clarity 仪表板看不到数据？**
A: 等待 15-30 分钟让数据同步，或检查网络请求是否成功

## 📞 需要帮助？

查看完整测试指南：`docs/clarity-identity-testing-guide.md`

