import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import LoginModal from './auth/LoginModal';

export default function AnalyzeHeader() {
    const { user, signOut, usageStatus } = useAuth();
    const [showLoginModal, setShowLoginModal] = useState(false);
    const [showUserMenu, setShowUserMenu] = useState(false);
    const [showExportButtons, setShowExportButtons] = useState(false);
    const [showExportMenu, setShowExportMenu] = useState(false);
    const [showShareMenu, setShowShareMenu] = useState(false);

    // Listen for analysis result events to show/hide export buttons
    useEffect(() => {
        const handleAnalysisReady = () => setShowExportButtons(true);
        const handleAnalysisCleared = () => setShowExportButtons(false);

        window.addEventListener('analysisResultReady', handleAnalysisReady);
        window.addEventListener('analysisResultCleared', handleAnalysisCleared);

        return () => {
            window.removeEventListener('analysisResultReady', handleAnalysisReady);
            window.removeEventListener('analysisResultCleared', handleAnalysisCleared);
        };
    }, []);

    const handleSignOut = async () => {
        try {
            console.log('Starting sign out process...');
            await signOut();
            console.log('Sign out successful');
            setShowUserMenu(false);

            // 重定向到首页
            window.location.href = '/';
        } catch (error) {
            console.error('Error signing out:', error);
            alert('Failed to sign out. Please try again.');
        }
    };

    // Export functionality
    const getCurrentAnalysisData = () => {
        const currentResult = (window as any).currentAnalysisResult;
        const result = currentResult || (window as any).backupAnalysisResult;

        if (!result) {
            return {
                filename: "no-analysis-available.mp3",
                timestamp: new Date().toISOString(),
                duration: 0,
                format: "Unknown",
                basicInfo: { genre: "Unknown", mood: "Unknown", bpm: 0 },
                emotions: { happy: 0, sad: 0, angry: 0, calm: 0, excited: 0 },
                quality: { overall: 0, clarity: 0 },
                tags: ["no-analysis-available"],
            };
        }

        return result;
    };

    const downloadFile = (filename: string, content: string, mimeType: string) => {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const getCleanFilename = (filename: string) => {
        if (!filename || filename === "no-analysis-available.mp3") {
            return "audio-analysis";
        }
        const lastDotIndex = filename.lastIndexOf(".");
        if (lastDotIndex > 0) {
            return filename.substring(0, lastDotIndex);
        }
        return filename;
    };

    const exportAsJSON = () => {
        const data = getCurrentAnalysisData();
        const cleanFilename = getCleanFilename(data.filename);
        const jsonString = JSON.stringify(data, null, 2);
        downloadFile(`${cleanFilename}-analysis.json`, jsonString, "application/json");
        setShowExportMenu(false);
    };

    const exportAsCSV = () => {
        const data = getCurrentAnalysisData();
        const cleanFilename = getCleanFilename(data.filename);

        // Simple CSV conversion
        const csvRows = [
            ['Property', 'Value'],
            ['Filename', data.filename],
            ['Genre', data.basicInfo?.genre || 'Unknown'],
            ['Mood', data.basicInfo?.mood || 'Unknown'],
            ['BPM', data.basicInfo?.bpm || 0],
            ['Quality Score', data.quality?.overall || 0],
            ['Duration', data.duration || 0],
        ];

        const csvContent = csvRows.map(row => row.join(',')).join('\n');
        downloadFile(`${cleanFilename}-analysis.csv`, csvContent, "text/csv");
        setShowExportMenu(false);
    };

    const copyAnalysisData = async () => {
        const data = getCurrentAnalysisData();
        const summary = `Audio Analysis Summary:
Filename: ${data.filename}
Genre: ${data.basicInfo?.genre || 'Unknown'}
Mood: ${data.basicInfo?.mood || 'Unknown'}
BPM: ${data.basicInfo?.bpm || 0}
Quality: ${data.quality?.overall || 0}/10`;

        try {
            await navigator.clipboard.writeText(summary);
            alert('Analysis data copied to clipboard!');
        } catch (error) {
            console.error('Failed to copy to clipboard:', error);
        }
        setShowExportMenu(false);
    };

    const copyShareLink = async () => {
        try {
            await navigator.clipboard.writeText(window.location.href);
            alert('Share link copied to clipboard!');
        } catch (error) {
            console.error('Failed to copy to clipboard:', error);
        }
        setShowShareMenu(false);
    };

    return (
        <>
            <header className="fixed top-0 left-0 w-full z-50 border-b border-slate-800/50">
                <div className="absolute inset-0 bg-slate-900/95 backdrop-blur-md"></div>

                <div className="relative max-w-none px-6">
                    <div className="h-16 flex items-center justify-between">
                        {/* Brand Logo */}
                        <a href="/" className="group relative">
                            <div className="text-xl font-bold tracking-tight">
                                <span className="bg-gradient-to-r from-violet-400 via-purple-400 to-blue-400 bg-clip-text text-transparent">
                                    Describe
                                </span>
                                <span className="text-white/70 group-hover:text-white/90 transition-colors duration-300">
                                    Music
                                </span>
                                <span className="text-violet-400/80">.</span>
                            </div>
                            <div className="absolute inset-0 bg-gradient-to-r from-violet-500/20 to-blue-500/20 rounded-lg blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10"></div>
                        </a>

                        {/* Right side navigation */}
                        <nav className="flex items-center gap-4">
                            {/* Export/Share buttons - only show when analysis is available */}
                            {showExportButtons && (
                                <div className="hidden md:flex items-center gap-2">
                                    {/* Export Dropdown */}
                                    <div className="relative">
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
                                                        onClick={exportAsJSON}
                                                        className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-300 hover:text-white hover:bg-slate-700/50 rounded-md transition-all duration-200"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                        </svg>
                                                        Export as JSON
                                                    </button>
                                                    <button
                                                        onClick={exportAsCSV}
                                                        className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-300 hover:text-white hover:bg-slate-700/50 rounded-md transition-all duration-200"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                                        </svg>
                                                        Export as CSV
                                                    </button>
                                                    <hr className="my-2 border-slate-600" />
                                                    <button
                                                        onClick={copyAnalysisData}
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
                                    <div className="relative">
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
                                                        onClick={copyShareLink}
                                                        className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-300 hover:text-white hover:bg-slate-700/50 rounded-md transition-all duration-200"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                                                        </svg>
                                                        Copy Share Link
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Pricing Link */}
                            <a
                                href="/pricing"
                                className="inline-flex items-center gap-2 px-3 py-1.5 text-sm text-slate-400 hover:text-white border border-slate-700 rounded-md hover:border-slate-600 transition-all duration-300"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                                </svg>
                                Launch Special
                            </a>

                            {/* User Authentication Section */}
                            {user ? (
                                <div className="relative">
                                    <button
                                        onClick={() => setShowUserMenu(!showUserMenu)}
                                        className="flex items-center gap-3 px-3 py-1.5 text-sm text-white bg-slate-800 hover:bg-slate-700 rounded-md transition-all duration-300"
                                    >
                                        <div className="w-6 h-6 bg-gradient-to-r from-violet-400 to-blue-400 rounded-full flex items-center justify-center text-white text-xs font-semibold">
                                            {user.email?.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="hidden md:block text-left">
                                            <div className="text-white text-sm">{user.email}</div>
                                            {usageStatus && (
                                                <div className="text-slate-400 text-xs">
                                                    {usageStatus.remaining}/{usageStatus.total} analyses
                                                </div>
                                            )}
                                        </div>
                                        <svg className="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </button>

                                    {/* User Dropdown Menu */}
                                    {showUserMenu && (
                                        <div className="absolute right-0 mt-2 w-64 bg-slate-800/95 backdrop-blur-md border border-slate-700 rounded-lg shadow-xl z-50">
                                            <div className="p-4 border-b border-slate-700">
                                                <div className="text-white text-sm font-medium">{user.email}</div>
                                                <div className="text-slate-400 text-xs mt-1">
                                                    {usageStatus?.userType === 'registered' ? 'Registered User' : 'Trial User'}
                                                </div>
                                                {usageStatus && (
                                                    <div className="mt-2">
                                                        <div className="flex justify-between text-xs text-slate-400 mb-1">
                                                            <span>Monthly Usage</span>
                                                            <span>{usageStatus.remaining}/{usageStatus.total}</span>
                                                        </div>
                                                        <div className="w-full bg-slate-700 rounded-full h-1.5">
                                                            <div
                                                                className="bg-gradient-to-r from-violet-400 to-blue-400 h-1.5 rounded-full transition-all duration-300"
                                                                style={{ width: `${((usageStatus.total - usageStatus.remaining) / usageStatus.total) * 100}%` }}
                                                            ></div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="p-2">
                                                <button
                                                    onClick={() => {
                                                        setShowUserMenu(false);
                                                        // Navigate to account settings if available
                                                    }}
                                                    className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-300 hover:text-white hover:bg-slate-700/50 rounded-md transition-all duration-200"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                                    </svg>
                                                    Account Settings
                                                </button>
                                                <button
                                                    onClick={handleSignOut}
                                                    className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-300 hover:text-white hover:bg-slate-700/50 rounded-md transition-all duration-200"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                                    </svg>
                                                    Sign Out
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => setShowLoginModal(true)}
                                        className="text-slate-400 hover:text-white text-sm transition-colors duration-300"
                                    >
                                        Sign In
                                    </button>
                                    <button
                                        onClick={() => setShowLoginModal(true)}
                                        className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-violet-500 to-blue-500 text-white text-sm font-medium rounded-md hover:from-violet-600 hover:to-blue-600 transition-all duration-300"
                                    >
                                        Get Started
                                    </button>
                                </div>
                            )}

                            {/* Mobile menu button */}
                            <button className="md:hidden p-2 text-slate-400 hover:text-white rounded-md hover:bg-slate-800 transition-all duration-300">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                                </svg>
                            </button>
                        </nav>
                    </div>
                </div>
            </header>

            {/* Login Modal */}
            <LoginModal
                isOpen={showLoginModal}
                onClose={() => setShowLoginModal(false)}
                defaultMode="login"
            />

            {/* Click outside to close menus */}
            {(showUserMenu || showExportMenu || showShareMenu) && (
                <div
                    className="fixed inset-0 z-40"
                    onClick={() => {
                        setShowUserMenu(false);
                        setShowExportMenu(false);
                        setShowShareMenu(false);
                    }}
                />
            )}
        </>
    );
}