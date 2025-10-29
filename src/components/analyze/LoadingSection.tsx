import React, { useState, useEffect } from 'react';

interface LoadingSectionProps {
  filename: string;
  onCancel: () => void;
  progress?: {
    phase: 'uploading' | 'analyzing';
    percentage: number;
    message: string;
  } | null;
}

const loadingSteps = [
  { text: "Preparing upload...", duration: 500 },
  { text: "Uploading audio file...", duration: 800 },
  { text: "Processing audio data...", duration: 600 },
  { text: "Analyzing patterns...", duration: 700 },
  { text: "Finalizing results...", duration: 400 }
];

export default function LoadingSection({ filename, onCancel, progress: realProgress }: LoadingSectionProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const [currentMessage, setCurrentMessage] = useState("Initializing analysis...");

  useEffect(() => {
    // If we have real progress, use it
    if (realProgress) {
      setProgress(realProgress.percentage);
      setCurrentMessage(realProgress.message);
      
      // Update step based on unified progress (0-100%)
      if (realProgress.percentage < 15) {
        setCurrentStep(0); // Preparing/Starting upload
      } else if (realProgress.percentage < 30) {
        setCurrentStep(1); // Uploading
      } else if (realProgress.percentage < 50) {
        setCurrentStep(2); // Processing audio
      } else if (realProgress.percentage < 80) {
        setCurrentStep(3); // Analyzing patterns
      } else {
        setCurrentStep(4); // Finalizing
      }
      return;
    }

    // Fallback to simulated progress if no real progress provided
    let stepTimer: NodeJS.Timeout;
    let progressTimer: NodeJS.Timeout;

    const totalDuration = loadingSteps.reduce((sum, step) => sum + step.duration, 0);
    let elapsedTime = 0;

    const updateProgress = () => {
      elapsedTime += 50;
      const newProgress = Math.min((elapsedTime / totalDuration) * 100, 100);
      setProgress(newProgress);

      if (elapsedTime < totalDuration) {
        progressTimer = setTimeout(updateProgress, 50);
      }
    };

    const advanceStep = (stepIndex: number) => {
      if (stepIndex < loadingSteps.length) {
        setCurrentStep(stepIndex);
        setCurrentMessage(loadingSteps[stepIndex].text);
        stepTimer = setTimeout(() => advanceStep(stepIndex + 1), loadingSteps[stepIndex].duration);
      }
    };

    updateProgress();
    advanceStep(0);

    return () => {
      clearTimeout(stepTimer);
      clearTimeout(progressTimer);
    };
  }, [realProgress]);

  // Generate dynamic waveform bars
  const WaveformVisualizer = () => {
    const bars = Array.from({ length: 32 }, (_, i) => {
      const height = Math.random() * 60 + 20;
      const delay = Math.random() * 2;
      const duration = 0.8 + Math.random() * 0.4;
      
      return (
        <div
          key={i}
          className="bg-gradient-to-t from-violet-500 to-blue-500 rounded-full"
          style={{
            width: '3px',
            height: `${height}%`,
            animation: `waveform-pulse ${duration}s ease-in-out infinite`,
            animationDelay: `${delay}s`
          }}
        />
      );
    });

    return (
      <div className="flex items-end justify-center gap-1 h-32">
        {bars}
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Background Decorations */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-20 right-20 w-80 h-80 bg-violet-500/10 rounded-full blur-3xl animate-pulse"></div>
        
        {/* Floating musical notes */}
        <div className="absolute top-16 left-1/4 text-violet-400/20 text-4xl animate-bounce" style={{animationDelay: '0s', animationDuration: '2s'}}>♪</div>
        <div className="absolute top-32 right-1/3 text-blue-400/20 text-3xl animate-bounce" style={{animationDelay: '0.5s', animationDuration: '2.5s'}}>♫</div>
        <div className="absolute bottom-32 left-1/3 text-purple-400/20 text-4xl animate-bounce" style={{animationDelay: '1s', animationDuration: '2.2s'}}>♬</div>
        <div className="absolute bottom-16 right-1/4 text-violet-400/20 text-2xl animate-bounce" style={{animationDelay: '1.5s', animationDuration: '3s'}}>♩</div>
      </div>

      {/* Main Loading Card */}
      <div className="relative z-10 glass-pane p-12 text-center">
        {/* File Info */}
        <div className="mb-8">
          <div className="w-16 h-16 mx-auto bg-gradient-to-r from-violet-500 to-blue-500 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
            </svg>
          </div>
          <h3 className="text-2xl font-bold text-white mb-2">Analyzing Audio</h3>
          <p className="text-slate-300/80 text-lg truncate max-w-md mx-auto">{filename}</p>
        </div>

        {/* Waveform Visualizer */}
        <div className="mb-12">
          <WaveformVisualizer />
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="w-full bg-white/10 rounded-full h-2 mb-4">
            <div 
              className="bg-gradient-to-r from-violet-500 to-blue-500 h-2 rounded-full transition-all duration-100 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="text-sm text-slate-400">
            {Math.round(progress)}% complete
          </div>
        </div>

        {/* Current Step */}
        <div className="mb-8">
          <p className="text-xl text-white font-medium">
            {currentMessage}
          </p>
        </div>

        {/* Analysis Steps Preview */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          {[
            { icon: "upload", label: "Prepare" },
            { icon: "cloud", label: "Upload" },
            { icon: "music", label: "Process" },
            { icon: "lightning", label: "Analyze" },
            { icon: "check", label: "Complete" }
          ].map((item, index) => (
            <div 
              key={index}
              className={`glass-pane p-4 transition-all duration-300 ${
                currentStep > index 
                  ? 'bg-violet-500/20 border-violet-400/30' 
                  : 'bg-white/5 border-white/10'
              }`}
            >
              <div className="w-8 h-8 mx-auto mb-2 flex items-center justify-center">
                {item.icon === 'upload' && (
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                  </svg>
                )}
                {item.icon === 'cloud' && (
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                )}
                {item.icon === 'music' && (
                  <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
                  </svg>
                )}
                {item.icon === 'lightning' && (
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                )}
                {item.icon === 'check' && (
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
              </div>
              <div className="text-sm text-slate-300">{item.label}</div>
            </div>
          ))}
        </div>

        {/* Cancel Button */}
        <button
          onClick={onCancel}
          className="inline-flex items-center justify-center gap-2 px-6 py-3 text-slate-300 border border-slate-600 rounded-full hover:bg-white/5 hover:border-slate-500 transition-all duration-300"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
          Cancel Analysis
        </button>
      </div>


    </div>
  );
}