# Lemonsqueezy 变体设置完整指南

## 📋 准备工作

在开始之前，请确保：
- [ ] 已注册 Lemonsqueezy 账户
- [ ] 已完成商店基本设置
- [ ] 已配置支付方式和税务设置
- [ ] 准备好产品描述和图片

## 🚀 第一步：创建主产品

### 1.1 进入产品管理页面

1. 登录 [Lemonsqueezy Dashboard](https://app.lemonsqueezy.com)
2. 在左侧导航栏点击 **"Products"**
3. 点击右上角的 **"New product"** 按钮

### 1.2 填写基本产品信息

在产品创建页面填写以下信息：

**基本信息**
```
Product name: Music Analysis Credit Plans
Description: Professional music analysis credits for detailed audio insights and reports.
```

**产品类型选择**
- 选择 **"Digital"** (数字产品)
- 勾选 **"This product has variants"** (此产品有变体)

**分类设置**
```
Category: Software
Tags: music, analysis, audio, credits, AI
```

**状态设置**
- Status: **Draft** (先设为草稿，配置完成后再发布)

点击 **"Create product"** 创建产品。

## 🎯 第二步：创建产品变体

产品创建成功后，你会进入产品详情页面。现在开始创建三个变体：

### 2.1 创建基础套餐变体

#### 点击 "Add variant" 按钮

在产品详情页面，找到 **"Variants"** 部分，点击 **"Add variant"**。

#### 填写基础套餐信息

**变体基本信息**
```
Variant name: Basic Plan
Price: $9.90
Currency: USD
```

**变体描述**
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

**高级设置**
```
SKU: music-analysis-basic-2000
Sort order: 1
```

**库存设置**
- Track quantity: **关闭** (数字产品不需要库存管理)

**配送设置**
- Requires shipping: **关闭**
- Digital product: **开启**

点击 **"Save variant"** 保存。

### 2.2 创建专业套餐变体

#### 点击 "Add variant" 按钮

继续添加第二个变体。

#### 填写专业套餐信息

**变体基本信息**
```
Variant name: Pro Plan ⭐ Most Popular
Price: $19.90
Currency: USD
```

**变体描述**
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

**高级设置**
```
SKU: music-analysis-pro-4000
Sort order: 2
```

**推荐标签设置**
- 在变体设置中找到 **"Tags"** 或 **"Labels"** 选项
- 添加标签: `popular`, `recommended`, `best-value`

**库存和配送设置**
- Track quantity: **关闭**
- Requires shipping: **关闭**
- Digital product: **开启**

点击 **"Save variant"** 保存。

### 2.3 创建高级套餐变体

#### 点击 "Add variant" 按钮

添加第三个变体。

#### 填写高级套餐信息

**变体基本信息**
```
Variant name: Premium Plan
Price: $29.90
Currency: USD
```

**变体描述**
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

**高级设置**
```
SKU: music-analysis-premium-6000
Sort order: 3
```

**库存和配送设置**
- Track quantity: **关闭**
- Requires shipping: **关闭**
- Digital product: **开启**

点击 **"Save variant"** 保存。

## 🔧 第三步：配置自定义数据

Lemonsqueezy 的变体本身没有自定义数据字段，但我们可以通过以下方式传递积分信息：

### 3.1 使用 Checkout 自定义数据

我们将在创建 Checkout 时传递自定义数据，而不是在变体中存储。这样更灵活且符合 Lemonsqueezy 的设计。

**在前端代码中配置**（已在 `src/services/lemonsqueezyService.ts` 中实现）：

```typescript
// 基础套餐配置
const SUBSCRIPTION_PLANS = {
  basic: {
    id: 'basic',
    name: 'Basic Plan',
    price: 9.9,
    credits: 2000,
    variantId: 'your_basic_variant_id',
    description: 'Perfect for occasional users'
  },
  pro: {
    id: 'pro', 
    name: 'Pro Plan',
    price: 19.9,
    credits: 4000,
    variantId: 'your_pro_variant_id',
    description: 'Most popular choice',
    popular: true
  },
  premium: {
    id: 'premium',
    name: 'Premium Plan',
    price: 29.9,
    credits: 6000,
    variantId: 'your_premium_variant_id',
    description: 'For professional use'
  }
};
```

### 3.2 Webhook 中的积分映射

在 Webhook 处理函数中，我们通过变体 ID 来确定积分数量：

```typescript
// 在 cloud-functions/src/functions/lemonsqueezyWebhook.ts 中
function getCreditsForVariant(variantId: number): number {
  const variantCreditsMap: Record<string, number> = {
    [config.lemonsqueezy.basicVariantId || '']: 2000,
    [config.lemonsqueezy.proVariantId || '']: 4000,
    [config.lemonsqueezy.premiumVariantId || '']: 6000
  };
  return variantCreditsMap[variantId.toString()] || 0;
}
```

### 3.3 记录变体 ID

创建完成后，记录每个变体的 ID：

1. 在变体列表中，点击每个变体
2. 在 URL 中或变体详情页面找到 Variant ID
3. 记录到下表中：

| Plan Name | Price | Credits | Variant ID | Environment Variable |
|-----------|-------|---------|------------|---------------------|
| Basic Plan | $9.9 | 2000 | `[你的ID]` | `VITE_LEMONSQUEEZY_BASIC_VARIANT_ID` |
| Pro Plan | $19.9 | 4000 | `[你的ID]` | `VITE_LEMONSQUEEZY_PRO_VARIANT_ID` |
| Premium Plan | $29.9 | 6000 | `[你的ID]` | `VITE_LEMONSQUEEZY_PREMIUM_VARIANT_ID` |

### 3.4 如何找到变体 ID

**方法 1: 从 URL 获取**
- 进入变体编辑页面
- 查看浏览器地址栏，URL 格式类似：`https://app.lemonsqueezy.com/products/12345/variants/67890`
- 最后的数字 `67890` 就是变体 ID

**方法 2: 从页面信息获取**
- 在变体详情页面，有些地方会显示 Variant ID
- 或者在开发者工具中查看页面元素

**方法 3: 使用 API 获取**
- 可以通过 Lemonsqueezy API 查询产品的所有变体
- 但对于手动设置，前两种方法更简单

## 🎨 第四步：优化产品展示

### 4.1 添加产品图片

1. 在产品详情页面找到 **"Images"** 部分
2. 上传产品主图（建议尺寸：1200x800px）
3. 为每个变体添加特定图片（可选）

**图片建议**
- 使用专业的音乐/音频相关图片
- 突出积分和分析概念
- 保持品牌一致性

### 4.2 设置产品 SEO

在产品设置中找到 **"SEO"** 部分：

```
SEO Title: Music Analysis Credits - Professional Audio Analysis Plans
Meta Description: Get professional music analysis with our credit-based system. Choose from Basic, Pro, or Premium plans. Credits never expire. Start analyzing your music today!
URL Slug: music-analysis-credits
```

### 4.3 配置产品选项

如果需要，可以添加产品选项：

1. 在产品设置中找到 **"Product options"**
2. 可以添加选项如：
   - License type (Personal/Commercial)
   - Support level
   - Additional features

## 🔗 第五步：设置 Webhook

### 5.1 创建 Webhook

1. 在 Lemonsqueezy Dashboard 中，进入 **"Settings"**
2. 点击 **"Webhooks"**
3. 点击 **"Create webhook"**

### 5.2 配置 Webhook 设置

**基本设置**
```
Name: Music Analysis Credit System
URL: https://your-project.cloudfunctions.net/lemonsqueezyWebhook
```

**事件选择**
勾选以下事件：
- [x] `order_created`
- [x] `order_refunded`
- [x] `subscription_created`
- [x] `subscription_updated`
- [x] `subscription_cancelled`
- [x] `subscription_resumed`
- [x] `subscription_expired`
- [x] `subscription_paused`
- [x] `subscription_unpaused`

**安全设置**
1. 点击 **"Generate secret"** 生成 Webhook Secret
2. 复制并保存这个 Secret（用于环境变量）
3. 确保 **"Verify SSL"** 已开启

点击 **"Create webhook"** 完成创建。

## 🧪 第六步：测试设置

### 6.1 启用测试模式

1. 在 Lemonsqueezy Dashboard 中找到 **"Test mode"** 开关
2. 开启测试模式
3. 确保产品状态设为 **"Published"**

### 6.2 测试购买流程

使用测试信用卡进行购买测试：

**测试信用卡信息**
```
成功支付: 4242 4242 4242 4242
失败支付: 4000 0000 0000 0002
过期日期: 任何未来日期 (如 12/25)
CVC: 任何3位数字 (如 123)
```

### 6.3 验证 Webhook

1. 进行测试购买
2. 检查 Webhook 日志确认事件已发送
3. 验证云函数日志确认事件已处理
4. 检查数据库确认积分已正确发放

## 📝 第七步：环境变量配置

将记录的变体 ID 添加到环境变量中：

**前端 (.env)**
```bash
VITE_LEMONSQUEEZY_API_KEY=your_api_key
VITE_LEMONSQUEEZY_STORE_ID=your_store_id
VITE_LEMONSQUEEZY_BASIC_VARIANT_ID=your_basic_variant_id
VITE_LEMONSQUEEZY_PRO_VARIANT_ID=your_pro_variant_id
VITE_LEMONSQUEEZY_PREMIUM_VARIANT_ID=your_premium_variant_id
```

**云函数 (cloud-functions/.env)**
```bash
LEMONSQUEEZY_WEBHOOK_SECRET=your_webhook_secret
LEMONSQUEEZY_BASIC_VARIANT_ID=your_basic_variant_id
LEMONSQUEEZY_PRO_VARIANT_ID=your_pro_variant_id
LEMONSQUEEZY_PREMIUM_VARIANT_ID=your_premium_variant_id
```

## ✅ 完成检查清单

设置完成后，请检查以下项目：

- [ ] 主产品已创建并发布
- [ ] 三个变体已创建（Basic, Pro, Premium）
- [ ] 每个变体的价格和描述正确
- [ ] 自定义数据已添加到每个变体
- [ ] 变体 ID 已记录并添加到环境变量
- [ ] Webhook 已创建并配置正确事件
- [ ] Webhook Secret 已保存到环境变量
- [ ] 测试模式下购买流程正常
- [ ] Webhook 事件能正确触发和处理
- [ ] 积分发放机制工作正常

## 🚀 上线准备

测试完成后，准备上线：

1. **关闭测试模式**
   - 在 Lemonsqueezy Dashboard 中关闭 Test mode
   
2. **更新环境变量**
   - 将生产环境的 API Key 和配置更新到环境变量
   
3. **部署云函数**
   ```bash
   cd cloud-functions
   npm run deploy
   ```

4. **最终测试**
   - 使用真实信用卡进行小额测试（建议测试基础套餐）
   - 验证整个流程正常工作

## 🆘 常见问题解决

### 问题 1: 变体 ID 找不到
**解决方案**: 在变体编辑页面的 URL 中查看，格式通常是 `/variants/12345`

### 问题 2: Webhook 未触发
**解决方案**: 
- 检查 Webhook URL 是否正确
- 确认云函数已部署
- 查看 Lemonsqueezy Webhook 日志

### 问题 3: 积分数量映射错误
**解决方案**: 
- 检查环境变量中的变体 ID 是否正确
- 确认 Webhook 处理函数中的变体映射配置
- 验证变体 ID 格式（应该是纯数字）

### 问题 4: 测试支付失败
**解决方案**:
- 确认测试模式已开启
- 使用正确的测试信用卡号
- 检查产品状态是否为 Published

完成这些步骤后，你的 Lemonsqueezy 积分套餐就完全配置好了！🎉