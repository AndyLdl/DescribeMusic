import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useCreditToast, CreditToastContainer } from './credit/CreditToast';
import { useTrialCredit, useCredit, CreditProvider } from '../contexts/CreditContext';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import LoginModal from './auth/LoginModal';
import { cloudFunctions, type CloudAnalysisResult, type ProgressUpdate } from '../utils/cloudFunctions';
import { HistoryStorage, type HistoryRecord } from '../utils/historyStorage';

// Demo audio samples from HookSection
interface AudioSample {
  id: string;
  title: string;
  description: string;
  audioSrc: string;
  analysis: {
    genre: string;
    mood: string;
    tempo: string;
    key: string;
    energy: string;
    vocals: string;
    instruments: string[];
    quality: string;
    tags: string[];
    voiceAnalysis?: {
      gender?: string;
      emotion?: string;
      clarity?: string;
    };
  };
  summary: string;
}

const demoAudioSamples: AudioSample[] = [
  {
    id: 'rock',
    title: '🎸 Rock Anthem',
    description: 'High-energy hard rock anthem with driving rhythm and powerful instrumentation',
    audioSrc: '/audio/samples/rock-anthem.wav',
    analysis: { 
      genre: 'Hard Rock', 
      mood: 'Energetic, Anthemic', 
      tempo: '140 BPM', 
      key: 'E minor',
      energy: 'Very High (0.95)',
      vocals: 'None (Instrumental)',
      instruments: ['Electric Guitar', 'Bass Guitar', 'Drums'],
      quality: 'Studio Quality (7/10)',
      tags: ['hard-rock', 'rock-anthem', 'energetic', 'anthemic', 'powerful', 'driving-rhythm', 'electric-guitar', 'drums', 'bass', 'high-energy', 'live-recording', 'rock-music', 'e-minor', 'loud', 'intense'],
    },
    summary: 'A high-energy hard rock anthem with a driving rhythm, powerful vocals, and a classic rock feel, reminiscent of bands like The White Stripes and Foo Fighters.'
  },
  {
    id: 'speech',
    title: '🎙️ Female Voice Sample',
    description: 'High-quality female speech with clear pronunciation',
    audioSrc: '/audio/samples/femal-vocal.mp3',
    analysis: { 
      genre: 'Speech/TTS', 
      mood: 'Calm, Neutral', 
      tempo: 'Normal Speech (150 WPM)', 
      key: 'N/A',
      energy: 'Low (0.0)',
      vocals: 'Female Voice - Clear Speech',
      instruments: [],
      quality: 'High Quality (7/10)',
      tags: ['speech', 'female-voice', 'tts', 'text-to-speech', 'calm', 'neutral', 'clear-speech', 'short-audio', 'english', 'low-noise'],
      voiceAnalysis: {
        gender: 'Female',
        emotion: 'Neutral, Calm',
        clarity: 'Excellent (0.9)',
      }
    },
    summary: 'A short, high-quality audio clip features a calm female voice speaking in English with a General American accent.'
  },
  {
    id: 'ambient',
    title: '🌲 Forest Ambience',
    description: 'Natural soundscape with birds, wind, and distant water',
    audioSrc: '/audio/samples/forest-ambience.mp3',
    analysis: { 
      genre: 'Ambient', 
      mood: 'Peaceful', 
      tempo: '60 BPM', 
      key: 'C Major',
      energy: 'Very Low (0.2)',
      vocals: 'None (Instrumental)',
      instruments: ['Natural Sounds', 'Birds', 'Wind', 'Water'],
      quality: 'High Quality (7/10)',
      tags: ['ambient', 'nature-sounds', 'forest-ambience', 'birds', 'wind', 'water', 'peaceful', 'calm', 'relaxing', 'outdoor', 'high-quality']
    },
    summary: 'A high-quality recording of a peaceful forest ambience featuring gentle wind, birdsong, and distant water sounds, ideal for relaxation or meditation.'
  }
];

/**
 * Enhanced Hero Component with Real Analysis Logic
 * Integrates audio analysis, progress tracking, and credit system
 */
