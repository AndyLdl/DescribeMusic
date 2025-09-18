import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AudioDurationDetector, AudioDetectionError, AudioErrorCodes } from '../audioDurationDetector';

describe('AudioDurationDetector', () => {
    let mockFile: File;
    let mockAudioContext: any;
    let mockAudio: any;

    beforeEach(() => {
        // Reset all mocks
        vi.clearAllMocks();

        // Create mock file
        mockFile = new File(['mock audio data'], 'test.mp3', {
            type: 'audio/mp3',
            size: 1024 * 1024, // 1MB
        });

        // Mock AudioContext
        mockAudioContext = {
            decodeAudioData: vi.fn(),
            close: vi.fn(),
            state: 'running',
        };

        global.AudioContext = vi.fn(() => mockAudioContext);
        (global as any).webkitAudioContext = global.AudioContext;

        // Mock Audio element
        mockAudio = {
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            duration: 180, // 3 minutes
            src: '',
        };

        global.Audio = vi.fn(() => mockAudio);

        // Mock URL methods
        global.URL.createObjectURL = vi.fn(() => 'mock-object-url');
        global.URL.revokeObjectURL = vi.fn();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('detectDuration', () => {
        it('should detect duration using Web Audio API successfully', async () => {
            const expectedDuration = 180; // 3 minutes
            const mockAudioBuffer = { duration: expectedDuration };

            mockAudioContext.decodeAudioData.mockResolvedValue(mockAudioBuffer);

            const result = await AudioDurationDetector.detectDuration(mockFile);

            expect(result.duration).toBe(expectedDuration);
            expect(result.creditsRequired).toBe(180); // 1 credit per second
            expect(result.formattedDuration).toBe('3:00');
            expect(mockAudioContext.decodeAudioData).toHaveBeenCalled();
        });

        it('should fallback to HTML5 Audio when Web Audio API fails', async () => {
            const expectedDuration = 120; // 2 minutes

            // Make Web Audio API fail
            mockAudioContext.decodeAudioData.mockRejectedValue(new Error('Web Audio API failed'));

            // Setup HTML5 Audio success
            mockAudio.duration = expectedDuration;

            // Mock the event listener behavior
            mockAudio.addEventListener.mockImplementation((event: string, callback: Function) => {
                if (event === 'loadedmetadata') {
                    setTimeout(() => callback(), 0);
                }
            });

            const result = await AudioDurationDetector.detectDuration(mockFile);

            expect(result.duration).toBe(expectedDuration);
            expect(result.creditsRequired).toBe(120);
            expect(result.formattedDuration).toBe('2:00');
            expect(mockAudio.addEventListener).toHaveBeenCalledWith('loadedmetadata', expect.any(Function));
        });

        it('should throw error when both detection methods fail', async () => {
            // Make Web Audio API fail
            mockAudioContext.decodeAudioData.mockRejectedValue(new Error('Web Audio API failed'));

            // Make HTML5 Audio fail
            mockAudio.addEventListener.mockImplementation((event: string, callback: Function) => {
                if (event === 'error') {
                    setTimeout(() => callback(), 0);
                }
            });

            await expect(AudioDurationDetector.detectDuration(mockFile)).rejects.toThrow(
                '无法检测音频文件时长，请确保文件格式正确且未损坏'
            );
        });

        it('should validate file before detection', async () => {
            const invalidFile = new File(['data'], 'test.txt', {
                type: 'text/plain',
                size: 1024,
            });

            await expect(AudioDurationDetector.detectDuration(invalidFile)).rejects.toThrow(
                '请选择有效的音频文件格式（MP3、WAV、OGG、AAC、FLAC等）'
            );
        });

        it('should reject files that are too large', async () => {
            const largeFile = new File(['data'], 'large.mp3', {
                type: 'audio/mp3',
                size: 200 * 1024 * 1024, // 200MB (exceeds 100MB limit)
            });

            await expect(AudioDurationDetector.detectDuration(largeFile)).rejects.toThrow(
                '文件大小不能超过 100MB'
            );
        });

        it('should handle HTML5 Audio timeout', async () => {
            // Make Web Audio API fail
            mockAudioContext.decodeAudioData.mockRejectedValue(new Error('Web Audio API failed'));

            // Don't trigger any events to simulate timeout
            mockAudio.addEventListener.mockImplementation(() => { });

            await expect(AudioDurationDetector.detectDuration(mockFile)).rejects.toThrow('无法检测音频文件时长，请确保文件格式正确且未损坏');
        }, 15000);
    });

    describe('calculateCreditsRequired', () => {
        it('should calculate credits correctly for whole seconds', () => {
            expect(AudioDurationDetector.calculateCreditsRequired(60)).toBe(60);
            expect(AudioDurationDetector.calculateCreditsRequired(120)).toBe(120);
            expect(AudioDurationDetector.calculateCreditsRequired(180)).toBe(180);
        });

        it('should round up fractional seconds', () => {
            expect(AudioDurationDetector.calculateCreditsRequired(60.1)).toBe(61);
            expect(AudioDurationDetector.calculateCreditsRequired(60.9)).toBe(61);
            expect(AudioDurationDetector.calculateCreditsRequired(120.5)).toBe(121);
        });

        it('should return 0 for zero or negative duration', () => {
            expect(AudioDurationDetector.calculateCreditsRequired(0)).toBe(0);
            expect(AudioDurationDetector.calculateCreditsRequired(-10)).toBe(0);
        });
    });

    describe('formatDurationDisplay', () => {
        it('should format seconds correctly', () => {
            expect(AudioDurationDetector.formatDurationDisplay(30)).toBe('0:30');
            expect(AudioDurationDetector.formatDurationDisplay(59)).toBe('0:59');
        });

        it('should format minutes and seconds correctly', () => {
            expect(AudioDurationDetector.formatDurationDisplay(60)).toBe('1:00');
            expect(AudioDurationDetector.formatDurationDisplay(90)).toBe('1:30');
            expect(AudioDurationDetector.formatDurationDisplay(3599)).toBe('59:59');
        });

        it('should format hours, minutes, and seconds correctly', () => {
            expect(AudioDurationDetector.formatDurationDisplay(3600)).toBe('1:00:00');
            expect(AudioDurationDetector.formatDurationDisplay(3661)).toBe('1:01:01');
            expect(AudioDurationDetector.formatDurationDisplay(7200)).toBe('2:00:00');
        });

        it('should handle zero and negative values', () => {
            expect(AudioDurationDetector.formatDurationDisplay(0)).toBe('0:00');
            expect(AudioDurationDetector.formatDurationDisplay(-10)).toBe('0:00');
        });
    });

    describe('isAudioFile', () => {
        it('should accept valid audio MIME types', () => {
            const mp3File = new File(['data'], 'test.mp3', { type: 'audio/mpeg' });
            const wavFile = new File(['data'], 'test.wav', { type: 'audio/wav' });
            const oggFile = new File(['data'], 'test.ogg', { type: 'audio/ogg' });

            expect(AudioDurationDetector.isAudioFile(mp3File)).toBe(true);
            expect(AudioDurationDetector.isAudioFile(wavFile)).toBe(true);
            expect(AudioDurationDetector.isAudioFile(oggFile)).toBe(true);
        });

        it('should accept files with audio extensions even without MIME type', () => {
            const mp3File = new File(['data'], 'test.mp3', { type: '' });
            const wavFile = new File(['data'], 'test.wav', { type: '' });
            const flacFile = new File(['data'], 'test.flac', { type: '' });

            expect(AudioDurationDetector.isAudioFile(mp3File)).toBe(true);
            expect(AudioDurationDetector.isAudioFile(wavFile)).toBe(true);
            expect(AudioDurationDetector.isAudioFile(flacFile)).toBe(true);
        });

        it('should reject non-audio files', () => {
            const textFile = new File(['data'], 'test.txt', { type: 'text/plain' });
            const imageFile = new File(['data'], 'test.jpg', { type: 'image/jpeg' });
            const videoFile = new File(['data'], 'test.mp4', { type: 'video/mp4' });

            expect(AudioDurationDetector.isAudioFile(textFile)).toBe(false);
            expect(AudioDurationDetector.isAudioFile(imageFile)).toBe(false);
            expect(AudioDurationDetector.isAudioFile(videoFile)).toBe(false);
        });

        it('should be case insensitive for extensions', () => {
            const mp3File = new File(['data'], 'test.MP3', { type: '' });
            const wavFile = new File(['data'], 'test.WAV', { type: '' });

            expect(AudioDurationDetector.isAudioFile(mp3File)).toBe(true);
            expect(AudioDurationDetector.isAudioFile(wavFile)).toBe(true);
        });
    });

    describe('getSupportedFormats', () => {
        it('should return array of supported formats', () => {
            const formats = AudioDurationDetector.getSupportedFormats();

            expect(Array.isArray(formats)).toBe(true);
            expect(formats).toContain('audio/mpeg');
            expect(formats).toContain('audio/wav');
            expect(formats).toContain('audio/ogg');
            expect(formats.length).toBeGreaterThan(0);
        });

        it('should return a copy of the formats array', () => {
            const formats1 = AudioDurationDetector.getSupportedFormats();
            const formats2 = AudioDurationDetector.getSupportedFormats();

            expect(formats1).not.toBe(formats2); // Different array instances
            expect(formats1).toEqual(formats2); // Same content
        });
    });

    describe('estimateCreditsConsumption', () => {
        it('should estimate credits consumption correctly', () => {
            const result = AudioDurationDetector.estimateCreditsConsumption(180);

            expect(result.credits).toBe(180);
            expect(result.formattedDuration).toBe('3:00');
            expect(result.costDescription).toBe('3:00 ≈ 180 积分');
        });

        it('should handle fractional durations', () => {
            const result = AudioDurationDetector.estimateCreditsConsumption(90.5);

            expect(result.credits).toBe(91); // Rounded up
            expect(result.formattedDuration).toBe('1:30');
            expect(result.costDescription).toBe('1:30 ≈ 91 积分');
        });

        it('should handle zero duration', () => {
            const result = AudioDurationDetector.estimateCreditsConsumption(0);

            expect(result.credits).toBe(0);
            expect(result.formattedDuration).toBe('0:00');
            expect(result.costDescription).toBe('0:00 ≈ 0 积分');
        });
    });

    describe('validateFile', () => {
        it('should throw error for null file', async () => {
            await expect(AudioDurationDetector.detectDuration(null as any)).rejects.toThrow(
                '请选择一个文件'
            );
        });

        it('should throw error for undefined file', async () => {
            await expect(AudioDurationDetector.detectDuration(undefined as any)).rejects.toThrow(
                '请选择一个文件'
            );
        });
    });

    describe('Web Audio API edge cases', () => {
        it('should handle AudioContext creation failure', async () => {
            // Remove AudioContext support
            delete (global as any).AudioContext;
            delete (global as any).webkitAudioContext;

            // Setup HTML5 Audio success
            mockAudio.duration = 120;
            mockAudio.addEventListener.mockImplementation((event: string, callback: Function) => {
                if (event === 'loadedmetadata') {
                    setTimeout(() => callback(), 10);
                }
            });

            const result = await AudioDurationDetector.detectDuration(mockFile);

            expect(result.duration).toBe(120);
            expect(result.creditsRequired).toBe(120);
        }, 10000);

        it('should properly close AudioContext after use', async () => {
            const expectedDuration = 180;
            const mockAudioBuffer = { duration: expectedDuration };

            mockAudioContext.decodeAudioData.mockResolvedValue(mockAudioBuffer);

            await AudioDurationDetector.detectDuration(mockFile);

            expect(mockAudioContext.close).toHaveBeenCalled();
        });

        it('should handle AudioContext close failure gracefully', async () => {
            const expectedDuration = 180;
            const mockAudioBuffer = { duration: expectedDuration };

            mockAudioContext.decodeAudioData.mockResolvedValue(mockAudioBuffer);
            mockAudioContext.close.mockRejectedValue(new Error('Close failed'));

            // Should not throw error even if close fails, but will fallback to HTML5 Audio
            // Setup HTML5 Audio success for fallback
            mockAudio.duration = expectedDuration;
            mockAudio.addEventListener.mockImplementation((event: string, callback: Function) => {
                if (event === 'loadedmetadata') {
                    setTimeout(() => callback(), 10);
                }
            });

            const result = await AudioDurationDetector.detectDuration(mockFile);
            expect(result.duration).toBe(expectedDuration);
        }, 10000);
    });

    describe('HTML5 Audio edge cases', () => {
        it('should handle invalid duration from HTML5 Audio', async () => {
            // Make Web Audio API fail
            mockAudioContext.decodeAudioData.mockRejectedValue(new Error('Web Audio API failed'));

            // Set invalid duration
            mockAudio.duration = NaN;

            mockAudio.addEventListener.mockImplementation((event: string, callback: Function) => {
                if (event === 'loadedmetadata') {
                    setTimeout(() => callback(), 10);
                }
            });

            await expect(AudioDurationDetector.detectDuration(mockFile)).rejects.toThrow(
                '无法检测音频文件时长，请确保文件格式正确且未损坏'
            );
        }, 10000);

        it('should handle infinite duration from HTML5 Audio', async () => {
            // Make Web Audio API fail
            mockAudioContext.decodeAudioData.mockRejectedValue(new Error('Web Audio API failed'));

            // Set infinite duration
            mockAudio.duration = Infinity;

            mockAudio.addEventListener.mockImplementation((event: string, callback: Function) => {
                if (event === 'loadedmetadata') {
                    setTimeout(() => callback(), 10);
                }
            });

            await expect(AudioDurationDetector.detectDuration(mockFile)).rejects.toThrow(
                '无法检测音频文件时长，请确保文件格式正确且未损坏'
            );
        }, 10000);

        it('should properly clean up object URL', async () => {
            const expectedDuration = 180;
            const mockAudioBuffer = { duration: expectedDuration };

            mockAudioContext.decodeAudioData.mockResolvedValue(mockAudioBuffer);

            await AudioDurationDetector.detectDuration(mockFile);

            // Object URL should not be created when Web Audio API succeeds
            expect(global.URL.createObjectURL).not.toHaveBeenCalled();
            expect(global.URL.revokeObjectURL).not.toHaveBeenCalled();
        });

        it('should clean up object URL when HTML5 Audio is used', async () => {
            // Make Web Audio API fail
            mockAudioContext.decodeAudioData.mockRejectedValue(new Error('Web Audio API failed'));

            mockAudio.duration = 120;
            mockAudio.addEventListener.mockImplementation((event: string, callback: Function) => {
                if (event === 'loadedmetadata') {
                    setTimeout(() => callback(), 10);
                }
            });

            await AudioDurationDetector.detectDuration(mockFile);

            expect(global.URL.createObjectURL).toHaveBeenCalledWith(mockFile);
            expect(global.URL.revokeObjectURL).toHaveBeenCalledWith('mock-object-url');
        }, 10000);
    });
});