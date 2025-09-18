/**
 * Lemonsqueezy 配置
 * 从环境变量读取配置，带有回退值处理长 API Key 的问题
 */

// 完整的 API Key（作为回退值，解决环境变量截断问题）
const FALLBACK_API_KEY = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiI5NGQ1OWNlZi1kYmI4LTRlYTUtYjE3OC1kMjU0MGZjZDY5MTkiLCJqdGkiOiJkNTQzZmJmOGIxMTdkZjdmODI5MTFiMzI4NTRlYWQ0MjBmNjdkNDk5Y2RlYjU5ZTVkMDg1ZTBmOTE5NTVhNWUyN2MzODRiYzlmODU1MjllMCIsImlhdCI6MTc1Nzk5OTg1Ni44NzMxNTMsIm5iZiI6MTc1Nzk5OTg1Ni44NzMxNTYsImV4cCI6MjA3MzUzMjY1Ni44NTE3MjQsInN1YiI6IjE5MTQwMTEiLCJzY29wZXMiOltdfQ.QaX1W8waHys5KuCgR0TusrmFuAOm9p7dyTq_hH06X0f8VlWbH1x8451DLHTkn2KrEOoKLYSXuMPM3Mf20PKIGk5-9dQFnW4WB7elbe3picWemj4jkviTsQEzmcH4haqyypLfqscNXhxFcRjSyOdYBHmcJU2A83Sl5aDYhynICAXf_BLPttmGy7gMTI9Q7-PmLkz_HgxEHSawgWrDppL1hI8sNI_CgyiX-9J6brLOHmYfrTpHxokd916KjBFtxI7XSQ9SykejsVgGtfo6IC7DgPnu8QcSKATmvJ7OgbpT6uE3LBwCdnH0UGMi-CQQeTO04VPeeCqoJNAAuU75rC9rPcwAetVEVXtwSkiSJSQ5U5kr8lHTd3n8SU2BpwWEXDSajx_rWdxW5da-CcFDyTcyPGlGedH-F8SY85EAYRjt7-JU2ekP19yV7HCHyPwxbP4VFigGhw7kfGX8as2kjrJHBDKfUHNsdExEs-u3aJuVg7L2lTxLu-NGhSsQ7X1eBcsY';

// 从环境变量获取配置，带有回退值
export const ENV = {
    LEMONSQUEEZY_API_KEY: (() => {
        const envApiKey = import.meta.env.VITE_LEMONSQUEEZY_API_KEY;
        // 检查环境变量是否完整（应该是 864 字符）
        if (envApiKey && envApiKey.length >= 800) {
            return envApiKey;
        }
        // 如果环境变量不完整或不存在，使用回退值
        console.warn('⚠️ 使用回退 API Key，环境变量可能被截断');
        return FALLBACK_API_KEY;
    })(),
    LEMONSQUEEZY_STORE_ID: import.meta.env.VITE_LEMONSQUEEZY_STORE_ID || '76046',
    LEMONSQUEEZY_BASIC_VARIANT_ID: import.meta.env.VITE_LEMONSQUEEZY_BASIC_VARIANT_ID || '999977',
    LEMONSQUEEZY_PRO_VARIANT_ID: import.meta.env.VITE_LEMONSQUEEZY_PRO_VARIANT_ID || '999980',
    LEMONSQUEEZY_PREMIUM_VARIANT_ID: import.meta.env.VITE_LEMONSQUEEZY_PREMIUM_VARIANT_ID || '999981',
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