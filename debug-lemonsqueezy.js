#!/usr/bin/env node

/**
 * Lemonsqueezy 调试工具
 * 用于验证 API Key、变体 ID 和产品配置
 */

// 配置信息 - 请替换为你的真实值
const CONFIG = {
    API_KEY: "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiI5NGQ1OWNlZi1kYmI4LTRlYTUtYjE3OC1kMjU0MGZjZDY5MTkiLCJqdGkiOiJjZWY4MDU1Y2E2NzI4YjM3NzAxMTU5MzEwYzkzNmQ0YjA2OGI3OWQ1MDFkODNhYTAxYjAyN2I3N2RjYjkzYTBlNWVmMWM3YWMzZjA0ODBkYyIsImlhdCI6MTc1ODIxNDU0Ny43NTY3OTYsIm5iZiI6MTc1ODIxNDU0Ny43NTY3OTksImV4cCI6MjA3Mzc0NzM0Ny43NDM0NCwic3ViIjoiMTkxNDAxMSIsInNjb3BlcyI6W119.as4QEOlT0uK1bOQC8C464bjvdgH4Icsf0MZMLLps4L2aVPnnVdqInbQYQG-x_PGJwY2qPdugjm1zPorVEFDdyboqMJKWLshEA-j8mXbcZeSu91u05YKKT5vE1ekZTvDrvMN8QAtQNvJ6mZLqWlpasHDOdbZYHM9uwjSYa4-zRMYbjVvEHtB0tJtRF1U8NxlUGnRkGmqWLITx-b-xb5XNjF2Pe-Y85SJJhyU0Sf0K1nfjWvKNebzYoMfwuCHXUdEjVsJvLcrZwNuLRO47YOIGwXJISQa2mqAx2PqONNs37QKz4ACWy6mPSRaz59XhTZueIHz8rqMn5adAQ6oApaEMGvcVpToAGfZknIqKpm5nt0JakFTFCEfGfKDGskpsDDXIyyxaUhVRF87xXNkM7mP7PXRcW4BsJ3EM1H_nj7VzQ194JUFDISc-nQuIefQDnTIShYLKCaMbAfuo_J6GfHUYGrEO11ryljU5q95_Mj5M6ztdjuPDKHkUCURDd7d2rtpX", // 替换为你的真实 API Key
    STORE_ID: "76046",
    VARIANTS: [
        { id: '999961', name: 'Basic Plan' },
        { id: '999967', name: 'Pro Plan' },
        { id: '999981', name: 'Premium Plan' }
    ]
};

// 颜色输出
const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
    console.log(colors[color] + message + colors.reset);
}

// 测试 API Key 是否有效
async function testApiKey() {
    log('\n🔍 测试 API Key...', 'cyan');

    try {
        const response = await fetch('https://api.lemonsqueezy.com/v1/users/me', {
            headers: {
                'Authorization': `Bearer ${CONFIG.API_KEY}`,
                'Accept': 'application/vnd.api+json'
            }
        });

        const data = await response.json();

        if (response.ok) {
            log('✅ API Key 有效！', 'green');
            log(`   用户: ${data.data.attributes.name}`, 'blue');
            log(`   邮箱: ${data.data.attributes.email}`, 'blue');
            return true;
        } else {
            log('❌ API Key 无效', 'red');
            log(`   状态码: ${response.status}`, 'red');
            log(`   错误: ${JSON.stringify(data, null, 2)}`, 'red');
            return false;
        }
    } catch (error) {
        log('❌ API Key 测试失败', 'red');
        log(`   错误: ${error.message}`, 'red');
        return false;
    }
}

