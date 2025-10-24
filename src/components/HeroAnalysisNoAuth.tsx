import React, { useState, useCallback, useEffect } from 'react';
import HeroLeftContent from './hero/HeroLeftContent';
import HeroRightAnalysisSimple from './hero/HeroRightAnalysisSimple';

/**
 * Hero Analysis Component without Auth dependencies
 * This version doesn't use AuthProvider/CreditProvider to avoid circular dependencies
 */
export default function HeroAnalysisNoAuth() {
  const [analysisResult, setAnalysisResult] = useState<any>(null);

  // Initialize visualizer after component mounts
  useEffect(() => {
    const initVisualizer = () => {
      const canvas = document.getElementById('living-nebula-canvas');
      if (canvas && window.initNebulaVisualizer) {
        window.initNebulaVisualizer();
      } else {
        // Retry after a short delay
        setTimeout(initVisualizer, 100);
      }
    };
    
    initVisualizer();
  }, []);

  // Handle analysis completion
  const handleAnalysisComplete = useCallback((result: any) => {
    setAnalysisResult(result);
  }, []);

  // Navigate to full analysis page
  const navigateToFullAnalysis = useCallback((result: any) => {
    // Store result in sessionStorage
    sessionStorage.setItem('heroAnalysisResult', JSON.stringify(result));
    
    // Navigate with result ID
    window.location.href = `/analyze?id=${result.id}`;
  }, []);

  return (
    <div className="relative h-screen flex items-center justify-center overflow-hidden bg-dark-bg -mt-20">
      {/* Background Animation Canvas */}
      <canvas 
        id="living-nebula-canvas" 
        className="absolute inset-0 w-full h-full"
      ></canvas>

      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-violet-900/20 via-transparent to-blue-900/20 z-5"></div>

      {/* Main Content Grid */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 lg:gap-12 h-full min-h-[80vh]">
          {/* Left Content - Brand Value Proposition */}
          <div className="lg:col-span-2 flex items-center">
            <div className="w-full">
              <HeroLeftContent />
            </div>
          </div>

          {/* Right Content - Analysis Interface */}
          <div className="lg:col-span-3 flex items-center">
            <div className="w-full max-w-2xl mx-auto">
              <HeroRightAnalysisSimple 
                onAnalysisComplete={handleAnalysisComplete}
                onNavigateToFullAnalysis={navigateToFullAnalysis}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Scroll Down Hint */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10">
        <a href="#hook" className="animate-bounce group">
          <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center group-hover:bg-white/20 transition-all duration-300">
            <svg className="w-6 h-6 text-white/70 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </div>
        </a>
      </div>
    </div>
  );
}
