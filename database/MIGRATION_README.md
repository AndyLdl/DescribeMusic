# 数据迁移指南：从次数制到积分制系统

本文档详细说明了如何将现有的使用次数限制系统迁移到新的积分制系统。

## 概述

积分制系统将基于音频时长计算积分消费（1秒=1积分），替代原有的固定次数限制。这种方式更加灵活和公平，用户可以根据实际使用的音频时长付费。

### 迁移内容

- **用户数据**：将剩余使用次数转换为等价积分
- **设备指纹**：将试用次数转换为试用积分
- **历史记录**：保持完整性，添加积分交易记录
- **兼容性**：确保现有代码继续工作

## 迁移前准备

### 1. 环境要求

- PostgreSQL 12+ (Supabase)
- 数据库管理员权限
- 足够的存储空间（建议预留20%额外空间）

### 2. 备份数据

```sql
-- 创建完整数据库备份
pg_dump -h your-host -U your-user -d your-database > backup_before_migration.sql

-- 或者在Supabase控制台中创建备份
```

### 3. 停止应用服务

确保在迁移期间没有新的数据写入：
- 停止前端应用
- 停止云函数
- 通知用户系统维护

### 4. 验证当前数据

```sql
-- 检查当前用户数量
SELECT COUNT(*) FROM user_profiles WHERE deleted_at IS NULL;

-- 检查设备指纹数量
SELECT COUNT(*) FROM device_fingerprints WHERE deleted_at IS NULL;

-- 检查使用记录
SELECT COUNT(*) FROM usage_logs;
```

## 迁移步骤

### 第一步：创建积分系统表结构

```sql
-- 在Supabase SQL编辑器中执行
\i database/credit-system-schema.sql
```

这将创建以下表：
- `user_credits` - 用户积分表
- `subscriptions` - 订阅表
- `credit_transactions` - 积分交易表
- `payment_records` - 支付记录表

### 第二步：执行完整迁移

```sql
-- 执行完整迁移脚本
\i database/execute-complete-migration.sql
```

此脚本将：
1. 创建迁移基础设施
2. 记录迁移前数据快照
3. 执行用户数据迁移
4. 执行设备指纹数据迁移
5. 验证数据完整性
6. 创建兼容性视图
7. 生成迁移报告

### 第三步：验证迁移结果

```sql
-- 查看迁移摘要
SELECT * FROM migration_validation_summary;

-- 查看详细验证报告
SELECT * FROM generate_validation_report();

-- 检查是否有严重问题
SELECT * FROM migration_validation_report 
WHERE severity = 'CRITICAL' AND status = 'FAIL';
```

### 第四步：修复数据问题（如需要）

```sql
-- 修复负积分余额
SELECT repair_negative_credit_balances();

-- 修复设备积分不一致
SELECT repair_device_credit_inconsistency();

-- 清理孤立记录
SELECT cleanup_orphaned_credit_records();
```

## 迁移规则

### 用户积分转换

- **剩余月度次数** → 积分（每次 = 180积分）
- **基础月度积分** → 200积分
- **试用积分** → 0积分（注册用户不需要）

示例：
```
用户A：月度限制10次，已使用3次
剩余次数：7次
转换积分：7 × 180 + 200 = 1460积分
```

### 设备指纹转换

- **试用次数** → 积分消费（每次 = 180积分）
- **初始试用积分** → 100积分
- **剩余积分** → 100 - (试用次数 × 180)

示例：
```
设备B：已试用2次
消费积分：2 × 180 = 360积分
剩余积分：100 - 360 = -260积分 → 0积分（最小值保护）
```

## 验证检查项

### 数据完整性检查

- ✅ 用户数量一致性
- ✅ 设备数量一致性
- ✅ 无负积分余额
- ✅ 积分计算正确性
- ✅ 交易记录完整性

### 业务逻辑检查

