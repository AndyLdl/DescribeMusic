import React, { useState, useRef, useCallback } from 'react';
import UploadSection from './analyze/UploadSection';
import LoadingSection from './analyze/LoadingSection';
import DashboardSection from './analyze/DashboardSection';
import HistorySidebar from './analyze/HistorySidebar';
import { HistoryStorage, type HistoryRecord } from '../utils/historyStorage';
import { cloudFunctions, validateAudioFile, type CloudAnalysisResult, type ProgressUpdate } from '../utils/cloudFunctions';

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

export default function AnalyzeApp() {
  const [stage, setStage] = useState<AnalysisStage>('upload');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentProgress, setCurrentProgress] = useState<ProgressUpdate | null>(null);
  
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

  const handleFiles = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return;
    
    const file = files[0];
    
    // Use cloud functions validation
    const validation = validateAudioFile(file);
    if (!validation.valid) {
      setErrorMessage(validation.error || 'Invalid file');
      setStage('error');
      return;
    }

    setUploadedFile(file);
    setErrorMessage('');
    startAnalysis(file);
  }, []);

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

  const startAnalysis = useCallback(async (file: File) => {
    setStage('analyzing');
    setIsAnalyzing(true);
    
    // Clear previous results and hide export buttons during analysis
    (window as any).currentAnalysisResult = null;
    (window as any).backupAnalysisResult = null;
    const clearEvent = new CustomEvent('analysisResultCleared');
    window.dispatchEvent(clearEvent);
    
    setErrorMessage('');
    setCurrentProgress(null);
    
    try {
      // Create local URL for audio preview
      const audioUrl = URL.createObjectURL(file);
      
      // Generate thumbnail for history
      const thumbnail = await HistoryStorage.generateThumbnail(file);
      
      // Call cloud function for analysis with progress callback
      const startTime = Date.now();
      const cloudResult: CloudAnalysisResult = await cloudFunctions.analyzeAudio(file, {
        includeStructure: true,
        includeSimilarity: true,
        detailedAnalysis: true,
        generateTags: true,
        onProgress: (progress: ProgressUpdate) => {
          setCurrentProgress(progress);
        }
      });
      
      const processingTime = Date.now() - startTime;
      
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
        audioUrl: audioUrl // Add the local audio URL
      };
      
      // Save to history
      const historyRecord: HistoryRecord = {
        id: result.id,
        filename: result.filename,
        timestamp: result.timestamp,
        duration: result.duration,
        fileSize: result.fileSize,
        format: result.format,
        thumbnail,
        contentType: result.contentType,
        basicInfo: result.basicInfo,
        voiceAnalysis: result.voiceAnalysis,
        soundEffects: result.soundEffects,
        quickStats: {
          qualityScore: result.quality.overall,
          emotionalTone: result.basicInfo.mood,
          primaryGenre: result.basicInfo.genre
        }
      };
      
      HistoryStorage.addRecord(historyRecord);
      
      setAnalysisResult(result);
      
      // Make the current analysis result available globally for export functionality
      (window as any).currentAnalysisResult = result;
      
      // Also dispatch a custom event to notify that analysis result is ready
      const event = new CustomEvent('analysisResultReady', { 
        detail: result 
      });
      window.dispatchEvent(event);
      
      setStage('results');
    } catch (error: any) {
      console.error('Analysis failed:', error);
      setErrorMessage(error.message || 'Analysis failed. Please try again.');
      setStage('error');
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

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
    // Convert history record to analysis result format
    const result: AnalysisResult = {
      id: record.id,
      filename: record.filename,
      timestamp: record.timestamp,
      duration: record.duration,
      fileSize: record.fileSize,
      format: record.format,
      contentType: record.contentType || {
        primary: 'music',
        confidence: 0.8,
        description: 'Music content (legacy record)'
      },
      basicInfo: record.basicInfo,
      voiceAnalysis: record.voiceAnalysis || {
        hasVoice: false,
        speakerCount: 0,
        genderDetection: { primary: 'unknown', confidence: 0.0, multipleGenders: false },
        speakerEmotion: { 
          primary: 'neutral', 
          confidence: 0.0, 
          emotions: {
            happy: 0.0, sad: 0.0, angry: 0.0, calm: 0.0,
            excited: 0.0, nervous: 0.0, confident: 0.0, stressed: 0.0
          }
        },
        speechClarity: { score: 0.0, pronunciation: 0.0, articulation: 0.0, pace: 'normal', volume: 'normal' },
        vocalCharacteristics: { pitchRange: 'medium', speakingRate: 0, pauseFrequency: 'low', intonationVariation: 0.0 },
        languageAnalysis: { language: 'unknown', confidence: 0.0, accent: 'unknown' },
        audioQuality: { backgroundNoise: 0.0, echo: 0.0, compression: 0.0, overall: 0.0 }
      },
      soundEffects: record.soundEffects || {
        detected: [],
        environment: {
          location_type: 'indoor',
          setting: 'commercial',
          activity_level: 'moderate',
          acoustic_space: 'medium',
          time_of_day: 'unknown',
          weather: 'unknown'
        }
      },
      emotions: {
        happy: 0.78,
        sad: 0.12,
        angry: 0.05,
        calm: 0.25,
        excited: 0.82
      },
      structure: {
        intro: { start: 0, end: 8 },
        verse1: { start: 8, end: 32 },
        chorus1: { start: 32, end: 56 },
        verse2: { start: 56, end: 80 },
        chorus2: { start: 80, end: 104 },
        bridge: { start: 104, end: 128 },
        outro: { start: 128, end: 180 }
      },
      quality: {
        overall: record.quickStats.qualityScore,
        clarity: 9.2,
        loudness: -8.5,
        dynamic_range: 7.8,
        noise_level: 2.1
      },
      similarity: {
        similar_tracks: [
          { title: "Midnight Drive", artist: "Synthwave Artist", similarity: 0.87 },
          { title: "Neon Lights", artist: "Retro Collective", similarity: 0.82 },
          { title: "Digital Dreams", artist: "Electronic Vibes", similarity: 0.79 }
        ]
      },
      tags: generateAITags(record.basicInfo, {
        happy: 0.78,
        sad: 0.12,
        angry: 0.05,
        calm: 0.25,
        excited: 0.82
      }, { overall: record.quickStats.qualityScore }, record.filename),
      aiDescription: `A ${record.basicInfo.mood.toLowerCase()} ${record.basicInfo.genre.toLowerCase()} track with professional quality.`,
      processingTime: 0 // Historical data
    };
    
    setAnalysisResult(result);
    setStage('results');
    setShowMobileSidebar(false);
    
    // Make the history analysis result available globally for export functionality
    (window as any).currentAnalysisResult = result;
    (window as any).backupAnalysisResult = result;
    
    // Dispatch event to show export buttons
    const event = new CustomEvent('analysisResultReady', { 
      detail: result 
    });
    window.dispatchEvent(event);
  }, []);

  const handleNewAnalysis = useCallback(() => {
    setStage('upload');
    setAnalysisResult(null);
    setUploadedFile(null);
    setErrorMessage('');
    setIsAnalyzing(false);
    
    // Clear global analysis results and hide export buttons
    (window as any).currentAnalysisResult = null;
    (window as any).backupAnalysisResult = null;
    const clearEvent = new CustomEvent('analysisResultCleared');
    window.dispatchEvent(clearEvent);
  }, []);

  const handleRetryAnalysis = useCallback(() => {
    if (uploadedFile) {
      startAnalysis(uploadedFile);
    } else {
      handleNewAnalysis();
    }
  }, [uploadedFile, startAnalysis, handleNewAnalysis]);

  return (
    <div className="min-h-screen bg-dark-bg">
      {/* Mobile Header */}
      <div className="md:hidden pt-16 pb-4 px-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">Analysis</h1>
          <button
            onClick={() => setShowMobileSidebar(!showMobileSidebar)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-white/5 text-slate-300 border border-white/10 rounded-full hover:bg-white/10 transition-all duration-300"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            History
          </button>
        </div>
      </div>
      
      {/* Desktop spacer */}
      <div className="hidden md:block pt-16"></div>

      {/* Main Content - Split Layout */}
      <div className="relative">
        {/* Mobile Sidebar Overlay */}
        {showMobileSidebar && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden">
            <div className="absolute left-0 top-0 bottom-0 w-80 max-w-[90vw]">
              <HistorySidebar 
                selectedRecordId={analysisResult?.id}
                onSelectRecord={(record) => {
                  handleSelectHistoryRecord(record);
                  setShowMobileSidebar(false);
                }}
                onNewAnalysis={() => {
                  resetAnalysis();
                  setShowMobileSidebar(false);
                }}
              />
            </div>
            <button
              onClick={() => setShowMobileSidebar(false)}
              className="absolute top-4 right-4 p-2 text-white bg-black/50 rounded-full"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
        
        {/* Desktop Layout */}
        <div className="hidden md:flex h-[calc(100vh-64px)] min-h-[600px]">
          {/* Left Sidebar - History */}
          <HistorySidebar 
            selectedRecordId={analysisResult?.id}
            onSelectRecord={handleSelectHistoryRecord}
            onNewAnalysis={handleNewAnalysis}
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
                  inputRef={inputRef}
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
                    <h3 className="text-xl font-semibold text-white mb-2">Analysis Failed</h3>
                    <p className="text-slate-400 mb-6">{errorMessage}</p>
                    <div className="flex gap-3 justify-center">
                      <button
                        onClick={handleRetryAnalysis}
                        className="btn btn-primary"
                      >
                        Try Again
                      </button>
                      <button
                        onClick={handleNewAnalysis}
                        className="btn btn-secondary"
                      >
                        New File
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Layout */}
        <div className="md:hidden">
          <div className="max-w-6xl mx-auto px-6 py-8">
            {stage === 'upload' && (
              <UploadSection 
                onFileSelect={handleFiles}
                dragActive={dragActive}
                onDrag={handleDrag}
                onDrop={handleDrop}
                inputRef={inputRef}
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
                  <h3 className="text-xl font-semibold text-white mb-2">Analysis Failed</h3>
                  <p className="text-slate-400 mb-6">{errorMessage}</p>
                  <div className="flex gap-3 justify-center">
                    <button
                      onClick={handleRetryAnalysis}
                      className="btn btn-primary"
                    >
                      Try Again
                    </button>
                    <button
                      onClick={handleNewAnalysis}
                      className="btn btn-secondary"
                    >
                      New File
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