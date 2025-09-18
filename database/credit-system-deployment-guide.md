# 积分系统数据库部署指南

## 概述

本指南描述了如何在Supabase中部署积分系统的数据库基础设施。请按照以下顺序执行SQL脚本。

## 部署步骤

### 1. 准备工作

1. 登录到Supabase控制台
2. 选择你的项目
3. 进入SQL编辑器

### 2. 执行SQL脚本

按照以下顺序执行SQL脚本：

#### 步骤1：创建积分系统表结构
```bash
# 在Supabase SQL编辑器中执行
database/credit-system-schema.sql
```

这个脚本将创建：
- `user_credits` 表：存储用户积分信息
- `subscriptions` 表：管理订阅状态
- `credit_transactions` 表：记录积分交易
- `payment_records` 表：存储支付记录
- 扩展现有 `device_fingerprints` 表支持积分制
- 相关索引和触发器

#### 步骤2：创建积分操作函数
```bash
# 在Supabase SQL编辑器中执行
database/credit-system-functions.sql
```

这个脚本将创建：
- `consume_credits()` 函数：处理积分消费
- `consume_trial_credits()` 函数：处理试用积分消费
- `add_credits()` 函数：处理积分添加
- `reset_monthly_credits()` 函数：处理月度重置
- `refund_credits()` 函数：处理积分退款
- 其他辅助查询函数

#### 步骤3：配置安全策略
```bash
# 在Supabase SQL编辑器中执行
database/credit-system-rls-policies.sql
```

这个脚本将创建：
- Row Level Security (RLS) 策略
- 安全函数（绕过RLS进行必要操作）
- 用户权限设置
- 管理员查询函数

### 3. 验证部署

执行以下查询验证部署是否成功：

```sql
-- 检查表是否创建成功
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('user_credits', 'subscriptions', 'credit_transactions', 'payment_records');

-- 检查函数是否创建成功
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('consume_credits', 'add_credits', 'reset_monthly_credits');

-- 检查RLS是否启用
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('user_credits', 'subscriptions', 'credit_transactions', 'payment_records');
```

### 4. 初始化数据（可选）

如果需要为现有用户初始化积分数据，可以执行：

```sql
-- 为现有用户创建积分记录
INSERT INTO user_credits (id, credits, trial_credits, monthly_credits)
SELECT id, 200, 0, 200
FROM auth.users
WHERE id NOT IN (SELECT id FROM user_credits);

-- 更新现有设备指纹记录
UPDATE device_fingerprints 
SET trial_credits = 100, credits_used = trial_usage * 180
WHERE trial_credits IS NULL;
```

### 5. 设置定时任务（推荐）

#### 5.1 启用pg_cron扩展

首先需要在Supabase控制台中启用pg_cron扩展：

1. 进入Supabase控制台
2. 选择你的项目
3. 进入 Database → Extensions
4. 搜索并启用 "pg_cron" 扩展

#### 5.2 创建定时任务

启用扩展后，在SQL编辑器中执行以下定时任务：

```sql
-- 每月1号重置用户积分
SELECT cron.schedule('reset-monthly-credits', '0 0 1 * *', 'SELECT reset_monthly_credits();');

-- 每周清理过期交易记录
SELECT cron.schedule('cleanup-credit-transactions', '0 2 * * 0', 'SELECT cleanup_old_credit_transactions();');

-- 每月清理过期支付记录
SELECT cron.schedule('cleanup-payment-records', '0 3 1 * *', 'SELECT cleanup_old_payment_records();');
```

#### 5.3 验证定时任务

检查定时任务是否创建成功：

```sql
-- 查看所有定时任务
SELECT * FROM cron.job;

-- 查看定时任务执行历史
SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;
```

#### 5.4 手动执行维护任务（如果不使用定时任务）

如果你不想使用定时任务，可以手动执行维护函数：

```sql
-- 手动重置月度积分
SELECT reset_monthly_credits();

-- 手动清理过期交易记录
SELECT cleanup_old_credit_transactions();

-- 手动清理过期支付记录
SELECT cleanup_old_payment_records();
```

## 环境变量配置

确保在你的应用中配置以下环境变量：

```env
# Supabase配置
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Lemonsqueezy配置（后续任务中使用）
LEMONSQUEEZY_API_KEY=your_lemonsqueezy_api_key
LEMONSQUEEZY_STORE_ID=your_store_id
LEMONSQUEEZY_WEBHOOK_SECRET=your_webhook_secret
```

## 安全注意事项

1. **服务角色密钥**：仅在服务端使用，不要暴露给客户端
2. **RLS策略**：确保所有表都启用了RLS
3. **函数权限**：安全函数使用SECURITY DEFINER，需要谨慎管理
4. **数据验证**：所有输入都应该在函数中进行验证

## 监控和维护

### 监控查询

```sql
-- 查看积分系统统计
SELECT * FROM get_credit_system_stats();

-- 查看用户积分分布
SELECT 
  CASE 
    WHEN credits = 0 THEN '0 credits'
    WHEN credits <= 100 THEN '1-100 credits'
    WHEN credits <= 500 THEN '101-500 credits'
    WHEN credits <= 1000 THEN '501-1000 credits'
    ELSE '1000+ credits'
  END as credit_range,
  COUNT(*) as user_count
FROM user_credits
GROUP BY 1
ORDER BY 1;

-- 查看积分消费趋势
SELECT 
  DATE_TRUNC('day', created_at) as date,
  COUNT(*) as transactions,
  SUM(ABS(amount)) as total_credits
FROM credit_transactions
WHERE transaction_type = 'consume'
AND created_at >= NOW() - INTERVAL '30 days'
GROUP BY 1
ORDER BY 1;
```

### 维护任务

定期执行以下维护任务：

1. **数据清理**：清理过期的交易记录和支付记录
2. **索引维护**：检查和重建必要的索引
3. **统计更新**：更新表统计信息以优化查询性能
4. **备份验证**：确保数据备份正常工作

## 故障排除

### 常见问题

1. **RLS策略阻止访问**
   - 检查用户是否已认证
   - 验证策略是否正确配置
   - 使用服务角色进行管理操作

2. **函数执行失败**
   - 检查参数类型和值
   - 查看错误日志
   - 验证权限设置

3. **性能问题**
   - 检查索引使用情况
   - 分析慢查询
   - 考虑查询优化

4. **cron扩展错误**
   - 错误：`schema "cron" does not exist`
   - 解决：在Supabase控制台的Extensions页面启用pg_cron扩展
   - 或者跳过定时任务设置，使用手动执行方式

5. **触发器冲突**
   - 如果已存在handle_new_user触发器，可能会有冲突
   - 检查现有触发器：`SELECT * FROM information_schema.triggers WHERE event_object_table = 'users';`
   - 必要时修改触发器名称或合并逻辑

### 调试查询

```sql
-- 检查用户积分状态
SELECT * FROM get_user_credit_summary('user_uuid_here');

-- 检查设备试用积分
SELECT * FROM check_device_credit_balance('device_fingerprint_here');

-- 查看最近的积分交易
SELECT * FROM credit_transactions 
WHERE created_at >= NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;
```

## 完成

数据库基础设施部署完成后，你可以继续实施积分系统的其他组件，如前端界面、支付集成等。

确保在生产环境部署前进行充分的测试，包括：
- 单元测试所有数据库函数
- 集成测试完整的积分流程
- 性能测试高并发场景
- 安全测试RLS策略和权限设置