- ✅ 积分余额合理性
- ✅ 订阅状态一致性
- ✅ 历史记录保持完整
- ✅ 兼容性视图正常工作

### 跨表一致性检查

- ✅ 用户-积分关联正确
- ✅ 设备-交易关联正确
- ✅ 无孤立记录

## 回滚计划

如果迁移失败，可以按以下步骤回滚：

### 1. 立即回滚

```sql
-- 恢复备份数据
psql -h your-host -U your-user -d your-database < backup_before_migration.sql
```

### 2. 部分回滚

```sql
-- 删除积分系统表（保留原有数据）
DROP TABLE IF EXISTS credit_transactions CASCADE;
DROP TABLE IF EXISTS payment_records CASCADE;
DROP TABLE IF EXISTS subscriptions CASCADE;
DROP TABLE IF EXISTS user_credits CASCADE;

-- 移除设备指纹表的积分字段
ALTER TABLE device_fingerprints 
DROP COLUMN IF EXISTS trial_credits,
DROP COLUMN IF EXISTS credits_used;
```

### 3. 清理迁移数据

```sql
-- 清理迁移相关表
DROP TABLE IF EXISTS migration_log CASCADE;
DROP TABLE IF EXISTS migration_validation_report CASCADE;
DROP TABLE IF EXISTS data_repair_log CASCADE;
DROP TABLE IF EXISTS pre_migration_snapshot CASCADE;
DROP TABLE IF EXISTS migration_status CASCADE;
```

## 迁移后配置

### 1. 更新应用配置

更新以下配置文件以使用积分系统：

```typescript
// src/contexts/CreditContext.tsx
// 确保积分系统已正确集成

// src/utils/creditCalculator.ts
// 验证积分计算逻辑

// cloud-functions/src/functions/analyzeAudio.ts
// 更新云函数使用积分验证
```

### 2. 更新环境变量

```bash
# .env
ENABLE_CREDIT_SYSTEM=true
CREDITS_PER_SECOND=1
TRIAL_CREDITS=100
MONTHLY_CREDITS=200
```

### 3. 重启服务

按以下顺序重启服务：
1. 数据库连接池
2. 云函数
3. 前端应用

### 4. 监控系统

监控以下指标：
- 积分消费率
- 支付成功率
- 系统响应时间
- 错误率

## 常见问题

### Q: 迁移需要多长时间？
A: 取决于数据量，通常每10万条记录需要5-10分钟。

### Q: 迁移期间用户能否使用系统？
A: 不能，建议在维护窗口期间执行迁移。

### Q: 如何处理迁移过程中的错误？
A: 脚本包含完整的错误处理和日志记录，可以根据错误信息进行修复。

### Q: 现有代码是否需要修改？
A: 不需要，迁移脚本创建了兼容性视图，现有代码可以继续工作。

### Q: 如何验证迁移是否成功？
A: 运行验证脚本并检查所有测试是否通过，特别关注CRITICAL级别的问题。

## 支持和联系

如果在迁移过程中遇到问题，请：

1. 查看迁移日志：`SELECT * FROM migration_log WHERE status = 'failed';`
2. 查看验证报告：`SELECT * FROM generate_validation_report();`
3. 检查错误详情：`SELECT * FROM migration_validation_report WHERE status = 'FAIL';`

## 文件清单

- `credit-system-schema.sql` - 积分系统表结构
- `migrate-user-data-to-credits.sql` - 用户数据迁移脚本
- `migrate-device-fingerprint-to-credits.sql` - 设备指纹迁移脚本
- `validate-migration-integrity.sql` - 数据完整性验证脚本
- `execute-complete-migration.sql` - 完整迁移执行脚本
- `MIGRATION_README.md` - 本文档

## 版本历史

- v1.0.0 - 初始版本，支持从次数制到积分制的完整迁移
- 包含用户数据、设备指纹、验证和修复功能
- 提供完整的兼容性支持和回滚机制