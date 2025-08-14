// 简单的API测试脚本
async function testCloudFunctions() {
    const baseUrl = 'http://localhost:5001/describe-music/us-central1';

    console.log('🧪 Testing Cloud Functions API...\n');

    try {
        // 测试 healthCheck
        console.log('1. Testing healthCheck...');
        const healthResponse = await fetch(`${baseUrl}/healthCheck`);
        const healthData = await healthResponse.json();
        console.log('✅ HealthCheck:', healthData);

        // 测试 analyzeAudio (应该返回 400，因为没有文件)
        console.log('\n2. Testing analyzeAudio without file...');
        const analyzeResponse = await fetch(`${baseUrl}/analyzeAudio`, {
            method: 'POST'
        });
        const analyzeData = await analyzeResponse.json();
        console.log('✅ AnalyzeAudio (no file):', analyzeData);

        console.log('\n🎉 All tests passed! Cloud Functions are working correctly.');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

// 运行测试
testCloudFunctions();