// 获取店铺信息
async function getStores() {
    log('\n🏪 获取店铺信息...', 'cyan');

    try {
        const response = await fetch('https://api.lemonsqueezy.com/v1/stores', {
            headers: {
                'Authorization': `Bearer ${CONFIG.API_KEY}`,
                'Accept': 'application/vnd.api+json'
            }
        });

        const data = await response.json();

        if (response.ok) {
            log(`✅ 找到 ${data.data.length} 个店铺`, 'green');
            data.data.forEach(store => {
                log(`   📦 ${store.attributes.name} (ID: ${store.id})`, 'blue');
                log(`      域名: ${store.attributes.domain || '未设置'}`, 'blue');
                log(`      状态: ${store.attributes.status}`, 'blue');
            });
            return data.data;
        } else {
            log('❌ 获取店铺失败', 'red');
            log(`   错误: ${JSON.stringify(data, null, 2)}`, 'red');
            return [];
        }
    } catch (error) {
        log('❌ 获取店铺失败', 'red');
        log(`   错误: ${error.message}`, 'red');
        return [];
    }
}

// 获取产品和变体信息
async function getProductsAndVariants() {
    log('\n📦 获取产品和变体信息...', 'cyan');

    try {
        const response = await fetch(`https://api.lemonsqueezy.com/v1/products?filter[store_id]=${CONFIG.STORE_ID}`, {
            headers: {
                'Authorization': `Bearer ${CONFIG.API_KEY}`,
                'Accept': 'application/vnd.api+json'
            }
        });

        const data = await response.json();

        if (response.ok) {
            if (data.data.length === 0) {
                log('⚠️  没有找到任何产品', 'yellow');
                return;
            }

            log(`✅ 找到 ${data.data.length} 个产品`, 'green');

            for (const product of data.data) {
                log(`\n   📦 产品: ${product.attributes.name}`, 'magenta');
                log(`      ID: ${product.id}`, 'blue');
                log(`      状态: ${product.attributes.status}`, 'blue');
                log(`      价格: $${(product.attributes.price / 100).toFixed(2)}`, 'blue');

                // 获取变体信息
                try {
                    const variantsResponse = await fetch(`https://api.lemonsqueezy.com/v1/variants?filter[product_id]=${product.id}`, {
                        headers: {
                            'Authorization': `Bearer ${CONFIG.API_KEY}`,
                            'Accept': 'application/vnd.api+json'
                        }
                    });

                    const variantsData = await variantsResponse.json();

                    if (variantsResponse.ok && variantsData.data.length > 0) {
                        log(`      变体:`, 'blue');
                        variantsData.data.forEach(variant => {
                            log(`        🎯 ${variant.attributes.name}`, 'cyan');
                            log(`           ID: ${variant.id}`, 'blue');
                            log(`           价格: $${(variant.attributes.price / 100).toFixed(2)}`, 'blue');
                            log(`           状态: ${variant.attributes.status}`, 'blue');
                        });
                    } else {
                        log(`      ⚠️  没有找到变体`, 'yellow');
                    }
                } catch (error) {
                    log(`      ❌ 获取变体失败: ${error.message}`, 'red');
                }
            }
        } else {
            log('❌ 获取产品失败', 'red');
            log(`   错误: ${JSON.stringify(data, null, 2)}`, 'red');
        }
    } catch (error) {
        log('❌ 获取产品失败', 'red');
        log(`   错误: ${error.message}`, 'red');
    }
}

// 测试当前配置的变体 ID
async function testCurrentVariants() {
    log('\n🎯 测试当前配置的变体 ID...', 'cyan');

    for (const variant of CONFIG.VARIANTS) {
        try {
            const response = await fetch(`https://api.lemonsqueezy.com/v1/variants/${variant.id}`, {
                headers: {
                    'Authorization': `Bearer ${CONFIG.API_KEY}`,
                    'Accept': 'application/vnd.api+json'
                }
            });

            const data = await response.json();

            if (response.ok) {
                log(`✅ ${variant.name} (${variant.id}): 存在`, 'green');
                log(`   名称: ${data.data.attributes.name}`, 'blue');
                log(`   价格: $${(data.data.attributes.price / 100).toFixed(2)}`, 'blue');
                log(`   状态: ${data.data.attributes.status}`, 'blue');
            } else {
                log(`❌ ${variant.name} (${variant.id}): 不存在`, 'red');
                log(`   状态码: ${response.status}`, 'red');
                if (data.errors) {
                    data.errors.forEach(error => {
                        log(`   错误: ${error.detail}`, 'red');
                    });
                }
            }
        } catch (error) {
            log(`❌ ${variant.name} (${variant.id}): 请求失败`, 'red');
            log(`   错误: ${error.message}`, 'red');
        }
    }
}

