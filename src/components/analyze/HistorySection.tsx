import React, { useState, useEffect } from 'react';
import { HistoryStorage, type HistoryRecord } from '../../utils/historyStorage';

interface HistorySectionProps {
  onSelectRecord: (record: HistoryRecord) => void;
  onNewAnalysis: () => void;
}

export default function HistorySection({ onSelectRecord, onNewAnalysis }: HistorySectionProps) {
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = () => {
    const records = HistoryStorage.getHistory();
    setHistory(records);
  };

  const handleClearHistory = () => {
    HistoryStorage.clearHistory();
    setHistory([]);
    setShowClearConfirm(false);
  };

  const handleRemoveRecord = (id: string, event: React.MouseEvent) => {
    event.stopPropagation();
    HistoryStorage.removeRecord(id);
    loadHistory();
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const getGenreColor = (genre: string) => {
    const colors = {
      'Electronic': 'from-violet-500 to-purple-500',
      'Rock': 'from-red-500 to-orange-500',
      'Pop': 'from-pink-500 to-rose-500',
      'Jazz': 'from-blue-500 to-indigo-500',
      'Classical': 'from-gray-500 to-slate-500',
      'Hip Hop': 'from-yellow-500 to-amber-500',
      'Country': 'from-green-500 to-emerald-500',
    };
    return colors[genre as keyof typeof colors] || 'from-violet-500 to-blue-500';
  };

  if (history.length === 0) {
    return (
      <div className="space-y-8">
        {/* Empty State */}
        <div className="glass-pane p-12 text-center">
          <div className="w-16 h-16 mx-auto bg-gray-500/20 rounded-full flex items-center justify-center mb-6">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-white mb-3">No Analysis History</h3>
          <p className="text-slate-400 mb-6 max-w-md mx-auto">
            Start analyzing your audio files to build up your analysis history. All your results will be saved locally.
          </p>
          <button
            onClick={onNewAnalysis}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 text-white bg-gradient-to-r from-violet-500 to-blue-500 rounded-full hover:from-violet-600 hover:to-blue-600 transition-all duration-300"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Start First Analysis
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-white mb-2">Analysis History</h2>
          <p className="text-slate-400">
            {history.length} analysis{history.length !== 1 ? 'es' : ''} saved locally
          </p>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={onNewAnalysis}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-violet-500/20 border border-violet-400/30 rounded-full hover:bg-violet-500/30 transition-all duration-300"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            New Analysis
          </button>
          <button
            onClick={() => setShowClearConfirm(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-red-300 border border-red-400/30 rounded-full hover:bg-red-500/20 transition-all duration-300"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Clear All
          </button>
        </div>
      </div>

      {/* Clear Confirmation Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="glass-pane p-8 max-w-md mx-4">
            <h3 className="text-xl font-bold text-white mb-4">Clear All History?</h3>
            <p className="text-slate-300 mb-6">
              This will permanently delete all {history.length} analysis records from your local storage. This action cannot be undone.
            </p>
            <div className="flex gap-4">
              <button
                onClick={handleClearHistory}
                className="flex-1 px-4 py-2 bg-red-500/20 text-red-300 border border-red-400/30 rounded-lg hover:bg-red-500/30 transition-all duration-300"
              >
                Clear All
              </button>
              <button
                onClick={() => setShowClearConfirm(false)}
                className="flex-1 px-4 py-2 bg-white/5 text-white border border-white/10 rounded-lg hover:bg-white/10 transition-all duration-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* History Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {history.map((record) => (
          <div
            key={record.id}
            onClick={() => onSelectRecord(record)}
            className="glass-pane p-6 cursor-pointer group hover:bg-white/[0.08] transition-all duration-300 border-white/10 hover:border-white/20"
          >
            {/* File Icon and Remove Button */}
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 bg-gradient-to-r from-violet-500 to-blue-500 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
                </svg>
              </div>
              <button
                onClick={(e) => handleRemoveRecord(record.id, e)}
                className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-400 transition-all duration-300"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* File Info */}
            <div className="mb-4">
              <h3 className="font-semibold text-white truncate group-hover:text-white/95 transition-colors">
                {record.filename}
              </h3>
              <p className="text-sm text-slate-400 mt-1">
                {Math.floor(record.duration / 60)}:{(record.duration % 60).toString().padStart(2, '0')} • {record.fileSize} • {record.format}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {formatDate(record.timestamp)}
              </p>
            </div>

            {/* Waveform Thumbnail */}
            {record.thumbnail && (
              <div className="mb-4 h-12 bg-white/5 rounded-lg overflow-hidden">
                <img 
                  src={record.thumbnail} 
                  alt="Waveform preview" 
                  className="w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity"
                />
              </div>
            )}

            {/* Quick Stats */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">Genre</span>
                <span className={`text-xs px-2 py-1 rounded-full bg-gradient-to-r ${getGenreColor(record.basicInfo.genre)} text-white font-medium`}>
                  {record.basicInfo.genre}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">Mood</span>
                <span className="text-xs text-white font-medium">{record.basicInfo.mood}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">BPM</span>
                <span className="text-xs text-white font-medium">{record.basicInfo.bpm}</span>
              </div>
            </div>

            {/* Hover Indicator */}
            <div className="mt-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <div className="flex items-center justify-center gap-2 text-xs text-violet-300">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                Click to view details
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}