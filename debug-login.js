// 简单的登录测试脚本
// 在浏览器控制台中运行这个脚本来测试登录

async function testLogin() {
    const { createClient } = await import('@supabase/supabase-js');

    const supabaseUrl = 'https://fsmgroeytsburlgmoxcj.supabase.co';
    const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZzbWdyb2V5dHNidXJsZ21veGNqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc5MzUwMjQsImV4cCI6MjA3MzUxMTAyNH0.z6T4B5HtUuLoQD-hmSNJEWCmoXCM0_pNoy5MlaC49ok';

    const supabase = createClient(supabaseUrl, supabaseKey);

    // 替换为你的测试邮箱和密码
    const email = 'your-email@example.com';
    const password = 'your-password';

    console.log('Testing login with:', email);

    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error) {
            console.error('Login error:', error);
            console.error('Error code:', error.status);
            console.error('Error message:', error.message);
        } else {
            console.log('Login successful:', data);
        }
    } catch (err) {
        console.error('Unexpected error:', err);
    }
}

// 使用方法：
// 1. 在浏览器控制台中粘贴这个脚本
// 2. 修改 email 和 password 为你的测试账户
// 3. 运行 testLogin()
console.log('Login test script loaded. Modify email/password and run testLogin()');