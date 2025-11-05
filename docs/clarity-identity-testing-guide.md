# Clarity 自定义标识符测试指南

## 测试目标

验证 Microsoft Clarity 自定义标识符功能是否正常工作，确保：

1. 登录用户使用用户 ID 作为标识符
2. 未登录用户使用设备指纹作为标识符
3. 登录/登出时能正确切换标识符
4. 标识符在 Clarity 仪表板中正确显示

## 前置准备

### 1. 检查 Clarity 是否已加载

打开浏览器开发者工具（F12），在 Console 中输入：

```javascript
typeof window.clarity;
```

应该返回 `"function"`，表示 Clarity 已加载。

### 2. 查看 Clarity ID

在 Console 中输入：

```javascript
window.clarity;
```

应该看到 Clarity 函数对象。

## 测试场景

### 场景 1：未登录用户测试

#### 步骤：

1. **清除浏览器缓存和 localStorage**

   ```javascript
   // 在 Console 中执行
   localStorage.clear();
   sessionStorage.clear();
   location.reload();
   ```

2. **打开网站（未登录状态）**

   - 访问网站首页
   - 不要登录

3. **检查控制台日志**
   应该看到类似以下日志：

   ```
   ✅ Clarity identity set: {
     identifier: "device_abc123...",
     type: "device",
     sessionId: "session_...",
     pageId: "/",
     friendlyName: "Anonymous User"
   }
   ```

4. **验证 Clarity 标识符**
   在 Console 中执行：

   ```javascript
   // 检查 Clarity 队列中的标识符调用
   console.log(window.clarity.q || []);
   ```

   应该看到包含 `"identify"` 的调用，且第一个参数以 `device_` 开头。

5. **刷新页面验证一致性**
   - 刷新页面（F5）
   - 检查控制台日志，设备指纹应该保持一致（相同的前缀 `device_xxx`）

### 场景 2：登录用户测试

#### 步骤：

1. **登录用户账户**

   - 使用有效的邮箱和密码登录

2. **检查控制台日志**
   应该看到类似以下日志：

   ```
   ✅ Clarity identity set: {
     identifier: "user-uuid-123-456-789",
     type: "user",
     sessionId: "eyJhbGc...",
     pageId: "/analyze",
     friendlyName: "user@example.com"
   }
   ```

   注意：

   - `identifier` 应该是用户 UUID（不是 `device_` 开头）
   - `type` 应该是 `"user"`
   - `friendlyName` 应该是用户邮箱

3. **验证标识符切换**
   在 Console 中执行：
   ```javascript
   // 查看最新的 Clarity 调用
   const calls = window.clarity.q || [];
   const lastIdentify = calls.find((call) => call[0] === "identify");
   console.log("Latest identify call:", lastIdentify);
   ```
   应该看到标识符从 `device_xxx` 切换到了用户 UUID。

### 场景 3：登出测试

#### 步骤：

1. **从已登录状态登出**

   - 点击登出按钮

2. **检查控制台日志**
   应该看到：
   ```
   ✅ Clarity identity set: {
     identifier: "device_abc123...",
     type: "device",
     sessionId: "session_...",
     pageId: "/",
     friendlyName: "Anonymous User"
   }
   ```
   注意标识符从用户 ID 切换回了设备指纹。

### 场景 4：跨会话测试（未登录用户）

#### 步骤：

1. **第一次访问（未登录）**

   - 记录设备指纹（从控制台日志）
   - 例如：`device_abc123def456...`

2. **关闭浏览器标签页**

3. **重新打开网站（未登录）**

   - 打开新的标签页
   - 访问同一网站

4. **验证设备指纹一致性**
   - 检查控制台日志
   - 设备指纹应该与第一次访问相同（相同的前缀部分）
   - 这说明同一设备被正确识别

### 场景 5：Clarity 仪表板验证

#### 步骤：

1. **等待数据同步**

   - Clarity 数据通常需要几分钟到几小时才能显示
   - 建议等待 15-30 分钟后查看

2. **登录 Clarity 仪表板**

   - 访问 https://clarity.microsoft.com
   - 登录你的账户
   - 选择对应的项目

3. **查看会话记录**

   - 进入 "Recordings" 页面
   - 查看最近的会话记录

4. **验证自定义标识符**

   - 在会话详情中，应该能看到：
     - Custom ID: `device_xxx` (未登录用户) 或 `user-uuid` (登录用户)
     - Custom Session ID: 会话令牌或时间戳
     - Custom Page ID: 页面路径
     - Friendly Name: 用户邮箱或 "Anonymous User"

5. **使用过滤器**
   - 在 Filters 中，可以按 Custom ID 过滤
   - 搜索 `device_` 可以找到所有未登录用户的会话
   - 搜索用户 UUID 可以找到特定用户的会话

## 自动化测试脚本

创建一个测试脚本，在浏览器 Console 中执行：

