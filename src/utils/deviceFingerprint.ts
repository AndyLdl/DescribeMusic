/**
 * 设备指纹生成服务
 * 用于识别未注册用户的设备，管理试用次数限制
 */

import { sha256 } from 'js-sha256';
import { supabase } from '../lib/supabase';
import type { DeviceUsageStatus } from '../lib/supabase';

// 设备指纹组件接口
interface FingerprintComponents {
    screen: string;
    timezone: string;
    language: string;
    platform: string;
    canvas: string;
    webgl: string;
    audio: string;
    userAgent: string;
}

// 设备指纹缓存
let cachedFingerprint: string | null = null;
let fingerprintPromise: Promise<string> | null = null;

export class DeviceFingerprint {
    private static readonly CACHE_KEY = 'device_fingerprint_cache';
    private static readonly CACHE_EXPIRY_KEY = 'device_fingerprint_expiry';
    private static readonly CACHE_DURATION = 24 * 60 * 60 * 1000; // 24小时

    /**
     * 生成设备指纹
     * 使用多种浏览器特征创建唯一标识
     */
    static async generate(): Promise<string> {
        // 如果已有缓存的指纹，直接返回
        if (cachedFingerprint) {
            return cachedFingerprint;
        }

        // 如果正在生成指纹，等待完成
        if (fingerprintPromise) {
            return fingerprintPromise;
        }

        // 检查本地存储的缓存
        const cached = this.getCachedFingerprint();
        if (cached) {
            cachedFingerprint = cached;
            return cached;
        }

        // 生成新的指纹
        fingerprintPromise = this.generateFingerprint();

        try {
            const fingerprint = await fingerprintPromise;
            cachedFingerprint = fingerprint;
            this.setCachedFingerprint(fingerprint);
            return fingerprint;
        } finally {
            fingerprintPromise = null;
        }
    }

    /**
     * 生成设备指纹的核心逻辑
     */
    private static async generateFingerprint(): Promise<string> {
        const components: FingerprintComponents = {
            screen: this.getScreenFingerprint(),
            timezone: this.getTimezoneFingerprint(),
            language: this.getLanguageFingerprint(),
            platform: this.getPlatformFingerprint(),
            canvas: await this.getCanvasFingerprint(),
            webgl: this.getWebGLFingerprint(),
            audio: await this.getAudioFingerprint(),
            userAgent: this.getUserAgentFingerprint()
        };

        // 组合所有组件
        const fingerprintString = Object.values(components).join('|');

        // 添加盐值增强安全性
        const salt = import.meta.env.VITE_DEVICE_FINGERPRINT_SALT || 'default-salt';
        const saltedFingerprint = `${fingerprintString}|${salt}`;

        // 生成SHA-256哈希
        return sha256(saltedFingerprint);
    }

    /**
     * 获取屏幕特征
     */
    private static getScreenFingerprint(): string {
        if (typeof window === 'undefined') return 'server';

        const screen = window.screen;
        return [
            screen.width,
            screen.height,
            screen.colorDepth,
            screen.pixelDepth,
            window.devicePixelRatio || 1
        ].join('x');
    }

    /**
     * 获取时区特征
     */
    private static getTimezoneFingerprint(): string {
        try {
            const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
            const offset = new Date().getTimezoneOffset();
            return `${timezone}:${offset}`;
        } catch {
            return 'unknown';
        }
    }

    /**
     * 获取语言特征
     */
    private static getLanguageFingerprint(): string {
        if (typeof navigator === 'undefined') return 'server';

        return [
            navigator.language,
            navigator.languages?.slice(0, 3).join(',') || '',
        ].join('|');
    }

    /**
     * 获取平台特征
     */
    private static getPlatformFingerprint(): string {
        if (typeof navigator === 'undefined') return 'server';

        return [
            navigator.platform,
            navigator.hardwareConcurrency || 0,
            navigator.maxTouchPoints || 0
        ].join('|');
    }

