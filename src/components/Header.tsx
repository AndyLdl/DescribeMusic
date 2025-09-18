import React, { useState, useEffect } from 'react';
import UserAccountDropdown from './UserAccountDropdown';

export default function Header() {
    const [showMobileMenu, setShowMobileMenu] = useState(false);
    const [showResourcesMenu, setShowResourcesMenu] = useState(false);

    // Close menus when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Element;
            if (!target.closest('.dropdown-container')) {
                setShowResourcesMenu(false);
            }
        };

        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, []);

    return (
        <>
            <header className="fixed top-0 left-0 w-full z-50">
                {/* Enhanced glassmorphism background */}
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-slate-900/40 via-slate-800/30 to-slate-900/40 backdrop-blur-2xl border-b border-white/5"></div>

                {/* Subtle gradient overlay for depth */}
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-white/[0.02] to-transparent"></div>

                <div className="relative max-w-7xl mx-auto px-6">
                    <div className="h-20 flex items-center justify-between">
                        {/* Enhanced brand logo with gradient */}
                        <a href="/" className="group relative">
                            <div className="text-2xl font-bold tracking-tight">
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

                        {/* Desktop navigation */}
                        <nav className="hidden md:flex items-center gap-6">
                            {/* Product */}
                            <a
                                href="/analyze/"
                                className="relative text-slate-300/90 hover:text-white transition-all duration-300 group"
                            >
                                <span className="relative z-10">Music Analyzer</span>
                                <div className="absolute inset-x-0 -bottom-1 h-px bg-gradient-to-r from-violet-400 to-blue-400 scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></div>
                            </a>

                            {/* Resources dropdown */}
                            <div className="relative dropdown-container">
                                <button
                                    onClick={() => setShowResourcesMenu(!showResourcesMenu)}
                                    className="relative text-slate-300/90 hover:text-white transition-all duration-300 flex items-center gap-1"
                                >
                                    <span className="relative z-10">Resources</span>
                                    <svg
                                        className={`w-3 h-3 transition-transform ${showResourcesMenu ? 'rotate-180' : ''}`}
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                    <div className="absolute inset-x-0 -bottom-1 h-px bg-gradient-to-r from-violet-400 to-blue-400 scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></div>
                                </button>

                                {/* Resources dropdown menu */}
                                {showResourcesMenu && (
                                    <div className="absolute top-full left-0 mt-2 w-56 bg-slate-800/95 backdrop-blur-md border border-slate-700 rounded-lg shadow-xl z-50">
                                        <div className="p-2">
                                            <a
                                                href="/pricing"
                                                className="flex items-center gap-3 px-3 py-2 text-sm text-slate-300 hover:text-white hover:bg-slate-700/50 rounded-md transition-all duration-200"
                                            >
                                                <svg className="w-4 h-4 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                                                </svg>
                                                <div>
                                                    <div className="font-medium">Pricing</div>
                                                    <div className="text-xs text-slate-500">Launch special</div>
                                                </div>
                                            </a>
                                            <a
                                                href="/blog/"
                                                className="flex items-center gap-3 px-3 py-2 text-sm text-slate-300 hover:text-white hover:bg-slate-700/50 rounded-md transition-all duration-200"
                                            >
                                                <svg className="w-4 h-4 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                </svg>
                                                <div>
                                                    <div className="font-medium">Blog</div>
                                                    <div className="text-xs text-slate-500">Tutorials & insights</div>
                                                </div>
                                            </a>
                                            <a
                                                href="/about/"
                                                className="flex items-center gap-3 px-3 py-2 text-sm text-slate-300 hover:text-white hover:bg-slate-700/50 rounded-md transition-all duration-200"
                                            >
                                                <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                                <div>
                                                    <div className="font-medium">About</div>
                                                    <div className="text-xs text-slate-500">Our technology</div>
                                                </div>
                                            </a>
                                            <a
                                                href="/contact/"
                                                className="flex items-center gap-3 px-3 py-2 text-sm text-slate-300 hover:text-white hover:bg-slate-700/50 rounded-md transition-all duration-200"
                                            >
                                                <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                                </svg>
                                                <div>
                                                    <div className="font-medium">Contact</div>
                                                    <div className="text-xs text-slate-500">Get support</div>
                                                </div>
                                            </a>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Auth Section */}
                            <UserAccountDropdown />
                        </nav>

                        {/* Mobile menu button */}
                        <div className="md:hidden">
                            <button
                                onClick={() => setShowMobileMenu(!showMobileMenu)}
                                className="relative p-2 text-white/80 hover:text-white transition-colors duration-300 group"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                                </svg>
                                <div className="absolute inset-0 bg-white/5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                            </button>
                        </div>
                    </div>

                    {/* Mobile menu */}
                    {showMobileMenu && (
                        <div className="md:hidden absolute top-full left-0 w-full bg-slate-900/95 backdrop-blur-md border-b border-slate-800/50 z-50">
                            <div className="px-6 py-4 space-y-3">
                                <a
                                    href="/analyze/"
                                    className="block px-3 py-2 text-slate-300 hover:text-white hover:bg-slate-800/50 rounded-md transition-all duration-200"
                                    onClick={() => setShowMobileMenu(false)}
                                >
                                    Audio Analysis
                                </a>

                                <a
                                    href="/#features"
                                    className="block px-3 py-2 text-slate-300 hover:text-white hover:bg-slate-800/50 rounded-md transition-all duration-200"
                                    onClick={() => setShowMobileMenu(false)}
                                >
                                    Features
                                </a>

                                {/* Resources section */}
                                <div className="space-y-2">
                                    <div className="px-3 py-1 text-sm font-medium text-slate-400 uppercase tracking-wide">
                                        Resources
                                    </div>
                                    <a
                                        href="/blog"
                                        className="block px-6 py-2 text-slate-300 hover:text-white hover:bg-slate-800/50 rounded-md transition-all duration-200 text-sm"
                                        onClick={() => setShowMobileMenu(false)}
                                    >
                                        Blog
                                    </a>
                                    <a
                                        href="/about"
                                        className="block px-6 py-2 text-slate-300 hover:text-white hover:bg-slate-800/50 rounded-md transition-all duration-200 text-sm"
                                        onClick={() => setShowMobileMenu(false)}
                                    >
                                        About
                                    </a>
                                    <a
                                        href="/contact"
                                        className="block px-6 py-2 text-slate-300 hover:text-white hover:bg-slate-800/50 rounded-md transition-all duration-200 text-sm"
                                        onClick={() => setShowMobileMenu(false)}
                                    >
                                        Contact
                                    </a>
                                </div>

                                <a
                                    href="/pricing"
                                    className="block px-3 py-2 text-slate-300 hover:text-white hover:bg-slate-800/50 rounded-md transition-all duration-200"
                                    onClick={() => setShowMobileMenu(false)}
                                >
                                    Pricing
                                </a>

                                {/* Auth Section for Mobile */}
                                <div className="pt-4 border-t border-slate-800">
                                    {user ? (
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-3 px-3 py-2">
                                                <div className="w-8 h-8 bg-gradient-to-r from-violet-400 to-blue-400 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                                                    {user.email?.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <div className="text-white text-sm font-medium">{user.email}</div>
                                                    <div className="text-slate-400 text-xs">
                                                        {creditLoading ? '加载中...' : `${credits} 积分`}
                                                    </div>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => {
                                                    handleSignOut();
                                                    setShowMobileMenu(false);
                                                }}
                                                className="w-full text-left px-3 py-2 text-slate-300 hover:text-white hover:bg-slate-800/50 rounded-md transition-all duration-200"
                                            >
                                                Sign Out
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {/* Trial Credits Display for Mobile */}
                                            <div className="px-3 py-3 bg-gradient-to-r from-blue-500/10 to-violet-500/10 border border-blue-500/20 rounded-lg">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                                                    </svg>
                                                    <span className="text-blue-400 font-semibold">Free Trial</span>
                                                </div>
                                                <div className="text-white text-lg font-bold">
                                                    {trialCredits} Credits Available
                                                </div>
                                                <div className="text-slate-400 text-sm">
                                                    Start analyzing music for free
                                                </div>
                                            </div>

                                            <a
                                                href="/analyze/"
                                                className="block w-full text-center px-6 py-3 bg-gradient-to-r from-violet-500 to-blue-500 text-white rounded-lg hover:from-violet-600 hover:to-blue-600 transition-all duration-300 font-medium"
                                                onClick={() => setShowMobileMenu(false)}
                                            >
                                                Start Analyzing
                                            </a>

                                            <a
                                                href="/analyze/"
                                                className="w-full text-center px-3 py-2 text-slate-400 hover:text-white border border-slate-600 hover:border-slate-500 rounded-lg transition-all duration-200"
                                                onClick={() => setShowMobileMenu(false)}
                                            >
                                                Sign In for More Features
                                            </a>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </header>



            {/* Click outside overlay for mobile menu */}
            {showMobileMenu && (
                <div
                    className="fixed inset-0 bg-black/20 z-40 md:hidden"
                    onClick={() => setShowMobileMenu(false)}
                />
            )}
        </>
    );
}