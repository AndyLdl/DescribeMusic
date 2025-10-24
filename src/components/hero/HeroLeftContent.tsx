import React from 'react';

/**
 * Hero Left Content Component
 * Displays brand value proposition, features, statistics, and testimonials
 */
export default function HeroLeftContent() {
  const coreFeatures = [
    { icon: "🎵", text: "Identify Music Genre" },
    { icon: "🎭", text: "Analyze Emotional Mood" },
    { icon: "🎼", text: "Detect Instrumentation" },
    { icon: "🎶", text: "Parse Music Structure" }
  ];

  const useCases = [
    "Music Production",
    "Content Creation", 
    "Education",
    "Music Discovery"
  ];

  const statistics = [
    { icon: "📊", text: "50,000+ Audio Files Analyzed" },
    { icon: "⚡", text: "Average Analysis Time 10s" },
    { icon: "🎯", text: "95%+ Accuracy Rate" }
  ];

  return (
    <div className="flex flex-col justify-center h-full px-6 lg:px-8">
      {/* Main Title with Gradient */}
      <div className="mb-10">
        <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tighter !leading-tight mb-6">
          <span className="bg-gradient-to-r from-white via-violet-200 to-blue-200 bg-clip-text text-transparent">
            Describe Music.
          </span>
        </h1>
        <p className="text-lg md:text-xl lg:text-2xl text-slate-300/90 mb-4">
          AI-Powered Audio Analysis.
        </p>
        <p className="text-slate-400/80 text-sm md:text-base leading-relaxed max-w-lg">
          Transform any audio into detailed insights. Identify genres, emotions, instruments, and more with our advanced AI technology.
        </p>
      </div>

      {/* Core Features with Cards */}
      <div className="mb-8">
        <div className="grid grid-cols-1 gap-3">
          {coreFeatures.map((feature, index) => (
            <div key={index} className="flex items-center gap-4 p-4 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 transition-all duration-300 group">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-violet-500/20 to-blue-500/20 flex items-center justify-center group-hover:from-violet-500/30 group-hover:to-blue-500/30 transition-all duration-300">
                <span className="text-xl">{feature.icon}</span>
              </div>
              <span className="text-white/90 font-medium text-sm lg:text-base">{feature.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Use Cases with Better Styling */}
      <div className="mb-8">
        <h3 className="text-sm font-semibold text-slate-300 mb-4">Perfect for:</h3>
        <div className="flex flex-wrap gap-2">
          {useCases.map((useCase, index) => (
            <span 
              key={index}
              className="px-4 py-2 text-sm font-medium bg-gradient-to-r from-violet-500/20 to-blue-500/20 text-violet-200 rounded-full border border-violet-500/30 hover:from-violet-500/30 hover:to-blue-500/30 transition-all duration-300"
            >
              {useCase}
            </span>
          ))}
        </div>
      </div>

      {/* Statistics with Cards */}
      <div className="mb-8">
        <div className="grid grid-cols-1 gap-3">
          {statistics.map((stat, index) => (
            <div key={index} className="flex items-center gap-4 p-3 rounded-lg bg-white/5 backdrop-blur-sm border border-white/10">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-blue-500/20 to-cyan-500/20 flex items-center justify-center">
                <span className="text-lg">{stat.icon}</span>
              </div>
              <span className="text-white/90 text-sm font-medium">{stat.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* User Testimonial with Better Design */}
      <div className="bg-gradient-to-r from-violet-500/10 to-blue-500/10 backdrop-blur-sm border border-violet-500/20 rounded-xl p-6 mt-auto">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-full bg-gradient-to-r from-violet-500 to-blue-500 flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-lg">M</span>
          </div>
          <div>
            <blockquote className="text-slate-200 italic text-sm mb-3 leading-relaxed">
              "This tool is amazing! It helped me quickly analyze my entire music library and discover patterns I never noticed before."
            </blockquote>
            <cite className="text-slate-400 text-xs font-medium">- Music Producer</cite>
          </div>
        </div>
      </div>
    </div>
  );
}