// 创建测试 checkout
async function testCheckoutCreation() {
    log('\n💳 测试 Checkout 创建...', 'cyan');

    const testVariantId = CONFIG.VARIANTS[0].id; // 使用第一个变体测试

    try {
        const checkoutData = {
            data: {
                type: 'checkouts',
                attributes: {
                    checkout_options: {
                        embed: false,
                        media: false,
                        logo: true,
                        desc: true,
                        discount: true,
                        dark: false,
                        subscription_preview: true,
                        button_color: '#3B82F6'
                    },
                    checkout_data: {
                        email: 'test@example.com',
                        name: 'Test User',
                        custom: {
                            user_id: 'test_user_123',
                            plan_id: 'basic',
                            credits: '1200'
                        }
                    },
                    product_options: {
                        name: 'Test Checkout',
                        description: 'Test checkout creation',
                        media: [],
                        redirect_url: 'https://example.com/success',
                        receipt_button_text: 'Return to App',
                        receipt_link_url: 'https://example.com',
                        receipt_thank_you_note: 'Thank you for your test purchase!'
                    }
                },
                relationships: {
                    store: {
                        data: {
                            type: 'stores',
                            id: CONFIG.STORE_ID
                        }
                    },
                    variant: {
                        data: {
                            type: 'variants',
                            id: testVariantId
                        }
                    }
                }
            }
        };

        const response = await fetch('https://api.lemonsqueezy.com/v1/checkouts', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${CONFIG.API_KEY}`,
                'Accept': 'application/vnd.api+json',
                'Content-Type': 'application/vnd.api+json'
            },
            body: JSON.stringify(checkoutData)
        });

        const data = await response.json();

        if (response.ok) {
            log('✅ Checkout 创建成功！', 'green');
            log(`   Checkout ID: ${data.data.id}`, 'blue');
            log(`   支付链接: ${data.data.attributes.url}`, 'blue');
            log(`   过期时间: ${data.data.attributes.expires_at}`, 'blue');
        } else {
            log('❌ Checkout 创建失败', 'red');
            log(`   状态码: ${response.status}`, 'red');
            log(`   错误: ${JSON.stringify(data, null, 2)}`, 'red');
        }
    } catch (error) {
        log('❌ Checkout 创建失败', 'red');
        log(`   错误: ${error.message}`, 'red');
    }
}

// 主函数
async function main() {
    log('🚀 Lemonsqueezy 调试工具启动', 'magenta');
    log('================================', 'magenta');

    // 检查配置
    if (CONFIG.API_KEY === "你的API密钥") {
        log('❌ 请先在文件中设置你的 API Key！', 'red');
        log('   编辑 CONFIG.API_KEY 变量', 'yellow');
        return;
    }

    // 运行所有测试
    const apiValid = await testApiKey();
    if (!apiValid) {
        log('\n❌ API Key 无效，停止后续测试', 'red');
        return;
    }

    await getStores();
    await getProductsAndVariants();
    await testCurrentVariants();
    await testCheckoutCreation();

    log('\n✅ 调试完成！', 'green');
    log('================================', 'magenta');
}

// 如果是直接运行此文件
if (typeof window === 'undefined') {
    // Node.js 环境 - 使用动态 import
    (async () => {
        // Node.js 18+ 内置 fetch，不需要额外安装
        if (!globalThis.fetch) {
            const { default: fetch } = await import('node-fetch');
            globalThis.fetch = fetch;
        }
        await main();
    })().catch(console.error);
} else {
    // 浏览器环境
    window.debugLemonsqueezy = main;
    log('💡 在浏览器控制台运行: debugLemonsqueezy()', 'yellow');
}

export { main, testApiKey, getProductsAndVariants, testCurrentVariants };