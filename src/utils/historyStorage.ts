export interface HistoryRecord {
    id: string;
    filename: string;
    timestamp: string;
    duration: number;
    fileSize: string;
    format: string;
    thumbnail?: string; // Base64 encoded waveform preview
    userId?: string; // Associated user ID (if logged in)
    audioUrl?: string; // Firebase Storage URL for audio playback (7 days validity)
    contentType?: {
        primary: 'music' | 'speech' | 'sound-effects' | 'ambient' | 'mixed';
        confidence: number;
        description: string;
    };
    basicInfo: {
        genre: string;
        mood: string;
        bpm: number;
        key: string;
        energy: number;
        valence: number;
        danceability: number;
    };
    voiceAnalysis?: {
        hasVoice: boolean;
        speakerCount: number;
        genderDetection: {
            primary: 'male' | 'female' | 'unknown';
            confidence: number;
            multipleGenders: boolean;
        };
        speakerEmotion: {
            primary: 'happy' | 'sad' | 'angry' | 'calm' | 'excited' | 'nervous' | 'confident' | 'stressed' | 'neutral';
            confidence: number;
            emotions: {
                happy: number;
                sad: number;
                angry: number;
                calm: number;
                excited: number;
                nervous: number;
                confident: number;
                stressed: number;
            };
        };
        speechClarity: {
            score: number;
            pronunciation: number;
            articulation: number;
            pace: 'slow' | 'normal' | 'fast';
            volume: 'quiet' | 'normal' | 'loud';
        };
        vocalCharacteristics: {
            pitchRange: 'low' | 'medium' | 'high';
            speakingRate: number;
            pauseFrequency: 'low' | 'medium' | 'high';
            intonationVariation: number;
        };
        languageAnalysis: {
            language: string;
            confidence: number;
            accent: string;
        };
        audioQuality: {
            backgroundNoise: number;
            echo: number;
            compression: number;
            overall: number;
        };
    };
    soundEffects?: {
        detected: Array<{
            category: 'nature' | 'urban' | 'indoor' | 'mechanical' | 'human' | 'animal' | 'event';
            type: string;
            confidence: number;
            timestamp: { start: number; end: number };
            description: string;
        }>;
        environment: {
            location_type: 'indoor' | 'outdoor' | 'mixed';
            setting: 'urban' | 'rural' | 'natural' | 'domestic' | 'commercial';
            activity_level: 'busy' | 'moderate' | 'calm' | 'isolated';
            acoustic_space: 'small' | 'medium' | 'large' | 'open';
            time_of_day: 'unknown' | 'morning' | 'day' | 'evening' | 'night';
            weather: 'unknown' | 'clear' | 'rain' | 'wind' | 'storm';
        };
    };
    quickStats: {
        qualityScore: number;
        emotionalTone: string;
        primaryGenre: string;
    };
    // Full analysis data for complete display
    emotions?: {
        happy: number;
        sad: number;
        angry: number;
        calm: number;
        excited: number;
        melancholic?: number;
        energetic?: number;
        peaceful?: number;
        tense?: number;
        relaxed?: number;
    };
    structure?: {
        [key: string]: { start: number; end: number } | any;
    };
    quality?: {
        overall: number;
        clarity: number;
        loudness: number;
        dynamic_range: number;
        noise_level: number;
        distortion?: number;
        frequency_balance?: number;
    };
    similarity?: {
        similar_tracks: Array<{
            title: string;
            artist: string;
            similarity: number;
        }>;
    };
    tags?: string[];
    aiDescription?: string;
    processingTime?: number;
}

const STORAGE_KEY = 'describe_music_history';
const MAX_HISTORY_ITEMS = 50; // Limit history items count

export class HistoryStorage {
    /**
     * Get all history records (legacy method for backward compatibility)
     */
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

    /**
     * Get history records for a specific user
     */
    static getUserHistory(userId: string): HistoryRecord[] {
        const allHistory = this.getHistory();
        return allHistory.filter(record => record.userId === userId);
    }

    /**
     * Get anonymous history records (no userId)
     */
    static getAnonymousHistory(): HistoryRecord[] {
        const allHistory = this.getHistory();
        return allHistory.filter(record => !record.userId);
    }

    /**
     * Get history records for current user context
     */
    static async getCurrentUserHistory(): Promise<HistoryRecord[]> {
        try {
            // Try to get current user from Supabase
            const { supabase } = await import('../lib/supabase');
            const { data: { user } } = await supabase.auth.getUser();

            if (user) {
                return this.getUserHistory(user.id);
            } else {
                return this.getAnonymousHistory();
            }
        } catch (error) {
            console.error('Error getting current user history:', error);
            return this.getAnonymousHistory();
        }
    }

