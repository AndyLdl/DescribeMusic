import React from 'react';
import UsageIndicator from './UsageIndicator';
import type { UsageStatus, User } from '../../lib/supabase';

interface UploadSectionProps {
  onFileSelect: (files: FileList | null) => void;
  dragActive: boolean;
  onDrag: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  inputRef: React.RefObject<HTMLInputElement>;
  usageStatus?: UsageStatus | null;
  user?: User | null;
  onOpenLogin?: () => void;
}

export default function UploadSection({
  onFileSelect,
  dragActive,
  onDrag,
  onDrop,
  inputRef,
  usageStatus,
  user,
  onOpenLogin
}: UploadSectionProps) {

  const openFileDialog = () => {
    inputRef.current?.click();
  };

  // 检查是否可以上传
  const canUpload = !usageStatus || usageStatus.allowed;
  const needsAuth = usageStatus?.requiresAuth || false;



  return (
    <div className="space-y-12">
      {/* Usage Indicator */}
      <UsageIndicator
        usageStatus={usageStatus}
        user={user}
        onOpenLogin={onOpenLogin}
      />

      {/* Upload Area */}
      <div className="relative">
        {/* Background Decorations */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-20 right-20 w-80 h-80 bg-violet-500/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 left-20 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"></div>

          {/* Floating musical notes */}
          <div className="absolute top-16 left-1/4 text-violet-400/20 text-6xl animate-bounce" style={{ animationDelay: '0s', animationDuration: '3s' }}>♪</div>
          <div className="absolute top-32 right-1/3 text-blue-400/20 text-4xl animate-bounce" style={{ animationDelay: '1s', animationDuration: '4s' }}>♫</div>
          <div className="absolute bottom-32 left-1/3 text-purple-400/20 text-5xl animate-bounce" style={{ animationDelay: '2s', animationDuration: '3.5s' }}>♬</div>
        </div>

        {/* Main Upload Zone */}
        <div
          className={`
            relative z-10 glass-pane p-16 text-center transition-all duration-300 
            ${!canUpload
              ? 'cursor-not-allowed opacity-50'
              : 'cursor-pointer'
            }
            ${dragActive && canUpload
              ? 'border-violet-400/50 bg-violet-500/10 scale-105'
              : canUpload
                ? 'border-white/10 hover:border-white/20 hover:bg-white/[0.08]'
                : 'border-red-500/30 bg-red-500/5'
            }
          `}
          onDragEnter={canUpload ? onDrag : undefined}
          onDragLeave={canUpload ? onDrag : undefined}
          onDragOver={canUpload ? onDrag : undefined}
          onDrop={canUpload ? onDrop : undefined}
          onClick={canUpload ? openFileDialog : undefined}
        >
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            accept="audio/*"
            onChange={(e) => onFileSelect(e.target.files)}
          />

          {/* Upload Icon */}
          <div className="mb-8">
            <div className="w-24 h-24 mx-auto bg-gradient-to-r from-violet-500 to-blue-500 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
              <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
          </div>

          <h3 className="text-3xl font-bold text-white mb-4">
            {!canUpload && needsAuth
              ? 'Login required to continue'
              : !canUpload
                ? 'Usage limit reached'
                : 'Drop your audio file here'
            }
          </h3>
          <p className="text-slate-300/80 text-lg mb-8 max-w-2xl mx-auto">
            {!canUpload && needsAuth
              ? 'Sign up to get 10 free analyses per month'
              : !canUpload
                ? usageStatus?.message || 'Please wait for next month reset or upgrade your account'
                : 'Or click to browse files. We support MP3, WAV, OGG, MP4, M4A formats up to 50MB.'
            }
          </p>

          {/* Upload Button */}
          {canUpload ? (
            <button
              className="inline-flex items-center justify-center gap-3 px-8 py-4 text-lg font-medium text-white bg-gradient-to-r from-violet-500 to-blue-500 rounded-full hover:from-violet-600 hover:to-blue-600 transition-all duration-300 transform hover:scale-105"
              onClick={(e) => {
                e.stopPropagation();
                openFileDialog();
              }}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Choose Audio File
            </button>
          ) : needsAuth && onOpenLogin ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onOpenLogin();
              }}
              className="inline-flex items-center justify-center gap-3 px-8 py-4 text-lg font-medium text-white bg-gradient-to-r from-violet-500 to-blue-500 rounded-full hover:from-violet-600 hover:to-blue-600 transition-all duration-300 transform hover:scale-105"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Sign Up Now
            </button>
          ) : (
            <button
              disabled
              className="inline-flex items-center justify-center gap-3 px-8 py-4 text-lg font-medium text-slate-400 bg-slate-700/50 rounded-full cursor-not-allowed"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728" />
              </svg>
              Usage Limit Reached
            </button>
          )}

          {/* Format Info */}
          <div className="mt-12 flex flex-wrap justify-center gap-3">
            {['MP3', 'WAV', 'OGG', 'MP4', 'M4A'].map((format) => (
              <span
                key={format}
                className="px-4 py-2 bg-white/5 text-slate-300 text-sm rounded-full border border-white/10"
              >
                {format}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Alternative Upload Methods - Placeholder */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* URL Upload - Disabled */}
        <div className="glass-pane p-8 text-center opacity-50 cursor-not-allowed">
          <div className="w-16 h-16 mx-auto bg-gray-500/20 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.1m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
          </div>
          <h4 className="text-xl font-semibold text-gray-400 mb-2">Upload from URL</h4>
          <p className="text-gray-500 text-sm">Coming soon</p>
        </div>

        {/* Record Audio - Disabled */}
        <div className="glass-pane p-8 text-center opacity-50 cursor-not-allowed">
          <div className="w-16 h-16 mx-auto bg-gray-500/20 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          </div>
          <h4 className="text-xl font-semibold text-gray-400 mb-2">Record Audio</h4>
          <p className="text-gray-500 text-sm">Coming soon</p>
        </div>
      </div>
    </div>
  );
}