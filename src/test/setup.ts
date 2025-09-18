import { vi } from 'vitest';
import '@testing-library/jest-dom';

// Mock Web Audio API
global.AudioContext = vi.fn().mockImplementation(() => ({
    decodeAudioData: vi.fn(),
    close: vi.fn(),
    state: 'running',
}));

global.webkitAudioContext = global.AudioContext;

// Mock URL.createObjectURL and revokeObjectURL
global.URL.createObjectURL = vi.fn(() => 'mock-object-url');
global.URL.revokeObjectURL = vi.fn();

// Mock Audio constructor
global.Audio = vi.fn().mockImplementation(() => ({
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    duration: 180, // 3 minutes default
    src: '',
}));

// Mock File constructor for testing
global.File = class MockFile {
    name: string;
    size: number;
    type: string;
    lastModified: number;

    constructor(bits: BlobPart[], filename: string, options: FilePropertyBag = {}) {
        this.name = filename;
        this.size = options.size || 1024;
        this.type = options.type || 'audio/mp3';
        this.lastModified = options.lastModified || Date.now();
    }

    arrayBuffer(): Promise<ArrayBuffer> {
        return Promise.resolve(new ArrayBuffer(this.size));
    }
} as any;

// Mock crypto for device fingerprinting
Object.defineProperty(global, 'crypto', {
    value: {
        subtle: {
            digest: vi.fn().mockResolvedValue(new ArrayBuffer(32)),
        },
        getRandomValues: vi.fn().mockImplementation((arr) => {
            for (let i = 0; i < arr.length; i++) {
                arr[i] = Math.floor(Math.random() * 256);
            }
            return arr;
        }),
    },
});

// Mock navigator
Object.defineProperty(global, 'navigator', {
    value: {
        userAgent: 'test-user-agent',
        language: 'en-US',
        platform: 'test-platform',
        hardwareConcurrency: 4,
    },
});

// Mock screen
Object.defineProperty(global, 'screen', {
    value: {
        width: 1920,
        height: 1080,
        colorDepth: 24,
    },
});