/**
 * 带认证功能的音频分析应用包装组件
 * 集成AuthProvider和使用限制检查，包含完整的页面结构
 */

import React from 'react';
import { AuthProvider } from '../contexts/AuthContext';
import { CreditProvider } from '../contexts/CreditContext';
import AnalyzeHeaderWithAuth from './AnalyzeHeaderWithAuth';
import AnalyzeApp from './AnalyzeApp';

// 主要的导出组件，包装了AuthProvider和完整页面结构
export default function AnalyzeAppWithAuth() {
    console.log('🔥 AnalyzeAppWithAuth component rendered/re-mounted');

    React.useEffect(() => {
        console.log('🔥 AnalyzeAppWithAuth mounted');
        return () => {
            console.log('🔥 AnalyzeAppWithAuth unmounted');
        };
    }, []);

    return (
        <AuthProvider>
            <CreditProvider>
                <AnalyzeHeaderWithAuth />
                <AnalyzeApp />
            </CreditProvider>
        </AuthProvider>
    );
}