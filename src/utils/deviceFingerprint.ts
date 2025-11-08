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
    private static readonly STABLE_CACHE_KEY = 'device_stable_fingerprint'; // 稳定指纹缓存
    private static readonly ALGORITHM_VERSION_KEY = 'device_fingerprint_algorithm_version';
    private static readonly CURRENT_ALGORITHM_VERSION = 'v2.2'; // 当前算法版本

    /**
     * 生成设备指纹
     * 使用稳定的硬件特征创建唯一标识，确保无痕模式和正常模式生成相同指纹
     * 这样可以防止用户通过切换无痕模式来绕过试用限制
     */
    static async generate(): Promise<string> {
        // 检查算法版本，如果版本变化则清除旧缓存（必须在检查缓存之前）
        this.checkAndClearCacheIfVersionChanged();

        // 如果已有缓存的指纹，直接返回
        if (cachedFingerprint) {
            return cachedFingerprint;
        }

        // 如果正在生成指纹，等待完成
        if (fingerprintPromise) {
            return fingerprintPromise;
        }

        // 检测是否在无痕模式
        const isIncognito = await this.detectIncognito();

        // 检查缓存（无痕模式和正常模式使用不同的缓存策略）
        const cached = isIncognito ? this.getStableFingerprint() : this.getCachedFingerprint();
        if (cached) {
            cachedFingerprint = cached;
            console.log(isIncognito ? '📦 无痕模式：使用sessionStorage缓存' : '📦 正常模式：使用localStorage缓存');
            return cached;
        }

        // 生成新的指纹（总是使用稳定模式，确保两种模式生成相同指纹）
        fingerprintPromise = this.generateFingerprint();

        try {
            const fingerprint = await fingerprintPromise;
            cachedFingerprint = fingerprint;

            // 保存算法版本号
            this.saveAlgorithmVersion();

            // 根据模式使用不同的缓存策略
            if (isIncognito) {
                this.setStableFingerprint(fingerprint);
                console.log('🔒 无痕模式：指纹已保存到sessionStorage');
            } else {
                this.setCachedFingerprint(fingerprint);
                console.log('✅ 正常模式：指纹已保存到localStorage');
            }

            return fingerprint;
        } finally {
            fingerprintPromise = null;
        }
    }

    /**
     * 检查算法版本，如果版本变化则清除旧缓存
     * 这样老用户会自动使用新算法生成新指纹
     */
    private static checkAndClearCacheIfVersionChanged(): void {
        if (typeof localStorage === 'undefined') return;

        try {
            const cachedVersion = localStorage.getItem(DeviceFingerprint.ALGORITHM_VERSION_KEY);

            // 如果版本不匹配，清除所有缓存
            if (cachedVersion && cachedVersion !== DeviceFingerprint.CURRENT_ALGORITHM_VERSION) {
                console.log(`🔄 检测到算法版本变化 (${cachedVersion} → ${DeviceFingerprint.CURRENT_ALGORITHM_VERSION})，清除旧缓存`);

                // 清除所有相关缓存
                localStorage.removeItem(DeviceFingerprint.CACHE_KEY);
                localStorage.removeItem(DeviceFingerprint.CACHE_EXPIRY_KEY);
                localStorage.removeItem(DeviceFingerprint.STABLE_CACHE_KEY);

                // 清除内存缓存
                cachedFingerprint = null;
                fingerprintPromise = null;

                // 清除 sessionStorage（无痕模式）
                if (typeof sessionStorage !== 'undefined') {
                    try {
                        sessionStorage.removeItem(DeviceFingerprint.STABLE_CACHE_KEY);
                    } catch {
                        // 忽略错误
                    }
                }
            }
        } catch (error) {
            console.warn('检查算法版本时出错:', error);
        }
    }

    /**
     * 保存当前算法版本号
     */
    private static saveAlgorithmVersion(): void {
        if (typeof localStorage === 'undefined') return;

        try {
            localStorage.setItem(DeviceFingerprint.ALGORITHM_VERSION_KEY, DeviceFingerprint.CURRENT_ALGORITHM_VERSION);
        } catch {
            // 忽略错误
        }
    }

    /**
     * 生成设备指纹的核心逻辑
     * 只使用真正的硬件特征，不受屏幕切换、窗口移动等影响
     * 避免使用 Canvas/WebGL/Audio 等容易被无痕模式修改的特征
     */
    private static async generateFingerprint(): Promise<string> {
        // 只使用硬件级别的特征，避免受环境变化影响
        const components = {
            // 核心硬件特征（完全不变）
            gpu: await this.getGPUInfo(),                          // GPU 信息
            cores: String(navigator.hardwareConcurrency || 'unknown'), // CPU 核心数
            memory: String((navigator as any).deviceMemory || 'unknown'), // 设备内存
            platform: this.getPlatformFingerprint(),               // 操作系统

            // 浏览器特征
            userAgent: this.getUserAgentFingerprint(),             // 浏览器信息
            vendor: navigator.vendor || 'unknown',                 // 浏览器供应商

            // 系统特征
            timezone: this.getTimezoneFingerprint(),               // 时区

            // 输入设备特征（较稳定）
            touch: String(navigator.maxTouchPoints || 0),          // 触摸点数
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
     * 获取 GPU 信息（用于设备指纹）
     * 这比 Canvas 更稳定，因为它直接读取硬件信息
     */
    private static async getGPUInfo(): Promise<string> {
        if (typeof window === 'undefined') return 'server';

        try {
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl') as WebGLRenderingContext | null;

            if (!gl) return 'no-webgl';

            // 获取 GPU 供应商和渲染器信息
            const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
            if (!debugInfo) {
                // 降级方案：使用基本的 WebGL 参数
                const vendor = gl.getParameter(gl.VENDOR) || 'unknown';
                const renderer = gl.getParameter(gl.RENDERER) || 'unknown';
                return `${vendor}|${renderer}`;
            }

            const vendor = gl.getParameter((debugInfo as any).UNMASKED_VENDOR_WEBGL) || 'unknown';
            const renderer = gl.getParameter((debugInfo as any).UNMASKED_RENDERER_WEBGL) || 'unknown';

            // 清理字符串，只保留关键信息
            const cleanVendor = String(vendor).split('(')[0].trim();
            const cleanRenderer = String(renderer).split('(')[0].trim();

            return `${cleanVendor}|${cleanRenderer}`;
        } catch (error) {
            console.warn('GPU info error:', error);
            return 'gpu-error';
        }
    }

    /**
     * 获取WebGL指纹（保留用于调试）
     */
    private static getWebGLFingerprint(): string {
        if (typeof window === 'undefined') return 'server';

        try {
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl') as WebGLRenderingContext | null;

            if (!gl) return 'no-webgl';

            const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
            const vendor = debugInfo ? gl.getParameter((debugInfo as any).UNMASKED_VENDOR_WEBGL) : '';
            const renderer = debugInfo ? gl.getParameter((debugInfo as any).UNMASKED_RENDERER_WEBGL) : '';

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
     * 获取浏览器插件指纹
     */
    private static getPluginsFingerprint(): string {
        if (typeof navigator === 'undefined') return 'server';

        try {
            const plugins = Array.from(navigator.plugins || [])
                .map(p => p.name)
                .sort()
                .slice(0, 5) // 只取前5个插件
                .join('|');

            return plugins || 'no-plugins';
        } catch {
            return 'plugins-error';
        }
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
     * 保存稳定指纹（用于无痕模式）
     * 使用更持久的存储机制
     */
    private static setStableFingerprint(fingerprint: string): void {
        if (typeof sessionStorage === 'undefined') return;

        try {
            // 无痕模式下使用 sessionStorage（在会话期间有效）
            sessionStorage.setItem(this.STABLE_CACHE_KEY, fingerprint);

            // 同时尝试 localStorage（可能会失败）
            try {
                localStorage.setItem(this.STABLE_CACHE_KEY, fingerprint);
            } catch {
                // 无痕模式可能会阻止 localStorage
            }
        } catch {
            // 忽略错误
        }
    }

    /**
     * 获取稳定指纹缓存
     */
    private static getStableFingerprint(): string | null {
        try {
            // 先尝试 sessionStorage
            if (typeof sessionStorage !== 'undefined') {
                const cached = sessionStorage.getItem(this.STABLE_CACHE_KEY);
                if (cached) return cached;
            }

            // 再尝试 localStorage
            if (typeof localStorage !== 'undefined') {
                const cached = localStorage.getItem(this.STABLE_CACHE_KEY);
                if (cached) return cached;
            }

            return null;
        } catch {
            return null;
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
                localStorage.removeItem(this.STABLE_CACHE_KEY);
                localStorage.removeItem(DeviceFingerprint.ALGORITHM_VERSION_KEY);
            } catch {
                // 忽略错误
            }
        }

        if (typeof sessionStorage !== 'undefined') {
            try {
                sessionStorage.removeItem(this.STABLE_CACHE_KEY);
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

    /**
     * 获取完整的设备指纹组件（用于调试）
     * 可以看到每个组件的具体值
     */
    static async getDetailedFingerprint(): Promise<{
        fingerprint: string;
        components: Record<string, string>;
        isIncognito: boolean;
    }> {
        // 使用与 generate() 相同的稳定特征
        const components = {
            // 核心硬件特征（完全不变）
            gpu: await this.getGPUInfo(),
            cores: String(navigator.hardwareConcurrency || 'unknown'),
            memory: String((navigator as any).deviceMemory || 'unknown'),
            platform: this.getPlatformFingerprint(),

            // 浏览器特征
            userAgent: this.getUserAgentFingerprint(),
            vendor: navigator.vendor || 'unknown',

            // 系统特征
            timezone: this.getTimezoneFingerprint(),

            // 输入设备特征
            touch: String(navigator.maxTouchPoints || 0),
        };

        const fingerprintString = Object.values(components).join('|');
        const salt = import.meta.env.VITE_DEVICE_FINGERPRINT_SALT || 'default-salt';
        const saltedFingerprint = `${fingerprintString}|${salt}`;
        const fingerprint = sha256(saltedFingerprint);

        // 检测是否在无痕模式
        const isIncognito = await this.detectIncognito();

        return {
            fingerprint,
            components,
            isIncognito
        };
    }

    /**
     * 检测是否在无痕模式
     */
    private static async detectIncognito(): Promise<boolean> {
        if (typeof window === 'undefined') return false;

        try {
            // 方法1: 检查 FileSystem API
            if ('storage' in navigator && 'estimate' in navigator.storage) {
                const { quota } = await navigator.storage.estimate();
                // 无痕模式下配额通常很小（< 120MB）
                if (quota && quota < 120000000) {
                    return true;
                }
            }

            // 方法2: 检查 IndexedDB
            if ('indexedDB' in window) {
                try {
                    const db = indexedDB.open('test');
                    db.onerror = () => true;
                } catch {
                    return true;
                }
            }

            // 方法3: 检查 localStorage 持久性
            if (typeof localStorage !== 'undefined') {
                try {
                    localStorage.setItem('incognito_test', '1');
                    localStorage.removeItem('incognito_test');
                } catch {
                    return true;
                }
            }

            return false;
        } catch {
            return false;
        }
    }
}

// 导出默认实例
export default DeviceFingerprint;