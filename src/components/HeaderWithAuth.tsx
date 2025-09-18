/**
 * 带认证功能的首页头部组件包装
 * 集成AuthProvider、CreditProvider和认证状态管理
 */

import React from 'react';
import { AuthProvider } from '../contexts/AuthContext';
import { CreditProvider } from '../contexts/CreditContext';
import Header from './Header';

// 主要的导出组件，包装了AuthProvider和CreditProvider
export default function HeaderWithAuth() {
    return (
        <AuthProvider>
            <CreditProvider>
                <Header />
            </CreditProvider>
        </AuthProvider>
    );
}