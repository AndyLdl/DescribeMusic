/**
 * 带认证功能的首页头部组件包装
 * 集成AuthProvider和认证状态管理
 */

import React from 'react';
import { AuthProvider } from '../contexts/AuthContext';
import Header from './Header';

// 主要的导出组件，包装了AuthProvider
export default function HeaderWithAuth() {
    return (
        <AuthProvider>
            <Header />
        </AuthProvider>
    );
}