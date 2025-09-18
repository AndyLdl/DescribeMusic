# Lemonsqueezy 产品变体设置指南

## 概述

本指南详细说明如何在 Lemonsqueezy 中创建和配置音乐分析应用的积分套餐产品变体。

## 🎯 产品变体规划

### 变体架构
我们需要创建一个主产品，然后在其下创建三个变体（套餐）：

```
音乐分析积分套餐 (主产品)
├── 基础套餐 (Basic) - $9.9 / 2000积分
├── 专业套餐 (Pro) - $19.9 / 4000积分
└── 高级套餐 (Premium) - $29.9 / 6000积分
```

## 📋 详细变体配置

### 1. 基础套餐 (Basic Plan)

**基本信息**
- **名称**: 基础套餐 / Basic Plan
- **价格**: $9.90 USD
- **积分数量**: 2000 积分
- **目标用户**: 轻度使用者

**产品描述**
```
🎵 Basic Plan - Music Analysis Credits

✨ What's Included:
• 2,000 credits (~33 minutes of audio analysis)
• Support for all audio formats (MP3, WAV, FLAC, etc.)
• Detailed music analysis reports
• Basic customer support

💡 Perfect For:
• Occasional music analysis users
• Personal music enthusiasts
• Small-scale music projects

⏱️ How It Works:
• 1 credit = 1 second of audio analysis
• Credits never expire
• Purchase additional credits anytime
```

**变体设置**
- **SKU**: `music-analysis-basic-2000`
- **库存**: 无限制
- **数字产品**: 是
- **即时交付**: 是

### 2. 专业套餐 (Pro Plan)

**基本信息**
- **名称**: 专业套餐 / Pro Plan  
- **价格**: $19.90 USD
- **积分数量**: 4000 积分
- **目标用户**: 专业用户
- **推荐标签**: ⭐ 最受欢迎

**产品描述**
```
🎵 Pro Plan - Music Analysis Credits ⭐ Most Popular

✨ What's Included:
• 4,000 credits (~67 minutes of audio analysis)
• Support for all audio formats (MP3, WAV, FLAC, etc.)
• Detailed music analysis reports
• Priority customer support
• Batch analysis features

💡 Perfect For:
• Music producers and composers
• Music educators
• Medium-scale music projects
• Regular music analysis users

⏱️ How It Works:
• 1 credit = 1 second of audio analysis
• Credits never expire
• Save $0.10 compared to Basic plan per credit
• Purchase additional credits anytime

🎁 Extra Value:
• Save equivalent of 2,000 credits compared to individual purchases
• Priority technical support
```

**变体设置**
- **SKU**: `music-analysis-pro-4000`
- **库存**: 无限制
- **数字产品**: 是
- **即时交付**: 是
- **推荐标签**: 添加"Popular"或"Best Value"标签

### 3. 高级套餐 (Premium Plan)

**基本信息**
- **名称**: 高级套餐 / Premium Plan
- **价格**: $29.90 USD
- **积分数量**: 6000 积分
- **目标用户**: 重度使用者

**产品描述**
```
🎵 Premium Plan - Music Analysis Credits

✨ What's Included:
• 6,000 credits (~100 minutes of audio analysis)
• Support for all audio formats (MP3, WAV, FLAC, etc.)
• Detailed music analysis reports
• Dedicated customer support
• Batch analysis features
• API access (coming soon)

💡 Perfect For:
• Professional music studios
• Music technology companies
• Large-scale music projects
• Music research institutions

⏱️ How It Works:
• 1 credit = 1 second of audio analysis
• Credits never expire
• Save $0.20 compared to Basic plan per credit
• Purchase additional credits anytime

🎁 Extra Value:
• Save equivalent of 4,000 credits compared to individual purchases
• Dedicated technical support
• Early access to new features
• API access (coming soon)
```

**变体设置**
- **SKU**: `music-analysis-premium-6000`
- **库存**: 无限制
- **数字产品**: 是
- **即时交付**: 是

## 🛠️ Lemonsqueezy 设置步骤

> 📖 **详细操作指南**: 请参考 `docs/lemonsqueezy-step-by-step-setup.md` 获取完整的图文操作步骤。

### 步骤 1: 创建主产品

