-- 暂时禁用触发器来测试注册功能

-- 删除触发器（暂时）
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 删除有问题的函数
DROP FUNCTION IF EXISTS handle_new_user();

-- 注意：这意味着用户注册后需要手动创建user_profiles记录
-- 我们可以在前端代码中处理这个逻辑