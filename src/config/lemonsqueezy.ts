/**
 * Lemonsqueezy 配置
 * 从环境变量读取配置
 */

// 从环境变量获取配置
export const ENV = {
    LEMONSQUEEZY_API_KEY: (() => {
        const envApiKey = import.meta.env.VITE_LEMONSQUEEZY_API_KEY;
        if (!envApiKey) {
            throw new Error('VITE_LEMONSQUEEZY_API_KEY environment variable is required');
        }
        return envApiKey;
    })(),
    LEMONSQUEEZY_STORE_ID: import.meta.env.VITE_LEMONSQUEEZY_STORE_ID || '76046',
    LEMONSQUEEZY_BASIC_VARIANT_ID: import.meta.env.VITE_LEMONSQUEEZY_BASIC_VARIANT_ID || '999961',
    LEMONSQUEEZY_PRO_VARIANT_ID: import.meta.env.VITE_LEMONSQUEEZY_PRO_VARIANT_ID || '999967',
    LEMONSQUEEZY_PREMIUM_VARIANT_ID: import.meta.env.VITE_LEMONSQUEEZY_PREMIUM_VARIANT_ID || '999967',
};

// 调试函数
export function debugEnv() {
    console.log('🔍 Lemonsqueezy 配置调试:', {
        raw: {
            VITE_LEMONSQUEEZY_API_KEY: import.meta.env.VITE_LEMONSQUEEZY_API_KEY,
            VITE_LEMONSQUEEZY_STORE_ID: import.meta.env.VITE_LEMONSQUEEZY_STORE_ID,
            VITE_LEMONSQUEEZY_BASIC_VARIANT_ID: import.meta.env.VITE_LEMONSQUEEZY_BASIC_VARIANT_ID,
        },
        processed: ENV,
        allEnv: import.meta.env
    });
}

// 检查配置是否完整
export function isLemonsqueezyConfigured(): boolean {
    return !!(ENV.LEMONSQUEEZY_API_KEY && ENV.LEMONSQUEEZY_STORE_ID);
}

// 获取变体 ID
export function getVariantId(planId: 'basic' | 'pro' | 'premium'): string {
    switch (planId) {
        case 'basic':
            return ENV.LEMONSQUEEZY_BASIC_VARIANT_ID;
        case 'pro':
            return ENV.LEMONSQUEEZY_PRO_VARIANT_ID;
        case 'premium':
            return ENV.LEMONSQUEEZY_PREMIUM_VARIANT_ID;
        default:
            return '';
    }
}