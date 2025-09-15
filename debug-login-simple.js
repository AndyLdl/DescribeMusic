// 简单的登录调试工具 - 在浏览器控制台中运行

// 直接测试登录API
async function testLogin(email, password) {
    console.log('=== 测试登录 ===');
    console.log('Email:', email);

    try {
        const response = await fetch('https://fsmgroeytsburlgmoxcj.supabase.co/auth/v1/token?grant_type=password', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZzbWdyb2V5dHNidXJsZ21veGNqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc5MzUwMjQsImV4cCI6MjA3MzUxMTAyNH0.z6T4B5HtUuLoQD-hmSNJEWCmoXCM0_pNoy5MlaC49ok'
            },
            body: JSON.stringify({
                email: email,
                password: password
            })
        });

        console.log('Response status:', response.status);

        const result = await response.text();
        console.log('Response body:', result);

        if (!response.ok) {
            try {
                const errorData = JSON.parse(result);
                console.error('详细错误信息:', errorData);

                // 分析常见错误
                if (errorData.error_description) {
                    console.log('错误描述:', errorData.error_description);
                }
                if (errorData.error) {
                    console.log('错误类型:', errorData.error);
                }
            } catch (e) {
                console.error('无法解析错误响应:', result);
            }
        } else {
            console.log('✅ 登录成功!');
        }

    } catch (error) {
        console.error('网络错误:', error);
    }
}

console.log('=== 登录调试工具已加载 ===');
console.log('使用方法: testLogin("your-email@example.com", "your-password")');
console.log('请替换为你的实际邮箱和密码');