import React, { useState, useRef, useCallback } from 'react';
import UploadSection from './analyze/UploadSection';
import LoadingSection from './analyze/LoadingSection';
import DashboardSection from './analyze/DashboardSection';
import HistorySidebar from './analyze/HistorySidebar';

import AnalyzeHeader from './AnalyzeHeader';
import { CreditToastContainer } from './credit/CreditToast';
import { HistoryStorage, type HistoryRecord } from '../utils/historyStorage';
import { saveAnalysisResult } from '../services/analysisResultService';
import { supabase } from '../lib/supabase';
import { cloudFunctions, validateAudioFile, type CloudAnalysisResult, type ProgressUpdate } from '../utils/cloudFunctions';
import { useAuth, useUsageStatus } from '../contexts/AuthContext';
import { CreditProvider, useCredit, useTrialCredit } from '../contexts/CreditContext';
import { AudioDurationDetector, type AudioDurationResult } from '../utils/audioDurationDetector';
import { CreditCalculator, type CreditConsumptionEstimate } from '../utils/creditCalculator';

type AnalysisStage = 'upload' | 'analyzing' | 'results' | 'error';

interface AnalysisResult {
  id: string;
  filename: string;
  timestamp: string;
  duration: number;
  fileSize: string;
  format: string;
  contentType?: {
    primary: 'music' | 'speech' | 'sound-effects' | 'ambient' | 'mixed';
    confidence: number;
    description: string;
  };
  basicInfo: any;
  voiceAnalysis?: {
    hasVoice: boolean;
    speakerCount: number;
    genderDetection: {
      primary: 'male' | 'female' | 'unknown';
      confidence: number;
      multipleGenders: boolean;
    };
    speakerEmotion: {
      primary: 'happy' | 'sad' | 'angry' | 'calm' | 'excited' | 'nervous' | 'confident' | 'stressed' | 'neutral';
      confidence: number;
      emotions: {
        happy: number;
        sad: number;
        angry: number;
        calm: number;
        excited: number;
        nervous: number;
        confident: number;
        stressed: number;
      };
    };
    speechClarity: {
      score: number;
      pronunciation: number;
      articulation: number;
      pace: 'slow' | 'normal' | 'fast';
      volume: 'quiet' | 'normal' | 'loud';
    };
    vocalCharacteristics: {
      pitchRange: 'low' | 'medium' | 'high';
      speakingRate: number;
      pauseFrequency: 'low' | 'medium' | 'high';
      intonationVariation: number;
    };
    languageAnalysis: {
      language: string;
      confidence: number;
      accent: string;
    };
    audioQuality: {
      backgroundNoise: number;
      echo: number;
      compression: number;
      overall: number;
    };
  };
  soundEffects?: {
    detected: Array<{
      category: 'nature' | 'urban' | 'indoor' | 'mechanical' | 'human' | 'animal' | 'event';
      type: string;
      confidence: number;
      timestamp: { start: number; end: number };
      description: string;
    }>;
    environment: {
      location_type: 'indoor' | 'outdoor' | 'mixed';
      setting: 'urban' | 'rural' | 'natural' | 'domestic' | 'commercial';
      activity_level: 'busy' | 'moderate' | 'calm' | 'isolated';
      acoustic_space: 'small' | 'medium' | 'large' | 'open';
      time_of_day: 'unknown' | 'morning' | 'day' | 'evening' | 'night';
      weather: 'unknown' | 'clear' | 'rain' | 'wind' | 'storm';
    };
  };
  emotions: any;
  structure: any;
  quality: any;
  similarity: any;
  tags: string[];
  aiDescription: string;
  processingTime: number;
  audioUrl?: string; // Add optional audio URL for playback
}

