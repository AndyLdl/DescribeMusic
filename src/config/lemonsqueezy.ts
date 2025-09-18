/**
 * Lemonsqueezy 配置
 * 从环境变量读取配置，带有回退值处理长 API Key 的问题
 */

// 完整的 API Key（作为回退值，解决环境变量截断问题）
const FALLBACK_API_KEY = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiI5NGQ1OWNlZi1kYmI4LTRlYTUtYjE3OC1kMjU0MGZjZDY5MTkiLCJqdGkiOiJmYmU3MGY5ZWM1MjU4NDk5ODQxN2MwYmI4ZGMwNGNkNTAyNjE4ZjZjNGMyNGZhOTVjZWM4YTdlNDIzMTg0YmVjZTFkNTZmNDcwMDA1ZmY0OCIsImlhdCI6MTc1ODIxMTA1MC41OTczMywibmJmIjoxNzU4MjExMDUwLjU5NzMzMywiZXhwIjoyMDczNzQzODUwLjU4MzY1Nywic3ViIjoiMTkxNDAxMSIsInNjb3BlcyI6W119.hsPmFmsOR90qrelGh-asOyUa_PwrafHiAwNEvQGICAHvwEwgaAsfjfr3Hg-nb3mrNrBoHxH7FAomJShZdxAZC1wWQMgTN48O33DUrmrS2OaxLc1hs19YDVT-YsZmGkkaV9z8Lquycs87id9sklMnILzIZK1xQOzarxzWrmXxJoUb7yVCDWje9wtuVD2mqf3TGFBhS9AAWV3IURZnsy9NEXkzaBgZDb7HkFIU0iwachuX-Hpxt1MHuL0HGi1RIfFcYOoHbaAPnv1TPWyeeC9OFagN3GNm6NsgsG3Hrq2250JaaebVojfyES6ErP4AW6YI515g2FEBEVZmoM4IFBU-2Aw6i7iWpLMFhp48fk9wJI8DokY0hjjWUCy2mhy33n7oewqnu3IqsCmw8Vdy5_zCgkEKHDXTC7lDUaO_NEeL2Cu21mNkZj93qrmyahpj-aDan0CtUdZEFf6eoCh5wrSYqBn4klg1hiafyglTW1SKtAB4Gj-eZ7Pd-UIlKJmRlMy3';

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