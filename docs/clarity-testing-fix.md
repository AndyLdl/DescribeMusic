# Clarity 测试问题修复说明

## 问题描述

在执行测试时，`window.clarity.q` 返回空数组 `[]` 或 `undefined`，无法获取标识符信息。

## 原因分析

`window.clarity.q` 是 Clarity 的调用队列，在 Clarity 脚本加载完成后，队列中的调用会被执行并清空。因此，如果页面已经加载完成，队列可能已经是空的。

## 解决方案

我已经添加了一个**调用追踪器**，它会自动记录所有的 Clarity 调用，包括 `identify` 调用。

### 新的测试方法

#### 方法 1：使用便捷函数（最简单）

```javascript
// 查看当前标识符
window.getClarityIdentity()
```

这会返回：
```javascript
{
  customId: "device_abc123...",
  sessionId: "session_...",
  pageId: "/",
  friendlyName: "Anonymous User",
  type: "device",  // 或 "user"
  timestamp: "2024-01-15 10:30:00"
}
```

#### 方法 2：直接访问追踪器

```javascript
// 查看最后设置的标识符
window.__clarityIdentityTracker?.lastIdentify

// 查看所有 Clarity 调用
window.__clarityIdentityTracker?.calls
```

#### 方法 3：使用测试工具

```javascript
// 运行完整测试
window.testClarityIdentity()

// 查看所有调用
window.getAllClarityCalls()
```

## 工作原理

1. **自动拦截**：当 `setClarityIdentity` 被调用时，会自动初始化追踪器
2. **记录调用**：追踪器会拦截所有 `window.clarity()` 调用并记录
3. **特别记录**：对于 `identify` 调用，会特别记录最后一条信息
4. **持久化**：追踪器数据会保留在 `window.__clarityIdentityTracker` 中，直到页面刷新

## 测试步骤（更新版）

### 1. 未登录用户测试

```javascript
// 刷新页面后，等待几秒让标识符设置完成
// 然后运行：
window.getClarityIdentity()
```

应该看到：
- `customId` 以 `device_` 开头
- `type` 为 `"device"`
- `friendlyName` 为 `"Anonymous User"`

### 2. 登录用户测试

```javascript
// 登录后运行：
window.getClarityIdentity()
```

应该看到：
- `customId` 是用户 UUID（不是 `device_` 开头）
- `type` 为 `"user"`
- `friendlyName` 是用户邮箱

### 3. 查看调用历史

```javascript
// 查看所有调用记录
window.getAllClarityCalls()
```

这会显示所有 Clarity 调用，包括：
- `identify` 调用（设置标识符）
- `set` 调用（设置标签）
- `event` 调用（发送事件）

## 常见问题

### Q: `window.getClarityIdentity()` 返回 `null`

**可能原因：**
1. 页面刚加载，标识符还未设置（等待几秒后重试）
2. 追踪器未初始化（刷新页面）
3. 从未调用过 `setClarityIdentity`

**解决方案：**
```javascript
// 检查追踪器是否存在
console.log(window.__clarityIdentityTracker)

// 检查是否有调用记录
console.log(window.__clarityIdentityTracker?.calls)

// 如果为空，刷新页面后重新测试
```

### Q: 如何确认标识符是否已设置？

**方法 1：查看控制台日志**
查找包含 `✅ Clarity identity set:` 的日志

**方法 2：检查追踪器**
```javascript
window.__clarityIdentityTracker?.lastIdentify
```

**方法 3：运行完整测试**
```javascript
window.testClarityIdentity()
```

## 优势

相比直接访问 `window.clarity.q`，新的追踪器方法：

✅ **更可靠**：不依赖 Clarity 的队列状态
✅ **更完整**：记录所有调用，不仅仅是队列中的
✅ **更易用**：提供便捷函数，无需手动解析
✅ **更持久**：数据保留直到页面刷新

## 更新后的测试流程

1. **刷新页面**（确保追踪器初始化）
2. **等待 2-3 秒**（让标识符设置完成）
3. **运行测试**：
   ```javascript
   window.getClarityIdentity()
   ```
4. **查看结果**：应该能看到完整的标识符信息

## 示例输出

```javascript
// 未登录用户
{
  customId: "device_a1b2c3d4e5f6...",
  sessionId: "session_1705320000000_abc123",
  pageId: "/",
  friendlyName: "Anonymous User",
  type: "device",
  timestamp: "2024-01-15 10:30:00"
}

// 登录用户
{
  customId: "123e4567-e89b-12d3-a456-426614174000",
  sessionId: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  pageId: "/analyze",
  friendlyName: "user@example.com",
  type: "user",
  timestamp: "2024-01-15 10:35:00"
}
```

