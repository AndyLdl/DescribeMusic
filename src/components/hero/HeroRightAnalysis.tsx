import React, { useState, useRef, useCallback } from 'react';
import { useTrialCredit } from '../../contexts/CreditContext';
import { cloudFunctions, type CloudAnalysisResult, type ProgressUpdate } from '../../utils/cloudFunctions';
import { exampleAnalysisResults } from '../../data/exampleAnalysisResults';

interface HeroRightAnalysisProps {
  onAnalysisComplete?: (result: CloudAnalysisResult) => void;
  onNavigateToFullAnalysis?: (result: CloudAnalysisResult) => void;
}

/**
 * Hero Right Analysis Component
 * Handles file upload, credit validation, analysis, and result display
 */
export default function HeroRightAnalysis({ onAnalysisComplete, onNavigateToFullAnalysis }: HeroRightAnalysisProps) {
  // State management
  const [analysisState, setAnalysisState] = useState<'example' | 'analyzing' | 'result'>('example');
  const [analysisResult, setAnalysisResult] = useState<string>('');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [audioDuration, setAudioDuration] = useState<number>(0);
  const [dragActive, setDragActive] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [currentProgress, setCurrentProgress] = useState<ProgressUpdate | null>(null);
  const [currentExample, setCurrentExample] = useState(0);

  // Hooks
  const { checkTrialCredits, consumeTrialCredits, getTrialCreditBalance } = useTrialCredit();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Example rotation effect
  React.useEffect(() => {
    if (analysisState === 'example') {
      const interval = setInterval(() => {
        setCurrentExample(prev => (prev + 1) % exampleAnalysisResults.length);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [analysisState]);

  // Detect audio duration
  const detectAudioDuration = useCallback(async (file: File): Promise<number> => {
    return new Promise((resolve) => {
      const audio = new Audio();
      const url = URL.createObjectURL(file);
      
      audio.onloadedmetadata = () => {
        const duration = Math.ceil(audio.duration);
        URL.revokeObjectURL(url);
        resolve(duration);
      };
      
      audio.src = url;
    });
  }, []);

  // Handle file upload
  const handleFileUpload = useCallback(async (file: File) => {
    try {
      setErrorMessage('');
      
      // Detect audio duration
      const duration = await detectAudioDuration(file);
      setAudioDuration(duration);
      
      // Check if user has enough trial credits
      const hasCredits = await checkTrialCredits(duration);
      
      if (!hasCredits) {
        setErrorMessage(`Audio too long (${duration}s), requires ${duration} credits. Please choose a shorter audio or login for more credits.`);
        return;
      }
      
      setUploadedFile(file);
      setAnalysisState('analyzing');
      
      // Start analysis
      await startAnalysis(file, duration);
      
    } catch (error) {
      console.error('Error handling file upload:', error);
      setErrorMessage('Failed to process audio file. Please try again.');
    }
  }, [detectAudioDuration, checkTrialCredits]);

  // Start analysis
  const startAnalysis = useCallback(async (file: File, duration: number) => {
    try {
      // Call existing API
      const result: CloudAnalysisResult = await cloudFunctions.analyzeAudio(file, {
        includeStructure: true,
        includeSimilarity: true,
        detailedAnalysis: true,
        generateTags: true,
        audioDuration: duration,
        onProgress: (progress: ProgressUpdate) => {
          setCurrentProgress(progress);
        }
      });

      // Extract description only
      const description = result.analysis?.aiDescription || 
                         result.analysis?.description || 
                         'Analysis completed';

      setAnalysisResult(description);
      setAnalysisState('result');
      
      // Consume trial credits
      await consumeTrialCredits(duration, `Hero analysis: ${file.name}`, result.id);
      
      // Notify parent component
      if (onAnalysisComplete) {
        onAnalysisComplete(result);
      }
      
    } catch (error) {
      console.error('Analysis failed:', error);
      setErrorMessage('Analysis failed. Please try again.');
      setAnalysisState('example');
    }
  }, [consumeTrialCredits, onAnalysisComplete]);

  // Handle drag events
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('audio/')) {
        handleFileUpload(file);
      } else {
        setErrorMessage('Please upload an audio file.');
      }
    }
  }, [handleFileUpload]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0]);
    }
  }, [handleFileUpload]);

  const openFileDialog = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const navigateToFullAnalysis = useCallback((result: CloudAnalysisResult) => {
    if (onNavigateToFullAnalysis) {
      onNavigateToFullAnalysis(result);
    } else {
      // Store result in sessionStorage
      sessionStorage.setItem('heroAnalysisResult', JSON.stringify(result));
      
      // Navigate with result ID
      window.location.href = `/analyze?id=${result.id}`;
    }
  }, [onNavigateToFullAnalysis]);

  // Get current example
  const currentExampleData = exampleAnalysisResults[currentExample];

  return (
    <div className="flex flex-col justify-center h-full px-6 lg:px-8">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl lg:text-3xl font-bold text-white mb-2">
          Quick Audio Analysis
        </h2>
        <p className="text-slate-300/80 text-sm lg:text-base">
          Upload your audio file and get instant AI-powered analysis
        </p>
      </div>

      {/* Credit Display */}
      <div className="mb-6">
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
          <div className="flex items-center gap-2 text-blue-300 mb-1">
            <span>💡</span>
            <span className="font-medium">New User Free Trial</span>
          </div>
          <div className="text-sm text-blue-200/80">
            Analyze up to 100 seconds of audio • 1 second = 1 credit
          </div>
          {audioDuration > 0 && (
            <div className="text-sm mt-2 text-green-300">
              ✅ This audio will consume {audioDuration} credits
            </div>
          )}
        </div>
      </div>

      {/* Upload Zone */}
      <div className="mb-6">
        <div
          className={`
            relative z-10 glass-pane p-8 text-center transition-all duration-300 
            cursor-pointer border-2 border-dashed rounded-xl
            ${dragActive 
              ? 'border-violet-400/50 bg-violet-500/10 scale-105' 
              : 'border-white/20 hover:border-white/40 hover:bg-white/[0.08]'
            }
          `}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={openFileDialog}
        >
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept="audio/*"
            onChange={handleFileInput}
          />

          {/* Upload Icon */}
          <div className="mb-4">
            <div className="w-16 h-16 mx-auto bg-gradient-to-r from-violet-500 to-blue-500 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
          </div>

          <h3 className="text-lg font-semibold text-white mb-2">
            Drop your audio file here
          </h3>
          <p className="text-slate-300/80 text-sm mb-4">
            or click to select file
          </p>
          
          <div className="text-xs text-slate-400">
            Supports MP3, WAV, FLAC, AAC
          </div>
        </div>
      </div>

      {/* Error Message */}
      {errorMessage && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
          <p className="text-red-300 text-sm">{errorMessage}</p>
        </div>
      )}

      {/* Analysis Progress */}
      {analysisState === 'analyzing' && currentProgress && (
        <div className="mb-6">
          <div className="bg-white/5 backdrop-blur-sm rounded-lg p-4 border border-white/10">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-4 h-4 border-2 border-violet-500 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-white text-sm font-medium">{currentProgress.message}</span>
            </div>
            <div className="w-full bg-slate-700/50 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-violet-500 to-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${currentProgress.percentage}%` }}
              ></div>
            </div>
            <div className="text-xs text-slate-400 mt-1">
              {currentProgress.percentage}% complete
            </div>
          </div>
        </div>
      )}

      {/* Result Display */}
      <div className="mb-6">
        <div className="bg-white/5 backdrop-blur-sm rounded-lg p-4 border border-white/10">
          {analysisState === 'example' && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs text-slate-400">Example Result</span>
                <span className="text-xs text-slate-500">•</span>
                <span className="text-xs text-slate-400">{currentExampleData.title}</span>
              </div>
              <p className="text-white/90 text-sm leading-relaxed">
                {currentExampleData.description}
              </p>
            </div>
          )}
          
          {analysisState === 'result' && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs text-green-400">✓ Analysis Complete</span>
              </div>
              <p className="text-white/90 text-sm leading-relaxed">
                {analysisResult}
              </p>
              <button
                onClick={() => {
                  if (analysisResult) {
                    // Create a mock result object for navigation
                    const mockResult: CloudAnalysisResult = {
                      id: `hero-${Date.now()}`,
                      filename: uploadedFile?.name || 'Unknown',
                      timestamp: new Date().toISOString(),
                      duration: audioDuration,
                      fileSize: uploadedFile ? `${Math.round(uploadedFile.size / 1024)}KB` : 'Unknown',
                      format: uploadedFile?.type || 'Unknown',
                      contentType: { primary: 'music', confidence: 0.9, description: 'Music content' },
                      basicInfo: { genre: 'Unknown', mood: 'Unknown', bpm: 0, key: 'Unknown' },
                      analysis: { aiDescription: analysisResult },
                      processingTime: 0
                    };
                    navigateToFullAnalysis(mockResult);
                  }
                }}
                className="mt-3 px-4 py-2 bg-gradient-to-r from-violet-500 to-blue-500 text-white text-sm font-medium rounded-lg hover:from-violet-600 hover:to-blue-600 transition-all duration-300"
              >
                View Full Analysis
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
