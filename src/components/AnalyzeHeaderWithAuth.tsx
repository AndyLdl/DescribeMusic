/**
 * 带认证功能的analyze页面头部组件
 * 集成统一的用户账户信息下拉框
 */

import React, { useState, useEffect } from 'react';
import UserAccountDropdown from './UserAccountDropdown';

function AnalyzeHeaderContent() {
    const [showExportMenu, setShowExportMenu] = useState(false);
    const [showShareMenu, setShowShareMenu] = useState(false);

    // Close menus when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Element;
            if (!target.closest('.export-dropdown') && !target.closest('.share-dropdown')) {
                setShowExportMenu(false);
                setShowShareMenu(false);
            }
        };

        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, []);

    return (
        <header className="fixed top-0 left-0 w-full z-50 border-b border-slate-800/50">
            {/* Simplified background for tool interface */}
            <div className="absolute inset-0 bg-slate-900/95 backdrop-blur-md"></div>

            <div className="relative max-w-none px-3 sm:px-6">
                <div className="h-16 flex items-center justify-between gap-2">
                    {/* Enhanced brand logo with gradient (consistent with homepage) */}
                    <a href="/" className="group relative flex-shrink-0">
                        <div className="text-base sm:text-xl font-bold tracking-tight">
                            <span className="bg-gradient-to-r from-violet-400 via-purple-400 to-blue-400 bg-clip-text text-transparent">
                                Describe
                            </span>
                            <span className="text-white/70 group-hover:text-white/90 transition-colors duration-300">
                                Music
                            </span>
                            <span className="text-violet-400/80">.</span>
                        </div>
                        {/* Subtle glow effect on hover */}
                        <div className="absolute inset-0 bg-gradient-to-r from-violet-500/20 to-blue-500/20 rounded-lg blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10"></div>
                    </a>

                    {/* Right side navigation */}
                    <nav className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1 justify-end">
                        {/* Save/Export actions (only show when analysis results are available) */}
                        <div
                            className="hidden items-center gap-2"
                            id="export-share-container"
                            style={{ display: 'none' }}
                        >
                            {/* Export Dropdown */}
                            <div className="relative export-dropdown">
                                <button
                                    onClick={() => setShowExportMenu(!showExportMenu)}
                                    className="inline-flex items-center gap-2 px-3 py-1.5 text-sm text-slate-400 hover:text-white border border-slate-700 rounded-md hover:border-slate-600 transition-all duration-300"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                    Export
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </button>

                                {/* Export Dropdown Menu */}
                                {showExportMenu && (
                                    <div className="absolute right-0 mt-2 w-48 bg-slate-800/95 backdrop-blur-md border border-slate-700 rounded-lg shadow-xl z-50">
                                        <div className="p-2">
                                            <button
                                                onClick={() => {
                                                    // Export functionality will be handled by existing scripts
                                                    (window as any).exportAsJSON?.();
                                                    setShowExportMenu(false);
                                                }}
                                                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-300 hover:text-white hover:bg-slate-700/50 rounded-md transition-all duration-200"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                </svg>
                                                Export as JSON
                                            </button>
                                            <button
                                                onClick={() => {
                                                    (window as any).exportAsCSV?.();
                                                    setShowExportMenu(false);
                                                }}
                                                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-300 hover:text-white hover:bg-slate-700/50 rounded-md transition-all duration-200"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                                                </svg>
                                                Export as CSV
                                            </button>
                                            <button
                                                onClick={() => {
                                                    (window as any).exportReport?.();
                                                    setShowExportMenu(false);
                                                }}
                                                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-300 hover:text-white hover:bg-slate-700/50 rounded-md transition-all duration-200"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                </svg>
                                                Generate Report
                                            </button>
                                            <hr className="my-2 border-slate-600" />
                                            <button
                                                onClick={() => {
                                                    (window as any).copyAnalysisData?.();
                                                    setShowExportMenu(false);
                                                }}
                                                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-300 hover:text-white hover:bg-slate-700/50 rounded-md transition-all duration-200"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                                </svg>
                                                Copy to Clipboard
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Share Dropdown */}
                            <div className="relative share-dropdown">
                                <button
                                    onClick={() => setShowShareMenu(!showShareMenu)}
                                    className="inline-flex items-center gap-2 px-3 py-1.5 text-sm text-slate-400 hover:text-white border border-slate-700 rounded-md hover:border-slate-600 transition-all duration-300"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                                    </svg>
                                    Share
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </button>

                                {/* Share Dropdown Menu */}
                                {showShareMenu && (
                                    <div className="absolute right-0 mt-2 w-56 bg-slate-800/95 backdrop-blur-md border border-slate-700 rounded-lg shadow-xl z-50">
                                        <div className="p-2">
                                            <button
                                                onClick={() => {
                                                    (window as any).copyShareLink?.();
                                                    setShowShareMenu(false);
                                                }}
                                                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-300 hover:text-white hover:bg-slate-700/50 rounded-md transition-all duration-200"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                                                </svg>
                                                Copy Share Link
                                            </button>
                                            <button
                                                onClick={() => {
                                                    (window as any).shareViaEmail?.();
                                                    setShowShareMenu(false);
                                                }}
                                                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-300 hover:text-white hover:bg-slate-700/50 rounded-md transition-all duration-200"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                                </svg>
                                                Share via Email
                                            </button>
                                            <hr className="my-2 border-slate-600" />
                                            <button
                                                onClick={() => {
                                                    (window as any).shareToTwitter?.();
                                                    setShowShareMenu(false);
                                                }}
                                                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-300 hover:text-white hover:bg-slate-700/50 rounded-md transition-all duration-200"
                                            >
                                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                                    <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" />
                                                </svg>
                                                Share on Twitter
                                            </button>
                                            <button
                                                onClick={() => {
                                                    (window as any).shareToLinkedIn?.();
                                                    setShowShareMenu(false);
                                                }}
                                                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-300 hover:text-white hover:bg-slate-700/50 rounded-md transition-all duration-200"
                                            >
                                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                                                </svg>
                                                Share on LinkedIn
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* User Account Dropdown */}
                        <UserAccountDropdown />

                        {/* Mobile menu button */}
                        <button className="md:hidden p-2 text-slate-400 hover:text-white rounded-md hover:bg-slate-800 transition-all duration-300 flex-shrink-0">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                            </svg>
                        </button>
                    </nav>
                </div>
            </div>
        </header>
    );
}


// 导出组件，不包装Provider（由AnalyzeAppWithAuth统一提供）
export default function AnalyzeHeaderWithAuth() {
    return <AnalyzeHeaderContent />;
}