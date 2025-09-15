-- 创建服务端函数来创建用户配置，绕过RLS限制

CREATE OR REPLACE FUNCTION create_user_profile(user_uuid UUID)
RETURNS BOOLEAN
SECURITY DEFINER -- 使用函数定义者的权限执行
SET search_path = public
AS $$
BEGIN
    -- 检查用户配置是否已存在
    IF EXISTS (SELECT 1 FROM user_profiles WHERE id = user_uuid) THEN
        RETURN true; -- 已存在，返回成功
    END IF;
    
    -- 创建用户配置记录
    INSERT INTO user_profiles (id, monthly_limit, current_month_usage, total_analyses)
    VALUES (user_uuid, 10, 0, 0);
    
    RETURN true;
EXCEPTION
    WHEN OTHERS THEN
        -- 如果出错，返回false
        RETURN false;
END;
$$ LANGUAGE plpgsql;

-- 授予执行权限
GRANT EXECUTE ON FUNCTION create_user_profile(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION create_user_profile(UUID) TO anon;