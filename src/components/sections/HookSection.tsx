import React, { useState, useEffect, useRef, useCallback } from 'react';

interface AudioAnalysis {
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
}

interface AudioSample {
  id: string;
  title: string;
  description: string;
  audioSrc: string;
  analysis: AudioAnalysis;
  summary: string;
}

interface AnalysisStep {
  id: string;
  label: string;
  completed: boolean;
}

const samples: AudioSample[] = [
  {
    id: 'rock',
    title: '🎸 Rock Anthem',
    description: 'High-energy hard rock anthem with driving rhythm and powerful instrumentation',
    audioSrc: 'https://music.describemusic.net/sample-music/rock-anthem.wav',
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
    audioSrc: 'https://music.describemusic.net/sample-music/femal-vocal.mp3',
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
    audioSrc: 'https://music.describemusic.net/sample-music/forest-ambience.mp3',
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

const analysisSteps: AnalysisStep[] = [
  { id: 'loading', label: 'Loading audio file...', completed: false },
  { id: 'analyzing', label: 'Analyzing frequency spectrum...', completed: false },
  { id: 'detecting', label: 'Detecting musical patterns...', completed: false },
  { id: 'processing', label: 'Processing AI insights...', completed: false },
  { id: 'complete', label: 'Analysis complete!', completed: false }
];

const HookSection: React.FC = () => {
  const [selectedSample, setSelectedSample] = useState<string>('rock');
  const [currentlyPlaying, setCurrentlyPlaying] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [analysisProgress, setAnalysisProgress] = useState<AnalysisStep[]>(analysisSteps);
  const [showAnalysisResults, setShowAnalysisResults] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [audioProgress, setAudioProgress] = useState<{ [key: string]: number }>({});
  const [audioDuration, setAudioDuration] = useState<{ [key: string]: number }>({});
  const [audioCurrentTime, setAudioCurrentTime] = useState<{ [key: string]: number }>({});
  const [isClient, setIsClient] = useState(false);
  
  const audioRefs = useRef<{ [key: string]: HTMLAudioElement }>({});
  const canvasRefs = useRef<{ [key: string]: HTMLCanvasElement | null }>({});
  const animationFrameRefs = useRef<{ [key: string]: number }>({});
  const drawTimeoutRefs = useRef<{ [key: string]: NodeJS.Timeout }>({});

  // Utility function to format time in MM:SS format
  const formatTime = (seconds: number): string => {
    if (isNaN(seconds) || seconds < 0) return '0:00';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Initialize client-side state and components
  useEffect(() => {
    setIsClient(true);
    startAIAnalysis(selectedSample);
    
    // Initialize scroll animations for this component
    const animatedElements = document.querySelectorAll('.animate-on-scroll');
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.1,
      }
    );

    animatedElements.forEach((el) => {
      observer.observe(el);
    });
    
    // Initialize all waveforms after component mounts
    setTimeout(() => {
      Object.entries(canvasRefs.current).forEach(([sampleId, canvas]) => {
        if (canvas) {
          const rect = canvas.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
            canvas.width = rect.width * 2;
            canvas.height = rect.height * 2;
            canvas.style.width = rect.width + 'px';
            canvas.style.height = rect.height + 'px';
            drawProfessionalWaveform(canvas, audioProgress[sampleId] || 0);
          }
        }
      });
    }, 100);
    
    // Try to get duration from all audio elements after mount
    setTimeout(() => {
      Object.entries(audioRefs.current).forEach(([sampleId, audio]) => {
        if (audio && audio.duration && !isNaN(audio.duration)) {
          setAudioDuration(prev => ({ ...prev, [sampleId]: audio.duration }));
        }
      });
    }, 500);
  }, []);

  const drawProfessionalWaveform = useCallback((canvas: HTMLCanvasElement, progress: number = 0) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const context = ctx as CanvasRenderingContext2D;

    const width = canvas.width;
    const height = canvas.height;
    const centerY = height / 2;
    const progressX = Math.max(0, Math.min(1, progress)) * width;
    const maxAmplitude = height * 0.28;
    const step = 6; // visual smoothness vs perf

    context.clearRect(0, 0, width, height);

    function amplitudeAt(x: number): number {
      const t = x / width;
      const env = Math.sin(t * Math.PI);
      const a = Math.sin(t * Math.PI * 8 + progress * Math.PI * 2) * 0.9;
      const b = Math.sin(t * Math.PI * 16 + progress * Math.PI * 3) * 0.4;
      const c = Math.sin(t * Math.PI * 32 + progress * Math.PI * 5) * 0.2;
      const pseudoNoise = Math.sin((t + 0.123) * 37.0) * 0.08;
      const amp = Math.abs((a + b + c + pseudoNoise) * env);
      return Math.min(1, Math.max(0, amp));
    }

    function buildRibbonPath(fromX: number, toX: number) {
      const pointsTop: { x: number; y: number }[] = [];
      for (let x = fromX; x <= toX; x += step) {
        const amp = amplitudeAt(x);
        pointsTop.push({ x, y: centerY - amp * maxAmplitude });
      }
      // Build smooth path using quadratic curves
      context.beginPath();
      if (pointsTop.length > 0) {
        context.moveTo(pointsTop[0].x, pointsTop[0].y);
        for (let i = 1; i < pointsTop.length - 1; i++) {
          const p0 = pointsTop[i];
          const p1 = pointsTop[i + 1];
          const cx = (p0.x + p1.x) / 2;
          const cy = (p0.y + p1.y) / 2;
          context.quadraticCurveTo(p0.x, p0.y, cx, cy);
        }
        const last = pointsTop[pointsTop.length - 1];
        context.lineTo(last.x, last.y);

        // Mirror to bottom
        for (let i = pointsTop.length - 1; i >= 0; i--) {
          const px = pointsTop[i].x;
          const py = pointsTop[i].y;
          const mirroredY = centerY + (centerY - py);
          context.lineTo(px, mirroredY);
        }
        context.closePath();
      }
    }

    // Left (played) region
    if (progressX > 0) {
      context.save();
      context.beginPath();
      context.rect(0, 0, progressX, height);
      context.clip();

      const gradLeft = context.createLinearGradient(0, 0, 0, height);
      gradLeft.addColorStop(0, '#8B5CF6');
      gradLeft.addColorStop(0.5, '#38BDF8');
      gradLeft.addColorStop(1, '#8B5CF6');
      
      context.shadowColor = 'rgba(34, 197, 94, 0.35)';
      context.shadowBlur = 24;
      context.fillStyle = gradLeft;
      buildRibbonPath(0, progressX);
      context.fill();

      context.restore();
    }

    // Right (unplayed) region
    if (progressX < width) {
      context.save();
      context.beginPath();
      context.rect(progressX, 0, width - progressX, height);
      context.clip();

      const gradRight = context.createLinearGradient(0, 0, 0, height);
      gradRight.addColorStop(0, 'rgba(139, 92, 246, 0.22)');
      gradRight.addColorStop(0.5, 'rgba(56, 189, 248, 0.20)');
      gradRight.addColorStop(1, 'rgba(139, 92, 246, 0.18)');
      
      context.shadowColor = 'rgba(34, 197, 94, 0.18)';
      context.shadowBlur = 16;
      context.fillStyle = gradRight;
      buildRibbonPath(progressX, width);
      context.fill();
      context.restore();
    }

    // Playhead
    if (progress > 0 && progress < 1) {
      context.save();
      context.strokeStyle = '#60a5fa';
      context.lineWidth = 2;
      context.beginPath();
      context.moveTo(progressX, 0);
      context.lineTo(progressX, height);
      context.stroke();
      context.restore();
    }
  }, []);

  const drawWaveformDebounced = useCallback((sampleId: string, progress: number) => {
    // Clear any existing timeout for this sample
    if (drawTimeoutRefs.current[sampleId]) {
      clearTimeout(drawTimeoutRefs.current[sampleId]);
    }
    
    // Set a new timeout to draw after a short delay
    drawTimeoutRefs.current[sampleId] = setTimeout(() => {
      const canvas = canvasRefs.current[sampleId];
      if (canvas) {
        drawProfessionalWaveform(canvas, progress);
      }
    }, 16); // ~60fps
  }, [drawProfessionalWaveform]);

  const drawDynamicWaveform = useCallback((canvas: HTMLCanvasElement, audio: HTMLAudioElement, progress: number = 0) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Use the professional waveform with progress indication
    drawProfessionalWaveform(canvas, progress);
  }, [drawProfessionalWaveform]);

  const handleSampleSelect = (sampleId: string) => {
    if (sampleId === selectedSample) return;
    
    setSelectedSample(sampleId);
    setShowAnalysisResults(false);
    startAIAnalysis(sampleId);
  };

  const handlePlayPause = async (sampleId: string) => {
    const audio = audioRefs.current[sampleId];
    if (!audio) return;

    // If clicking the same audio that's currently playing, pause it
    if (currentlyPlaying === sampleId) {
      audio.pause();
      setCurrentlyPlaying(null);
      setIsLoading(null);
      
      // Update waveform to show current progress when paused
      const currentProgress = audioProgress[sampleId] || 0;
      drawWaveformDebounced(sampleId, currentProgress);
      return;
    }

    // Stop other audio if playing
    if (currentlyPlaying && currentlyPlaying !== sampleId) {
      const currentAudio = audioRefs.current[currentlyPlaying];
      if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
      }
      
      // Reset progress for the previously playing audio
      setAudioProgress(prev => ({ ...prev, [currentlyPlaying]: 0 }));
      setAudioCurrentTime(prev => ({ ...prev, [currentlyPlaying]: 0 }));
      
      // Update waveform for the previously playing audio
      drawWaveformDebounced(currentlyPlaying, 0);
    }

    // Auto-select the sample when play button is clicked
    if (selectedSample !== sampleId) {
      setSelectedSample(sampleId);
      // Start AI analysis for the newly selected sample
      startAIAnalysis(sampleId);
    }
    
    // Set loading state and prepare to play new audio
    setIsLoading(sampleId);
    setCurrentlyPlaying(sampleId);
    
    // Add a small delay to prevent race conditions
    await new Promise(resolve => setTimeout(resolve, 50));
    
    // Try to get duration before playing
    if (audio.duration && !isNaN(audio.duration) && !audioDuration[sampleId]) {
      setAudioDuration(prev => ({ ...prev, [sampleId]: audio.duration }));
    }
    
    try {
      // Check if the audio is still the one we want to play (user might have clicked another)
      if (currentlyPlaying === sampleId || currentlyPlaying === null) {
        await audio.play();
        setIsLoading(null);
        
        // Try to get duration after play starts
        if (audio.duration && !isNaN(audio.duration)) {
          setAudioDuration(prev => ({ ...prev, [sampleId]: audio.duration }));
        }
      }
    } catch (error) {
      // Handle different types of audio errors gracefully
      if (error.name === 'AbortError') {
        console.log('Audio play was interrupted, which is normal when switching tracks');
      } else {
        console.error('Audio play error:', error);
      }
      setCurrentlyPlaying(null);
      setIsLoading(null);
    }
  };

  const handleWaveformClick = (sampleId: string, event: React.MouseEvent<HTMLCanvasElement>) => {
    const audio = audioRefs.current[sampleId];
    const canvas = canvasRefs.current[sampleId];
    if (!audio || !canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const progress = x / rect.width;
    
    // Seek to the clicked position
    if (audio.duration) {
      audio.currentTime = progress * audio.duration;
      setAudioProgress(prev => ({ ...prev, [sampleId]: progress }));
      
      // Update waveform immediately
      drawWaveformDebounced(sampleId, progress);
      
      // If not currently playing, start playing from this position
      if (currentlyPlaying !== sampleId) {
        handlePlayPause(sampleId);
      }
    }
  };

  const startAIAnalysis = (sampleId: string) => {
    setIsAnalyzing(true);
    setShowAnalysisResults(false);
    
    // Reset progress
    const resetSteps = analysisSteps.map(step => ({ ...step, completed: false }));
    setAnalysisProgress(resetSteps);

    // Simulate analysis steps
    resetSteps.forEach((step, index) => {
      setTimeout(() => {
        setAnalysisProgress(prev => 
          prev.map((s, i) => 
            i <= index ? { ...s, completed: true } : s
          )
        );
        
        if (index === resetSteps.length - 1) {
          setTimeout(() => {
            setIsAnalyzing(false);
            setShowAnalysisResults(true);
          }, 500);
        }
      }, (index + 1) * 800);
    });
  };

  const selectedSampleData = samples.find(s => s.id === selectedSample);

  return (
    <section id="hook" className="py-24 bg-gradient-to-b from-transparent to-slate-900/20">
      <div className="container mx-auto px-6">
        {/* Section Header */}
        <div className="text-center mb-16 animate-on-scroll" style={{ '--scroll-delay': '0ms' } as React.CSSProperties}>
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            🚀 Experience AI Analysis <span className="text-primary">Instantly</span>
          </h2>
          <p className="text-xl text-slate-300 max-w-3xl mx-auto leading-relaxed">
            Upload your audio and watch our AI analyze every detail. See how our technology identifies genres, moods, and musical elements with unprecedented accuracy.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 animate-on-scroll" style={{ '--scroll-delay': '200ms' } as React.CSSProperties}>
          {/* Left Panel: Audio Samples */}
          <div className="bg-white/5 border border-white/10 rounded-2xl backdrop-blur-md p-6">
            <h3 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
              🎵 Audio Samples
            </h3>
            
            <div className="space-y-4">
              {samples.map((sample) => (
                <div
                  key={sample.id}
                  className={`sample-card p-4 rounded-xl border transition-all duration-300 cursor-pointer ${
                    selectedSample === sample.id
                      ? 'border-primary bg-primary/10 shadow-lg shadow-primary/20'
                      : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10'
                  }`}
                  onClick={() => handleSampleSelect(sample.id)}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="font-semibold text-white">{sample.title}</h4>
                      <p className="text-sm text-slate-400">{sample.description}</p>
                    </div>
                    
                    <button
                      className="play-btn w-12 h-12 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center hover:bg-primary/30 transition-all duration-200 relative"
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePlayPause(sample.id);
                      }}
                    >
                      {isLoading === sample.id ? (
                        <div className="animate-spin w-5 h-5 border-2 border-primary border-t-transparent rounded-full"></div>
                      ) : currentlyPlaying === sample.id ? (
                        <svg className="w-5 h-5 text-primary" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
                        </svg>
                      ) : (
                        <svg className="w-5 h-5 text-primary ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z"/>
                        </svg>
                      )}
                    </button>
                  </div>
                  
                  {/* Audio element */}
                  <audio
                    ref={(el) => {
                      if (el) audioRefs.current[sample.id] = el;
                    }}
                    onEnded={() => {
                      setCurrentlyPlaying(null);
                      setIsLoading(null);
                      setAudioProgress(prev => ({ ...prev, [sample.id]: 0 }));
                      setAudioCurrentTime(prev => ({ ...prev, [sample.id]: 0 }));
                      
                      // Reset waveform to beginning
                      drawWaveformDebounced(sample.id, 0);
                    }}
                    onLoadedMetadata={(e) => {
                      const audio = e.target as HTMLAudioElement;
                      console.log(`Audio metadata loaded for ${sample.id}:`, {
                        duration: audio.duration,
                        readyState: audio.readyState,
                        src: audio.currentSrc
                      });
                      if (audio.duration && !isNaN(audio.duration)) {
                        setAudioDuration(prev => ({ ...prev, [sample.id]: audio.duration }));
                      }
                    }}
                    onLoadStart={() => {
                      if (currentlyPlaying === sample.id) {
                        setIsLoading(sample.id);
                      }
                    }}
                    onCanPlay={(e) => {
                      const audio = e.target as HTMLAudioElement;
                      if (currentlyPlaying === sample.id) {
                        setIsLoading(null);
                      }
                      // Try to get duration here as well, in case onLoadedMetadata didn't fire
                      if (audio.duration && !isNaN(audio.duration)) {
                        setAudioDuration(prev => ({ ...prev, [sample.id]: audio.duration }));
                      }
                    }}
                    onDurationChange={(e) => {
                      const audio = e.target as HTMLAudioElement;
                      if (audio.duration && !isNaN(audio.duration)) {
                        setAudioDuration(prev => ({ ...prev, [sample.id]: audio.duration }));
                      }
                    }}
                    onTimeUpdate={(e) => {
                      const audio = e.target as HTMLAudioElement;
                      
                      // Ensure we have duration - sometimes onLoadedMetadata doesn't fire
                      if (audio.duration && !isNaN(audio.duration) && !audioDuration[sample.id]) {
                        setAudioDuration(prev => ({ ...prev, [sample.id]: audio.duration }));
                      }
                      
                      const progress = audio.currentTime / audio.duration;
                      setAudioProgress(prev => ({ ...prev, [sample.id]: progress }));
                      setAudioCurrentTime(prev => ({ ...prev, [sample.id]: audio.currentTime }));
                      
                      // Update waveform with progress using debounced drawing
                      if (currentlyPlaying === sample.id) {
                        drawWaveformDebounced(sample.id, progress);
                      }
                    }}
                    onError={(e) => {
                      const audio = e.target as HTMLAudioElement;
                      console.error(`Audio loading error for ${sample.id}:`, {
                        error: audio.error,
                        networkState: audio.networkState,
                        readyState: audio.readyState,
                        src: audio.currentSrc
                      });
                      setCurrentlyPlaying(null);
                      setIsLoading(null);
                      // Set a fallback duration for display purposes
                      setAudioDuration(prev => ({ ...prev, [sample.id]: 0 }));
                    }}
                    preload="auto"
                  >
                    <source src={sample.audioSrc} type="audio/wav" />
                    <source src={sample.audioSrc.replace('.wav', '.mp3')} type="audio/mpeg" />
                  </audio>
                  
                  {/* Progress bar with time display */}
                  <div className="audio-progress-container mb-3">
                    <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                      <span>{formatTime(audioCurrentTime[sample.id] || 0)}</span>
                      <span>{audioDuration[sample.id] ? formatTime(audioDuration[sample.id]) : '--:--'}</span>
                    </div>
                    <div className="w-full bg-white/10 rounded-full h-1">
                      <div 
                        className="bg-primary h-1 rounded-full transition-all duration-100" 
                        style={{ width: `${(audioProgress[sample.id] || 0) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                  
                  {/* Waveform */}
                  <div className="waveform-container h-16 bg-black/20 rounded-lg overflow-hidden">
                    <canvas
                      ref={(el) => {
                        if (el) {
                          canvasRefs.current[sample.id] = el;
                          
                          // Use setTimeout to ensure DOM is fully rendered
                          setTimeout(() => {
                            const rect = el.getBoundingClientRect();
                            const width = rect.width || 300; // fallback width
                            const height = rect.height || 64; // fallback height
                            
                            el.width = width * 2;
                            el.height = height * 2;
                            el.style.width = width + 'px';
                            el.style.height = height + 'px';
                            
                            // Only draw if this canvas hasn't been drawn yet
                            const currentProgress = audioProgress[sample.id] || 0;
                            drawProfessionalWaveform(el, currentProgress);
                          }, 0);
                        }
                      }}
                      className="waveform-canvas w-full h-full cursor-pointer"
                      onClick={(e) => handleWaveformClick(sample.id, e)}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Panel: AI Analysis */}
          <div className="bg-white/5 border border-white/10 rounded-2xl backdrop-blur-md p-6">
            <h3 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
              🤖 AI Analysis Engine
            </h3>
            
            {isAnalyzing && (
              <div className="analysis-progress mb-6">
                {/* Analysis Header with Pulse Effect */}
                <div className="flex items-center gap-3 mb-6">
                  <div className="relative">
                    <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center">
                      <div className="w-4 h-4 bg-primary rounded-full animate-pulse"></div>
                    </div>
                    <div className="absolute inset-0 w-8 h-8 bg-primary/10 rounded-full animate-ping"></div>
                  </div>
                  <div>
                    <h4 className="text-white font-semibold">AI Analysis in Progress</h4>
                    <p className="text-xs text-slate-400">Processing audio data...</p>
                  </div>
                </div>

                {/* Enhanced Progress Steps */}
                <div className="space-y-4">
                  {analysisProgress.map((step, index) => {
                    const isActive = !step.completed && index > 0 && analysisProgress[index - 1]?.completed;
                    return (
                      <div key={step.id} className="flex items-center gap-4 group">
                        {/* Step Indicator */}
                        <div className="relative flex-shrink-0">
                          <div className={`w-6 h-6 rounded-full border-2 transition-all duration-500 flex items-center justify-center ${
                            step.completed 
                              ? 'bg-primary border-primary shadow-lg shadow-primary/30 scale-110' 
                              : isActive
                              ? 'border-primary/60 bg-primary/10 animate-pulse'
                              : 'border-white/20 bg-white/5'
                          }`}>
                            {step.completed ? (
                              <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            ) : isActive ? (
                              <div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
                            ) : (
                              <div className="w-2 h-2 bg-white/30 rounded-full"></div>
                            )}
                          </div>
                          
                          {/* Connection Line */}
                          {index < analysisProgress.length - 1 && (
                            <div className={`absolute top-6 left-1/2 transform -translate-x-1/2 w-0.5 h-4 transition-all duration-500 ${
                              step.completed ? 'bg-primary/60' : 'bg-white/10'
                            }`}></div>
                          )}
                        </div>
                        
                        {/* Step Content */}
                        <div className="flex-1 min-w-0">
                          <div className={`text-sm font-medium transition-all duration-300 ${
                            step.completed 
                              ? 'text-white' 
                              : isActive 
                              ? 'text-primary' 
                              : 'text-slate-400'
                          }`}>
                            {step.label}
                          </div>
                          
                          {/* Progress Bar for Active Step */}
                          {isActive && (
                            <div className="mt-2 w-full bg-white/10 rounded-full h-1 overflow-hidden">
                              <div className="h-full bg-gradient-to-r from-primary/60 to-primary rounded-full animate-pulse" style={{width: '60%'}}></div>
                            </div>
                          )}
                        </div>
                        
                        {/* Step Icon */}
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300 ${
                          step.completed 
                            ? 'bg-primary/20 text-primary' 
                            : isActive 
                            ? 'bg-primary/10 text-primary/70' 
                            : 'bg-white/5 text-white/30'
                        }`}>
                          {/* File Loading Icon */}
                          {index === 0 && (
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-5L9 2H4z" clipRule="evenodd" />
                            </svg>
                          )}
                          {/* Frequency Analysis Icon */}
                          {index === 1 && (
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M2 10a8 8 0 018-8v8h8a8 8 0 11-16 0z" />
                              <path d="M12 2.252A8.014 8.014 0 0117.748 8H12V2.252z" />
                            </svg>
                          )}
                          {/* Musical Pattern Icon */}
                          {index === 2 && (
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
                            </svg>
                          )}
                          {/* AI Processing Icon */}
                          {index === 3 && (
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                            </svg>
                          )}
                          {/* Completion Icon */}
                          {index === 4 && (
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                {/* Overall Progress Bar */}
                <div className="mt-6 pt-4 border-t border-white/10">
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                    <span>Overall Progress</span>
                    <span>{Math.round((analysisProgress.filter(s => s.completed).length / analysisProgress.length) * 100)}%</span>
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-primary via-blue-400 to-primary rounded-full transition-all duration-1000 ease-out"
                      style={{width: `${(analysisProgress.filter(s => s.completed).length / analysisProgress.length) * 100}%`}}
                    ></div>
                  </div>
                </div>
              </div>
            )}

            {showAnalysisResults && selectedSampleData && (
              <div className="analysis-results space-y-4">
                {/* Primary Analysis Grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white/5 rounded-lg p-3">
                    <div className="text-xs text-slate-400 mb-1">Genre</div>
                    <div className="text-white font-semibold">{selectedSampleData.analysis.genre}</div>
                  </div>
                  <div className="bg-white/5 rounded-lg p-3">
                    <div className="text-xs text-slate-400 mb-1">Mood</div>
                    <div className="text-white font-semibold">{selectedSampleData.analysis.mood}</div>
                  </div>
                  <div className="bg-white/5 rounded-lg p-3">
                    <div className="text-xs text-slate-400 mb-1">Energy</div>
                    <div className="text-white font-semibold">{selectedSampleData.analysis.energy}</div>
                  </div>
                  <div className="bg-white/5 rounded-lg p-3">
                    <div className="text-xs text-slate-400 mb-1">Quality</div>
                    <div className="text-white font-semibold">{selectedSampleData.analysis.quality}</div>
                  </div>
                </div>

                {/* Technical Details */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white/5 rounded-lg p-3">
                    <div className="text-xs text-slate-400 mb-1">Tempo</div>
                    <div className="text-white font-semibold">{selectedSampleData.analysis.tempo}</div>
                  </div>
                  <div className="bg-white/5 rounded-lg p-3">
                    <div className="text-xs text-slate-400 mb-1">Key</div>
                    <div className="text-white font-semibold">{selectedSampleData.analysis.key}</div>
                  </div>
                </div>

                {/* Vocals & Instruments */}
                <div className="space-y-3">
                  <div className="bg-white/5 rounded-lg p-3">
                    <div className="text-xs text-slate-400 mb-1">Vocals</div>
                    <div className="text-white font-semibold">{selectedSampleData.analysis.vocals}</div>
                  </div>
                  
                  {/* Voice Analysis Details */}
                  {selectedSampleData.analysis.voiceAnalysis && (
                    <div className="bg-white/5 rounded-lg p-3">
                      <div className="text-xs text-slate-400 mb-2">Voice Analysis</div>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div>
                          <span className="text-slate-400">Gender: </span>
                          <span className="text-white">{selectedSampleData.analysis.voiceAnalysis.gender}</span>
                        </div>
                        <div>
                          <span className="text-slate-400">Emotion: </span>
                          <span className="text-white">{selectedSampleData.analysis.voiceAnalysis.emotion}</span>
                        </div>
                        <div>
                          <span className="text-slate-400">Clarity: </span>
                          <span className="text-white">{selectedSampleData.analysis.voiceAnalysis.clarity}</span>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {selectedSampleData.analysis.instruments.length > 0 && (
                    <div className="bg-white/5 rounded-lg p-3">
                      <div className="text-xs text-slate-400 mb-2">Instruments Detected</div>
                      <div className="flex flex-wrap gap-1">
                        {selectedSampleData.analysis.instruments.map((instrument, index) => (
                          <span key={index} className="bg-primary/20 text-primary px-2 py-1 rounded text-xs">
                            {instrument}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* AI-Powered Tags */}
                <div className="bg-white/5 rounded-lg p-3">
                  <div className="text-xs text-slate-400 mb-2 flex items-center gap-2">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M17.707 9.293a1 1 0 010 1.414l-7 7a1 1 0 01-1.414 0l-7-7A.997.997 0 012 10V5a3 3 0 013-3h5c.256 0 .512.098.707.293l7 7zM5 6a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                    </svg>
                    AI-Powered Tags
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {selectedSampleData.analysis.tags.map((tag, index) => (
                      <span key={index} className="bg-green-500/20 text-green-400 px-2 py-1 rounded text-xs border border-green-500/30">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
                
                {/* AI Summary */}
                <div className="bg-white/5 rounded-lg p-4">
                  <div className="text-xs text-slate-400 mb-2 flex items-center gap-2">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                    </svg>
                    AI Summary
                  </div>
                  <p className="text-white text-sm leading-relaxed">{selectedSampleData.summary}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default HookSection;