    /**
     * Add a record to history (legacy method)
     */
    static addRecord(record: HistoryRecord): void {
        if (typeof window === 'undefined') return;

        try {
            const history = this.getHistory();

            // Add new record to the beginning
            const updatedHistory = [record, ...history];

            // Limit history items count
            const trimmedHistory = updatedHistory.slice(0, MAX_HISTORY_ITEMS);

            localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmedHistory));
        } catch (error) {
            console.error('Error saving to localStorage:', error);
        }
    }

    /**
     * Add a record with automatic user association
     */
    static async addRecordWithUser(record: Omit<HistoryRecord, 'userId'>): Promise<void> {
        if (typeof window === 'undefined') return;

        try {
            // Try to get current user from Supabase
            let userId: string | undefined;
            try {
                const { supabase } = await import('../lib/supabase');
                const { data: { user } } = await supabase.auth.getUser();
                userId = user?.id;
            } catch (error) {
                console.warn('Could not get current user for history record:', error);
            }

            // Create record with user ID if available
            const recordWithUser: HistoryRecord = {
                ...record,
                userId
            };

            this.addRecord(recordWithUser);
        } catch (error) {
            console.error('Error adding record with user:', error);
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

    /**
     * Clear history for a specific user
     */
    static clearUserHistory(userId: string): void {
        if (typeof window === 'undefined') return;

        try {
            const allHistory = this.getHistory();
            const filteredHistory = allHistory.filter(record => record.userId !== userId);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(filteredHistory));
        } catch (error) {
            console.error('Error clearing user history:', error);
        }
    }

    /**
     * Migrate anonymous history records to a user account
     */
    static async migrateAnonymousHistoryToUser(userId: string): Promise<number> {
        if (typeof window === 'undefined') return 0;

        try {
            const allHistory = this.getHistory();
            let migratedCount = 0;

            const updatedHistory = allHistory.map(record => {
                if (!record.userId) {
                    migratedCount++;
                    return { ...record, userId };
                }
                return record;
            });

            if (migratedCount > 0) {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedHistory));
                console.log(`Migrated ${migratedCount} anonymous history records to user ${userId}`);
            }

            return migratedCount;
        } catch (error) {
            console.error('Error migrating anonymous history:', error);
            return 0;
        }
    }

    /**
     * Get history statistics for a user
     */
    static getUserHistoryStats(userId?: string): {
        totalRecords: number;
        totalDuration: number;
        averageQuality: number;
        mostCommonGenre: string;
        mostCommonMood: string;
    } {
        const history = userId ? this.getUserHistory(userId) : this.getAnonymousHistory();

        if (history.length === 0) {
            return {
                totalRecords: 0,
                totalDuration: 0,
                averageQuality: 0,
                mostCommonGenre: 'Unknown',
                mostCommonMood: 'Unknown'
            };
        }

        const totalDuration = history.reduce((sum, record) => sum + record.duration, 0);
        const averageQuality = history.reduce((sum, record) => sum + record.quickStats.qualityScore, 0) / history.length;

        // Find most common genre
        const genreCounts: Record<string, number> = {};
        history.forEach(record => {
            const genre = record.basicInfo.genre || 'Unknown';
            genreCounts[genre] = (genreCounts[genre] || 0) + 1;
        });
        const mostCommonGenre = Object.keys(genreCounts).reduce((a, b) =>
            genreCounts[a] > genreCounts[b] ? a : b, 'Unknown'
        );

        // Find most common mood
        const moodCounts: Record<string, number> = {};
        history.forEach(record => {
            const mood = record.basicInfo.mood || 'Unknown';
            moodCounts[mood] = (moodCounts[mood] || 0) + 1;
        });
        const mostCommonMood = Object.keys(moodCounts).reduce((a, b) =>
            moodCounts[a] > moodCounts[b] ? a : b, 'Unknown'
        );

        return {
            totalRecords: history.length,
            totalDuration,
            averageQuality,
            mostCommonGenre,
            mostCommonMood
        };
    }

    static getRecordById(id: string): HistoryRecord | null {
        const history = this.getHistory();
        return history.find(record => record.id === id) || null;
    }

    static generateThumbnail(audioFile: File): Promise<string> {
        return new Promise((resolve) => {
            // Simplified waveform thumbnail generation
            // In real applications, this would use Web Audio API to analyze audio
            const canvas = document.createElement('canvas');
            canvas.width = 200;
            canvas.height = 60;
            const ctx = canvas.getContext('2d')!;

            // Generate simulated waveform
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