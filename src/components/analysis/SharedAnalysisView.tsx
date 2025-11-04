/**
 * Shared Analysis View Component
 * Branded sharing page for non-owners viewing shared analysis results
 */

import React from 'react';
import DashboardSection from '../analyze/DashboardSection';
import { useAuth } from '../../contexts/AuthContext';

interface SharedAnalysisViewProps {
  analysisResult: any;
  creatorId: string | null;
  createdAt: string;
}

export default function SharedAnalysisView({ 
  analysisResult, 
  creatorId,
  createdAt 
}: SharedAnalysisViewProps) {
  const { user } = useAuth();

  // Get creator display name
  const getCreatorDisplayName = () => {
    if (!creatorId) {
      return 'Anonymous User';
    }
    // If current user is the creator, show "You"
    if (user && user.id === creatorId) {
      return 'You';
    }
    // Otherwise show generic name
    return 'a user';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  return (
    <>
      {/* Hide the layout footer for shared view */}
      <style>{`
        body > footer {
          display: none !important;
        }
      `}</style>
      
      <div className="min-h-screen bg-dark-bg">
        {/* Modern Header - Bold & Clean */}
        <header className="fixed top-0 left-0 w-full z-50 backdrop-blur-xl bg-slate-900/80">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            {/* Logo */}
            <a href="/" className="group relative">
              <div className="text-2xl font-bold tracking-tight">
                <span className="bg-gradient-to-r from-violet-400 via-purple-400 to-blue-400 bg-clip-text text-transparent">
                  Describe
                </span>
                <span className="text-white group-hover:text-white/80 transition-colors">
                  Music
                </span>
                <span className="text-violet-400">.</span>
              </div>
            </a>

            {/* Right Section */}
            <div className="flex items-center gap-6">
              {/* Share Info - Inline */}
              <div className="hidden md:flex items-center gap-2 px-4 py-2 rounded-full bg-violet-500/10 border border-violet-500/20">
                <svg className="w-4 h-4 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
                <span className="text-sm text-slate-300">
                  by <span className="font-semibold text-white">{getCreatorDisplayName()}</span>
                </span>
                {createdAt && (
                  <span className="text-sm text-slate-500">• {formatDate(createdAt)}</span>
                )}
              </div>

              {/* CTA Button with Gradient Flow Animation */}
              <button
                onClick={() => window.location.href = '/analyze'}
                className="group relative px-6 py-2.5 overflow-hidden bg-gradient-to-r from-violet-500 via-purple-500 to-blue-500 bg-[length:200%_100%] animate-gradient-flow hover:from-violet-600 hover:via-purple-600 hover:to-blue-600 text-white rounded-full font-semibold text-sm transition-all duration-300 shadow-lg shadow-violet-500/25 hover:shadow-xl hover:shadow-violet-500/40 hover:scale-105 animate-glow"
              >
                {/* Shimmer effect */}
                <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/30 to-transparent"></div>
                
                {/* Text with arrow */}
                <span className="relative z-10 flex items-center gap-2">
                  Free Trial
                  <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </span>
              </button>
            </div>
          </div>

          {/* Mobile Share Info */}
          <div className="md:hidden pb-4 flex items-center gap-2 text-sm">
            <svg className="w-4 h-4 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
            <span className="text-slate-400">
              by <span className="font-medium text-white">{getCreatorDisplayName()}</span>
            </span>
            {createdAt && (
              <>
                <span className="text-slate-600">•</span>
                <span className="text-slate-500">{formatDate(createdAt)}</span>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Spacer for fixed header */}
      <div className="h-20"></div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <DashboardSection result={analysisResult} />
      </div>

      {/* CTA Section - Minimal & Clean */}
      <div className="mt-20 mb-16">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-4xl font-bold text-white mb-3">
            Create Your Own Analysis
          </h2>
          <p className="text-slate-400 mb-8">
            Experience AI-driven music analysis. Get detailed insights on music, voice, emotions, and more.
          </p>
          <button
            onClick={() => window.location.href = '/analyze'}
            className="group relative px-8 py-3.5 overflow-hidden bg-gradient-to-r from-violet-500 via-purple-500 to-blue-500 bg-[length:200%_100%] animate-gradient-flow hover:from-violet-600 hover:via-purple-600 hover:to-blue-600 text-white rounded-full font-semibold transition-all duration-300 shadow-lg shadow-violet-500/30 hover:shadow-xl hover:shadow-violet-500/50 hover:scale-105 animate-glow"
          >
            {/* Shimmer effect */}
            <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/30 to-transparent"></div>
            
            {/* Text with arrow */}
            <span className="relative z-10 flex items-center justify-center gap-2">
              Start Free Trial
              <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </span>
          </button>
        </div>
      </div>

        {/* Footer - Ultra Minimal (for shared view only) */}
        <footer className="pb-8">
          <div className="max-w-7xl mx-auto px-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-slate-500">
              <div>© {new Date().getFullYear()} Describe Music</div>
              <div className="flex gap-8">
                <a href="/" className="hover:text-slate-300 transition-colors">Home</a>
                <a href="/analyze" className="hover:text-slate-300 transition-colors">Analyze</a>
                <a href="/pricing" className="hover:text-slate-300 transition-colors">Pricing</a>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}

