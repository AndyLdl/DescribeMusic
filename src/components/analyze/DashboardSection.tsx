import React, { useState } from 'react';
import VoiceAnalysisTab from './VoiceAnalysisTab';

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
  aiDescription?: string; // AI-generated description of the audio
  audioUrl?: string; // Add optional audio URL for playback
}

interface DashboardSectionProps {
  result: AnalysisResult;
}

type TabType = 'overview' | 'voiceanalysis' | 'soundeffects' | 'emotions' | 'structure' | 'quality' | 'similarity';

export default function DashboardSection({ result }: DashboardSectionProps) {
  // 智能默认标签页选择
  const getDefaultTab = (): TabType => {
    if (result.voiceAnalysis?.hasVoice) return 'voiceanalysis';
    if (result.soundEffects?.detected && result.soundEffects.detected.length > 0) return 'soundeffects';
    return 'overview';
  };
  const defaultTab = getDefaultTab();
  const [activeTab, setActiveTab] = useState<TabType>(defaultTab);
  const [descriptionCopied, setDescriptionCopied] = useState(false);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const generateMusicDescription = (result: AnalysisResult) => {
    const { basicInfo, emotions } = result;
    const topEmotion = Object.entries(emotions).reduce((a, b) => emotions[a[0]] > emotions[b[0]] ? a : b)[0];
    const emotionIntensity = emotions[topEmotion] > 0.7 ? 'highly' : emotions[topEmotion] > 0.5 ? 'moderately' : 'subtly';
    
    // Generate contextual description based on genre and characteristics
    let description = `A ${emotionIntensity} ${topEmotion} ${basicInfo.genre.toLowerCase()} track`;
    
    if (basicInfo.bpm > 140) {
      description += ` with a fast-paced ${basicInfo.bpm} BPM rhythm`;
    } else if (basicInfo.bpm > 100) {
      description += ` with a moderate ${basicInfo.bpm} BPM tempo`;
    } else {
      description += ` with a slow ${basicInfo.bpm} BPM groove`;
    }
    
    if (basicInfo.energy > 0.8) {
      description += ', delivering high energy';
    } else if (basicInfo.energy > 0.6) {
      description += ', maintaining good energy levels';
    } else {
      description += ', with a relaxed energy';
    }
    
    if (basicInfo.danceability > 0.8) {
      description += ' and strong danceability';
    } else if (basicInfo.danceability > 0.6) {
      description += ' and moderate danceability';
    }
    
    description += ` in ${basicInfo.key}.`;
    
    return description;
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: 'chart' },
    { id: 'voiceanalysis', label: 'Voice & Speech', icon: 'microphone' },
    { id: 'soundeffects', label: 'Sound Effects', icon: 'soundwave' },
    { id: 'emotions', label: 'Emotions', icon: 'emotion' },
    { id: 'structure', label: 'Structure', icon: 'structure' },
    { id: 'quality', label: 'Quality', icon: 'lightning' },
    { id: 'similarity', label: 'Similarity', icon: 'search' }
  ];

  return (
    <div className="space-y-8" data-component="dashboard">
      {/* Audio Player */}
      <AudioPlayer result={result} />

      {/* AI Music Description */}
      <div className="glass-pane p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4">
          {/* Icon - 在移动端居中显示 */}
          <div className="flex justify-center sm:justify-start">
            <div className="w-12 h-12 sm:w-10 sm:h-10 bg-gradient-to-r from-violet-500 to-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6 sm:w-5 sm:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
          </div>
          
          {/* Content */}
          <div className="flex-1 text-center sm:text-left">
            <h3 className="text-lg sm:text-lg font-semibold text-white mb-2 flex items-center justify-center sm:justify-start gap-2">
              AI Description
              <span className="px-2 py-0.5 bg-violet-500/20 text-violet-300 text-xs rounded-full">
                Auto-generated
              </span>
            </h3>
            <p className="text-slate-300 text-sm sm:text-base leading-relaxed mb-4">
              {result.aiDescription || generateMusicDescription(result)}
            </p>
            
            {/* Copy description button - 移动端全宽 */}
            <button 
              onClick={() => {
                navigator.clipboard.writeText(result.aiDescription || generateMusicDescription(result));
                setDescriptionCopied(true);
                setTimeout(() => setDescriptionCopied(false), 2000);
              }}
              className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 sm:px-3 sm:py-1.5 text-sm border rounded-md transition-all duration-300 ${
                descriptionCopied 
                  ? 'text-green-300 border-green-500/30 bg-green-500/10' 
                  : 'text-slate-400 hover:text-white border-slate-700 hover:border-slate-600'
              }`}
            >
              {descriptionCopied ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              )}
              {descriptionCopied ? 'Copied!' : 'Copy Description'}
            </button>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="glass-pane p-2">
        <nav className="flex space-x-1 overflow-x-auto scrollbar-hide pb-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`
                flex items-center gap-1.5 sm:gap-2 px-3 sm:px-6 py-2.5 sm:py-3 rounded-full text-xs sm:text-sm font-medium transition-all duration-300 whitespace-nowrap flex-shrink-0 min-h-[44px] sm:min-h-0
                ${activeTab === tab.id
                  ? 'bg-gradient-to-r from-violet-500 to-blue-500 text-white'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
                }
              `}
            >
              {/* Professional SVG Icons */}
              {tab.icon === 'chart' && (
                <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              )}
              {tab.icon === 'microphone' && (
                <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              )}
              {tab.icon === 'soundwave' && (
                <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.636 15.364a5 5 0 000-7.072m-2.828 9.9a9 9 0 010-12.728M12 12v.01" />
                </svg>
              )}
              {tab.icon === 'emotion' && (
                <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              )}
              {tab.icon === 'structure' && (
                <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              )}
              {tab.icon === 'lightning' && (
                <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              )}
              {tab.icon === 'search' && (
                <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              )}
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="grid lg:grid-cols-3 gap-8">
        {/* Main Content Area */}
        <div className="lg:col-span-2 space-y-6">
          {activeTab === 'overview' && <OverviewTab result={result} />}
          {activeTab === 'voiceanalysis' && result.voiceAnalysis && <VoiceAnalysisTab result={result} />}
          {activeTab === 'soundeffects' && <SoundEffectsTab result={result} />}
          {activeTab === 'emotions' && <EmotionsTab result={result} />}
          {activeTab === 'structure' && <StructureTab result={result} />}
          {activeTab === 'quality' && <QualityTab result={result} />}
          {activeTab === 'similarity' && <SimilarityTab result={result} />}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <MetadataCard result={result} />
          <QuickStatsCard result={result} />
        </div>
      </div>

      {/* Analysis Timestamp */}
      <div className="text-center text-slate-500 text-sm">
        Analysis completed on {formatTimestamp(result.timestamp)}
      </div>
    </div>
  );
}

// Overview Tab Component
function OverviewTab({ result }: { result: AnalysisResult }) {
  const [tagsCopied, setTagsCopied] = React.useState(false);

  return (
    <div className="space-y-6">
      <div className="glass-pane p-8">
        <h3 className="text-2xl font-bold text-white mb-6">Musical Analysis</h3>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-slate-300">Genre</span>
              <span className="font-semibold text-white">{result.basicInfo.genre}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-300">Mood</span>
              <span className="font-semibold text-white">{result.basicInfo.mood}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-300">BPM</span>
              <span className="font-semibold text-white">{result.basicInfo.bpm}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-300">Key</span>
              <span className="font-semibold text-white">{result.basicInfo.key}</span>
            </div>
          </div>
          <div className="space-y-4">
            <MetricBar label="Energy" value={result.basicInfo.energy} color="violet" />
            <MetricBar label="Valence" value={result.basicInfo.valence} color="blue" />
            <MetricBar label="Danceability" value={result.basicInfo.danceability} color="purple" />
          </div>
        </div>
      </div>

      {/* AI-Powered Tags */}
      <div className="glass-pane p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4">
          {/* Icon - 在移动端居中显示 */}
          <div className="flex justify-center sm:justify-start">
            <div className="w-12 h-12 sm:w-10 sm:h-10 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6 sm:w-5 sm:h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path fillRule="evenodd" d="M17.707 9.293a1 1 0 010 1.414l-7 7a1 1 0 01-1.414 0l-7-7A.997.997 0 012 10V5a3 3 0 013-3h5c.256 0 .512.098.707.293l7 7zM5 6a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
          
          {/* Content */}
          <div className="flex-1 text-center sm:text-left">
            <h3 className="text-base sm:text-lg font-semibold text-white mb-2 flex items-center justify-center sm:justify-start gap-2">
              AI-Powered Tags
              <span className="px-2 py-0.5 bg-green-500/20 text-green-300 text-xs rounded-full">
                SEO Ready
              </span>
            </h3>
            <p className="text-slate-400 text-xs sm:text-sm mb-4">
              Automatically generated tags for better searchability and categorization
            </p>
            
            {/* Tags - 移动端优化布局 */}
            <div className="flex flex-wrap gap-1.5 sm:gap-2 justify-center sm:justify-start mb-4">
              {(result.tags || []).map((tag, index) => (
                <span 
                  key={index}
                  className="inline-flex items-center gap-1 px-2.5 sm:px-3 py-1 sm:py-1.5 bg-green-500/10 text-green-400 text-xs sm:text-sm rounded-full border border-green-500/20 hover:bg-green-500/15 transition-colors duration-200"
                >
                  {tag}
                </span>
              ))}
            </div>
            
            {/* Copy tags button - 移动端全宽 */}
            <button 
              onClick={() => {
                const tagsText = (result.tags || []).join(', ');
                navigator.clipboard.writeText(tagsText);
                setTagsCopied(true);
                setTimeout(() => setTagsCopied(false), 2000);
              }}
              className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 sm:px-3 sm:py-1.5 text-sm border rounded-md transition-all duration-300 ${
                tagsCopied
                  ? 'text-green-300 border-green-500/30 bg-green-500/10'
                  : 'text-slate-400 hover:text-white border-slate-700 hover:border-slate-600'
              }`}
            >
              {tagsCopied ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              )}
              {tagsCopied ? 'Copied!' : 'Copy All Tags'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Sound Effects Tab Component
function SoundEffectsTab({ result }: { result: AnalysisResult }) {
  const { contentType, soundEffects } = result;
  
  // Debug logging
  console.log('🐛 SoundEffectsTab Debug:', {
    contentType,
    soundEffects,
    hasDetected: soundEffects?.detected?.length ? soundEffects.detected.length > 0 : false,
    fullResult: result
  });

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Content Type Detection */}
      <div className="glass-pane p-4 sm:p-8">
        <h3 className="text-xl sm:text-2xl font-bold text-white mb-4 sm:mb-6 flex items-center gap-2 sm:gap-3">
          <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-r from-green-500 to-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
            <svg className="w-3 h-3 sm:w-4 sm:h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.636 15.364a5 5 0 000-7.072m-2.828 9.9a9 9 0 010-12.728M12 12v.01" />
            </svg>
          </div>
          <span className="truncate">Content Type Detection</span>
        </h3>
        
        {contentType ? (
          <div className="space-y-4">
            <div className="p-4 sm:p-6 bg-gradient-to-r from-green-500/10 to-blue-500/10 rounded-xl border border-green-500/20">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0 mb-2">
                <span className="text-base sm:text-lg font-semibold text-white capitalize">
                  {contentType.primary.replace('-', ' ')}
                </span>
                <span className="px-3 py-1 bg-green-500/20 text-green-300 text-xs sm:text-sm rounded-full self-start sm:self-auto">
                  {Math.round(contentType.confidence * 100)}% confidence
                </span>
              </div>
              <p className="text-slate-300 text-sm sm:text-base">{contentType.description}</p>
            </div>
          </div>
        ) : (
          <div className="p-4 sm:p-6 bg-slate-700/30 rounded-xl">
            <p className="text-slate-400 text-sm sm:text-base">Content type detection not available for this analysis.</p>
          </div>
        )}
      </div>

      {/* Detected Sounds */}
      {soundEffects?.detected && soundEffects.detected.length > 0 && (
        <div className="glass-pane p-4 sm:p-8">
          <h3 className="text-xl sm:text-2xl font-bold text-white mb-4 sm:mb-6 flex items-center gap-2 sm:gap-3">
            <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center flex-shrink-0">
              <svg className="w-3 h-3 sm:w-4 sm:h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </div>
            <span className="truncate">Detected Sounds</span>
          </h3>
          
          <div className="space-y-3 sm:space-y-4">
            {soundEffects.detected.map((sound, index) => (
              <div key={index} className="p-3 sm:p-4 bg-white/5 rounded-lg border border-white/10">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0 mb-2">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <span className={`px-2 py-1 text-xs rounded-full ${getCategoryColor(sound.category)}`}>
                      {sound.category}
                    </span>
                    <span className="font-semibold text-white text-sm sm:text-base truncate">{sound.type}</span>
                  </div>
                  <span className="text-slate-300 text-xs sm:text-sm self-start sm:self-auto">
                    {Math.round(sound.confidence * 100)}% confidence
                  </span>
                </div>
                <p className="text-slate-300 text-xs sm:text-sm mb-2">{sound.description}</p>
                <div className="text-xs text-slate-400">
                  {formatTime(sound.timestamp.start)} - {formatTime(sound.timestamp.end)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Environment Analysis */}
      {soundEffects?.environment && (
        <div className="glass-pane p-4 sm:p-8">
          <h3 className="text-xl sm:text-2xl font-bold text-white mb-4 sm:mb-6 flex items-center gap-2 sm:gap-3">
            <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-r from-teal-500 to-cyan-500 rounded-full flex items-center justify-center flex-shrink-0">
              <svg className="w-3 h-3 sm:w-4 sm:h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <span className="truncate">Environment Analysis</span>
          </h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            <div className="space-y-3 sm:space-y-4">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 sm:gap-0">
                <span className="text-slate-300 text-sm sm:text-base">Location Type</span>
                <span className="font-semibold text-white capitalize text-sm sm:text-base">{soundEffects.environment.location_type.replace('_', ' ')}</span>
              </div>
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 sm:gap-0">
                <span className="text-slate-300 text-sm sm:text-base">Setting</span>
                <span className="font-semibold text-white capitalize text-sm sm:text-base">{soundEffects.environment.setting}</span>
              </div>
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 sm:gap-0">
                <span className="text-slate-300 text-sm sm:text-base">Activity Level</span>
                <span className="font-semibold text-white capitalize text-sm sm:text-base">{soundEffects.environment.activity_level}</span>
              </div>
            </div>
            <div className="space-y-3 sm:space-y-4">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 sm:gap-0">
                <span className="text-slate-300 text-sm sm:text-base">Acoustic Space</span>
                <span className="font-semibold text-white capitalize text-sm sm:text-base">{soundEffects.environment.acoustic_space}</span>
              </div>
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 sm:gap-0">
                <span className="text-slate-300 text-sm sm:text-base">Time of Day</span>
                <span className="font-semibold text-white capitalize text-sm sm:text-base">{soundEffects.environment.time_of_day}</span>
              </div>
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 sm:gap-0">
                <span className="text-slate-300 text-sm sm:text-base">Weather</span>
                <span className="font-semibold text-white capitalize text-sm sm:text-base">{soundEffects.environment.weather}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* No Sound Effects Detected */}
      {(!soundEffects?.detected || soundEffects.detected.length === 0) && (
        <div className="glass-pane p-4 sm:p-8">
          <div className="text-center py-6 sm:py-8">
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-slate-700/50 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
              <svg className="w-6 h-6 sm:w-8 sm:h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <h4 className="text-base sm:text-lg font-semibold text-white mb-2">No Specific Sound Effects Detected</h4>
            <p className="text-slate-300 text-sm sm:text-base px-2">This appears to be primarily musical content. Sound effect detection is most effective with environmental audio, speech, or mixed content.</p>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper functions for SoundEffectsTab
function getCategoryColor(category: string): string {
  const colors = {
    nature: 'bg-green-500/20 text-green-300',
    urban: 'bg-blue-500/20 text-blue-300',
    indoor: 'bg-purple-500/20 text-purple-300',
    mechanical: 'bg-orange-500/20 text-orange-300',
    human: 'bg-pink-500/20 text-pink-300',
    animal: 'bg-teal-500/20 text-teal-300',
    event: 'bg-red-500/20 text-red-300'
  };
  return colors[category as keyof typeof colors] || 'bg-slate-500/20 text-slate-300';
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Emotions Tab Component
function EmotionsTab({ result }: { result: AnalysisResult }) {
  return (
    <div className="space-y-6">
      <div className="glass-pane p-8">
        <h3 className="text-2xl font-bold text-white mb-6">Emotional Analysis</h3>
        <div className="space-y-4">
          {Object.entries(result.emotions).map(([emotion, value]) => (
            <MetricBar 
              key={emotion} 
              label={emotion.charAt(0).toUpperCase() + emotion.slice(1)} 
              value={value as number} 
              color="violet" 
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// Structure Tab Component  
function StructureTab({ result }: { result: AnalysisResult }) {
  const { contentType, structure } = result;
  
  // 格式化时间戳（修复精度问题）
  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // 判断是否为音乐内容
  const isMusic = contentType?.primary === 'music' || !contentType;
  
  // 优先使用新的 sections 数组（灵活结构）
  const sectionsArray = structure.sections || [];
  const hasFlexibleSections = Array.isArray(sectionsArray) && sectionsArray.length > 0;
  
  // 如果有新的 sections 数组，使用它；否则回退到旧的固定字段
  let validSections: any[] = [];
  
  if (hasFlexibleSections) {
    // 使用新的灵活结构（sections 数组）
    validSections = sectionsArray
      .filter((section: any) => {
        return section && 
               typeof section.start === 'number' && 
               typeof section.end === 'number' &&
               !isNaN(section.start) && 
               !isNaN(section.end) &&
               (section.start > 0 || section.end > 0);
      })
      .map((section: any) => ({
        name: section.name || 'Unknown',
        index: section.index,
        start: section.start,
        end: section.end,
        description: section.description
      }));
  } else {
    // 回退到旧的固定字段（向后兼容）
    validSections = Object.entries(structure)
      .filter(([section, timing]: [string, any]) => {
        // 排除 events 和 sections 字段
        if (section === 'events' || section === 'sections') return false;
        return timing && 
               typeof timing.start === 'number' && 
               typeof timing.end === 'number' &&
               !isNaN(timing.start) && 
               !isNaN(timing.end) &&
               (timing.start > 0 || timing.end > 0);
      })
      .map(([section, timing]: [string, any]) => ({
        name: section,
        start: timing.start,
        end: timing.end
      }));
  }

  // 获取 events 数据
  const events = structure.events || [];
  const hasValidEvents = Array.isArray(events) && events.length > 0;

  return (
    <div className="space-y-6">
      <div className="glass-pane p-8">
        {/* 根据内容类型显示不同标题 */}
        <div className="mb-6">
          <h3 className="text-2xl font-bold text-white mb-2">
            {isMusic ? 'Song Structure' : 'Audio Timeline'}
          </h3>
          {contentType && (
            <p className="text-slate-400 text-sm">
              Content Type: <span className="text-white capitalize">{contentType.primary.replace('-', ' ')}</span>
            </p>
          )}
        </div>

        {/* 显示结构段落 */}
        {validSections.length > 0 ? (
          <div className="space-y-3 mb-6">
            {isMusic && (
              <p className="text-slate-400 text-sm mb-4">
                📊 Musical sections identified in this track:
              </p>
            )}
            {validSections.map((section: any, idx: number) => {
              // 格式化段落名称
              let displayName = section.name
                .replace(/([A-Z])/g, ' $1')
                .replace(/\d+/g, ' $&')
                .replace(/-/g, ' ')
                .trim();
              
              // 如果有 index 且不为 0，添加编号
              if (section.index && section.index > 0) {
                displayName = `${displayName} ${section.index}`;
              }
              
              return (
                <div key={`${section.name}-${section.index || idx}`} className="flex items-center justify-between p-4 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
                  <div className="flex-1">
                    <span className="font-medium text-white capitalize">
                      {displayName}
                    </span>
                    {section.description && (
                      <p className="text-slate-400 text-sm mt-1">{section.description}</p>
                    )}
                  </div>
                  <span className="text-slate-300 font-mono ml-4">
                    {formatTime(section.start)} - {formatTime(section.end)}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-6 bg-white/5 rounded-lg text-center">
            <p className="text-slate-400">
              {isMusic 
                ? '🎵 No distinct musical sections detected. This might be a continuous piece or the structure is too subtle to identify.'
                : '📝 No specific timeline sections identified for this audio.'}
            </p>
          </div>
        )}

        {/* 显示特殊事件（对非音乐内容特别有用）*/}
        {hasValidEvents && (
          <div className="mt-6 pt-6 border-t border-white/10">
            <h4 className="text-lg font-semibold text-white mb-4">
              {isMusic ? '🎯 Notable Events' : '🔊 Audio Events'}
            </h4>
            <div className="space-y-3">
              {events.map((event: any, index: number) => (
                <div key={index} className="p-4 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-lg border border-purple-500/20">
                  <div className="flex items-start justify-between mb-2">
                    <span className="font-medium text-white">{event.type}</span>
                    {event.timestamp && (
                      <span className="text-slate-300 text-sm font-mono">
                        {formatTime(event.timestamp.start)} - {formatTime(event.timestamp.end)}
                      </span>
                    )}
                  </div>
                  {event.description && (
                    <p className="text-slate-400 text-sm">{event.description}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 如果既没有结构也没有事件 */}
        {validSections.length === 0 && !hasValidEvents && (
          <div className="p-8 bg-gradient-to-r from-slate-800/50 to-slate-700/50 rounded-lg text-center border border-slate-600/30">
            <div className="text-4xl mb-3">🎧</div>
            <p className="text-slate-300 mb-2">No structure analysis available</p>
            <p className="text-slate-500 text-sm">
              {isMusic 
                ? 'This audio might be too short, continuous, or experimental in structure.'
                : 'This appears to be a continuous recording without distinct sections.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// Quality Tab Component
function QualityTab({ result }: { result: AnalysisResult }) {
  // Helper to normalize 0-10 score (handles both 0-10 and 0-1 formats)
  const normalizeScore = (score: number) => score > 1 ? score : score * 10;
  const formatQualityValue = (score: number) => {
    const normalized = normalizeScore(score);
    return `${Math.round(normalized * 10) / 10}/10`;
  };

  return (
    <div className="space-y-6">
      <div className="glass-pane p-8">
        <h3 className="text-2xl font-bold text-white mb-6">Audio Quality</h3>
        <div className="space-y-4">
          {/* Quality scores are 0-10 scale per prompt, convert to 0-1 for MetricBar */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-slate-300">Overall Score</span>
              <span className="font-semibold text-white">{formatQualityValue(result.quality.overall)}</span>
            </div>
            <MetricBar label="" value={normalizeScore(result.quality.overall) / 10} color="violet" />
          </div>
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-slate-300">Clarity</span>
              <span className="font-semibold text-white">{formatQualityValue(result.quality.clarity)}</span>
            </div>
            <MetricBar label="" value={normalizeScore(result.quality.clarity) / 10} color="blue" />
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-300">Loudness</span>
            <span className="font-semibold text-white">{result.quality.loudness} dB</span>
          </div>
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-slate-300">Dynamic Range</span>
              <span className="font-semibold text-white">{formatQualityValue(result.quality.dynamic_range)}</span>
            </div>
            <MetricBar label="" value={normalizeScore(result.quality.dynamic_range) / 10} color="purple" />
          </div>
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-slate-300">Noise Level</span>
              <span className="font-semibold text-white">{formatQualityValue(result.quality.noise_level)}</span>
            </div>
            <MetricBar label="" value={normalizeScore(result.quality.noise_level) / 10} color="red" />
          </div>
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-slate-300">Distortion</span>
              <span className="font-semibold text-white">{formatQualityValue(result.quality.distortion)}</span>
            </div>
            <MetricBar label="" value={normalizeScore(result.quality.distortion) / 10} color="red" />
          </div>
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-slate-300">Frequency Balance</span>
              <span className="font-semibold text-white">{formatQualityValue(result.quality.frequency_balance)}</span>
            </div>
            <MetricBar label="" value={normalizeScore(result.quality.frequency_balance) / 10} color="purple" />
          </div>
        </div>
      </div>
    </div>
  );
}

// Similarity Tab Component
function SimilarityTab({ result }: { result: AnalysisResult }) {
  return (
    <div className="space-y-6">
      <div className="glass-pane p-8">
        <h3 className="text-2xl font-bold text-white mb-6">Similar Tracks</h3>
        <div className="space-y-4">
          {result.similarity.similar_tracks.map((track: any, index: number) => (
            <div key={index} className="p-4 bg-white/5 rounded-lg">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h4 className="font-medium text-white">{track.title}</h4>
                  <p className="text-slate-400 text-sm">{track.artist}</p>
                </div>
                <span className="text-violet-400 font-semibold">{Math.round(track.similarity * 100)}%</span>
              </div>
              <div className="w-full bg-white/10 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-violet-500 to-blue-500 h-2 rounded-full"
                  style={{ width: `${track.similarity * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Metadata Card Component
function MetadataCard({ result }: { result: AnalysisResult }) {
  return (
    <div className="glass-pane p-6">
      <h4 className="text-lg font-bold text-white mb-4">File Information</h4>
      <div className="space-y-3">
        <div className="flex justify-between">
          <span className="text-slate-400">Duration</span>
          <span className="text-white">{Math.floor(result.duration / 60)}:{(result.duration % 60).toString().padStart(2, '0')}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">Size</span>
          <span className="text-white">{result.fileSize}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">Format</span>
          <span className="text-white">{result.format}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">Analysis ID</span>
          <span className="text-white font-mono text-sm">{result.id}</span>
        </div>
      </div>
    </div>
  );
}

// Quick Stats Card Component
function QuickStatsCard({ result }: { result: AnalysisResult }) {
  return (
    <div className="glass-pane p-6">
      <h4 className="text-lg font-bold text-white mb-4">Quick Stats</h4>
      <div className="grid grid-cols-2 gap-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-violet-400">{result.basicInfo.bpm}</div>
          <div className="text-xs text-slate-400">BPM</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-400">{Math.round(result.basicInfo.energy * 100)}%</div>
          <div className="text-xs text-slate-400">Energy</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-purple-400">{Math.round(result.quality.overall * 10) / 10}/10</div>
          <div className="text-xs text-slate-400">Quality</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-green-400">{Math.round(result.basicInfo.danceability * 100)}%</div>
          <div className="text-xs text-slate-400">Dance</div>
        </div>
      </div>
    </div>
  );
}

// Metric Bar Component
function MetricBar({ label, value, color }: { label: string; value: number; color: string }) {
  const colorClasses = {
    violet: 'from-violet-500 to-violet-400',
    blue: 'from-blue-500 to-blue-400',
    purple: 'from-purple-500 to-purple-400',
    red: 'from-red-500 to-red-400'
  };

  // value should be 0-1 for display purposes
  const percentage = Math.min(100, Math.max(0, value * 100));

  return (
    <div>
      {label && (
        <div className="flex justify-between items-center mb-2">
          <span className="text-slate-300">{label}</span>
          <span className="font-semibold text-white">{Math.round(percentage)}%</span>
        </div>
      )}
      <div className="w-full bg-white/10 rounded-full h-2">
        <div 
          className={`bg-gradient-to-r ${colorClasses[color as keyof typeof colorClasses]} h-2 rounded-full transition-all duration-500`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

// Audio Player Component
function AudioPlayer({ result }: { result: AnalysisResult }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(result.duration);
  const audioRef = React.useRef<HTMLAudioElement>(null);

  // Debug log
  React.useEffect(() => {
    console.log('🎵 AudioPlayer received:', {
      hasAudioUrl: !!result.audioUrl,
      audioUrl: result.audioUrl?.substring(0, 100) + '...',
      filename: result.filename
    });
  }, [result.audioUrl]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatFileName = (filename: string, maxLength: number = 60) => {
    if (filename.length <= maxLength) return filename;
    
    // 尝试保留文件扩展名
    const lastDotIndex = filename.lastIndexOf('.');
    if (lastDotIndex > 0 && filename.length - lastDotIndex <= 10) {
      const name = filename.substring(0, lastDotIndex);
      const extension = filename.substring(lastDotIndex);
      const availableLength = maxLength - extension.length - 3; // 3 for "..."
      
      if (availableLength > 10) {
        return `${name.substring(0, availableLength)}...${extension}`;
      }
    }
    
    // 否则直接截断
    return `${filename.substring(0, maxLength - 3)}...`;
  };

  const togglePlayPause = () => {
    if (!audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-slate-900/80 via-slate-800/80 to-slate-900/80 backdrop-blur-xl border border-white/10">
      {/* Background glow effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-violet-500/5 via-blue-500/5 to-purple-500/5" />
      
      <div className="relative p-5">
        {result.audioUrl ? (
          <>
            <audio
              ref={audioRef}
              src={result.audioUrl}
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              onEnded={() => setIsPlaying(false)}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
            />
            
            {/* Compact Layout */}
            <div className="flex items-center gap-4">
              {/* Album Art with Integrated Play Button */}
              <div className="relative flex-shrink-0 group">
                <div className="w-16 h-16 bg-gradient-to-br from-violet-500 via-blue-500 to-purple-500 rounded-lg flex items-center justify-center shadow-lg transition-all duration-200">
                  {/* Background music icon - visible when not playing */}
                  <svg 
                    className={`w-8 h-8 text-white transition-opacity duration-200 ${isPlaying ? 'opacity-30' : 'opacity-100'}`} 
                    fill="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
                  </svg>
                </div>
                
                {/* Play/Pause Button - always visible, becomes prominent on hover */}
                <button
                  onClick={togglePlayPause}
                  className={`absolute inset-0 rounded-lg flex items-center justify-center transition-all duration-200 ${
                    isPlaying 
                      ? 'bg-black/20 hover:bg-black/40' 
                      : 'bg-black/0 hover:bg-black/40 group-hover:bg-black/30'
                  }`}
                >
                  {isPlaying ? (
                    <svg className="w-8 h-8 text-white drop-shadow-lg" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
                    </svg>
                  ) : (
                    <svg className={`w-8 h-8 text-white ml-0.5 drop-shadow-lg transition-opacity duration-200 ${
                      isPlaying ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                    }`} fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z"/>
                    </svg>
                  )}
                </button>

                {/* Playing indicator */}
                {isPlaying && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center shadow-lg">
                    <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                  </div>
                )}
              </div>
              
              {/* Track Info and Controls */}
              <div className="flex-1 min-w-0">
                {/* Title and Info */}
                <div className="mb-3">
                  <h3 className="text-base font-bold text-white mb-1 truncate" title={result.filename}>
                    {formatFileName(result.filename, 60)}
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <span className="px-1.5 py-0.5 bg-white/10 rounded text-xs">
                      {result.format?.toUpperCase()}
                    </span>
                    <span>•</span>
                    <span>{result.fileSize}</span>
                    <span>•</span>
                    <span>{formatTime(result.duration)}</span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="relative group mb-2">
                  <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-violet-500 to-purple-500 transition-all duration-300 ease-out rounded-full"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <input
                    type="range"
                    min="0"
                    max={duration}
                    value={currentTime}
                    onChange={handleSeek}
                    className="absolute inset-0 w-full h-1.5 opacity-0 cursor-pointer"
                  />
                  {/* Progress thumb */}
                  <div 
                    className="absolute top-1/2 w-3 h-3 bg-white rounded-full shadow-lg transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                    style={{ left: `calc(${progress}% - 6px)` }}
                  />
                </div>

                {/* Time Display */}
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="font-mono">{formatTime(currentTime)}</span>
                  <span className="font-mono">{formatTime(duration)}</span>
                </div>
              </div>
            </div>
          </>
        ) : (
          /* No Audio State */
          <div className="text-center py-8">
            <div className="w-20 h-20 bg-slate-700/50 rounded-xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 text-slate-500" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2" title={result.filename}>
              {formatFileName(result.filename, 45)}
            </h3>
            <p className="text-slate-400 text-sm mb-4">
              {formatTime(result.duration)} • {result.fileSize} • {result.format}
            </p>
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500/10 border border-amber-500/20 rounded-full text-amber-400 text-sm">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M11 15h2v2h-2zm0-8h2v6h-2zm.99-5C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z"/>
                </svg>
                Audio playback not available for this analysis
              </div>
              <p className="text-slate-500 text-xs max-w-md mx-auto">
                This is a historical record. Audio playback is only available for new analyses. 
                Please upload and analyze the file again to enable playback.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}