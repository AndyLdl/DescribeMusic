-- 检查用户认证状态的查询

-- 查看所有用户的认证状态（需要在Supabase SQL编辑器中运行）
SELECT 
    id,
    email,
    created_at,
    email_confirmed_at,
    last_sign_in_at,
    CASE 
        WHEN email_confirmed_at IS NULL THEN '未确认邮箱'
        ELSE '已确认邮箱'
    END as status
FROM auth.users
ORDER BY created_at DESC;

-- 查看用户配置表
SELECT * FROM user_profiles ORDER BY created_at DESC;