```javascript
// Clarity 标识符测试脚本
async function testClarityIdentity() {
  console.log("🧪 开始测试 Clarity 标识符...\n");

  // 1. 检查 Clarity 是否加载
  if (typeof window.clarity !== "function") {
    console.error("❌ Clarity 未加载");
    return;
  }
  console.log("✅ Clarity 已加载");

  // 2. 检查 Clarity 队列
  const calls = window.clarity.q || [];
  console.log(`📊 Clarity 调用次数: ${calls.length}`);

  // 3. 查找 identify 调用
  const identifyCalls = calls.filter((call) => call && call[0] === "identify");
  console.log(`📝 Identify 调用次数: ${identifyCalls.length}`);

  if (identifyCalls.length > 0) {
    const lastCall = identifyCalls[identifyCalls.length - 1];
    console.log("🔍 最新的 identify 调用:", lastCall);

    const [action, customId, sessionId, pageId, friendlyName] = lastCall;

    console.log("\n📋 标识符详情:");
    console.log(`   Custom ID: ${customId}`);
    console.log(`   Session ID: ${sessionId?.substring(0, 20)}...`);
    console.log(`   Page ID: ${pageId}`);
    console.log(`   Friendly Name: ${friendlyName}`);

    // 判断类型
    if (customId.startsWith("device_")) {
      console.log("\n✅ 类型: 未登录用户（设备指纹）");
    } else {
      console.log("\n✅ 类型: 登录用户（用户ID）");
    }
  }

  // 4. 检查 localStorage 中的设备指纹
  const deviceFingerprintKeys = Object.keys(localStorage).filter(
    (key) => key.includes("fingerprint") || key.includes("device")
  );
  if (deviceFingerprintKeys.length > 0) {
    console.log("\n🔑 设备指纹缓存键:", deviceFingerprintKeys);
  }

  console.log("\n✨ 测试完成");
}

// 执行测试
testClarityIdentity();
```

## 验证清单

### 未登录用户

- [ ] 控制台显示 `device_` 开头的标识符
- [ ] `type` 字段为 `"device"`
- [ ] `friendlyName` 为 `"Anonymous User"`
- [ ] 刷新页面后标识符保持一致

### 登录用户

- [ ] 控制台显示用户 UUID（不是 `device_` 开头）
- [ ] `type` 字段为 `"user"`
- [ ] `friendlyName` 为实际邮箱地址
- [ ] 登录后标识符从设备指纹切换到用户 ID

### 登出用户

- [ ] 登出后标识符切换回 `device_` 开头
- [ ] `type` 字段变为 `"device"`
- [ ] `friendlyName` 变为 `"Anonymous User"`

### Clarity 仪表板

- [ ] 能看到自定义标识符数据
- [ ] 可以通过 Custom ID 过滤会话
- [ ] 登录用户和未登录用户能正确区分

## 常见问题排查

### 问题 1：看不到 Clarity 日志

**解决方案：**

- 检查 Clarity 是否已加载：`typeof window.clarity`
- 检查网络请求，确认 Clarity 脚本已加载
- 检查浏览器控制台是否有错误

### 问题 2：标识符没有切换

**解决方案：**

- 检查 `AuthContext` 是否正确调用了 `setClarityIdentity`
- 检查控制台是否有错误日志
- 确认用户登录状态是否正确更新

### 问题 3：设备指纹不一致

**解决方案：**

- 检查 localStorage 是否被清除
- 检查设备指纹缓存是否过期（24 小时）
- 确认浏览器特征没有变化

### 问题 4：Clarity 仪表板看不到数据

**解决方案：**

- 等待 15-30 分钟让数据同步
- 检查 Clarity 项目 ID 是否正确
- 确认网络请求已成功发送到 Clarity 服务器

## 测试报告模板

```markdown
## Clarity 标识符测试报告

### 测试环境

- 浏览器: Chrome 120
- 操作系统: macOS 14.0
- 测试时间: 2024-01-15 10:00

### 测试结果

#### 未登录用户

- [x] 设备指纹生成成功
- [x] 标识符格式正确 (device_xxx)
- [x] 跨会话一致性验证通过

#### 登录用户

- [x] 用户 ID 设置成功
- [x] 标识符格式正确 (user-uuid)
- [x] 登录后切换成功

#### 登出用户

- [x] 切换回设备指纹成功
- [x] 标识符格式正确

#### Clarity 仪表板

- [x] 数据同步成功
- [x] 自定义标识符显示正确
- [x] 过滤器功能正常

### 问题记录

无

### 结论

✅ 所有测试通过，功能正常
```

## 调试技巧

1. **实时监控 Clarity 调用**

   ```javascript
   // 拦截 Clarity 调用
   const originalClarity = window.clarity;
   window.clarity = function (...args) {
     console.log("🔍 Clarity 调用:", args);
     return originalClarity.apply(window, args);
   };
   ```

2. **检查设备指纹生成**

   ```javascript
   // 在 Console 中执行
   import("./utils/deviceFingerprint").then((m) => {
     m.DeviceFingerprint.generate().then((fp) => {
       console.log("设备指纹:", fp);
     });
   });
   ```

3. **查看完整 Clarity 状态**
   ```javascript
   // 查看所有 Clarity 相关数据
   console.log("Clarity 函数:", window.clarity);
   console.log("Clarity 队列:", window.clarity?.q || []);
   console.log(
     "设备指纹缓存:",
     localStorage.getItem("device_fingerprint_cache")
   );
   ```
