import React, { useEffect, useState } from 'react';

export default function EnvTest() {
    const [envData, setEnvData] = useState<any>(null);

    useEffect(() => {
        // 直接读取环境变量
        const rawEnv = {
            VITE_LEMONSQUEEZY_API_KEY: import.meta.env.VITE_LEMONSQUEEZY_API_KEY,
            VITE_LEMONSQUEEZY_STORE_ID: import.meta.env.VITE_LEMONSQUEEZY_STORE_ID,
            VITE_LEMONSQUEEZY_BASIC_VARIANT_ID: import.meta.env.VITE_LEMONSQUEEZY_BASIC_VARIANT_ID,
            VITE_LEMONSQUEEZY_PRO_VARIANT_ID: import.meta.env.VITE_LEMONSQUEEZY_PRO_VARIANT_ID,
            VITE_LEMONSQUEEZY_PREMIUM_VARIANT_ID: import.meta.env.VITE_LEMONSQUEEZY_PREMIUM_VARIANT_ID,
        };

        // 处理后的环境变量
        const processedEnv = {
            LEMONSQUEEZY_API_KEY: rawEnv.VITE_LEMONSQUEEZY_API_KEY || '',
            LEMONSQUEEZY_STORE_ID: rawEnv.VITE_LEMONSQUEEZY_STORE_ID || '',
            LEMONSQUEEZY_BASIC_VARIANT_ID: rawEnv.VITE_LEMONSQUEEZY_BASIC_VARIANT_ID || '',
            LEMONSQUEEZY_PRO_VARIANT_ID: rawEnv.VITE_LEMONSQUEEZY_PRO_VARIANT_ID || '',
            LEMONSQUEEZY_PREMIUM_VARIANT_ID: rawEnv.VITE_LEMONSQUEEZY_PREMIUM_VARIANT_ID || '',
        };

        // 配置检查
        const isConfigured = !!(processedEnv.LEMONSQUEEZY_API_KEY && processedEnv.LEMONSQUEEZY_STORE_ID);

        const data = {
            rawEnv,
            processedEnv,
            isConfigured,
            checks: {
                hasApiKey: !!processedEnv.LEMONSQUEEZY_API_KEY,
                apiKeyLength: processedEnv.LEMONSQUEEZY_API_KEY?.length || 0,
                hasStoreId: !!processedEnv.LEMONSQUEEZY_STORE_ID,
                storeId: processedEnv.LEMONSQUEEZY_STORE_ID,
            },
            allEnv: import.meta.env
        };

        setEnvData(data);

        // 控制台输出
        console.log('🔍 前端环境变量测试:', data);
    }, []);

    if (!envData) {
        return <div>加载中...</div>;
    }

    return (
        <div style={{
            padding: '20px',
            fontFamily: 'monospace',
            backgroundColor: '#1a1a1a',
            color: '#fff',
            minHeight: '100vh'
        }}>
            <h1>🔍 前端环境变量测试</h1>

            <div style={{
                padding: '10px',
                margin: '10px 0',
                backgroundColor: envData.isConfigured ? '#0f5132' : '#842029',
                borderRadius: '5px'
            }}>
                <h2>配置状态: {envData.isConfigured ? '✅ 正常' : '❌ 异常'}</h2>
            </div>

            <div style={{ marginBottom: '20px' }}>
                <h3>📋 原始环境变量 (import.meta.env)</h3>
                <pre style={{
                    backgroundColor: '#2a2a2a',
                    padding: '15px',
                    borderRadius: '5px',
                    overflow: 'auto'
                }}>
                    {JSON.stringify(envData.rawEnv, null, 2)}
                </pre>
            </div>

            <div style={{ marginBottom: '20px' }}>
                <h3>🔧 处理后的环境变量</h3>
                <pre style={{
                    backgroundColor: '#2a2a2a',
                    padding: '15px',
                    borderRadius: '5px',
                    overflow: 'auto'
                }}>
                    {JSON.stringify(envData.processedEnv, null, 2)}
                </pre>
            </div>

            <div style={{ marginBottom: '20px' }}>
                <h3>🧪 检查结果</h3>
                <ul>
                    <li>API Key 存在: {envData.checks.hasApiKey ? '✅' : '❌'}</li>
                    <li>API Key 长度: {envData.checks.apiKeyLength}</li>
                    <li>Store ID 存在: {envData.checks.hasStoreId ? '✅' : '❌'}</li>
                    <li>Store ID 值: {envData.checks.storeId}</li>
                    <li>配置完整: {envData.isConfigured ? '✅' : '❌'}</li>
                </ul>
            </div>

            <div style={{ marginBottom: '20px' }}>
                <h3>🌍 所有环境变量</h3>
                <pre style={{
                    backgroundColor: '#2a2a2a',
                    padding: '15px',
                    borderRadius: '5px',
                    overflow: 'auto',
                    maxHeight: '300px'
                }}>
                    {JSON.stringify(envData.allEnv, null, 2)}
                </pre>
            </div>

            {!envData.isConfigured && (
                <div style={{
                    padding: '15px',
                    backgroundColor: '#664d03',
                    borderRadius: '5px',
                    marginTop: '20px'
                }}>
                    <h3>⚠️ 修复建议</h3>
                    <ol>
                        <li>检查 .env 文件中的环境变量设置</li>
                        <li>确保所有变量都以 VITE_ 开头</li>
                        <li>重启开发服务器</li>
                        <li>清除浏览器缓存</li>
                    </ol>
                </div>
            )}
        </div>
    );
}