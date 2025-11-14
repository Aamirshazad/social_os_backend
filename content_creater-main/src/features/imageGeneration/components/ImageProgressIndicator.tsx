/**
 * Image Progress Indicator - Premium animated progress component
 */

'use client'

import React from 'react';
import { Loader2, Sparkles, Image as ImageIcon } from 'lucide-react';

interface ImageProgressIndicatorProps {
  progress?: number; // 0-100
  partialImage?: string;
  status?: string;
  height?: string;
}

export const ImageProgressIndicator: React.FC<ImageProgressIndicatorProps> = ({
  progress = 0,
  partialImage,
  status = 'Generating...',
  height = '300px',
}) => {
  return (
    <div
      className="relative rounded-xl overflow-hidden bg-gradient-to-br from-purple-100 via-pink-100 to-purple-100 border-4 border-purple-300 shadow-xl"
      style={{ height }}
    >
      {/* Partial Image Preview (Blurred) */}
      {partialImage && (
        <div className="absolute inset-0">
          <img
            src={partialImage}
            alt="Generating..."
            className="w-full h-full object-cover blur-sm opacity-60"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-purple-900/60 to-transparent" />
        </div>
      )}

      {/* Animated Background */}
      <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-purple-500/10 animate-pulse" />

      {/* Content */}
      <div className="relative h-full flex flex-col items-center justify-center p-6 space-y-6">
        {/* Animated Icon */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full blur-3xl opacity-40 animate-pulse" />
          <div className="relative bg-white rounded-full p-8 shadow-2xl border-4 border-purple-300">
            <div className="relative">
              <ImageIcon className="w-16 h-16 text-purple-600" />
              <div className="absolute -top-2 -right-2">
                <Loader2 className="w-8 h-8 text-pink-600 animate-spin" />
              </div>
            </div>
          </div>
        </div>

        {/* Status Text */}
        <div className="text-center space-y-2">
          <h3 className="text-2xl font-bold text-purple-900 flex items-center gap-2 justify-center">
            <Sparkles className="w-6 h-6 text-purple-600 animate-pulse" />
            {status}
          </h3>
          <p className="text-sm text-purple-700 font-semibold">
            Creating your masterpiece...
          </p>
        </div>

        {/* Progress Bar */}
        <div className="w-full max-w-md space-y-2">
          <div className="flex justify-between items-center text-sm">
            <span className="text-purple-700 font-bold">{Math.round(progress)}%</span>
            <span className="text-purple-600 text-xs">
              {progress < 33 && '🎨 Initializing...'}
              {progress >= 33 && progress < 66 && '✨ Creating details...'}
              {progress >= 66 && progress < 100 && '🖼️ Finalizing...'}
              {progress >= 100 && '✅ Complete!'}
            </span>
          </div>
          <div className="h-3 bg-white/50 rounded-full overflow-hidden shadow-inner">
            <div
              className="h-full bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600 rounded-full transition-all duration-500 shadow-lg relative overflow-hidden"
              style={{ width: `${progress}%` }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
            </div>
          </div>
        </div>

        {/* Stages */}
        <div className="flex items-center justify-center gap-3">
          {[0, 1, 2].map((index) => {
            const stageProgress = (progress / 100) * 3;
            const isActive = stageProgress >= index;
            const isCurrent = Math.floor(stageProgress) === index;

            return (
              <div
                key={index}
                className={`h-3 rounded-full transition-all duration-500 ${
                  isActive
                    ? isCurrent
                      ? 'w-12 bg-gradient-to-r from-purple-600 to-pink-600 shadow-lg animate-pulse'
                      : 'w-8 bg-purple-500 shadow-md'
                    : 'w-3 bg-purple-200'
                }`}
              />
            );
          })}
        </div>

        {/* Fun Tip */}
        <div className="absolute bottom-4 left-0 right-0 px-6">
          <div className="bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-lg border-2 border-purple-200">
            <p className="text-xs text-purple-800 text-center font-medium">
              💡 <strong>Pro tip:</strong> Try transparent backgrounds for logos and overlays!
            </p>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }
        .animate-shimmer {
          animation: shimmer 2s infinite;
        }
      `}</style>
    </div>
  );
};

export default ImageProgressIndicator;