// Main AnalyzeApp component that uses credit system
function AnalyzeAppContent() {
  // Auth hooks must be called before all other hooks
  const { user, loading: authLoading } = useAuth();
  const { usageStatus, canAnalyze, needsAuth } = useUsageStatus();

  // 使用实际的积分系统
  const {
    credits,
    loading: creditLoading,
    consumeCredits,
    refundCredits,
    estimateConsumption,
    calculateCreditsForDuration
  } = useCredit();

  const {
    checkTrialCredits,
    consumeTrialCredits,
    refundTrialCredits,
    calculateCreditsForDuration: calculateTrialCredits
  } = useTrialCredit();

  // Component state hooks
  const [stage, setStage] = useState<AnalysisStage>('upload');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentProgress, setCurrentProgress] = useState<ProgressUpdate | null>(null);


  // Credit system state
  const [audioDuration, setAudioDuration] = useState<AudioDurationResult | null>(null);
  const [creditEstimate, setCreditEstimate] = useState<CreditConsumptionEstimate | null>(null);
  const [analysisCreditsConsumed, setAnalysisCreditsConsumed] = useState<number>(0);
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0); // 用于触发积分刷新

  // Cleanup function for audio URL and global variables
  React.useEffect(() => {
    return () => {
      if (analysisResult?.audioUrl) {
        URL.revokeObjectURL(analysisResult.audioUrl);
      }
      // Clean up global analysis result when component unmounts
      (window as any).currentAnalysisResult = null;
    };
  }, [analysisResult?.audioUrl]);

  // Clear any previous analysis result when component mounts
  React.useEffect(() => {
    (window as any).currentAnalysisResult = null;
    (window as any).backupAnalysisResult = null;

    // Dispatch event to hide export buttons initially
    const event = new CustomEvent('analysisResultCleared');
    window.dispatchEvent(event);
  }, []);
  const inputRef = useRef<HTMLInputElement>(null);

  // Open login modal - now handled by UserAccountDropdown
  const openLogin = useCallback(() => {
    // 触发UserAccountDropdown中的登录模态框
    const signInButton = document.querySelector('[data-login-trigger]') as HTMLButtonElement;
    if (signInButton) {
      signInButton.click();
    }
  }, []);

  const handleFiles = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const file = files[0];

    try {
      // Use cloud functions validation
      const validation = validateAudioFile(file);
      if (!validation.valid) {
        setErrorMessage(validation.error || 'Invalid file');
        setStage('error');
        return;
      }

      // 检测音频时长和计算积分
      setErrorMessage('正在检测音频时长...');
      const durationResult = await AudioDurationDetector.detectDuration(file);
      setAudioDuration(durationResult);

      // 计算积分消费预估
      const creditsRequired = user
        ? calculateCreditsForDuration(durationResult.duration)
        : calculateTrialCredits(durationResult.duration);

      const estimate = user
        ? estimateConsumption(durationResult.duration)
        : CreditCalculator.estimateConsumption(durationResult.duration, 100); // Assume 100 trial credits

      setCreditEstimate(estimate);

      // 检查积分余额
      let hasEnoughCredits = false;

      if (user) {
        // For authenticated users, check credit balance
        hasEnoughCredits = credits >= creditsRequired;
        if (!hasEnoughCredits) {
          setErrorMessage(`Insufficient credits. ${creditsRequired} credits required, current balance: ${credits} credits`);
          setStage('error');
          return;
        }
      } else {
        // For trial users, check trial credits
        hasEnoughCredits = await checkTrialCredits(creditsRequired);
        if (!hasEnoughCredits) {
          setErrorMessage(`Insufficient trial credits. ${creditsRequired} credits required. Please register to get more credits.`);
          setStage('error');
          return;
        }
      }

      // Check usage limits (保持现有逻辑作为fallback)
      if (!canAnalyze) {
        if (needsAuth) {
          setErrorMessage(usageStatus?.message || 'Login required to continue');
          setStage('error');
          return;
        } else {
          setErrorMessage(usageStatus?.message || 'Usage limit reached');
          setStage('error');
          return;
        }
      }

      setUploadedFile(file);
      setErrorMessage('');

      // 显示预估信息并等待用户确认
      console.log(`音频时长: ${durationResult.formattedDuration}, 预估消费: ${creditsRequired} 积分`);

      // 直接开始分析，传递检测到的音频时长
      startAnalysis(file, creditsRequired, durationResult.duration);

    } catch (error: any) {
      console.error('Audio duration detection failed:', error);
      setErrorMessage(error.message || '音频文件处理失败，请检查文件格式');
      setStage('error');
    }
  }, [user, credits, canAnalyze, needsAuth, usageStatus, calculateCreditsForDuration, calculateTrialCredits, estimateConsumption, checkTrialCredits]);

  // Function to generate AI tags based on analysis results
  const generateAITags = (basicInfo: any, emotions: any, quality: any, filename: string) => {
    const tags: string[] = [];

    // Genre-based tags
    tags.push(basicInfo.genre.toLowerCase());

    // Mood-based tags
    tags.push(basicInfo.mood.toLowerCase());

    // Energy level tags
    if (basicInfo.energy > 0.8) {
      tags.push('high-energy', 'energetic', 'intense');
    } else if (basicInfo.energy > 0.6) {
      tags.push('medium-energy', 'upbeat');
    } else {
      tags.push('low-energy', 'calm', 'relaxed');
    }

    // BPM-based tags
    if (basicInfo.bpm > 140) {
      tags.push('fast-tempo', 'dance', 'workout');
    } else if (basicInfo.bpm > 100) {
      tags.push('moderate-tempo', 'groove');
    } else {
      tags.push('slow-tempo', 'chill', 'ambient');
    }

    // Emotion-based tags
    const topEmotion = Object.entries(emotions).reduce((a, b) => emotions[a[0]] > emotions[b[0]] ? a : b)[0];
    tags.push(topEmotion);

    if (emotions.happy > 0.6) tags.push('uplifting', 'positive');
    if (emotions.sad > 0.6) tags.push('melancholic', 'emotional');
    if (emotions.excited > 0.7) tags.push('exciting', 'dynamic');
    if (emotions.calm > 0.6) tags.push('peaceful', 'serene');

    // Quality-based tags
    if (quality.overall > 8) {
      tags.push('high-quality', 'professional', 'studio-quality');
    } else if (quality.overall > 6) {
      tags.push('good-quality');
    }

    if (quality.clarity > 8) tags.push('clear', 'crisp');
    if (quality.dynamic_range > 7) tags.push('dynamic');

    // Danceability tags
    if (basicInfo.danceability > 0.8) {
      tags.push('danceable', 'groovy', 'rhythmic');
    }

    // Valence-based tags
    if (basicInfo.valence > 0.7) {
      tags.push('positive', 'bright');
    } else if (basicInfo.valence < 0.4) {
      tags.push('dark', 'moody');
    }

    // File type based tags
    const fileExtension = filename.split('.').pop()?.toLowerCase();
    if (fileExtension) {
      tags.push(`${fileExtension}-file`);
    }

    // SEO-friendly tags
    tags.push('ai-analyzed', 'music-analysis', 'audio-processing');

    // Remove duplicates and limit to 15 tags
    return [...new Set(tags)].slice(0, 15);
  };

  const startAnalysis = useCallback(async (file: File, creditsToConsume: number = 0, audioDurationSeconds?: number) => {
    setStage('analyzing');
    setIsAnalyzing(true);

    // Clear previous results and hide export buttons during analysis
    (window as any).currentAnalysisResult = null;
    (window as any).backupAnalysisResult = null;
    const clearEvent = new CustomEvent('analysisResultCleared');
    window.dispatchEvent(clearEvent);

    setErrorMessage('');
    setCurrentProgress(null);

    let analysisId: string | undefined;

    try {
      // 积分扣除现在由云函数处理，更安全
      console.log(`预估积分消耗: ${creditsToConsume}`);

      // Create local URL for audio preview in current page
      const audioUrl = URL.createObjectURL(file);

      // Generate thumbnail for history
      const thumbnail = await HistoryStorage.generateThumbnail(file);

      // Call cloud function for analysis with progress callback
      console.log(`🎵 开始分析音频，时长: ${audioDurationSeconds} 秒`);

      const startTime = Date.now();
      const cloudResult: CloudAnalysisResult = await cloudFunctions.analyzeAudio(file, {
        includeStructure: true,
        includeSimilarity: true,
        detailedAnalysis: true,
        generateTags: true,
        audioDuration: audioDurationSeconds || 0, // Pass detected duration to cloud function
        onProgress: (progress: ProgressUpdate) => {
          setCurrentProgress(progress);
        }
      });

      const processingTime = Date.now() - startTime;
      analysisId = cloudResult.id;

      // Convert cloud result to frontend format
      const result: AnalysisResult = {
        id: cloudResult.id,
        filename: cloudResult.filename,
        timestamp: cloudResult.timestamp,
        duration: cloudResult.duration,
        fileSize: cloudResult.fileSize,
        format: cloudResult.format,
        contentType: cloudResult.contentType,
        basicInfo: cloudResult.basicInfo,
        voiceAnalysis: cloudResult.voiceAnalysis,
        soundEffects: cloudResult.soundEffects,
        emotions: cloudResult.emotions,
        structure: cloudResult.structure,
        quality: cloudResult.quality,
        similarity: cloudResult.similarity,
        tags: cloudResult.tags,
        aiDescription: cloudResult.aiDescription,
        processingTime: Math.round(processingTime / 1000), // Convert to seconds
        audioUrl: cloudResult.audioUrl || audioUrl // Use cloud function URL if available, fallback to local
      };

      console.log('🎵 Analysis result created:', {
        id: result.id,
        hasAudioUrl: !!result.audioUrl,
        audioUrlSource: cloudResult.audioUrl ? 'cloud' : 'local',
        audioUrlPreview: result.audioUrl?.substring(0, 100) + '...'
      });

      // Save to history with complete data
      const historyRecord: HistoryRecord = {
        id: result.id,
        filename: result.filename,
        timestamp: result.timestamp,
        duration: result.duration,
        fileSize: result.fileSize,
        format: result.format,
        thumbnail,
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

      // Save to database for sharing functionality
      try {
        const { data: { user } } = await supabase.auth.getUser();
        await saveAnalysisResult(result, user?.id);
      } catch (error) {
        console.error('Failed to save analysis result to database:', error);
        // Don't block the flow if database save fails
      }

      // Store result in sessionStorage for the new analysis page
      // Note: audioUrl from cloud function is already included in result
      sessionStorage.setItem('heroAnalysisResult', JSON.stringify(result));

      // Make the current analysis result available globally for export functionality
      (window as any).currentAnalysisResult = result;

      // Also dispatch a custom event to notify that analysis result is ready
      const event = new CustomEvent('analysisResultReady', {
        detail: result
      });
      window.dispatchEvent(event);

      // Navigate to the new analysis result page instead of showing results in current page (ensure trailing slash)
      window.location.href = `/analysis/${result.id}/`;
      
      // 🔄 触发积分刷新（分析成功后）
      setRefreshTrigger(prev => prev + 1);
      console.log('💳 Triggering credit refresh after successful analysis');
    } catch (error: any) {
      console.error('Analysis failed:', error);

      // 积分扣除和退款现在由云函数处理，更安全
      console.log('分析失败，云函数会自动处理积分退款');

      setErrorMessage(error.message || 'Analysis failed. Please try again.');
      setStage('error');
    } finally {
      setIsAnalyzing(false);
      setAnalysisCreditsConsumed(0);
    }
  }, [user, consumeCredits, consumeTrialCredits, refundCredits, refundTrialCredits]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files);
    }
  }, [handleFiles]);



  const handleSelectHistoryRecord = useCallback((record: HistoryRecord) => {
    // Navigate to the dynamic analysis page (ensure trailing slash)
    window.location.href = `/analysis/${record.id}/`;
  }, []);

  const handleNewAnalysis = useCallback(() => {
    setStage('upload');
    setAnalysisResult(null);
    setUploadedFile(null);
    setErrorMessage('');
    setIsAnalyzing(false);

    // Clear credit system state
    setAudioDuration(null);
    setCreditEstimate(null);
    setAnalysisCreditsConsumed(0);

    // Clear global analysis results and hide export buttons
    (window as any).currentAnalysisResult = null;
    (window as any).backupAnalysisResult = null;
    const clearEvent = new CustomEvent('analysisResultCleared');
    window.dispatchEvent(clearEvent);
  }, []);

  const handleRetryAnalysis = useCallback(() => {
    if (uploadedFile) {
      // 重新检测时长和计算积分
      handleFiles([uploadedFile] as any);
    } else {
      handleNewAnalysis();
    }
  }, [uploadedFile, handleFiles, handleNewAnalysis]);

  return (
    <div className="min-h-screen bg-dark-bg">
      <CreditToastContainer />
      {/* React Header Component */}
      <AnalyzeHeader />

      {/* Mobile Header - Compact */}
      <div className="md:hidden pt-20 pb-2 px-4">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-white truncate">Analysis</h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Upload and analyze your audio files
            </p>
          </div>
          <button
            onClick={() => setShowMobileSidebar(!showMobileSidebar)}
            className="ml-3 inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-white/5 text-slate-300 border border-white/10 rounded-full hover:bg-white/10 transition-all duration-300 text-sm flex-shrink-0"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="hidden sm:inline">History</span>
          </button>
        </div>
      </div>

      {/* Desktop spacer */}
      <div className="hidden md:block pt-16"></div>

      {/* Main Content - Split Layout */}
      <div className="relative">
        {/* Mobile Bottom Sheet */}
        {showMobileSidebar && (
          <div className="fixed inset-0 z-40 md:hidden">
            {/* Backdrop */}
            <div 
              className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300"
              onClick={() => setShowMobileSidebar(false)}
            />
            
            {/* Bottom Sheet */}
            <div className="fixed inset-x-0 bottom-0 top-[20%] bg-slate-900/95 backdrop-blur-xl border-t border-white/10 rounded-t-3xl shadow-2xl flex flex-col transition-transform duration-300 ease-out animate-slide-up">
              {/* Drag Handle */}
              <div className="flex justify-center pt-3 pb-2">
                <div className="w-12 h-1.5 bg-white/20 rounded-full" />
              </div>
              
              {/* Header */}
              <div className="px-4 pb-3 border-b border-white/10">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-white">History</h3>
                  </div>
                  <button
                    onClick={() => setShowMobileSidebar(false)}
                    className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-all duration-300"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              
              {/* History Content */}
              <div className="flex-1 overflow-y-auto">
                <HistorySidebar
                  selectedRecordId={analysisResult?.id}
                  onSelectRecord={(record) => {
                    handleSelectHistoryRecord(record);
                    setShowMobileSidebar(false);
                  }}
                  onNewAnalysis={() => {
                    handleNewAnalysis();
                    setShowMobileSidebar(false);
                  }}
                  currentStage={stage}
                  isMobile={true}
                />
              </div>
            </div>
          </div>
        )}

        {/* Desktop Layout */}
        <div className="hidden md:flex h-[calc(100vh-64px)] min-h-[600px]">
          {/* Left Sidebar - History */}
          <HistorySidebar
            selectedRecordId={analysisResult?.id}
            onSelectRecord={handleSelectHistoryRecord}
            onNewAnalysis={handleNewAnalysis}
            currentStage={stage}
          />

          {/* Right Main Area */}
          <div className="flex-1 overflow-auto">
            <div className="max-w-6xl mx-auto px-6 py-8">
              {stage === 'upload' && (
                <UploadSection
                  onFileSelect={handleFiles}
                  dragActive={dragActive}
                  onDrag={handleDrag}
                  onDrop={handleDrop}
                  inputRef={inputRef as React.RefObject<HTMLInputElement>}
                  usageStatus={usageStatus}
                  user={user}
                  onOpenLogin={openLogin}
                  currentCredits={credits}
                  isLoadingCredits={creditLoading}
                  audioDuration={audioDuration}
                  creditEstimate={creditEstimate}
                  onPurchaseCredits={() => window.location.href = '/pricing'}
                  refreshTrigger={refreshTrigger}
                />
              )}

              {stage === 'analyzing' && uploadedFile && (
                <LoadingSection
                  filename={uploadedFile.name}
                  onCancel={handleNewAnalysis}
                  progress={currentProgress}
                />
              )}

              {stage === 'results' && analysisResult && (
                <DashboardSection
                  result={analysisResult}
                />
              )}

              {stage === 'error' && (
                <div className="text-center py-12">
                  <div className="glass-pane p-8 max-w-md mx-auto">
                    <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-semibold text-white mb-2">Insufficient Credits</h3>
                    {!user ? (
                      <div className="mb-6">
                        <p className="text-slate-300 text-base mb-3">{errorMessage}</p>
                        <div className="bg-gradient-to-r from-violet-500/10 to-blue-500/10 border border-violet-500/20 rounded-lg p-4">
                          <div className="flex items-start gap-3">
                            <svg className="w-5 h-5 text-violet-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                            <div className="text-left">
                              <p className="text-violet-300 text-sm font-medium">Sign up now and get 200 free trial credits!</p>
                              <p className="text-slate-400 text-xs mt-1">Start analyzing your audio files instantly with no credit card required.</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="mb-6">
                        <p className="text-slate-300 text-base mb-3">{errorMessage}</p>
                        <div className="bg-gradient-to-r from-violet-500/10 to-blue-500/10 border border-violet-500/20 rounded-lg p-4">
                          <div className="flex items-start gap-3">
                            <svg className="w-5 h-5 text-violet-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <div className="text-left">
                              <p className="text-violet-300 text-sm font-medium">Need more credits?</p>
                              <p className="text-slate-400 text-xs mt-1">Choose a plan that fits your needs and continue analyzing without limits.</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                      {!user ? (
                        <button
                          onClick={openLogin}
                          className="px-6 py-3 bg-gradient-to-r from-violet-500 to-blue-500 text-white text-base font-semibold rounded-lg hover:from-violet-600 hover:to-blue-600 transform hover:scale-105 transition-all duration-300 shadow-lg shadow-violet-500/25"
                        >
                          Sign Up Free
                        </button>
                      ) : (
                        <button
                          onClick={() => window.location.href = '/pricing'}
                          className="px-6 py-3 bg-gradient-to-r from-violet-500 to-blue-500 text-white text-base font-semibold rounded-lg hover:from-violet-600 hover:to-blue-600 transform hover:scale-105 transition-all duration-300 shadow-lg shadow-violet-500/25"
                        >
                          Get More Credits
                        </button>
                      )}
                      <button
                        onClick={handleNewAnalysis}
                        className="px-6 py-3 bg-white/10 text-slate-300 text-base font-medium rounded-lg hover:bg-white/20 hover:text-white border border-white/20 transition-all duration-300"
                      >
                        Try Another File
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Layout - Optimized for Upload Visibility */}
        <div className="md:hidden">
          <div className="max-w-6xl mx-auto px-4 py-4">
            {stage === 'upload' && (
              <UploadSection
                onFileSelect={handleFiles}
                dragActive={dragActive}
                onDrag={handleDrag}
                onDrop={handleDrop}
                inputRef={inputRef as React.RefObject<HTMLInputElement>}
                usageStatus={usageStatus}
                user={user}
                onOpenLogin={openLogin}
                currentCredits={credits}
                isLoadingCredits={creditLoading}
                audioDuration={audioDuration}
                creditEstimate={creditEstimate}
                onPurchaseCredits={() => window.location.href = '/pricing'}
                refreshTrigger={refreshTrigger}
              />
            )}

            {stage === 'analyzing' && uploadedFile && (
              <LoadingSection
                filename={uploadedFile.name}
                onCancel={handleNewAnalysis}
                progress={currentProgress}
              />
            )}

            {stage === 'results' && analysisResult && (
              <DashboardSection
                result={analysisResult}
              />
            )}

            {stage === 'error' && (
              <div className="text-center py-12">
                <div className="glass-pane p-8">
                  <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">Insufficient Credits</h3>
                  {!user ? (
                    <div className="mb-6">
                      <p className="text-slate-300 text-base mb-3">{errorMessage}</p>
                      <div className="bg-gradient-to-r from-violet-500/10 to-blue-500/10 border border-violet-500/20 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                          <svg className="w-5 h-5 text-violet-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                          <div className="text-left">
                            <p className="text-violet-300 text-sm font-medium">Sign up now and get 200 free trial credits!</p>
                            <p className="text-slate-400 text-xs mt-1">Start analyzing your audio files instantly with no credit card required.</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="mb-6">
                      <p className="text-slate-300 text-base mb-3">{errorMessage}</p>
                      <div className="bg-gradient-to-r from-violet-500/10 to-blue-500/10 border border-violet-500/20 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                          <svg className="w-5 h-5 text-violet-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <div className="text-left">
                            <p className="text-violet-300 text-sm font-medium">Need more credits?</p>
                            <p className="text-slate-400 text-xs mt-1">Choose a plan that fits your needs and continue analyzing without limits.</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="flex flex-col gap-3 justify-center">
                    {!user ? (
                      <button
                        onClick={openLogin}
                        className="px-6 py-3 bg-gradient-to-r from-violet-500 to-blue-500 text-white text-base font-semibold rounded-lg hover:from-violet-600 hover:to-blue-600 transform hover:scale-105 transition-all duration-300 shadow-lg shadow-violet-500/25"
                      >
                        Sign Up Free
                      </button>
                    ) : (
                      <button
                        onClick={() => window.location.href = '/pricing'}
                        className="px-6 py-3 bg-gradient-to-r from-violet-500 to-blue-500 text-white text-base font-semibold rounded-lg hover:from-violet-600 hover:to-blue-600 transform hover:scale-105 transition-all duration-300 shadow-lg shadow-violet-500/25"
                      >
                        Get More Credits
                      </button>
                    )}
                    <button
                      onClick={handleNewAnalysis}
                      className="px-6 py-3 bg-white/10 text-slate-300 text-base font-medium rounded-lg hover:bg-white/20 hover:text-white border border-white/20 transition-all duration-300"
                    >
                      Try Another File
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>


    </div>
  );
}

// Main AnalyzeApp component with CreditProvider
export default function AnalyzeApp() {
  return (
    <CreditProvider>
      <AnalyzeAppContent />
    </CreditProvider>
  );
}