export default function HeroSimple() {
  const toast = useCreditToast();
  const { checkTrialCredits, consumeTrialCredits, getTrialCreditBalance } = useTrialCredit();
  const { credits, creditBalance, loading: creditLoading, refreshCredits } = useCredit();
  const { user, loading: authLoading } = useAuth();
  
  // Upload and analysis state
  const [uploadState, setUploadState] = useState<'idle' | 'uploaded' | 'analyzing' | 'complete'>('idle');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  const [currentMessage, setCurrentMessage] = useState('');
  
  // Real analysis state
  const [audioDuration, setAudioDuration] = useState<number>(0);
  const [currentProgress, setCurrentProgress] = useState<ProgressUpdate | null>(null);
  const [analysisResult, setAnalysisResult] = useState<CloudAnalysisResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [trialCreditBalance, setTrialCreditBalance] = useState<{ total: number; used: number; remaining: number; } | null>(null);
  const [currentCreditBalance, setCurrentCreditBalance] = useState<{ total: number; used: number; remaining: number; } | null>(null);
  
  // Demo carousel state
  const [currentDemoIndex, setCurrentDemoIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentAudioUrl, setCurrentAudioUrl] = useState<string>(demoAudioSamples[0].audioSrc);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  
  // Login modal state
  const [showLoginModal, setShowLoginModal] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const carouselIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const userActivityTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Helper function to calculate rounded up credits
  const getRoundedCredits = useCallback((duration: number) => {
    return Math.ceil(duration);
  }, []);

  // Get the appropriate credit balance based on user login status
  const getCurrentCreditBalance = useCallback(async () => {
    if (user && !authLoading) {
      // User is logged in, use real credits
      if (creditBalance) {
        return {
          total: creditBalance.total,
          used: creditBalance.total - credits,
          remaining: credits
        };
      }
      return null;
    } else {
      // User not logged in, use trial credits
      return await getTrialCreditBalance();
    }
  }, [user, authLoading, creditBalance, credits, getTrialCreditBalance]);

  // Handle insufficient credits action
  const handleInsufficientCreditsAction = useCallback(() => {
    if (!user) {
      // User not logged in - show login modal
      setShowLoginModal(true);
    } else {
      // User logged in - redirect to purchase credits
      window.location.href = '/pricing';
    }
  }, [user]);

  // Initialize visualizer after component mounts
  useEffect(() => {
    const initVisualizer = () => {
      const canvas = document.getElementById('living-nebula-canvas');
      if (canvas && (window as any).initNebulaVisualizer) {
        (window as any).initNebulaVisualizer();
      } else {
        setTimeout(initVisualizer, 100);
      }
    };
    initVisualizer();
  }, []);

  // Load credit balance on mount and when user/auth status changes
  useEffect(() => {
    const loadCreditBalance = async () => {
      try {
        if (user && !authLoading) {
          // User is logged in, use real credits
          if (creditBalance && credits !== undefined) {
            setCurrentCreditBalance({
              total: creditBalance.total,
              used: creditBalance.total - credits,
              remaining: credits
            });
          }
        } else {
          // User not logged in, use trial credits
          const balance = await getTrialCreditBalance();
          setTrialCreditBalance(balance);
          setCurrentCreditBalance(balance);
        }
      } catch (error) {
        console.error('Failed to load credit balance:', error);
      }
    };
    loadCreditBalance();
  }, [user, authLoading, creditBalance, credits, getTrialCreditBalance]);

  // Demo carousel auto-rotation
  useEffect(() => {
    if (isAutoPlaying && uploadState === 'idle' && !isPlaying) {
      carouselIntervalRef.current = setInterval(() => {
        setCurrentDemoIndex(prev => (prev + 1) % demoAudioSamples.length);
      }, 4000); // Change demo every 4 seconds
    } else {
      if (carouselIntervalRef.current) {
        clearInterval(carouselIntervalRef.current);
        carouselIntervalRef.current = null;
      }
    }

    return () => {
      if (carouselIntervalRef.current) {
        clearInterval(carouselIntervalRef.current);
      }
    };
  }, [isAutoPlaying, uploadState, isPlaying]);

  // Handle user activity - restart auto-rotation after 20s of inactivity
  const handleUserActivity = useCallback(() => {
    // Clear existing timeout
    if (userActivityTimeoutRef.current) {
      clearTimeout(userActivityTimeoutRef.current);
    }
    
    // Stop auto-rotation immediately
    setIsAutoPlaying(false);
    if (carouselIntervalRef.current) {
      clearInterval(carouselIntervalRef.current);
      carouselIntervalRef.current = null;
    }
    
    // Set timeout to restart auto-rotation after 20s
    userActivityTimeoutRef.current = setTimeout(() => {
      // Check current state at timeout execution time
      if (uploadState === 'idle') {
        setIsAutoPlaying(true);
      }
    }, 10000); // 20 seconds
  }, [uploadState]);

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (userActivityTimeoutRef.current) {
        clearTimeout(userActivityTimeoutRef.current);
      }
    };
  }, []);

  // Update current audio URL when demo changes
  useEffect(() => {
    if (uploadState === 'idle') {
      setCurrentAudioUrl(demoAudioSamples[currentDemoIndex].audioSrc);
    }
  }, [currentDemoIndex, uploadState]);


  // Handle demo play/pause
  const handleDemoPlayPause = async () => {
    if (!audioRef.current) return;

    try {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        await audioRef.current.play();
        setIsPlaying(true);
      }
    } catch (error) {
      console.error('Audio play failed:', error);
    }
  };

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
      
      audio.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(0); // Fallback to 0 if detection fails
      };
      
      audio.src = url;
    });
  }, []);

  // Analysis steps with real progress percentages
  const analysisSteps = [
    { text: "Preparing upload...", progress: 5 },
    { text: "Uploading audio file...", progress: 20 },
    { text: "Processing audio data...", progress: 45 },
    { text: "Analyzing patterns...", progress: 75 },
    { text: "Finalizing results...", progress: 100 }
  ];

  // Real progress based on actual analysis steps
  useEffect(() => {
    if (uploadState === 'analyzing') {
      let stepTimer: NodeJS.Timeout;

      const advanceStep = (stepIndex: number) => {
        if (stepIndex < analysisSteps.length) {
          setCurrentStep(stepIndex);
          setCurrentMessage(analysisSteps[stepIndex].text);
          
          // Use real progress from step configuration
          setAnalysisProgress(analysisSteps[stepIndex].progress);
          
          // Move to next step after a short delay
          stepTimer = setTimeout(() => advanceStep(stepIndex + 1), 1000);
        } else {
          // Analysis complete
          setUploadState('complete');
          setAnalysisProgress(100);
        }
      };

      advanceStep(0);

      return () => {
        clearTimeout(stepTimer);
      };
    }
  }, [uploadState, toast]);

  // Start real analysis
  const startAnalysis = useCallback(async (file: File, duration: number) => {
    try {
      setErrorMessage('');
      setCurrentProgress(null);
      
      // Call cloud function for analysis with progress callback
      console.log(`🎵 开始分析音频，时长: ${duration} 秒`);
      
      const result: CloudAnalysisResult = await cloudFunctions.analyzeAudio(file, {
        includeStructure: true,
        includeSimilarity: true,
        detailedAnalysis: true,
        generateTags: true,
        audioDuration: duration,
        onProgress: (progress: ProgressUpdate) => {
          setCurrentProgress(progress);
          setCurrentMessage(progress.message);
          setAnalysisProgress(progress.percentage);
        }
      });

      setAnalysisResult(result);
      setUploadState('complete');
      
      // Save to history storage
      const historyRecord: HistoryRecord = {
        id: result.id,
        filename: result.filename,
        timestamp: result.timestamp,
        duration: result.duration,
        fileSize: result.fileSize,
        format: result.format,
        audioUrl: result.audioUrl, // Save audioUrl for playback
        contentType: result.contentType,
        basicInfo: result.basicInfo,
        voiceAnalysis: result.voiceAnalysis,
        soundEffects: result.soundEffects,
        quickStats: {
          qualityScore: result.quality.overall,
          emotionalTone: result.basicInfo.mood,
          primaryGenre: result.basicInfo.genre
        },
        // Save complete analysis data
        emotions: result.emotions,
        structure: result.structure,
        quality: result.quality,
        similarity: result.similarity,
        tags: result.tags,
        aiDescription: result.aiDescription,
        processingTime: result.processingTime
      };
      
      await HistoryStorage.addRecordWithUser(historyRecord);
      console.log('✅ Hero区分析结果已保存到历史记录');
      
      // Update credit balance (credits already consumed by backend)
      if (user) {
        // User is logged in, refresh real credits
        await refreshCredits();
      } else {
        // User not logged in, refresh trial credits
        const balance = await getTrialCreditBalance();
        setTrialCreditBalance(balance);
        setCurrentCreditBalance(balance);
      }
      
    } catch (error) {
      console.error('Analysis failed:', error);
      setErrorMessage('Analysis failed. Please try again.');
      setUploadState('idle');
      // 分析失败时不清空文件，用户可以重试
      toast.error('Analysis Failed', 'Please try again or contact support if the issue persists.');
    }
  }, [consumeTrialCredits, getTrialCreditBalance, toast]);

  // Handle file upload (just validation and duration detection)
  const handleFileUpload = useCallback(async (file: File) => {
    try {
      setErrorMessage('');
      
      // Check file type
      const allowedTypes = ['audio/mpeg', 'audio/wav', 'audio/flac', 'audio/aac'];
      if (!allowedTypes.includes(file.type)) {
        toast.error('Invalid File Type', 'Please upload MP3, WAV, FLAC, or AAC files only');
        return;
      }

      // Check file size (50MB limit)
      const maxSize = 50 * 1024 * 1024; // 50MB in bytes
      if (file.size > maxSize) {
        toast.error('File Too Large', 'Please upload files smaller than 50MB');
        return;
      }

      // Detect audio duration
      const duration = await detectAudioDuration(file);
      setAudioDuration(duration);
      
      // Create URL for the uploaded file to play in the player
      const fileUrl = URL.createObjectURL(file);
      setCurrentAudioUrl(fileUrl);
      
      setUploadedFile(file);
      setUploadState('uploaded');
      
    } catch (error) {
      console.error('Error handling file upload:', error);
      setErrorMessage('Failed to process audio file. Please try again.');
      toast.error('Upload Failed', 'Failed to process audio file. Please try again.');
    }
  }, [detectAudioDuration, toast]);

  // Start analysis with credit check
  const handleStartAnalysis = useCallback(async () => {
    if (!uploadedFile || !audioDuration) return;
    
    try {
      // Check if user has enough credits
      let hasCredits = false;
      if (user) {
        // User is logged in, check real credits
        hasCredits = credits >= getRoundedCredits(audioDuration);
      } else {
        // User not logged in, check trial credits
        hasCredits = await checkTrialCredits(audioDuration);
      }
      
      if (!hasCredits) {
        const roundedCredits = getRoundedCredits(audioDuration);
        setErrorMessage(`Audio too long (${audioDuration}s), requires ${roundedCredits} credits. Please choose a shorter audio or login for more credits.`);
        toast.error('Insufficient Credits', `This audio requires ${roundedCredits} credits. Please choose a shorter audio.`);
        return;
      }
      
      setUploadState('analyzing');
      await startAnalysis(uploadedFile, audioDuration);
      
    } catch (error) {
      console.error('Error starting analysis:', error);
      setErrorMessage('Failed to start analysis. Please try again.');
      toast.error('Analysis Failed', 'Failed to start analysis. Please try again.');
    }
  }, [uploadedFile, audioDuration, user, credits, checkTrialCredits, getRoundedCredits, startAnalysis, toast]);

  // Handle file input change
  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  // Handle drag and drop
  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    event.currentTarget.classList.add('border-violet-400/50', 'bg-violet-500/5');
  };

  const handleDragLeave = (event: React.DragEvent) => {
    event.preventDefault();
    event.currentTarget.classList.remove('border-violet-400/50', 'bg-violet-500/5');
  };

  const handleDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.currentTarget.classList.remove('border-violet-400/50', 'bg-violet-500/5');
    
    const files = event.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (file.type.startsWith('audio/')) {
        handleFileUpload(file);
      } else {
        toast.error('Invalid File Type', 'Please upload an audio file.');
      }
    }
  }, [handleFileUpload, toast]);

  const openFileDialog = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  // Reset to upload new file
  const resetToUpload = useCallback(() => {
    // 清理之前创建的URL以避免内存泄漏
    if (currentAudioUrl && currentAudioUrl.startsWith('blob:')) {
      URL.revokeObjectURL(currentAudioUrl);
    }
    
    setUploadState('idle');
    setUploadedFile(null);
    setAnalysisResult(null);
    setCurrentProgress(null);
    setAnalysisProgress(0);
    setCurrentStep(0);
    setCurrentMessage('');
    setAudioDuration(0);
    setErrorMessage('');
    setCurrentAudioUrl('/audio/samples/rock-anthem.wav'); // 重置为demo音频
    // Clear file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [currentAudioUrl]);

  return (
    <>
      <CreditToastContainer />
      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slide-in-from-top {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slide-in-from-bottom {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slide-in-from-left {
          from { opacity: 0; transform: translateX(-20px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes slide-in-from-right {
          from { opacity: 0; transform: translateX(20px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes carousel-slide {
          from { opacity: 0; transform: translateX(100%) scale(0.95); }
          to { opacity: 1; transform: translateX(0) scale(1); }
        }
        @keyframes carousel-slide-out {
          from { opacity: 1; transform: translateX(0) scale(1); }
          to { opacity: 0; transform: translateX(-100%) scale(0.95); }
        }
        .animate-fade-in {
          animation: fade-in 0.6s ease-out;
        }
        .animate-slide-in-from-top {
          animation: slide-in-from-top 0.6s ease-out;
        }
        .animate-slide-in-from-bottom {
          animation: slide-in-from-bottom 0.6s ease-out;
        }
        .animate-slide-in-from-left {
          animation: slide-in-from-left 0.6s ease-out;
        }
        .animate-slide-in-from-right {
          animation: slide-in-from-right 0.6s ease-out;
        }
        .animate-carousel-slide {
          animation: carousel-slide 0.5s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .animate-carousel-slide-out {
          animation: carousel-slide-out 0.5s ease-in;
        }
        .demo-card {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .demo-card:hover {
          transform: translateY(-2px);
        }
        .demo-card.active {
          transform: scale(1.02);
        }
      `}</style>
      <div className="relative min-h-screen flex items-start justify-center overflow-hidden bg-dark-bg -mt-20 pt-16 pb-20">
      {/* Background Animation Canvas */}
      <canvas 
        id="living-nebula-canvas" 
        className="absolute inset-0 w-full h-full"
      ></canvas>

      {/* Enhanced Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-violet-900/40 via-purple-900/30 to-blue-900/40 z-5"></div>
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent z-5"></div>
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-violet-500/5 to-transparent z-5"></div>

      {/* Main Content - Vertical Layout */}
      <div className="relative z-10 w-full max-w-6xl mx-auto px-4 lg:px-8">
        <div className="flex flex-col items-center text-center space-y-12">
          {/* Top Section - Brand Value Proposition (Compact) */}
          <div className="w-full max-w-4xl">
            {/* Main Title - Compact */}
            <div className="mb-6">
              <div className="relative">
                <h1 className="text-2xl sm:text-3xl md:text-5xl lg:text-6xl font-bold tracking-tighter !leading-tight mb-3">
                  <span className="bg-gradient-to-r from-white via-violet-300 to-cyan-300 bg-clip-text text-transparent drop-shadow-2xl">
                    Describe Music.
                  </span>
                </h1>
                {/* Enhanced glow effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-violet-500/30 to-cyan-500/30 blur-2xl -z-10"></div>
                <div className="absolute inset-0 bg-gradient-to-r from-violet-400/20 to-cyan-400/20 blur-xl -z-10"></div>
              </div>
              <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-slate-200/95 mb-3 sm:mb-4 font-medium">
                <span className="bg-gradient-to-r from-slate-200 to-slate-300 bg-clip-text text-transparent">
                  AI-Powered Music Description & Audio Analysis.
                </span>
              </p>
              <p className="text-slate-300/90 text-xs sm:text-sm md:text-base leading-relaxed max-w-2xl mx-auto px-2">
                Describe music with AI instantly. Transform any audio into detailed insights, identify genres, emotions, instruments, and more with our advanced music description technology.
              </p>
            </div>

            {/* Key Features - Compact */}
            <div className="mb-8">
              <div className="flex flex-wrap justify-center gap-2">
                {[
                  "Describe Music Genre",
                  "Describe Music Mood", 
                  "Describe Music Instruments",
                  "Describe Music Structure"
                ].map((feature, index) => (
                  <span key={index} className="px-3 py-1 bg-white/5 rounded-full text-white/80 text-xs">
                    {feature}
                  </span>
                ))}
              </div>
            </div>

            {/* Action Buttons - Choose Your Path */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 mb-6 sm:mb-8">
              {/* Full Analysis Button - Primary */}
              <a
                href="/analyze"
                className="group relative w-full sm:w-auto px-4 sm:px-6 md:px-8 py-3 sm:py-4 bg-gradient-to-r from-violet-500 to-blue-500 hover:from-violet-600 hover:to-blue-600 rounded-lg sm:rounded-xl font-bold text-sm sm:text-base text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 transform flex items-center justify-center gap-2 sm:gap-3"
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5 group-hover:rotate-12 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span>Start Full Analysis</span>
                <svg className="w-3 h-3 sm:w-4 sm:h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
                {/* Glow effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-violet-500/50 to-blue-500/50 rounded-lg sm:rounded-xl blur-xl opacity-50 group-hover:opacity-75 transition-opacity -z-10"></div>
              </a>

              {/* Quick Try Button - Secondary */}
              <button
                onClick={() => {
                  const analysisSection = document.querySelector('#quick-analysis-section');
                  if (analysisSection) {
                    analysisSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }
                }}
                className="group w-full sm:w-auto px-4 sm:px-6 md:px-8 py-3 sm:py-4 bg-white/10 hover:bg-white/15 border-2 border-white/20 hover:border-white/30 rounded-lg sm:rounded-xl font-semibold text-sm sm:text-base text-white transition-all duration-300 hover:scale-105 transform flex items-center justify-center gap-2 sm:gap-3"
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-y-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
                <span>Quick Try Below</span>
              </button>
            </div>

            {/* Benefits hint */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6 text-xs text-slate-400 mb-2">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Full: History & Export</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span>Quick: Instant Results</span>
              </div>
            </div>
          </div>

          {/* Bottom Section - Analysis Interface (Expanded) */}
          <div id="quick-analysis-section" className="w-full max-w-6xl scroll-mt-20">
            {/* Analysis Interface - Redesigned */}
            <div className="bg-white/5 rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-10 lg:p-16 border border-white/10">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 lg:gap-16">
                {/* Left Side - Upload Area - Optimized */}
                <div className="flex flex-col space-y-4 sm:space-y-6">
                  {/* Upload Zone - Compact & Enhanced */}
                  <div className="relative">
                    {/* Upload Interface */}
                    {(uploadState === 'idle' || uploadState === 'uploaded' || uploadState === 'complete') && (
                      <div 
                        className="bg-white/5 rounded-xl sm:rounded-2xl p-4 sm:p-6 md:p-8 text-center border-2 border-dashed border-white/20 hover:border-violet-400/50 hover:bg-violet-500/5 transition-all duration-300 cursor-pointer group"
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        onClick={() => document.getElementById('file-upload')?.click()}
                      >
                        <input
                          ref={fileInputRef}
                          id="file-upload"
                          type="file"
                          accept="audio/mpeg,audio/wav,audio/flac,audio/aac"
                          onChange={handleFileInputChange}
                          className="hidden"
                        />
                        
                        <div className="mb-4 sm:mb-6">
                          <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 mx-auto bg-violet-500/20 rounded-lg sm:rounded-xl flex items-center justify-center group-hover:bg-violet-500/30 transition-colors">
                            <svg className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-violet-300 group-hover:text-violet-200 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                            </svg>
                          </div>
                        </div>

                        {uploadState === 'idle' && (
                          <>
                            <h3 className="text-base sm:text-lg md:text-xl font-bold text-white mb-2 sm:mb-3">
                              Drop your audio file here
                            </h3>
                            <p className="text-slate-300 text-sm sm:text-base mb-4 sm:mb-6">
                              or click to select file
                            </p>
                            
                            {/* File Size Limit */}
                            <p className="text-xs text-slate-400 mb-3 sm:mb-4">Max file size: 50MB</p>
                            
                            {/* Supported Formats - Enhanced */}
                            <div className="flex flex-wrap justify-center gap-1.5 sm:gap-2">
                              {["MP3", "WAV", "FLAC", "AAC"].map((format, index) => (
                                <span key={index} className="px-2 sm:px-3 py-1 sm:py-1.5 bg-violet-500/20 text-violet-300 rounded-md sm:rounded-lg text-xs font-medium border border-violet-500/30">
                                  {format}
                                </span>
                              ))}
                            </div>
                          </>
                        )}

                        {uploadState === 'uploaded' && uploadedFile && (
                          <>
                            <h3 className="text-base sm:text-lg md:text-xl font-bold text-white mb-2 sm:mb-3">
                              File Ready for Analysis
                            </h3>
                            <div className="text-slate-300 text-sm sm:text-base mb-3 sm:mb-4 max-w-full">
                              <p className="break-words overflow-hidden text-ellipsis whitespace-nowrap" title={uploadedFile.name}>
                                {uploadedFile.name}
                              </p>
                            </div>
                            <p className="text-slate-400 text-xs sm:text-sm mb-4 sm:mb-6">
                              Duration: {Math.floor(audioDuration / 60)}:{Math.floor(audioDuration % 60).toString().padStart(2, '0')} • Size: {(uploadedFile.size / 1024 / 1024).toFixed(1)}MB
                            </p>
                            
                            {/* Cancel Selection Button */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation(); // 阻止事件冒泡
                                
                                // 清理之前创建的URL以避免内存泄漏
                                if (currentAudioUrl && currentAudioUrl.startsWith('blob:')) {
                                  URL.revokeObjectURL(currentAudioUrl);
                                }
                                
                                setUploadState('idle');
                                setUploadedFile(null);
                                setAudioDuration(0);
                                setErrorMessage('');
                                setCurrentAudioUrl('/audio/samples/rock-anthem.wav'); // 重置为demo音频
                                if (fileInputRef.current) {
                                  fileInputRef.current.value = '';
                                }
                              }}
                              className="w-full py-2 sm:py-2.5 px-3 sm:px-4 rounded-lg text-xs sm:text-sm font-medium bg-red-500/20 hover:bg-red-500/30 text-red-300 hover:text-red-200 border border-red-500/40 hover:border-red-400/60 transition-all duration-200 hover:scale-[1.02] flex items-center justify-center gap-2"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                              Cancel Selection
                            </button>
                          </>
                        )}

                        {uploadState === 'complete' && (
                          <>
                            <h3 className="text-base sm:text-lg md:text-xl font-bold text-white mb-2 sm:mb-3">
                              Drop your audio file here
                            </h3>
                            <p className="text-slate-300 text-sm sm:text-base mb-4 sm:mb-6">
                              or click to select file
                            </p>
                            
                            {/* File Size Limit */}
                            <p className="text-xs text-slate-400 mb-3 sm:mb-4">Max file size: 50MB</p>
                            
                            {/* Supported Formats - Enhanced */}
                            <div className="flex flex-wrap justify-center gap-1.5 sm:gap-2">
                              {["MP3", "WAV", "FLAC", "AAC"].map((format, index) => (
                                <span key={index} className="px-2 sm:px-3 py-1 sm:py-1.5 bg-violet-500/20 text-violet-300 rounded-md sm:rounded-lg text-xs font-medium border border-violet-500/30">
                                  {format}
                                </span>
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                    )}

                    {/* Upload Progress Overlay */}
                    {uploadState === 'analyzing' && (
                      <div className="bg-white/5 rounded-xl sm:rounded-2xl p-4 sm:p-6 md:p-8 text-center border border-white/10">
                        <div className="mb-4 sm:mb-6">
                          <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 mx-auto bg-violet-500/20 rounded-lg sm:rounded-xl flex items-center justify-center">
                            <div className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin"></div>
                          </div>
                        </div>

                        <h3 className="text-base sm:text-lg md:text-xl font-bold text-white mb-2 sm:mb-3">
                          AI Analysis in Progress
                        </h3>
                        <p className="text-slate-300 text-sm sm:text-base mb-4 sm:mb-6">
                          {currentProgress?.message || currentMessage}
                        </p>
                        
                        {/* Progress Bar */}
                        <div className="mb-6">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-slate-400">
                              Overall Progress
                            </span>
                            <span className="text-sm text-slate-400">
                              {Math.round(currentProgress?.percentage || analysisProgress)}%
                            </span>
                          </div>
                          <div className="w-full bg-white/10 rounded-full h-2">
                            <div 
                              className="bg-gradient-to-r from-violet-500 to-blue-500 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${currentProgress?.percentage || analysisProgress}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Start Analysis Button - Always visible below upload area */}
                    <div className="mt-4 sm:mt-6">
                      {/* Check if user has insufficient credits */}
                      {uploadedFile && audioDuration > 0 && currentCreditBalance && currentCreditBalance.remaining < getRoundedCredits(audioDuration) ? (
                        /* Insufficient Credits - Prominent Action Button */
                        <div className="space-y-2 sm:space-y-3">
                          <button
                            onClick={handleInsufficientCreditsAction}
                            className="w-full py-3 sm:py-4 px-4 sm:px-6 rounded-lg font-bold text-sm sm:text-base text-white transition-all duration-300 transform hover:scale-105 shadow-lg bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 border-2 border-orange-400/50 hover:border-orange-300"
                          >
                            <div className="flex items-center justify-center gap-2">
                              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                              </svg>
                              {!user ? 'Login to Get More Credits' : 'Purchase More Credits'}
                            </div>
                          </button>
                          <div className="text-center">
                            <p className="text-xs sm:text-sm text-orange-300 font-medium">
                              Need {getRoundedCredits(audioDuration) - currentCreditBalance.remaining} more credits
                            </p>
                            <p className="text-xs text-orange-200/80 mt-1">
                              {!user ? 'Login to access your credit balance' : 'Purchase credits to continue analysis'}
                            </p>
                          </div>
                        </div>
                      ) : (
                        /* Normal Start Analysis Button */
                        <button
                          onClick={handleStartAnalysis}
                          disabled={!uploadedFile || !audioDuration || !currentCreditBalance || uploadState === 'analyzing' || uploadState === 'complete'}
                          className={`w-full py-2.5 sm:py-3 px-4 sm:px-6 rounded-lg font-semibold text-xs sm:text-sm transition-colors ${
                            !uploadedFile || !audioDuration || !currentCreditBalance || uploadState === 'analyzing' || uploadState === 'complete'
                              ? 'bg-gray-500/20 text-gray-400 cursor-not-allowed'
                              : 'bg-violet-500 hover:bg-violet-600 text-white'
                          }`}
                        >
                          {uploadState === 'analyzing'
                            ? 'AI Analysis in Progress...'
                            : !uploadedFile 
                            ? 'Select an audio file to start analysis'
                            : !audioDuration
                            ? 'Processing file...'
                            : !currentCreditBalance
                            ? 'Loading credits...'
                            : uploadState === 'complete'
                            ? 'Select an audio file to start analysis'
                            : `Start Analysis (${getRoundedCredits(audioDuration)} credits)`
                          }
                        </button>
                      )}
                      
                      {/* Credit Info - Only show when file is selected and not completed */}
                      {uploadedFile && audioDuration > 0 && currentCreditBalance && uploadState !== 'complete' && (
                        <div className="mt-3 text-center">
                          <p className="text-xs text-slate-400">
                            Remaining: {currentCreditBalance.remaining} credits • 1 credit per second
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Credit Display - Enhanced */}
                  <div className="bg-gradient-to-br from-blue-500/15 to-violet-500/15 rounded-lg sm:rounded-xl p-4 sm:p-5 border border-blue-500/30 relative overflow-hidden">
                    {/* Decorative Elements */}
                    <div className="absolute top-0 right-0 w-12 h-12 sm:w-16 sm:h-16 bg-blue-500/10 rounded-full -translate-y-6 sm:-translate-y-8 translate-x-6 sm:translate-x-8"></div>
                    <div className="absolute bottom-0 left-0 w-10 h-10 sm:w-12 sm:h-12 bg-violet-500/10 rounded-full translate-y-5 sm:translate-y-6 -translate-x-5 sm:-translate-x-6"></div>
                    
                    {/* Header Section */}
                    <div className="flex items-start gap-2 sm:gap-3 mb-3 sm:mb-4 relative z-10">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-gradient-to-br from-blue-500/30 to-violet-500/30 flex items-center justify-center shadow-lg flex-shrink-0">
                        <svg className="w-4 h-4 sm:w-5 sm:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold text-white text-xs sm:text-sm">Free Trial Credits</span>
                          <div className="px-1.5 sm:px-2 py-0.5 bg-blue-500/20 text-blue-300 text-xs rounded-full border border-blue-500/30 whitespace-nowrap">
                            {currentCreditBalance ? `${currentCreditBalance.remaining}` : '100'} LEFT
                          </div>
                        </div>
                        <div className="text-xs text-blue-200 text-left">
                          1 second = 1 credit
                        </div>
                      </div>
                    </div>
                    
                    
                    {/* Benefits List */}
                    <div className="space-y-2 mb-4 relative z-10">
                      <div className="flex items-center gap-2 text-xs text-slate-200">
                        <div className="w-1.5 h-1.5 bg-blue-400 rounded-full"></div>
                        <span>No credit card required</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-200">
                        <div className="w-1.5 h-1.5 bg-violet-400 rounded-full"></div>
                        <span>Instant analysis</span>
                      </div>
                    </div>
                    
                  </div>
                </div>

                {/* Right Side - Audio Player & Analysis */}
                <div className="flex flex-col space-y-4 sm:space-y-6">
                  {/* Audio Player Section - Enhanced with Demo Carousel */}
                  <div className="bg-white/5 rounded-xl sm:rounded-2xl p-3 sm:p-4 border border-white/10">
                    <div className="mb-2 sm:mb-3">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-sm sm:text-base font-bold text-white text-left">Audio Player</h3>
                        <div className={`px-1.5 sm:px-2 py-0.5 text-xs rounded-full border ${
                          uploadedFile 
                            ? 'bg-green-500/20 text-green-300 border-green-500/30'
                            : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                        }`}>
                          {uploadedFile ? 'UPLOADED' : 'DEMO'}
                        </div>
                      </div>
                      <p className="text-slate-300 text-xs text-left">
                        {uploadedFile ? 'Preview your uploaded audio' : 'Preview demo audio samples'}
                      </p>
                    </div>

                    
                    {/* Audio Player Interface - Carousel */}
                    <div className="relative overflow-hidden">
                      <div className="flex transition-transform duration-500 ease-in-out" style={{ transform: `translateX(-${currentDemoIndex * 100}%)` }}>
                        {demoAudioSamples.map((sample, index) => (
                          <div key={sample.id} className="w-full flex-shrink-0">
                            <div className="bg-white/5 rounded-lg p-3">
                              <div className="flex items-center justify-between">
                                {/* File Info */}
                                <div className="flex items-center gap-2 min-w-0 flex-1">
                                  <div className="w-6 h-6 rounded bg-violet-500/20 flex items-center justify-center flex-shrink-0">
                                    <svg className="w-3 h-3 text-violet-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                                    </svg>
                                  </div>
                                  <div className="text-left min-w-0 flex-1">
                                    <div className="text-white font-medium text-xs truncate" title={
                                      uploadedFile 
                                        ? uploadedFile.name.replace(/\.[^/.]+$/, "") 
                                        : sample.title
                                    }>
                                      {uploadedFile 
                                        ? uploadedFile.name.replace(/\.[^/.]+$/, "") 
                                        : sample.title
                                      }
                                    </div>
                                  </div>
                                </div>

                                {/* Play/Pause Button */}
                                <button 
                                  id="play-pause-btn"
                                  className="w-8 h-8 rounded-full bg-violet-500/30 flex items-center justify-center hover:bg-violet-500/40 transition-colors flex-shrink-0"
                                  onClick={async (e) => {
                                    e.preventDefault();
                                    const audio = audioRef.current;
                                    
                                    // Handle user activity - pause auto-rotation
                                    handleUserActivity();
                                    
                                    if (audio) {
                                      try {
                                        if (audio.paused) {
                                          await audio.play();
                                        } else {
                                          audio.pause();
                                        }
                                      } catch (error) {
                                        console.error('Audio play failed:', error);
                                        // 如果播放失败，尝试加载音频
                                        audio.load();
                                      }
                                    }
                                  }}
                                >
                                  {isPlaying ? (
                                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 24 24">
                                      <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
                                    </svg>
                                  ) : (
                                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 24 24">
                                      <path d="M8 5v14l11-7z"/>
                                    </svg>
                                  )}
                                </button>
                              </div>

                              {/* Progress Bar */}
                              <div className="mt-3">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-xs text-slate-400">{`${Math.floor(currentTime / 60)}:${Math.floor(currentTime % 60).toString().padStart(2, '0')}`}</span>
                                  <span className="text-xs text-slate-400">{audioRef.current?.duration ? `${Math.floor(audioRef.current.duration / 60)}:${Math.floor(audioRef.current.duration % 60).toString().padStart(2, '0')}` : '1:06'}</span>
                                </div>
                                <div className="w-full bg-white/10 rounded-full h-1">
                                  <div 
                                    className="bg-violet-500 h-1 rounded-full transition-all duration-300" 
                                    style={{ 
                                      width: audioRef.current?.duration ? `${(currentTime / audioRef.current.duration) * 100}%` : '0%' 
                                    }}
                                  ></div>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Hidden Audio Element */}
                      <audio 
                        ref={audioRef}
                        id="audio-player" 
                        preload="metadata"
                        controls={false}
                        key={currentAudioUrl} // 强制重新渲染当URL改变时
                        onTimeUpdate={(e) => {
                          const audio = e.target as HTMLAudioElement;
                          if (audio) {
                            setCurrentTime(audio.currentTime);
                          }
                        }}
                        onLoadedMetadata={(e) => {
                          const audio = e.target as HTMLAudioElement;
                          if (audio && audio.duration) {
                            setAudioDuration(audio.duration);
                          }
                        }}
                        onPlay={() => {
                          setIsPlaying(true);
                          handleUserActivity();
                        }}
                        onPause={() => {
                          setIsPlaying(false);
                          handleUserActivity();
                        }}
                        onEnded={() => {
                          setIsPlaying(false);
                          handleUserActivity();
                          const button = document.getElementById('play-pause-btn');
                          if (button) {
                            button.innerHTML = '<svg class="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>';
                          }
                        }}
                        onError={(e) => {
                          console.error('Audio loading error:', e);
                        }}
                      >
                        <source src={currentAudioUrl} type={currentAudioUrl.includes('.wav') ? 'audio/wav' : 'audio/mpeg'} />
                        Your browser does not support the audio element.
                      </audio>
                    </div>
                  </div>


                  {/* Error Message */}
                  {errorMessage && (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-6">
                      <p className="text-red-300 text-sm">{errorMessage}</p>
                    </div>
                  )}

                  {/* Analysis Results - Enhanced with Animations */}
                  <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
                    <div className="mb-3">
                      <h3 className="text-lg font-bold text-white mb-1 text-left">Analysis Results</h3>
                      <p className="text-slate-300 text-sm text-left">AI-powered insights</p>
                    </div>
                    
                    {/* Content with smooth transitions */}
                    <div className="transition-all duration-500 ease-in-out">
                      {/* Initial State - Demo Result */}
                      {uploadState === 'idle' && (
                        <div className="bg-white/5 rounded-lg p-4 animate-fade-in">
                          <div className="flex items-center gap-2 mb-3">
                            <div className="w-5 h-5 rounded bg-violet-500/20 flex items-center justify-center">
                              <svg className="w-3 h-3 text-violet-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                            </div>
                            <span className="text-xs text-slate-400">Demo Result</span>
                          </div>
                          
                          {/* Current Demo Analysis */}
                          <div className="mb-4">
                            <p className="text-white/90 text-sm leading-relaxed mb-4 text-left">
                              {demoAudioSamples[currentDemoIndex].summary}
                            </p>
                          </div>
                          
                          <div className="text-xs text-slate-400 italic">
                            Upload your audio file to get real AI analysis
                          </div>
                        </div>
                      )}

                      {/* File Selected - Ready for Analysis with Animation */}
                      {uploadState === 'uploaded' && uploadedFile && (
                        <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-lg p-4 border border-green-500/20 animate-slide-in-from-top">
                          <div className="flex items-center gap-2 mb-4">
                            <div className="w-5 h-5 rounded bg-green-500/20 flex items-center justify-center animate-pulse">
                              <svg className="w-3 h-3 text-green-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </div>
                            <span className="text-xs text-green-400 font-medium">Ready for Analysis</span>
                          </div>
                          
                          {/* Animated Audio Waveform */}
                          <div className="flex items-center justify-center gap-1 mb-4">
                            {[1, 2, 3, 4, 5, 4, 3, 2, 1, 2, 3, 4, 5, 4, 3, 2, 1].map((height, index) => (
                              <div
                                key={index}
                                className="bg-green-500 rounded-full animate-pulse"
                                style={{
                                  width: '3px',
                                  height: `${height * 3}px`,
                                  animationDelay: `${index * 0.1}s`,
                                  animationDuration: '1.5s'
                                }}
                              ></div>
                            ))}
                          </div>
                          
                          {/* Animated Text */}
                          <div className="text-center">
                            <div className="flex items-center justify-center gap-2 text-xs text-green-300 mb-2">
                              <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce"></div>
                              <span>Audio file ready for AI analysis</span>
                              <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                            </div>
                            <div className="mt-3 p-2 bg-green-500/10 rounded-lg border border-green-500/20">
                              <p className="text-green-300 text-xs text-center">
                                🎵 Click "Start Analysis" to get AI insights
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Analysis in Progress - Animated */}
                      {uploadState === 'analyzing' && (
                        <div className="bg-gradient-to-r from-violet-500/10 to-blue-500/10 rounded-lg p-4 border border-violet-500/20 animate-pulse">
                          <div className="flex items-center gap-2 mb-3">
                            <div className="w-5 h-5 rounded bg-violet-500/20 flex items-center justify-center">
                              <div className="w-3 h-3 border-2 border-violet-500 border-t-transparent rounded-full animate-spin"></div>
                            </div>
                            <span className="text-xs text-violet-400 font-medium">AI Analysis in Progress</span>
                          </div>
                          
                          {/* Animated Audio Waveform */}
                          <div className="flex items-center justify-center gap-1 mb-4">
                            {[1, 2, 3, 4, 5, 4, 3, 2, 1, 2, 3, 4, 5, 4, 3, 2, 1].map((height, index) => (
                              <div
                                key={index}
                                className="bg-violet-500 rounded-full animate-pulse"
                                style={{
                                  width: '3px',
                                  height: `${height * 4}px`,
                                  animationDelay: `${index * 0.1}s`,
                                  animationDuration: '1s'
                                }}
                              ></div>
                            ))}
                          </div>
                          
                          <div className="text-center">
                            <p className="text-white/90 text-sm mb-2">
                              {currentProgress?.message || currentMessage}
                            </p>
                            <div className="flex items-center justify-center gap-2 text-xs text-slate-400">
                              <div className="w-2 h-2 bg-violet-500 rounded-full animate-bounce"></div>
                              <span>Processing your audio file...</span>
                              <div className="w-2 h-2 bg-violet-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Analysis Complete - Success Animation */}
                      {uploadState === 'complete' && analysisResult && (
                        <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-lg p-4 border border-green-500/20 animate-slide-in-from-bottom">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <div className="w-5 h-5 rounded bg-green-500/20 flex items-center justify-center animate-bounce">
                                <svg className="w-3 h-3 text-green-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              </div>
                              <span className="text-xs text-green-400 font-medium">✓ Analysis Complete</span>
                            </div>
                            <button 
                              className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors animate-pulse"
                              onClick={(e) => {
                                const text = analysisResult.aiDescription || 'No description available';
                                navigator.clipboard.writeText(text).then(() => {
                                  toast.success('Copied Successfully', 'AI description copied to clipboard');
                                  
                                  const button = e.currentTarget as HTMLElement;
                                  if (button) {
                                    const originalContent = button.innerHTML;
                                    button.innerHTML = '<svg class="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>';
                                    setTimeout(() => {
                                      if (button) {
                                        button.innerHTML = originalContent;
                                      }
                                    }, 1500);
                                  }
                                }).catch((error) => {
                                  console.error('Copy failed:', error);
                                  toast.error('Copy Failed', 'Unable to copy to clipboard, please copy manually');
                                });
                              }}
                            >
                              <svg className="w-4 h-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                            </button>
                          </div>
                          <div className="relative">
                            <p className="text-white/90 text-sm leading-relaxed mb-4 text-left animate-fade-in">
                              {analysisResult.aiDescription || 'Analysis completed successfully!'}
                            </p>
                            {/* Success sparkle effect */}
                            <div className="absolute top-0 right-0 w-2 h-2 bg-green-400 rounded-full animate-ping"></div>
                            <div className="absolute top-2 right-2 w-1 h-1 bg-green-300 rounded-full animate-ping" style={{animationDelay: '0.5s'}}></div>
                          </div>
                          
                          {/* Action Button with animation */}
                          <button 
                            onClick={() => {
                              // Store result in sessionStorage for analysis result page
                              sessionStorage.setItem(`analysis-result-${analysisResult.id}`, JSON.stringify(analysisResult));
                              // Navigate to the dynamic analysis result page
                              window.location.href = `/analysis/${analysisResult.id}`;
                            }}
                            className="w-full bg-violet-500 hover:bg-violet-600 text-white py-3 px-4 rounded-lg text-sm font-semibold transition-all duration-300 hover:scale-105 transform shadow-lg"
                          >
                            🎵 View Full Analysis →
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
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

    {/* Login Modal */}
    <LoginModal
      isOpen={showLoginModal}
      onClose={() => setShowLoginModal(false)}
      defaultMode="login"
    />
    </>
  );
}

// Wrapper component with AuthProvider and CreditProvider for Astro usage
export function HeroSimpleWithProvider() {
  return (
    <AuthProvider>
      <CreditProvider>
        <HeroSimple />
      </CreditProvider>
    </AuthProvider>
  );
}