1. 登录 [Lemonsqueezy Dashboard](https://app.lemonsqueezy.com)
2. 进入 **Products** 页面
3. 点击 **Create Product**
4. 填写产品信息：
   - **Product Name**: Music Analysis Credit Plans
   - **Description**: Credit packages for music analysis application
   - **Category**: Digital Products / Software
   - **Status**: Published

### 步骤 2: 创建变体

对每个套餐重复以下步骤：

1. 在产品页面点击 **Add Variant**
2. 填写变体信息：
   - **Variant Name**: [套餐名称]
   - **Price**: [对应价格]
   - **Description**: [使用上面的产品描述]
3. 设置变体选项：
   - **SKU**: [使用上面的SKU]
   - **Inventory**: Unlimited
   - **Digital Product**: Yes
   - **Instant Delivery**: Yes
4. 保存变体并记录 **Variant ID**

### 步骤 3: 配置积分映射

由于 Lemonsqueezy 变体没有自定义数据字段，我们通过以下方式处理积分信息：

1. **前端配置**: 在 `src/services/lemonsqueezyService.ts` 中配置套餐信息
2. **Webhook 映射**: 在云函数中通过变体 ID 映射积分数量
3. **环境变量**: 将变体 ID 保存到环境变量中

**积分映射配置**（已在代码中实现）：
```typescript
const variantCreditsMap = {
  'basic_variant_id': 2000,
  'pro_variant_id': 4000, 
  'premium_variant_id': 6000
};
```

### 步骤 4: 设置 Webhook

1. 进入 **Settings** > **Webhooks**
2. 点击 **Add Webhook**
3. 配置 Webhook：
   - **URL**: `https://your-project.cloudfunctions.net/lemonsqueezyWebhook`
   - **Events**: 选择以下事件
     - ✅ `order_created`
     - ✅ `subscription_created`
     - ✅ `subscription_updated`
     - ✅ `subscription_cancelled`
     - ✅ `subscription_resumed`
     - ✅ `subscription_expired`
     - ✅ `subscription_paused`
     - ✅ `subscription_unpaused`
4. 生成并保存 **Webhook Secret**

## 📝 变体 ID 记录表

创建完成后，记录每个变体的 ID：

| Plan Name | Price | Credits | Variant ID | Environment Variable |
|-----------|-------|---------|------------|---------------------|
| Basic Plan | $9.9 | 2000 | `[Record ID]` | `VITE_LEMONSQUEEZY_BASIC_VARIANT_ID` |
| Pro Plan | $19.9 | 4000 | `[Record ID]` | `VITE_LEMONSQUEEZY_PRO_VARIANT_ID` |
| Premium Plan | $29.9 | 6000 | `[Record ID]` | `VITE_LEMONSQUEEZY_PREMIUM_VARIANT_ID` |

## 🎨 营销建议

### Value Proposition Highlights
- **Basic Plan**: Emphasize "Perfect for beginners" and "Great value"
- **Pro Plan**: Highlight "Most popular" and "Best value"
- **Premium Plan**: Emphasize "Professional grade" and "Full featured"

### Pricing Strategy
- Set Pro Plan as "Recommended" option
- Highlight savings compared to individual purchases
- Emphasize that credits never expire

### User Guidance
- Recommend appropriate plans for different user types
- Provide usage scenario examples
- Emphasize upgrade convenience

## 🔧 测试验证

### 测试模式设置
1. 在 Lemonsqueezy 中启用 **Test Mode**
2. 使用测试信用卡进行支付测试：
   - **成功**: `4242 4242 4242 4242`
   - **失败**: `4000 0000 0000 0002`
3. 验证 Webhook 是否正确触发
4. 检查积分是否正确发放

### 验证清单
- [ ] 三个变体都已创建并发布
- [ ] 价格和积分数量正确
- [ ] 产品描述清晰吸引人
- [ ] Webhook 配置正确
- [ ] 测试支付流程正常
- [ ] 积分发放机制工作正常

## 📞 技术支持

如果在设置过程中遇到问题：

1. **Lemonsqueezy 文档**: https://docs.lemonsqueezy.com/
2. **Webhook 测试工具**: 使用 ngrok 进行本地测试
3. **日志检查**: 查看云函数日志确认 Webhook 处理
4. **测试工具**: 使用 Postman 测试 API 调用

完成这些设置后，你的积分套餐就可以在应用中正常销售了！