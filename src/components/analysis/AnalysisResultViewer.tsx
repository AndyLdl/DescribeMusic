import React, { useState, useEffect, useCallback } from 'react';
import { HistoryStorage, type HistoryRecord } from '../../utils/historyStorage';
import DashboardSection from '../analyze/DashboardSection';
import AnalyzeHeader from '../AnalyzeHeader';
import HistorySidebar from '../analyze/HistorySidebar';

interface AnalysisResultViewerProps {
  analysisId: string;
}

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
  audioUrl?: string;
}

export default function AnalysisResultViewer({ analysisId }: AnalysisResultViewerProps) {
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);

  // Load analysis result from history
  const loadAnalysisResult = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      // First try to get from sessionStorage (for recent analysis)
      const sessionResult = sessionStorage.getItem('heroAnalysisResult');
      if (sessionResult) {
        const parsedResult = JSON.parse(sessionResult);
        console.log('📍 Analysis result from session:', {
          id: parsedResult.id,
          hasAudioUrl: !!parsedResult.audioUrl,
          audioUrl: parsedResult.audioUrl?.substring(0, 100) + '...'
        });
        if (parsedResult.id === analysisId) {
          // audioUrl is already included from cloud function response
          setAnalysisResult(parsedResult);
          
          // Make result available for export functionality
          (window as any).currentAnalysisResult = parsedResult;
          (window as any).backupAnalysisResult = parsedResult;
          
          // Dispatch event to show export buttons
          console.log('🎯 AnalysisResultViewer: Dispatching analysisResultReady event (from sessionStorage)');
          const event = new CustomEvent('analysisResultReady', {
            detail: parsedResult
          });
          window.dispatchEvent(event);
          console.log('🎯 AnalysisResultViewer: Event dispatched');
          
          setLoading(false);
          return;
        }
      }

      // Try to get from history storage
      const historyRecord = HistoryStorage.getRecordById(analysisId);
      if (historyRecord) {
        console.log('📍 Analysis result from history:', {
          id: historyRecord.id,
          hasAudioUrl: !!historyRecord.audioUrl,
          audioUrl: historyRecord.audioUrl?.substring(0, 100) + '...'
        });
        
        // Convert history record to analysis result format
        const result: AnalysisResult = {
          id: historyRecord.id,
          filename: historyRecord.filename,
          timestamp: historyRecord.timestamp,
          duration: historyRecord.duration,
          fileSize: historyRecord.fileSize,
          format: historyRecord.format,
          audioUrl: historyRecord.audioUrl, // Include audioUrl from history
          contentType: historyRecord.contentType || {
            primary: 'music',
            confidence: 0.8,
            description: 'Music content (legacy record)'
          },
          basicInfo: historyRecord.basicInfo,
          voiceAnalysis: historyRecord.voiceAnalysis || {
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
          soundEffects: historyRecord.soundEffects || {
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
          // Use saved data if available, fallback to defaults for legacy records
          emotions: historyRecord.emotions || {
            happy: 0.78,
            sad: 0.12,
            angry: 0.05,
            calm: 0.25,
            excited: 0.82
          },
          structure: historyRecord.structure || {
            intro: { start: 0, end: 8 },
            verse1: { start: 8, end: 32 },
            chorus1: { start: 32, end: 56 },
            verse2: { start: 56, end: 80 },
            chorus2: { start: 80, end: 104 },
            bridge: { start: 104, end: 128 },
            outro: { start: 128, end: 180 }
          },
          quality: historyRecord.quality || {
            overall: historyRecord.quickStats.qualityScore,
            clarity: 9.2,
            loudness: -8.5,
            dynamic_range: 7.8,
            noise_level: 2.1
          },
          similarity: historyRecord.similarity || {
            similar_tracks: [
              { title: "Midnight Drive", artist: "Synthwave Artist", similarity: 0.87 },
              { title: "Neon Lights", artist: "Retro Collective", similarity: 0.82 },
              { title: "Digital Dreams", artist: "Electronic Vibes", similarity: 0.79 }
            ]
          },
          tags: historyRecord.tags || generateAITags(historyRecord.basicInfo, historyRecord.emotions || {
            happy: 0.78,
            sad: 0.12,
            angry: 0.05,
            calm: 0.25,
            excited: 0.82
          }, { overall: historyRecord.quickStats.qualityScore }, historyRecord.filename),
          aiDescription: historyRecord.aiDescription || `A ${historyRecord.basicInfo.mood.toLowerCase()} ${historyRecord.basicInfo.genre.toLowerCase()} track with professional quality.`,
          processingTime: historyRecord.processingTime || 0
        };

        setAnalysisResult(result);
        
        // Make result available for export functionality
        (window as any).currentAnalysisResult = result;
        (window as any).backupAnalysisResult = result;
        
        // Dispatch event to show export buttons
        console.log('🎯 AnalysisResultViewer: Dispatching analysisResultReady event (from history)');
        const event = new CustomEvent('analysisResultReady', {
          detail: result
        });
        window.dispatchEvent(event);
        console.log('🎯 AnalysisResultViewer: Event dispatched');
        
        setLoading(false);
        return;
      }

      // If not found in history, show error
      setError('Analysis result not found. It may have been deleted or the link is invalid.');
      setLoading(false);
    } catch (error) {
      console.error('Error loading analysis result:', error);
      setError('Failed to load analysis result. Please try again.');
      setLoading(false);
    }
  }, [analysisId]);

  // Generate AI tags (same logic as in AnalyzeApp)
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

  // Handle history record selection
  const handleSelectHistoryRecord = useCallback((record: HistoryRecord) => {
    // Navigate to the analysis page for this record
    window.location.href = `/analysis/${record.id}`;
  }, []);

  const handleNewAnalysis = useCallback(() => {
    window.location.href = '/analyze';
  }, []);

  // Load analysis result on mount
  useEffect(() => {
    loadAnalysisResult();
    
    // Cleanup on unmount
    return () => {
      // Clear global variables and hide export buttons
      (window as any).currentAnalysisResult = null;
      (window as any).backupAnalysisResult = null;
      const clearEvent = new CustomEvent('analysisResultCleared');
      window.dispatchEvent(clearEvent);
    };
  }, [loadAnalysisResult]);

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center">
        <div className="glass-pane p-8">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 border-2 border-violet-400 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-white">Loading analysis result...</span>
          </div>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen bg-dark-bg">
        <AnalyzeHeader />
        <div className="pt-16">
          <div className="max-w-6xl mx-auto px-6 py-8">
            <div className="text-center py-12">
              <div className="glass-pane p-8 max-w-md mx-auto">
                <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">Analysis Not Found</h3>
                <p className="text-slate-400 mb-6">{error}</p>
                <div className="flex gap-3 justify-center">
                  <button
                    onClick={() => window.location.href = '/analyze'}
                    className="btn btn-primary"
                  >
                    Start New Analysis
                  </button>
                  <button
                    onClick={() => window.location.href = '/'}
                    className="btn btn-secondary"
                  >
                    Go Home
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show analysis result
  if (!analysisResult) {
    return null;
  }

  return (
    <div className="min-h-screen bg-dark-bg">
      {/* React Header Component */}
      <AnalyzeHeader />

      {/* Mobile Header */}
      <div className="md:hidden pt-16 pb-4 px-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">Analysis Result</h1>
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
                  handleNewAnalysis();
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
              <DashboardSection result={analysisResult} />
            </div>
          </div>
        </div>

        {/* Mobile Layout */}
        <div className="md:hidden">
          <div className="max-w-6xl mx-auto px-6 py-8">
            <DashboardSection result={analysisResult} />
          </div>
        </div>
      </div>
    </div>
  );
}
