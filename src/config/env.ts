/**
 * 环境变量配置
 * 确保环境变量正确加载
 */

// 从环境变量获取配置，带有回退值
export const ENV = {
    LEMONSQUEEZY_API_KEY: import.meta.env.VITE_LEMONSQUEEZY_API_KEY || '',
    LEMONSQUEEZY_STORE_ID: import.meta.env.VITE_LEMONSQUEEZY_STORE_ID || '',
    LEMONSQUEEZY_BASIC_VARIANT_ID: import.meta.env.VITE_LEMONSQUEEZY_BASIC_VARIANT_ID || '',
    LEMONSQUEEZY_PRO_VARIANT_ID: import.meta.env.VITE_LEMONSQUEEZY_PRO_VARIANT_ID || '',
    LEMONSQUEEZY_PREMIUM_VARIANT_ID: import.meta.env.VITE_LEMONSQUEEZY_PREMIUM_VARIANT_ID || '',
};

// 调试函数
export function debugEnv() {
    console.log('🔍 环境变量调试:', {
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