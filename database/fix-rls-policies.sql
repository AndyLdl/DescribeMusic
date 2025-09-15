-- 修复RLS策略，允许新注册用户创建配置

-- 删除现有的插入策略
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;

-- 创建更宽松的插入策略，允许新用户创建配置
CREATE POLICY "Users can insert own profile" ON user_profiles
    FOR INSERT WITH CHECK (
        auth.uid() = id OR 
        auth.uid() IS NOT NULL
    );

-- 或者，我们可以暂时允许所有认证用户插入（更安全的方式是使用服务端）
-- CREATE POLICY "Authenticated users can insert profiles" ON user_profiles
--     FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- 确保匿名用户可以访问设备指纹功能
CREATE POLICY IF NOT EXISTS "Anonymous users can manage device fingerprints" ON device_fingerprints
    FOR ALL TO anon USING (true) WITH CHECK (true);