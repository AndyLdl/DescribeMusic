/**
 * Supabase client configuration
 * For frontend authentication and database operations
 */

import { createClient } from '@supabase/supabase-js';

// Get Supabase configuration from environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://fsmgroeytsburlgmoxcj.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validate required environment variables
if (!supabaseAnonKey) {
    console.error('❌ Missing VITE_SUPABASE_ANON_KEY environment variable');
    throw new Error('VITE_SUPABASE_ANON_KEY is required but not found in environment variables');
}

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        // Configure authentication options
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        // 修复生产环境会话存储问题
        storage: typeof window !== 'undefined' ? window.localStorage : undefined,
        storageKey: 'supabase.auth.token',
        // 添加生产环境兼容性配置
        flowType: 'pkce',
        debug: import.meta.env.DEV,
    },
    // Configure realtime subscriptions (if needed)
    realtime: {
        params: {
            eventsPerSecond: 10,
        },
    },
    // 添加全局配置
    global: {
        headers: {
            'X-Client-Info': 'describe-music-web',
        },
    },
});

// Database table type definitions
export interface Database {
    public: {
        Tables: {
            user_profiles: {
                Row: {
                    id: string;
                    created_at: string;
                    updated_at: string;
                    monthly_limit: number;
                    current_month_usage: number;
                    last_reset_date: string;
                    preferences: Record<string, any>;
                    total_analyses: number;
                    deleted_at: string | null;
                };
                Insert: {
                    id: string;
                    monthly_limit?: number;
                    current_month_usage?: number;
                    preferences?: Record<string, any>;
                    total_analyses?: number;
                };
                Update: {
                    monthly_limit?: number;
                    current_month_usage?: number;
                    preferences?: Record<string, any>;
                    total_analyses?: number;
                };
            };
            device_fingerprints: {
                Row: {
                    id: string;
                    fingerprint_hash: string;
                    trial_usage: number;
                    created_at: string;
                    last_used_at: string;
                    user_id: string | null;
                    metadata: Record<string, any>;
                    deleted_at: string | null;
                };
                Insert: {
                    fingerprint_hash: string;
                    trial_usage?: number;
                    user_id?: string | null;
                    metadata?: Record<string, any>;
                };
                Update: {
                    trial_usage?: number;
                    last_used_at?: string;
                    user_id?: string | null;
                    metadata?: Record<string, any>;
                };
            };
            usage_logs: {
                Row: {
                    id: string;
                    user_id: string | null;
                    device_fingerprint_id: string | null;
                    analysis_type: string;
                    created_at: string;
                    file_name: string | null;
                    file_size: number | null;
                    file_format: string | null;
                    processing_time: number | null;
                    success: boolean;
                    error_message: string | null;
                    analysis_result_id: string | null;
                    result_summary: Record<string, any>;
                };
                Insert: {
                    user_id?: string | null;
                    device_fingerprint_id?: string | null;
                    analysis_type?: string;
                    file_name?: string | null;
                    file_size?: number | null;
                    file_format?: string | null;
                    processing_time?: number | null;
                    success?: boolean;
                    error_message?: string | null;
                    analysis_result_id?: string | null;
                    result_summary?: Record<string, any>;
                };
                Update: {
                    success?: boolean;
                    error_message?: string | null;
                    result_summary?: Record<string, any>;
                };
            };
        };
        Views: {
            user_usage_stats: {
                Row: {
                    user_id: string;
                    monthly_limit: number;
                    current_month_usage: number;
                    total_analyses: number;
                    last_reset_date: string;
                    remaining_this_month: number;
                    usage_percentage: number;
                    last_analysis_at: string | null;
                    this_month_analyses: number;
                };
            };
            device_fingerprint_stats: {
                Row: {
                    id: string;
                    fingerprint_hash: string;
                    trial_usage: number;
                    created_at: string;
                    last_used_at: string;
                    user_id: string | null;
                    remaining_trials: number;
                    is_registered: boolean;
                    last_usage_at: string | null;
                };
            };
        };
        Functions: {
            can_user_analyze: {
                Args: { user_uuid: string };
                Returns: boolean;
            };
            can_device_analyze: {
                Args: { fingerprint_hash_param: string };
                Returns: boolean;
            };
            record_analysis_usage: {
                Args: {
                    user_uuid?: string;
                    fingerprint_hash_param?: string;
                    file_name_param?: string;
                    file_size_param?: number;
                    file_format_param?: string;
                    processing_time_param?: number;
                    success_param?: boolean;
                    error_message_param?: string;
                    analysis_result_id_param?: string;
                    result_summary_param?: Record<string, any>;
                };
                Returns: string;
            };
            check_device_fingerprint_usage: {
                Args: { fingerprint_hash_param: string };
                Returns: {
                    can_analyze: boolean;
                    remaining_trials: number;
                    is_registered: boolean;
                }[];
            };
            check_user_monthly_limit: {
                Args: { user_uuid: string };
                Returns: {
                    can_analyze: boolean;
                    remaining_analyses: number;
                    monthly_limit: number;
                    current_usage: number;
                    reset_date: string;
                }[];
            };
            associate_device_fingerprint_to_user: {
                Args: {
                    fingerprint_hash_param: string;
                    user_uuid: string;
                };
                Returns: boolean;
            };
        };
    };
}

// Export typed Supabase client
export type SupabaseClient = typeof supabase;
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];
export type Inserts<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert'];
export type Updates<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update'];

// Authentication related types
export type User = {
    id: string;
    email?: string;
    created_at: string;
    updated_at: string;
    email_confirmed_at?: string;
    last_sign_in_at?: string;
    user_metadata?: Record<string, any>;
    app_metadata?: Record<string, any>;
};

export type Session = {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    expires_at?: number;
    token_type: string;
    user: User;
};

export type AuthResponse = {
    data: {
        user: User | null;
        session: Session | null;
    };
    error: Error | null;
};

// Usage status types
export interface UsageStatus {
    allowed: boolean;
    remaining: number;
    total: number;
    resetDate?: Date;
    requiresAuth: boolean;
    userType: 'trial' | 'registered';
    message?: string;
}

// Device fingerprint status types
export interface DeviceUsageStatus {
    canAnalyze: boolean;
    remainingTrials: number;
    isRegistered: boolean;
}

// User usage statistics types
export interface UserUsageStats {
    userId: string;
    monthlyLimit: number;
    currentMonthUsage: number;
    totalAnalyses: number;
    lastResetDate: string;
    remainingThisMonth: number;
    usagePercentage: number;
    lastAnalysisAt: string | null;
    thisMonthAnalyses: number;
}

// Export default client
export default supabase;