    /**
     * 获取Canvas指纹
     */
    private static async getCanvasFingerprint(): Promise<string> {
        if (typeof window === 'undefined') return 'server';

        try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            if (!ctx) return 'no-canvas';

            canvas.width = 200;
            canvas.height = 50;

            // 绘制文本
            ctx.textBaseline = 'top';
            ctx.font = '14px Arial';
            ctx.fillStyle = '#f60';
            ctx.fillRect(125, 1, 62, 20);
            ctx.fillStyle = '#069';
            ctx.fillText('Device Fingerprint 🎵', 2, 15);
            ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
            ctx.fillText('Audio Analysis', 4, 35);

            // 绘制几何图形
            ctx.globalCompositeOperation = 'multiply';
            ctx.fillStyle = 'rgb(255,0,255)';
            ctx.beginPath();
            ctx.arc(50, 25, 20, 0, Math.PI * 2, true);
            ctx.closePath();
            ctx.fill();

            // 获取canvas数据并生成哈希
            const dataURL = canvas.toDataURL();
            return sha256(dataURL).substring(0, 16); // 取前16位
        } catch {
            return 'canvas-error';
        }
    }

    /**
     * 获取WebGL指纹
     */
    private static getWebGLFingerprint(): string {
        if (typeof window === 'undefined') return 'server';

        try {
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');

            if (!gl) return 'no-webgl';

            const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
            const vendor = debugInfo ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) : '';
            const renderer = debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : '';

            return sha256(`${vendor}|${renderer}`).substring(0, 16);
        } catch {
            return 'webgl-error';
        }
    }

    /**
     * 获取音频上下文指纹
     */
    private static async getAudioFingerprint(): Promise<string> {
        if (typeof window === 'undefined') return 'server';

        try {
            // 创建音频上下文
            const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
            if (!AudioContext) return 'no-audio';

            const context = new AudioContext();

            // 创建振荡器
            const oscillator = context.createOscillator();
            const analyser = context.createAnalyser();
            const gainNode = context.createGain();
            const scriptProcessor = context.createScriptProcessor(4096, 1, 1);

            oscillator.type = 'triangle';
            oscillator.frequency.setValueAtTime(10000, context.currentTime);

            gainNode.gain.setValueAtTime(0, context.currentTime);

            oscillator.connect(analyser);
            analyser.connect(scriptProcessor);
            scriptProcessor.connect(gainNode);
            gainNode.connect(context.destination);

            oscillator.start(0);

            // 获取音频数据
            const audioData = new Float32Array(analyser.frequencyBinCount);
            analyser.getFloatFrequencyData(audioData);

            oscillator.stop();
            context.close();

            // 计算音频特征
            const sum = audioData.reduce((acc, val) => acc + Math.abs(val), 0);
            return sha256(sum.toString()).substring(0, 16);
        } catch {
            return 'audio-error';
        }
    }

    /**
     * 获取用户代理特征（部分信息）
     */
    private static getUserAgentFingerprint(): string {
        if (typeof navigator === 'undefined') return 'server';

        // 只使用用户代理的部分信息，避免过于具体
        const ua = navigator.userAgent;
        const parts = ua.match(/(Chrome|Firefox|Safari|Edge)\/[\d.]+/g) || [];
        return sha256(parts.join('|')).substring(0, 16);
    }

    /**
     * 从本地存储获取缓存的指纹
     */
    private static getCachedFingerprint(): string | null {
        if (typeof localStorage === 'undefined') return null;

        try {
            const cached = localStorage.getItem(this.CACHE_KEY);
            const expiry = localStorage.getItem(this.CACHE_EXPIRY_KEY);

            if (!cached || !expiry) return null;

            const expiryTime = parseInt(expiry, 10);
            if (Date.now() > expiryTime) {
                // 缓存已过期
                localStorage.removeItem(this.CACHE_KEY);
                localStorage.removeItem(this.CACHE_EXPIRY_KEY);
                return null;
            }

            return cached;
        } catch {
            return null;
        }
    }

    /**
     * 将指纹保存到本地存储
     */
    private static setCachedFingerprint(fingerprint: string): void {
        if (typeof localStorage === 'undefined') return;

        try {
            const expiry = Date.now() + this.CACHE_DURATION;
            localStorage.setItem(this.CACHE_KEY, fingerprint);
            localStorage.setItem(this.CACHE_EXPIRY_KEY, expiry.toString());
        } catch {
            // 忽略存储错误
        }
    }

    /**
     * 清除缓存的指纹
     */
    static clearCache(): void {
        cachedFingerprint = null;
        fingerprintPromise = null;

        if (typeof localStorage !== 'undefined') {
            try {
                localStorage.removeItem(this.CACHE_KEY);
                localStorage.removeItem(this.CACHE_EXPIRY_KEY);
            } catch {
                // 忽略错误
            }
        }
    }

    /**
     * 获取设备的试用使用情况
     */
    static async getTrialUsage(fingerprint?: string): Promise<DeviceUsageStatus> {
        try {
            const deviceFingerprint = fingerprint || await this.generate();

            // 调用Supabase函数检查设备使用情况
            const { data, error } = await supabase.rpc('check_device_fingerprint_usage', {
                fingerprint_hash_param: deviceFingerprint
            });

            if (error) {
                console.error('Error checking device usage:', error);
                // 返回默认值，允许使用
                return {
                    canAnalyze: true,
                    remainingTrials: 5,
                    isRegistered: false
                };
            }

            // 返回第一个结果（函数返回数组）
            const result = data?.[0];
            return {
                canAnalyze: result?.can_analyze ?? true,
                remainingTrials: result?.remaining_trials ?? 5,
                isRegistered: result?.is_registered ?? false
            };
        } catch (error) {
            console.error('Error getting trial usage:', error);
            // 出错时允许使用
            return {
                canAnalyze: true,
                remainingTrials: 5,
                isRegistered: false
            };
        }
    }

    /**
     * 更新设备的试用使用次数
     */
    static async updateTrialUsage(fingerprint?: string): Promise<void> {
        try {
            const deviceFingerprint = fingerprint || await this.generate();

            // 这个操作会在云函数中处理，这里只是占位符
            // 实际的使用次数更新会在分析完成后由云函数执行
            console.log('Trial usage will be updated by cloud function for:', deviceFingerprint);
        } catch (error) {
            console.error('Error updating trial usage:', error);
        }
    }

    /**
     * 清除设备的试用数据（注册时调用）
     */
    static async clearTrialData(fingerprint?: string): Promise<void> {
        try {
            const deviceFingerprint = fingerprint || await this.generate();

            // 获取当前用户
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                console.warn('No authenticated user to associate device fingerprint');
                return;
            }

            // 关联设备指纹到用户账户
            const { data, error } = await supabase.rpc('associate_device_fingerprint_to_user', {
                fingerprint_hash_param: deviceFingerprint,
                user_uuid: user.id
            });

            if (error) {
                console.error('Error associating device fingerprint to user:', error);
            } else {
                console.log('Device fingerprint associated to user successfully');
            }
        } catch (error) {
            console.error('Error clearing trial data:', error);
        }
    }

    /**
     * 关联设备指纹到用户账户
     */
    static async associateWithUser(userId: string, fingerprint?: string): Promise<boolean> {
        try {
            const deviceFingerprint = fingerprint || await this.generate();

            const { data, error } = await supabase.rpc('associate_device_fingerprint_to_user', {
                fingerprint_hash_param: deviceFingerprint,
                user_uuid: userId
            });

            if (error) {
                console.error('Error associating device fingerprint:', error);
                return false;
            }

            return data === true;
        } catch (error) {
            console.error('Error in associateWithUser:', error);
            return false;
        }
    }

    /**
     * 验证设备指纹的有效性
     */
    static validateFingerprint(fingerprint: string): boolean {
        // 检查指纹格式（应该是64位十六进制字符串）
        return /^[a-f0-9]{64}$/i.test(fingerprint);
    }

    /**
     * 获取设备信息摘要（用于调试）
     */
    static async getDeviceInfo(): Promise<Record<string, any>> {
        if (typeof window === 'undefined') {
            return { environment: 'server' };
        }

        return {
            screen: this.getScreenFingerprint(),
            timezone: this.getTimezoneFingerprint(),
            language: this.getLanguageFingerprint(),
            platform: this.getPlatformFingerprint(),
            userAgent: navigator.userAgent.substring(0, 100) + '...', // 截断用户代理
            timestamp: new Date().toISOString()
        };
    }
}

// 导出默认实例
export default DeviceFingerprint;