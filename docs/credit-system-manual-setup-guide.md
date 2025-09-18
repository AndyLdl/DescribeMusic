# 积分系统手动设置指南

## 概述

积分系统的核心代码和测试已经完成，但还需要一些手动配置和部署步骤才能完全运行。本指南将帮助你完成这些步骤。

## 🔧 需要手动处理的内容

### 1. 环境变量配置

#### 1.1 前端环境变量 (.env)
```bash
# Lemonsqueezy 配置
VITE_LEMONSQUEEZY_API_KEY=your_lemonsqueezy_api_key
VITE_LEMONSQUEEZY_STORE_ID=your_store_id
VITE_LEMONSQUEEZY_BASIC_VARIANT_ID=your_basic_variant_id
VITE_LEMONSQUEEZY_PRO_VARIANT_ID=your_pro_variant_id  
VITE_LEMONSQUEEZY_PREMIUM_VARIANT_ID=your_premium_variant_id

# Supabase 配置 (如果还没有)
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

#### 1.2 云函数环境变量 (cloud-functions/.env)
```bash
# Lemonsqueezy Webhook 配置
LEMONSQUEEZY_WEBHOOK_SECRET=your_webhook_secret
LEMONSQUEEZY_BASIC_VARIANT_ID=your_basic_variant_id
LEMONSQUEEZY_PRO_VARIANT_ID=your_pro_variant_id
LEMONSQUEEZY_PREMIUM_VARIANT_ID=your_premium_variant_id

# Supabase 配置
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 2. Lemonsqueezy 设置

#### 2.1 创建产品和变体
1. 登录 [Lemonsqueezy Dashboard](https://app.lemonsqueezy.com)
2. 按照 **详细变体设置指南** 创建三个产品变体：
   - **基础套餐**: $9.9, 2000 积分
   - **专业套餐**: $19.9, 4000 积分 (推荐)
   - **高级套餐**: $29.9, 6000 积分
3. 记录每个变体的 ID，填入环境变量

> 📖 **详细指南**: 请参考 `docs/lemonsqueezy-variants-setup-guide.md` 获取完整的产品变体创建步骤、产品描述模板和营销建议。

#### 2.2 配置 Webhook
1. 在 Lemonsqueezy 设置中添加 Webhook URL：
   ```
   https://your-project.cloudfunctions.net/lemonsqueezyWebhook
   ```
2. 选择以下事件：
   - `order_created`
   - `subscription_created`
   - `subscription_updated`
   - `subscription_cancelled`
   - `subscription_resumed`
   - `subscription_expired`
   - `subscription_paused`
   - `subscription_unpaused`
3. 生成并保存 Webhook Secret

### 3. 数据库设置

#### 3.1 运行数据库迁移
```bash
# 确保已经运行了积分系统的数据库迁移
# 参考 database/MIGRATION_README.md
```

#### 3.2 验证数据库函数
确保以下 Supabase 函数已正确创建：
- `get_user_credit_details(user_uuid)`
- `add_credits(user_uuid, credits_amount, credit_source, description)`
- `consume_credits(user_uuid, credits_amount, analysis_description, analysis_id)`
- `refund_credits(user_uuid, credits_amount, refund_reason, original_analysis_id)`
- `check_trial_credits(fingerprint_hash_param, required_credits)`
- `consume_trial_credits(fingerprint_hash_param, credits_amount, analysis_description, analysis_id)`
- `refund_trial_credits(fingerprint_hash_param, credits_amount, refund_reason, original_analysis_id)`

### 4. 云函数部署

#### 4.1 部署 Webhook 处理函数
```bash
cd cloud-functions
npm install
npm run deploy
```

#### 4.2 验证部署
测试 webhook 端点是否正常响应：
```bash
curl -X POST https://your-project.cloudfunctions.net/lemonsqueezyWebhook \
  -H "Content-Type: application/json" \
  -d '{"test": "ping"}'
```

### 5. 前端集成

#### 5.1 更新组件引用
确保以下组件正确引用了积分系统：

**src/components/AnalyzeApp.tsx**
```tsx
import { useCredit, useTrialCredit } from '../contexts/CreditContext';
import { AudioDurationDetector } from '../utils/audioDurationDetector';

// 在分析前检查积分
const { credits, consumeCredits, consumeTrialCredits } = useCredit();
const { checkTrialCredits } = useTrialCredit();
```

**src/pages/pricing.astro**
```tsx
import { lemonsqueezyService } from '../services/lemonsqueezyService';

// 确保支付按钮调用正确的服务
```

#### 5.2 添加 CreditProvider 到应用根部
**src/layouts/Layout.astro**
```tsx
import { CreditProvider } from '../contexts/CreditContext';

// 确保 CreditProvider 包装了整个应用
<CreditProvider>
  <AuthProvider>
    <!-- 你的应用内容 -->
  </AuthProvider>
</CreditProvider>
```

### 6. 测试验证

#### 6.1 运行单元测试
```bash
npm run test:run
```

#### 6.2 手动测试流程
1. **试用用户流程**：
   - 访问应用（未登录状态）
   - 尝试分析音频（应该消耗试用积分）
   - 验证试用积分余额

2. **注册用户流程**：
   - 注册新账户
   - 验证试用积分是否迁移到用户账户
   - 检查月度积分是否正确发放

3. **购买流程**：
   - 点击购买按钮
   - 完成支付（使用 Lemonsqueezy 测试模式）
   - 验证积分是否正确添加

4. **消费流程**：
   - 上传音频文件
   - 验证积分预估是否正确
   - 完成分析，验证积分是否正确扣除

### 7. 监控和日志

#### 7.1 设置错误监控
```bash
# 在云函数中添加错误监控
# 检查 Firebase Functions 日志
firebase functions:log
```

#### 7.2 监控关键指标
- 积分消费准确性
- 支付成功率
- Webhook 处理成功率
- 试用积分迁移成功率

## 🚨 常见问题排查

### 问题 1: Webhook 未触发
**解决方案**：
1. 检查 Lemonsqueezy Webhook URL 配置
2. 验证 Webhook Secret 是否正确
3. 查看云函数日志

### 问题 2: 积分计算不准确
**解决方案**：
1. 检查 `AudioDurationDetector.calculateCreditsRequired()` 逻辑
2. 验证音频时长检测是否正确
3. 运行相关单元测试

### 问题 3: 支付后积分未到账
**解决方案**：
1. 检查 Webhook 处理日志
2. 验证变体 ID 映射是否正确
3. 检查数据库函数执行结果

### 问题 4: 试用积分迁移失败
**解决方案**：
1. 检查设备指纹生成是否正常
2. 验证用户登录状态
3. 查看迁移相关日志

## 📋 部署检查清单

- [ ] 环境变量已配置
- [ ] Lemonsqueezy 产品和 Webhook 已设置
- [ ] 数据库迁移已完成
- [ ] 云函数已部署
- [ ] 前端组件已集成
- [ ] 单元测试通过
- [ ] 手动测试流程验证
- [ ] 监控和日志已设置

## 🎯 下一步

完成上述设置后，你的积分系统就可以正常运行了。建议：

1. 先在测试环境完整验证所有流程
2. 逐步开放给小部分用户测试
3. 监控系统运行状况
4. 根据用户反馈优化体验

如果遇到问题，可以参考测试文件中的示例代码，或查看相关组件的实现细节。