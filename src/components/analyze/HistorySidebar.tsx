import React, { useState, useEffect } from 'react';
import { HistoryStorage, type HistoryRecord } from '../../utils/historyStorage';
import { useAuth } from '../../contexts/AuthContext';

interface HistorySidebarProps {
  selectedRecordId?: string;
  onSelectRecord: (record: HistoryRecord) => void;
  onNewAnalysis: () => void;
}

export default function HistorySidebar({ selectedRecordId, onSelectRecord, onNewAnalysis }: HistorySidebarProps) {
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [loading, setLoading] = useState(true);

  const { user } = useAuth();

  useEffect(() => {
    loadHistory();
  }, [user]); // Reload history when user changes

  const loadHistory = async () => {
    setLoading(true);
    try {
      const records = await HistoryStorage.getCurrentUserHistory();
      setHistory(records);
    } catch (error) {
      console.error('Error loading history:', error);
      // Fallback to all history
      const records = HistoryStorage.getHistory();
      setHistory(records);
    } finally {
      setLoading(false);
    }
  };

  const handleClearHistory = () => {
    if (user) {
      // Clear only user's history
      HistoryStorage.clearUserHistory(user.id);
    } else {
      // Clear anonymous history
      HistoryStorage.clearHistory();
    }
    setHistory([]);
    setShowClearConfirm(false);
    onNewAnalysis(); // 返回到上传页面
  };

  const handleRemoveRecord = (id: string, event: React.MouseEvent) => {
    event.stopPropagation();
    HistoryStorage.removeRecord(id);
    loadHistory();

    // 如果删除的是当前选中的记录，返回到上传页面
    if (id === selectedRecordId) {
      onNewAnalysis();
    }
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Now';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getGenreColor = (genre: string) => {
    const colors = {
      'Electronic': 'bg-violet-500',
      'Rock': 'bg-red-500',
      'Pop': 'bg-pink-500',
      'Jazz': 'bg-blue-500',
      'Classical': 'bg-gray-500',
      'Hip Hop': 'bg-yellow-500',
      'Country': 'bg-green-500',
    };
    return colors[genre as keyof typeof colors] || 'bg-violet-500';
  };

  return (
    <>
      {/* Sidebar */}
      <div
        className={`relative bg-slate-900/50 backdrop-blur-xl border-r border-white/10 flex flex-col transition-all duration-300 ${isCollapsed ? 'w-16' : 'w-80'
          }`}
        data-sidebar="history"
        data-state={isCollapsed ? "collapsed" : "open"}>
        {/* Header */}
        <div className="p-4 border-b border-white/10">
          <div className="flex items-center justify-between">
            {!isCollapsed && (
              <div>
                <h3 className="text-lg font-semibold text-white">History</h3>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <span>{history.length} analysis</span>
                  {user && (
                    <span className="px-2 py-1 bg-violet-500/20 text-violet-300 rounded-full">
                      Synced
                    </span>
                  )}
                  {!user && history.length > 0 && (
                    <span className="px-2 py-1 bg-orange-500/20 text-orange-300 rounded-full">
                      Local
                    </span>
                  )}
                </div>
              </div>
            )}
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-all duration-300"
            >
              <svg className={`w-4 h-4 transition-transform duration-300 ${isCollapsed ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          </div>
        </div>

        {/* Actions */}
        {!isCollapsed && (
          <div className="p-4 space-y-2">
            <button
              onClick={onNewAnalysis}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-violet-500 to-blue-500 rounded-lg hover:from-violet-600 hover:to-blue-600 transition-all duration-300"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              New Analysis
            </button>

            {history.length > 0 && (
              <button
                onClick={() => setShowClearConfirm(true)}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-red-300 border border-red-400/30 rounded-lg hover:bg-red-500/20 transition-all duration-300"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Clear All
              </button>
            )}
          </div>
        )}

        {/* History List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className={`p-4 text-center ${isCollapsed ? 'hidden' : ''}`}>
              <div className="flex items-center justify-center gap-2 text-slate-400 text-sm">
                <div className="w-4 h-4 border-2 border-violet-400 border-t-transparent rounded-full animate-spin"></div>
                Loading history...
              </div>
            </div>
          ) : history.length === 0 ? (
            <div className={`p-4 text-center ${isCollapsed ? 'hidden' : ''}`}>
              <div className="text-slate-400 text-sm">
                {user ? 'No analysis history yet' : 'No local history yet'}
              </div>
              {!user && (
                <div className="mt-2 text-xs text-slate-500">
                  Sign in to sync your history across devices
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-1 p-2">
              {history.map((record) => (
                <div
                  key={record.id}
                  onClick={() => onSelectRecord(record)}
                  className={`
                    group cursor-pointer p-3 rounded-lg transition-all duration-300 relative
                    ${selectedRecordId === record.id
                      ? 'bg-violet-500/20 border border-violet-400/30'
                      : 'hover:bg-white/5 border border-transparent hover:border-white/10'
                    }
                    ${isCollapsed ? 'mx-1' : ''}
                  `}
                  data-history-item={selectedRecordId === record.id ? "selected" : "unselected"}
                >
                  {isCollapsed ? (
                    // Collapsed view - just icon and indicator
                    <div className="flex flex-col items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${getGenreColor(record.basicInfo.genre)}`}>
                        <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                        </svg>
                      </div>
                      {selectedRecordId === record.id && (
                        <div className="w-2 h-2 bg-violet-400 rounded-full mt-1"></div>
                      )}
                    </div>
                  ) : (
                    // Expanded view
                    <>
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${getGenreColor(record.basicInfo.genre)}`}>
                            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                            </svg>
                          </div>
                          <div className="min-w-0 flex-1">
                            <h4 className="font-medium text-white text-sm truncate group-hover:text-white/95 transition-colors">
                              {record.filename}
                            </h4>
                            <p className="text-xs text-slate-400 mt-0.5">
                              {Math.floor(record.duration / 60)}:{(record.duration % 60).toString().padStart(2, '0')} • {formatDate(record.timestamp)}
                            </p>
                          </div>
                        </div>

                        <button
                          onClick={(e) => handleRemoveRecord(record.id, e)}
                          className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-400 transition-all duration-300 flex-shrink-0"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>

                      {/* Waveform Preview */}
                      {record.thumbnail && (
                        <div className="h-8 bg-white/5 rounded overflow-hidden mb-2">
                          <img
                            src={record.thumbnail}
                            alt="Waveform"
                            className="w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity"
                          />
                        </div>
                      )}

                      {/* Quick Info */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-slate-400">Genre</span>
                          <span className="text-xs text-white font-medium">{record.basicInfo.genre}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-slate-400">BPM</span>
                          <span className="text-xs text-white font-medium">{record.basicInfo.bpm}</span>
                        </div>
                      </div>

                      {/* Selected Indicator */}
                      {selectedRecordId === record.id && (
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-violet-400 to-blue-400 rounded-r"></div>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Clear Confirmation Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="glass-pane p-8 max-w-md mx-4">
            <h3 className="text-xl font-bold text-white mb-4">Clear All History?</h3>
            <p className="text-slate-300 mb-6">
              This will permanently delete all {history.length} analysis records. This action cannot be undone.
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
    </>
  );
}