/**
 * Image Metadata Badge - Display Component
 * Shows metadata about generated images with visual indicators
 */

'use client'

import React from 'react';
import { Image as ImageIcon } from 'lucide-react';

interface ImageMetadataBadgeProps {
  metadata: {
    size?: string;
    quality?: string;
    format?: string;
    background?: string;
    model?: string;
  };
  timestamp?: number;
  generationTime?: number;
  variant?: 'overlay' | 'inline' | 'detailed';
  className?: string;
}

const getQualityEmoji = (quality?: string) => {
  switch (quality) {
    case 'high':
      return '💎';
    case 'medium':
      return '⭐';
    case 'low':
      return '⚡';
    default:
      return '🤖';
  }
};

const formatTime = (ms?: number) => {
  if (!ms) return '';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
};

const formatTimestamp = (timestamp?: number) => {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
};

export const ImageMetadataBadge: React.FC<ImageMetadataBadgeProps> = ({
  metadata,
  timestamp,
  generationTime,
  variant = 'overlay',
  className = '',
}) => {
  // Overlay variant (shows on hover over image)
  if (variant === 'overlay') {
    return (
      <div
        className={`absolute bottom-2 left-2 bg-black/70 backdrop-blur-sm text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity ${className}`}
      >
        {metadata.size} • {metadata.format?.toUpperCase()} • {metadata.quality}
      </div>
    );
  }

  // Inline variant (compact info bar)
  if (variant === 'inline') {
    return (
      <div className={`flex items-center justify-between text-xs text-gray-600 px-1 ${className}`}>
        <span className="flex items-center gap-1">
          <ImageIcon className="w-3 h-3" />
          {metadata.size?.replace('x', '×')}
        </span>
        <span className="flex items-center gap-1">
          {getQualityEmoji(metadata.quality)}
          {metadata.quality}
        </span>
        <span>{metadata.format?.toUpperCase()}</span>
        {metadata.background === 'transparent' && (
          <span className="text-emerald-600 font-medium">✨ Transparent</span>
        )}
      </div>
    );
  }

  // Detailed variant (full info card)
  if (variant === 'detailed') {
    return (
      <div className={`bg-gray-50 rounded-lg p-3 space-y-2 text-sm ${className}`}>
        <div className="flex items-center justify-between border-b border-gray-200 pb-2">
          <span className="font-semibold text-gray-700">Image Details</span>
          {metadata.model && (
            <span className="text-xs text-gray-500 bg-gray-200 px-2 py-0.5 rounded">
              {metadata.model}
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-gray-500">Size:</span>
            <span className="ml-2 font-medium text-gray-700">
              {metadata.size?.replace('x', ' × ')}
            </span>
          </div>

          <div>
            <span className="text-gray-500">Quality:</span>
            <span className="ml-2 font-medium text-gray-700">
              {getQualityEmoji(metadata.quality)} {metadata.quality}
            </span>
          </div>

          <div>
            <span className="text-gray-500">Format:</span>
            <span className="ml-2 font-medium text-gray-700">
              {metadata.format?.toUpperCase()}
            </span>
          </div>

          <div>
            <span className="text-gray-500">Background:</span>
            <span className="ml-2 font-medium text-gray-700">
              {metadata.background === 'transparent' && '✨ '}
              {metadata.background}
            </span>
          </div>

          {generationTime && (
            <div>
              <span className="text-gray-500">Generation:</span>
              <span className="ml-2 font-medium text-gray-700">
                {formatTime(generationTime)}
              </span>
            </div>
          )}

          {timestamp && (
            <div>
              <span className="text-gray-500">Created:</span>
              <span className="ml-2 font-medium text-gray-700">
                {formatTimestamp(timestamp)}
              </span>
            </div>
          )}
        </div>

        {metadata.background === 'transparent' && (
          <div className="bg-emerald-50 border border-emerald-200 rounded p-2 text-xs text-emerald-700">
            💡 Transparent background works best with PNG format
          </div>
        )}
      </div>
    );
  }

  return null;
};

export default ImageMetadataBadge;
