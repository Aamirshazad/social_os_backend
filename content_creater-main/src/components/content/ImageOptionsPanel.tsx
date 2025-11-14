/**
 * Image Options Panel - Reusable Component
 * Collapsible panel for advanced image generation options
 */

'use client'

import React from 'react';
import { Settings } from 'lucide-react';
import type { ImageGenerationOptions } from '@/features/imageGeneration';

interface ImageOptionsPanelProps {
  options: ImageGenerationOptions;
  onChange: (options: ImageGenerationOptions) => void;
  isOpen: boolean;
  onToggle: () => void;
  className?: string;
}

export const ImageOptionsPanel: React.FC<ImageOptionsPanelProps> = ({
  options,
  onChange,
  isOpen,
  onToggle,
  className = '',
}) => {
  return (
    <div className={`border-t border-emerald-200 pt-2 ${className}`}>
      {/* Toggle Button */}
      <button
        onClick={onToggle}
        className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1.5 transition-colors"
      >
        <Settings className="w-3.5 h-3.5" />
        {isOpen ? '▼' : '▶'} Advanced Options
        {!isOpen && (
          <span className="text-emerald-600 font-normal">
            ({options.quality}, {options.size})
          </span>
        )}
      </button>

      {/* Options Panel */}
      {isOpen && (
        <div className="mt-2 space-y-2 bg-white/50 rounded-lg p-3 border border-emerald-200 animate-in fade-in duration-200">
          {/* Quality Selector */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Quality
            </label>
            <select
              value={options.quality || 'medium'}
              onChange={(e) => onChange({ ...options, quality: e.target.value as any })}
              className="w-full text-sm border-emerald-300 rounded focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            >
              <option value="auto">Auto ✨</option>
              <option value="low">Low (Fastest) ⚡</option>
              <option value="medium">Medium (Balanced) ⭐</option>
              <option value="high">High (Best) 💎</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              {options.quality === 'high' && 'Maximum quality, slower generation (~4-8s)'}
              {options.quality === 'medium' && 'Great balance of speed and quality (~2-4s)'}
              {options.quality === 'low' && 'Fastest generation, lower quality (~1-2s)'}
              {(!options.quality || options.quality === 'auto') && 'AI picks best quality'}
            </p>
          </div>

          {/* Size Selector */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Size / Platform
            </label>
            <select
              value={options.size || '1024x1024'}
              onChange={(e) => onChange({ ...options, size: e.target.value as any })}
              className="w-full text-sm border-emerald-300 rounded focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            >
              <option value="auto">Auto</option>
              <option value="1024x1024">📸 Square (Instagram)</option>
              <option value="1536x1024">🖼️ Landscape (Twitter/X)</option>
              <option value="1024x1536">📱 Portrait (Stories)</option>
            </select>
          </div>

          {/* Format Selector */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Format
            </label>
            <select
              value={options.format || 'png'}
              onChange={(e) => onChange({ ...options, format: e.target.value as any })}
              className="w-full text-sm border-emerald-300 rounded focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            >
              <option value="png">PNG (Best Quality)</option>
              <option value="jpeg">JPEG (Faster)</option>
              <option value="webp">WebP (Balanced)</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              {options.format === 'png' && 'Best quality, supports transparency'}
              {options.format === 'jpeg' && 'Faster generation, smaller files'}
              {options.format === 'webp' && 'Modern format, good balance'}
            </p>
          </div>

          {/* Background Selector */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Background
            </label>
            <select
              value={options.background || 'auto'}
              onChange={(e) => onChange({ ...options, background: e.target.value as any })}
              className="w-full text-sm border-emerald-300 rounded focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            >
              <option value="auto">Auto</option>
              <option value="opaque">Solid Background</option>
              <option value="transparent">✨ Transparent</option>
            </select>
            {options.background === 'transparent' && (
              <p className="text-xs text-emerald-700 mt-1 font-medium">
                💡 Perfect for logos and overlays! Works best with PNG format.
              </p>
            )}
          </div>

          {/* Compression Slider (for JPEG/WebP) */}
          {(options.format === 'jpeg' || options.format === 'webp') && (
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Compression: {options.output_compression || 80}%
              </label>
              <input
                type="range"
                min="0"
                max="100"
                value={options.output_compression || 80}
                onChange={(e) =>
                  onChange({
                    ...options,
                    output_compression: parseInt(e.target.value),
                  })
                }
                className="w-full h-2 bg-emerald-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
              />
              <div className="flex justify-between text-xs text-gray-600 mt-1">
                <span>Smaller file</span>
                <span>Better quality</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ImageOptionsPanel;
