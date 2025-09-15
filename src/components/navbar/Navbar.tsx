import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import LoginModal from '../auth/LoginModal';

interface NavbarProps {
    className?: string;
}

export default function Navbar({ className = "" }: NavbarProps) {
    const { user, signOut, usageStatus } = useAuth();
    const [showLoginModal, setShowLoginModal] = useState(false);
    const [showUserMenu, setShowUserMenu] = useState(false);
    const [showMobileMenu, setShowMobileMenu] = useState(false);

    const handleSignOut = async () => {
        try {
            await signOut();
            setShowUserMenu(false);
        } catch (error) {
            console.error('Error signing out:', error);
        }
    };

    const menuItems = [
        { title: "Features", path: "/#features" },
        { title: "Pricing", path: "/pricing" },
        { title: "Blog", path: "/blog" },
        { title: "About", path: "/about" },
        { title: "Contact", path: "/contact" },
    ];

    return (
        <>
            <div className={`max-w-7xl mx-auto px-6 ${className}`}>
                <header className="flex flex-col lg:flex-row justify-between items-center my-5">
                    {/* Brand Logo */}
                    <div className="flex w-full lg:w-auto items-center justify-between">
                        <a href="/" className="text-lg">
                            <span className="font-bold text-slate-800">Describe</span>
                            <span className="text-slate-500">Music</span>
                        </a>

                        {/* Mobile menu button */}
                        <button
                            onClick={() => setShowMobileMenu(!showMobileMenu)}
                            className="block lg:hidden p-2 text-gray-800 hover:text-gray-600"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                            </svg>
                        </button>
                    </div>

                    {/* Desktop Navigation */}
                    <div className="hidden lg:flex items-center gap-8">
                        {/* Navigation Links */}
                        <nav className="flex items-center gap-6">
                            {menuItems.map((item) => (
                                <a
                                    key={item.path}
                                    href={item.path}
                                    className="text-gray-600 hover:text-gray-900 transition-colors duration-200"
                                >
                                    {item.title}
                                </a>
                            ))}
                        </nav>

                        {/* Auth Section */}
                        {user ? (
                            <div className="relative">
                                <button
                                    onClick={() => setShowUserMenu(!showUserMenu)}
                                    className="flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:text-gray-900 rounded-md transition-all duration-200"
                                >
                                    <div className="w-8 h-8 bg-gradient-to-r from-violet-400 to-blue-400 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                                        {user.email?.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="text-left">
                                        <div className="text-gray-900 text-sm font-medium">{user.email}</div>
                                        {usageStatus && (
                                            <div className="text-gray-500 text-xs">
                                                {usageStatus.remaining}/{usageStatus.total} analyses
                                            </div>
                                        )}
                                    </div>
                                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </button>

                                {/* User Dropdown Menu */}
                                {showUserMenu && (
                                    <div className="absolute right-0 mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                                        <div className="p-4 border-b border-gray-200">
                                            <div className="text-gray-900 text-sm font-medium">{user.email}</div>
                                            <div className="text-gray-500 text-xs mt-1">
                                                {usageStatus?.userType === 'registered' ? 'Registered User' : 'Trial User'}
                                            </div>
                                            {usageStatus && (
                                                <div className="mt-2">
                                                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                                                        <span>Monthly Usage</span>
                                                        <span>{usageStatus.remaining}/{usageStatus.total}</span>
                                                    </div>
                                                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                                                        <div
                                                            className="bg-gradient-to-r from-violet-400 to-blue-400 h-1.5 rounded-full transition-all duration-300"
                                                            style={{ width: `${((usageStatus.total - usageStatus.remaining) / usageStatus.total) * 100}%` }}
                                                        ></div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                        <div className="p-2">
                                            <a
                                                href="/analyze"
                                                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-md transition-all duration-200"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                                                </svg>
                                                Analyze Audio
                                            </a>
                                            <button
                                                onClick={handleSignOut}
                                                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-md transition-all duration-200"
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
                            <div className="flex items-center gap-4">
                                <button
                                    onClick={() => setShowLoginModal(true)}
                                    className="text-gray-600 hover:text-gray-900 transition-colors duration-200"
                                >
                                    Log in
                                </button>
                                <a
                                    href="/analyze"
                                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors duration-200"
                                >
                                    Start Analyzing for Free
                                </a>
                            </div>
                        )}
                    </div>

                    {/* Mobile Navigation */}
                    {showMobileMenu && (
                        <div className="lg:hidden w-full mt-4">
                            <nav className="flex flex-col space-y-2">
                                {menuItems.map((item) => (
                                    <a
                                        key={item.path}
                                        href={item.path}
                                        className="px-3 py-2 text-gray-600 hover:text-gray-900 transition-colors duration-200"
                                        onClick={() => setShowMobileMenu(false)}
                                    >
                                        {item.title}
                                    </a>
                                ))}
                            </nav>

                            {/* Mobile Auth Section */}
                            <div className="flex items-center mt-4 gap-4">
                                {user ? (
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-gradient-to-r from-violet-400 to-blue-400 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                                            {user.email?.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <div className="text-gray-900 text-sm font-medium">{user.email}</div>
                                            {usageStatus && (
                                                <div className="text-gray-500 text-xs">
                                                    {usageStatus.remaining}/{usageStatus.total} analyses
                                                </div>
                                            )}
                                        </div>
                                        <button
                                            onClick={handleSignOut}
                                            className="ml-auto text-gray-600 hover:text-gray-900 text-sm"
                                        >
                                            Sign Out
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        <button
                                            onClick={() => {
                                                setShowLoginModal(true);
                                                setShowMobileMenu(false);
                                            }}
                                            className="text-gray-600 hover:text-gray-900 text-sm"
                                        >
                                            Log in
                                        </button>
                                        <a
                                            href="/analyze"
                                            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors duration-200"
                                        >
                                            Start Analyzing for Free
                                        </a>
                                    </>
                                )}
                            </div>
                        </div>
                    )}
                </header>
            </div>

            {/* Login Modal */}
            <LoginModal
                isOpen={showLoginModal}
                onClose={() => setShowLoginModal(false)}
                defaultMode="login"
            />

            {/* Click outside to close menus */}
            {(showUserMenu || showMobileMenu) && (
                <div
                    className="fixed inset-0 z-40"
                    onClick={() => {
                        setShowUserMenu(false);
                        setShowMobileMenu(false);
                    }}
                />
            )}
        </>
    );
}