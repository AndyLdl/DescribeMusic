export interface HistoryRecord {
    id: string;
    filename: string;
    timestamp: string;
    duration: number;
    fileSize: string;
    format: string;
    thumbnail?: string; // Base64 encoded waveform preview
    basicInfo: {
        genre: string;
        mood: string;
        bpm: number;
        key: string;
        energy: number;
        valence: number;
        danceability: number;
    };
    quickStats: {
        qualityScore: number;
        emotionalTone: string;
        primaryGenre: string;
    };
}

const STORAGE_KEY = 'describe_music_history';
const MAX_HISTORY_ITEMS = 50; // 限制历史记录数量

export class HistoryStorage {
    static getHistory(): HistoryRecord[] {
        if (typeof window === 'undefined') return [];

        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            return stored ? JSON.parse(stored) : [];
        } catch (error) {
            console.error('Error reading history from localStorage:', error);
            return [];
        }
    }

    static addRecord(record: HistoryRecord): void {
        if (typeof window === 'undefined') return;

        try {
            const history = this.getHistory();

            // 添加新记录到开头
            const updatedHistory = [record, ...history];

            // 限制历史记录数量
            const trimmedHistory = updatedHistory.slice(0, MAX_HISTORY_ITEMS);

            localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmedHistory));
        } catch (error) {
            console.error('Error saving to localStorage:', error);
        }
    }

    static removeRecord(id: string): void {
        if (typeof window === 'undefined') return;

        try {
            const history = this.getHistory();
            const updatedHistory = history.filter(record => record.id !== id);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedHistory));
        } catch (error) {
            console.error('Error removing from localStorage:', error);
        }
    }

    static clearHistory(): void {
        if (typeof window === 'undefined') return;

        try {
            localStorage.removeItem(STORAGE_KEY);
        } catch (error) {
            console.error('Error clearing localStorage:', error);
        }
    }

    static getRecordById(id: string): HistoryRecord | null {
        const history = this.getHistory();
        return history.find(record => record.id === id) || null;
    }

    static generateThumbnail(audioFile: File): Promise<string> {
        return new Promise((resolve) => {
            // 简化的波形缩略图生成
            // 在实际应用中，这里会使用Web Audio API分析音频
            const canvas = document.createElement('canvas');
            canvas.width = 200;
            canvas.height = 60;
            const ctx = canvas.getContext('2d')!;

            // 生成模拟波形
            ctx.fillStyle = 'rgba(139, 92, 246, 0.3)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            ctx.strokeStyle = 'rgba(139, 92, 246, 1)';
            ctx.lineWidth = 1;
            ctx.beginPath();

            for (let i = 0; i < canvas.width; i += 2) {
                const height = Math.random() * canvas.height * 0.8 + canvas.height * 0.1;
                if (i === 0) {
                    ctx.moveTo(i, height);
                } else {
                    ctx.lineTo(i, height);
                }
            }

            ctx.stroke();
            resolve(canvas.toDataURL());
        });
    }
}