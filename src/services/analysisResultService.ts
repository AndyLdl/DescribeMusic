/**
 * 分析结果服务
 * 用于保存和读取分析结果到数据库，支持分享功能
 */

import { supabase } from '../lib/supabase';

export interface AnalysisResultData {
    id: string;
    filename: string;
    timestamp: string;
    duration: number;
    fileSize: string;
    format: string;
    thumbnail?: string;
    audioUrl?: string;
    contentType?: {
        primary: 'music' | 'speech' | 'sound-effects' | 'ambient' | 'mixed';
        confidence: number;
        description: string;
    };
    basicInfo: any;
    voiceAnalysis?: any;
    soundEffects?: any;
    emotions?: any;
    transcription?: string;  // 音频转文字内容
    quality?: any;
    similarity?: any;
    tags?: string[];
    aiDescription?: string;
    processingTime?: number;
    [key: string]: any; // 允许 other fields
}

export interface AnalysisResultWithCreator {
    data: AnalysisResultData;
    creatorId: string | null;
    creatorEmail: string | null;
    createdAt: string;
}

/**
 * 保存分析结果到数据库
 * @param resultData 完整的分析结果数据
 * @param userId 用户ID（可选）
 * @param expiresInDays 过期天数（可选，默认不设置过期时间）
 */
export async function saveAnalysisResult(
    resultData: AnalysisResultData,
    userId?: string | null,
    expiresInDays?: number
): Promise<{ success: boolean; error?: string }> {
    try {
        // 计算过期时间（如果指定了）
        let expiresAt: string | null = null;
        if (expiresInDays && expiresInDays > 0) {
            const expiryDate = new Date();
            expiryDate.setDate(expiryDate.getDate() + expiresInDays);
            expiresAt = expiryDate.toISOString();
        }

        const { error } = await supabase
            .from('analysis_results')
            .upsert({
                id: resultData.id,
                user_id: userId || null,
                result_data: resultData,
                expires_at: expiresAt,
                is_public: true,
            }, {
                onConflict: 'id', // 如果已存在则更新
            });

        if (error) {
            console.error('❌ Error saving analysis result to database:', error);
            return { success: false, error: error.message };
        }

        console.log('✅ Analysis result saved to database:', resultData.id);
        return { success: true };
    } catch (error: any) {
        console.error('❌ Exception saving analysis result:', error);
        return { success: false, error: error.message || 'Unknown error' };
    }
}

/**
 * 从数据库读取分析结果（包含创建者信息）
 * @param analysisId 分析结果ID
 */
export async function getAnalysisResult(
    analysisId: string
): Promise<{ success: boolean; data?: AnalysisResultData; creatorInfo?: { id: string | null; email: string | null; createdAt: string }; error?: string }> {
    try {
        const { data, error } = await supabase
            .from('analysis_results')
            .select('result_data, user_id, created_at')
            .eq('id', analysisId)
            .eq('is_public', true)
            .single();

        if (error) {
            // 如果记录不存在，返回成功但数据为null（让调用者处理）
            if (error.code === 'PGRST116') {
                return { success: true, data: undefined };
            }
            console.error('❌ Error fetching analysis result from database:', error);
            return { success: false, error: error.message };
        }

        if (!data || !data.result_data) {
            return { success: true, data: undefined };
        }

        // 检查是否过期
        const { data: expiryData } = await supabase
            .from('analysis_results')
            .select('expires_at')
            .eq('id', analysisId)
            .single();

        if (expiryData?.expires_at) {
            const expiresAt = new Date(expiryData.expires_at);
            if (expiresAt < new Date()) {
                console.log('⚠️ Analysis result has expired:', analysisId);
                return { success: true, data: undefined };
            }
        }

        // Note: We can't get user email from frontend without admin access
        // The creatorInfo.id will be used to check if current user is the owner
        // For display, we'll show "Shared by a user" or use a generic display name

        console.log('✅ Analysis result fetched from database:', analysisId);
        return {
            success: true,
            data: data.result_data as AnalysisResultData,
            creatorInfo: {
                id: data.user_id || null,
                email: null, // Email requires admin access, will be handled in component
                createdAt: data.created_at
            }
        };
    } catch (error: any) {
        console.error('❌ Exception fetching analysis result:', error);
        return { success: false, error: error.message || 'Unknown error' };
    }
}

/**
 * 删除分析结果（仅创建者可以删除）
 * @param analysisId 分析结果ID
 */
export async function deleteAnalysisResult(
    analysisId: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const { error } = await supabase
            .from('analysis_results')
            .delete()
            .eq('id', analysisId);

        if (error) {
            console.error('❌ Error deleting analysis result:', error);
            return { success: false, error: error.message };
        }

        console.log('✅ Analysis result deleted from database:', analysisId);
        return { success: true };
    } catch (error: any) {
        console.error('❌ Exception deleting analysis result:', error);
        return { success: false, error: error.message || 'Unknown error' };
    }
}

