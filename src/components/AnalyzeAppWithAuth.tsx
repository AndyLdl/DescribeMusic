/**
 * 带认证功能的音频分析应用包装组件
 * 集成AuthProvider和使用限制检查
 */

import React from 'react';
import { AuthProvider } from '../contexts/AuthContext';
import AnalyzeApp from './AnalyzeApp';

// 主要的导出组件，包装了AuthProvider
export default function AnalyzeAppWithAuth() {
    return (
        <AuthProvider>
            <AnalyzeApp />
        </AuthProvider>
    );
}