import React, { useState, useCallback, useEffect } from 'react';
import { type CloudAnalysisResult } from '../utils/cloudFunctions';
import HeroLeftContent from './hero/HeroLeftContent';
import HeroRightAnalysisSimple from './hero/HeroRightAnalysisSimple';

/**
 * Main Hero Analysis Component
 * Combines left content (brand value) with right analysis interface
 */
export default function HeroAnalysis() {
  const [analysisResult, setAnalysisResult] = useState<CloudAnalysisResult | null>(null);

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
  const handleAnalysisComplete = useCallback((result: CloudAnalysisResult) => {
    setAnalysisResult(result);
  }, []);

  // Navigate to full analysis page
  const navigateToFullAnalysis = useCallback((result: CloudAnalysisResult) => {
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

      {/* Main Content Grid */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 lg:gap-12 h-full min-h-[80vh]">
          {/* Left Content - Brand Value Proposition */}
          <div className="lg:col-span-2 flex items-center">
            <HeroLeftContent />
          </div>

          {/* Right Content - Analysis Interface */}
          <div className="lg:col-span-3 flex items-center">
            <HeroRightAnalysisSimple 
              onAnalysisComplete={handleAnalysisComplete}
              onNavigateToFullAnalysis={navigateToFullAnalysis}
            />
          </div>
        </div>
      </div>

      {/* Scroll Down Hint */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10">
        <a href="#hook" className="animate-bounce">
          <svg className="w-6 h-6 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </a>
      </div>
    </div>
  );
}
