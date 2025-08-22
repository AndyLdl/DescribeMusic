import React from 'react';

interface VoiceAnalysis {
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
}

interface VoiceAnalysisTabProps {
  result: {
    voiceAnalysis?: VoiceAnalysis;
  };
}

const VoiceAnalysisTab: React.FC<VoiceAnalysisTabProps> = ({ result }) => {
  const { voiceAnalysis } = result;

  // 如果没有语音分析数据或没有检测到语音
  if (!voiceAnalysis || !voiceAnalysis.hasVoice) {
    return (
      <div className="p-6 text-center">
        <div className="glass-pane p-8">
          <svg className="w-16 h-16 mx-auto text-slate-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
          <h3 className="text-lg font-medium text-white mb-2">No Voice Detected</h3>
          <p className="text-slate-400">
            This audio doesn't contain detectable speech or voice content. 
            Voice analysis is available for podcasts, interviews, speeches, and other vocal content.
          </p>
        </div>
      </div>
    );
  }

  // 获取情感颜色
  const getEmotionColor = (emotion: string, value: number) => {
    if (value < 0.3) return 'bg-white/20';
    if (value < 0.6) return 'bg-blue-400';
    return 'bg-blue-500';
  };

  // 获取清晰度颜色
  const getClarityColor = (score: number) => {
    if (score >= 0.8) return 'text-green-300 bg-green-500/20';
    if (score >= 0.6) return 'text-yellow-300 bg-yellow-500/20';
    return 'text-red-300 bg-red-500/20';
  };

  // 获取性别显示颜色
  const getGenderColor = (gender: string) => {
    switch (gender) {
      case 'male': return 'text-blue-300 bg-blue-500/20';
      case 'female': return 'text-pink-300 bg-pink-500/20';
      default: return 'text-slate-300 bg-slate-500/20';
    }
  };

  const formatConfidence = (confidence: number) => `${Math.round(confidence * 100)}%`;
  const formatScore = (score: number) => `${Math.round(score * 100)}%`;

  return (
    <div className="space-y-6">
      {/* 基础语音信息 */}
      <div className="glass-pane p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
          <svg className="w-5 h-5 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
          Voice Detection
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white/10 rounded-lg p-4">
            <div className="text-sm text-slate-400 mb-1">Speaker Count</div>
            <div className="text-2xl font-bold text-white">{voiceAnalysis.speakerCount}</div>
          </div>
          
          <div className="bg-white/10 rounded-lg p-4">
            <div className="text-sm text-slate-400 mb-1">Primary Gender</div>
            <div className={`inline-flex px-2 py-1 rounded-full text-sm font-medium ${getGenderColor(voiceAnalysis.genderDetection.primary)}`}>
              {voiceAnalysis.genderDetection.primary === 'unknown' ? 'Unknown' : 
               voiceAnalysis.genderDetection.primary.charAt(0).toUpperCase() + voiceAnalysis.genderDetection.primary.slice(1)}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              {formatConfidence(voiceAnalysis.genderDetection.confidence)} confidence
            </div>
          </div>
          
          <div className="bg-white/10 rounded-lg p-4">
            <div className="text-sm text-slate-400 mb-1">Multiple Speakers</div>
            <div className="text-2xl font-bold text-white">
              {voiceAnalysis.genderDetection.multipleGenders ? 'Yes' : 'No'}
            </div>
          </div>
        </div>
      </div>

      {/* 语音情感分析 */}
      <div className="glass-pane p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
          <svg className="w-5 h-5 mr-2 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Speaker Emotion Analysis
        </h3>
        
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-300">Primary Emotion</span>
            <span className="text-lg font-bold text-purple-400 capitalize">
              {voiceAnalysis.speakerEmotion.primary}
            </span>
          </div>
          <div className="text-sm text-slate-400">
            {formatConfidence(voiceAnalysis.speakerEmotion.confidence)} confidence
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Object.entries(voiceAnalysis.speakerEmotion.emotions).map(([emotion, value]) => (
            <div key={emotion} className="bg-white/10 rounded-lg p-3">
              <div className="text-xs text-slate-400 mb-1 capitalize">{emotion}</div>
              <div className="flex items-center">
                <div className="flex-1 bg-white/20 rounded-full h-2 mr-2">
                  <div 
                    className={`h-2 rounded-full ${getEmotionColor(emotion, value)}`}
                    style={{ width: `${Math.max(value * 100, 2)}%` }}
                  ></div>
                </div>
                <span className="text-xs font-medium text-slate-300">
                  {formatScore(value)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 语音清晰度 */}
      <div className="glass-pane p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
          <svg className="w-5 h-5 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Speech Clarity Score
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-white/10 rounded-lg p-4">
            <div className="text-sm text-slate-400 mb-1">Overall Score</div>
            <div className={`inline-flex px-3 py-1 rounded-full text-lg font-bold ${getClarityColor(voiceAnalysis.speechClarity.score)}`}>
              {formatScore(voiceAnalysis.speechClarity.score)}
            </div>
          </div>
          
          <div className="bg-white/10 rounded-lg p-4">
            <div className="text-sm text-slate-400 mb-1">Pronunciation</div>
            <div className="text-lg font-semibold text-white">
              {formatScore(voiceAnalysis.speechClarity.pronunciation)}
            </div>
          </div>
          
          <div className="bg-white/10 rounded-lg p-4">
            <div className="text-sm text-slate-400 mb-1">Articulation</div>
            <div className="text-lg font-semibold text-white">
              {formatScore(voiceAnalysis.speechClarity.articulation)}
            </div>
          </div>
          
          <div className="bg-white/10 rounded-lg p-4">
            <div className="text-sm text-slate-400 mb-1">Speaking Pace</div>
            <div className="text-lg font-semibold text-white capitalize">
              {voiceAnalysis.speechClarity.pace}
            </div>
          </div>
          
          <div className="bg-white/10 rounded-lg p-4">
            <div className="text-sm text-slate-400 mb-1">Volume Level</div>
            <div className="text-lg font-semibold text-white capitalize">
              {voiceAnalysis.speechClarity.volume}
            </div>
          </div>
        </div>
      </div>

      {/* 语音特征 */}
      <div className="glass-pane p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
          <svg className="w-5 h-5 mr-2 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2m-9 3v10a1 1 0 001 1h8a1 1 0 001 1V7M7 7h10M7 10h6m-3 3h3" />
          </svg>
          Vocal Characteristics
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white/10 rounded-lg p-4">
            <div className="text-sm text-slate-400 mb-1">Pitch Range</div>
            <div className="text-lg font-semibold text-white capitalize">
              {voiceAnalysis.vocalCharacteristics.pitchRange}
            </div>
          </div>
          
          <div className="bg-white/10 rounded-lg p-4">
            <div className="text-sm text-slate-400 mb-1">Speaking Rate</div>
            <div className="text-lg font-semibold text-white">
              {voiceAnalysis.vocalCharacteristics.speakingRate} WPM
            </div>
          </div>
          
          <div className="bg-white/10 rounded-lg p-4">
            <div className="text-sm text-slate-400 mb-1">Pause Frequency</div>
            <div className="text-lg font-semibold text-white capitalize">
              {voiceAnalysis.vocalCharacteristics.pauseFrequency}
            </div>
          </div>
          
          <div className="bg-white/10 rounded-lg p-4">
            <div className="text-sm text-slate-400 mb-1">Intonation Variation</div>
            <div className="text-lg font-semibold text-white">
              {formatScore(voiceAnalysis.vocalCharacteristics.intonationVariation)}
            </div>
          </div>
        </div>
      </div>

      {/* 语言分析和音频质量 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 语言分析 */}
        <div className="glass-pane p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
            <svg className="w-5 h-5 mr-2 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
            </svg>
            Language Analysis
          </h3>
          
          <div className="space-y-3">
            <div>
              <div className="text-sm text-slate-400 mb-1">Language</div>
              <div className="text-lg font-semibold text-white">
                {voiceAnalysis.languageAnalysis.language || 'Unknown'}
              </div>
            </div>
            
            <div>
              <div className="text-sm text-slate-400 mb-1">Confidence</div>
              <div className="text-lg font-semibold text-white">
                {formatConfidence(voiceAnalysis.languageAnalysis.confidence)}
              </div>
            </div>
            
            <div>
              <div className="text-sm text-slate-400 mb-1">Accent</div>
              <div className="text-lg font-semibold text-white">
                {voiceAnalysis.languageAnalysis.accent || 'Unknown'}
              </div>
            </div>
          </div>
        </div>

        {/* 音频质量 */}
        <div className="glass-pane p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
            <svg className="w-5 h-5 mr-2 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
            </svg>
            Audio Quality
          </h3>
          
          <div className="space-y-3">
            <div>
              <div className="text-sm text-slate-400 mb-1">Overall Quality</div>
              <div className="text-lg font-semibold text-white">
                {formatScore(voiceAnalysis.audioQuality.overall)}
              </div>
            </div>
            
            <div>
              <div className="text-sm text-slate-400 mb-1">Background Noise</div>
              <div className="text-lg font-semibold text-white">
                {formatScore(voiceAnalysis.audioQuality.backgroundNoise)}
              </div>
            </div>
            
            <div>
              <div className="text-sm text-slate-400 mb-1">Echo Level</div>
              <div className="text-lg font-semibold text-white">
                {formatScore(voiceAnalysis.audioQuality.echo)}
              </div>
            </div>
            
            <div>
              <div className="text-sm text-slate-400 mb-1">Compression</div>
              <div className="text-lg font-semibold text-white">
                {formatScore(voiceAnalysis.audioQuality.compression)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VoiceAnalysisTab;
