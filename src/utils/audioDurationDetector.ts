/**
 * AudioDurationDetector - 音频时长检测和积分计算服务
 * 支持多种音频格式，使用Web Audio API和HTML5 Audio作为fallback
 */

export interface AudioDurationResult {
    duration: number; // 时长（秒）
    creditsRequired: number; // 所需积分
    formattedDuration: string; // 格式化的时长显示
}

export class AudioDurationDetector {
    private static readonly CREDITS_PER_SECOND = 1;
    private static readonly MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

    // 支持的音频格式
    private static readonly SUPPORTED_FORMATS = [
        'audio/mpeg', 'audio/mp3',
        'audio/wav', 'audio/wave',
        'audio/ogg', 'audio/webm',
        'audio/aac', 'audio/m4a',
        'audio/flac'
    ];

    /**
     * 检测音频文件时长
     * @param file 音频文件
     * @returns Promise<AudioDurationResult>
     */
    static async detectDuration(file: File): Promise<AudioDurationResult> {
        // 验证文件
        this.validateFile(file);

        let duration: number;

        try {
            // 优先使用Web Audio API
            duration = await this.detectWithWebAudioAPI(file);
        } catch (error) {
            console.warn('Web Audio API failed, falling back to HTML5 Audio:', error);

            try {
                // Fallback到HTML5 Audio
                duration = await this.detectWithHTML5Audio(file);
            } catch (fallbackError) {
                console.error('Both detection methods failed:', fallbackError);
                throw new Error('无法检测音频文件时长，请确保文件格式正确且未损坏');
            }
        }

        const creditsRequired = this.calculateCreditsRequired(duration);
        const formattedDuration = this.formatDurationDisplay(duration);

        return {
            duration,
            creditsRequired,
            formattedDuration
        };
    }

    /**
     * 使用Web Audio API检测时长
     * @param file 音频文件
     * @returns Promise<number> 时长（秒）
     */
    private static async detectWithWebAudioAPI(file: File): Promise<number> {
        if (!window.AudioContext && !(window as any).webkitAudioContext) {
            throw new Error('Web Audio API not supported');
        }

        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

        try {
            const arrayBuffer = await file.arrayBuffer();
            const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
            return audioBuffer.duration;
        } finally {
            // 清理AudioContext
            if (audioContext.state !== 'closed') {
                await audioContext.close();
            }
        }
    }

    /**
     * 使用HTML5 Audio元素检测时长
     * @param file 音频文件
     * @returns Promise<number> 时长（秒）
     */
    private static detectWithHTML5Audio(file: File): Promise<number> {
        return new Promise((resolve, reject) => {
            const audio = new Audio();
            const objectUrl = URL.createObjectURL(file);

            const cleanup = () => {
                URL.revokeObjectURL(objectUrl);
                audio.removeEventListener('loadedmetadata', onLoadedMetadata);
                audio.removeEventListener('error', onError);
            };

            const onLoadedMetadata = () => {
                cleanup();
                if (audio.duration && isFinite(audio.duration)) {
                    resolve(audio.duration);
                } else {
                    reject(new Error('无法获取有效的音频时长'));
                }
            };

            const onError = () => {
                cleanup();
                reject(new Error('音频文件加载失败'));
            };

            audio.addEventListener('loadedmetadata', onLoadedMetadata);
            audio.addEventListener('error', onError);

            // 设置超时
            setTimeout(() => {
                cleanup();
                reject(new Error('音频时长检测超时'));
            }, 10000); // 10秒超时

            audio.src = objectUrl;
        });
    }

    /**
     * 计算所需积分（向上取整到秒）
     * @param durationSeconds 时长（秒）
     * @returns 所需积分
     */
    static calculateCreditsRequired(durationSeconds: number): number {
        if (durationSeconds <= 0) {
            return 0;
        }

        // 向上取整到最近的秒数
        const roundedSeconds = Math.ceil(durationSeconds);
        return roundedSeconds * this.CREDITS_PER_SECOND;
    }

    /**
     * 格式化时长显示
     * @param seconds 时长（秒）
     * @returns 格式化的时长字符串
     */
    static formatDurationDisplay(seconds: number): string {
        if (seconds <= 0) {
            return '0:00';
        }

        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);

        if (minutes >= 60) {
            const hours = Math.floor(minutes / 60);
            const remainingMinutes = minutes % 60;
            return `${hours}:${remainingMinutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
        }

        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }

    /**
     * 验证文件
     * @param file 文件对象
     */
    private static validateFile(file: File): void {
        if (!file) {
            throw new Error('请选择一个文件');
        }

        // 检查文件大小
        if (file.size > this.MAX_FILE_SIZE) {
            throw new Error(`文件大小不能超过 ${Math.round(this.MAX_FILE_SIZE / 1024 / 1024)}MB`);
        }

        // 检查文件类型
        if (!this.isAudioFile(file)) {
            throw new Error('请选择有效的音频文件格式（MP3、WAV、OGG、AAC、FLAC等）');
        }
    }

    /**
     * 检查是否为音频文件
     * @param file 文件对象
     * @returns boolean
     */
    static isAudioFile(file: File): boolean {
        // 检查MIME类型
        if (file.type && this.SUPPORTED_FORMATS.includes(file.type)) {
            return true;
        }

        // 检查文件扩展名（作为fallback）
        const fileName = file.name.toLowerCase();
        const audioExtensions = ['.mp3', '.wav', '.ogg', '.webm', '.aac', '.m4a', '.flac'];

        return audioExtensions.some(ext => fileName.endsWith(ext));
    }

    /**
     * 获取支持的音频格式列表
     * @returns 支持的格式数组
     */
    static getSupportedFormats(): string[] {
        return [...this.SUPPORTED_FORMATS];
    }

    /**
     * 预估积分消费（用于显示）
     * @param estimatedDuration 预估时长（秒）
     * @returns 预估积分消费信息
     */
    static estimateCreditsConsumption(estimatedDuration: number): {
        credits: number;
        formattedDuration: string;
        costDescription: string;
    } {
        const credits = this.calculateCreditsRequired(estimatedDuration);
        const formattedDuration = this.formatDurationDisplay(estimatedDuration);
        const costDescription = `${formattedDuration} ≈ ${credits} 积分`;

        return {
            credits,
            formattedDuration,
            costDescription
        };
    }
}

// 导出类型和常量
export const CREDITS_PER_SECOND = 1;
export const MAX_AUDIO_FILE_SIZE = 100 * 1024 * 1024; // 100MB

// 错误类型
export class AudioDetectionError extends Error {
    constructor(message: string, public readonly code: string) {
        super(message);
        this.name = 'AudioDetectionError';
    }
}

// 常用的错误代码
export const AudioErrorCodes = {
    INVALID_FILE: 'INVALID_FILE',
    FILE_TOO_LARGE: 'FILE_TOO_LARGE',
    UNSUPPORTED_FORMAT: 'UNSUPPORTED_FORMAT',
    DETECTION_FAILED: 'DETECTION_FAILED',
    DETECTION_TIMEOUT: 'DETECTION_TIMEOUT'
} as const;