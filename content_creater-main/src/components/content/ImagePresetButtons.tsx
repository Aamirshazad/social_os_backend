/**
 * Image Preset Buttons - Quick Configuration Component
 * Platform-specific preset buttons for rapid image generation setup
 */

'use client'

import React from 'react';
import type { ImageGenerationOptions } from '@/features/imageGeneration';

interface ImagePresetButtonsProps {
  onPresetSelect: (options: ImageGenerationOptions) => void;
  currentOptions?: ImageGenerationOptions;
  className?: string;
}

const presets = [
  {
    id: 'instagram',
    label: '📸 Instagram',
    emoji: '📸',
    name: 'Instagram',
    description: 'Square format for Instagram',
    options: {
      size: '1024x1024' as const,
      quality: 'medium' as const,
      format: 'png' as const,
      background: 'auto' as const,
    },
    className: 'border-emerald-300 hover:bg-emerald-50',
  },
  {
    id: 'twitter',
    label: '🐦 Twitter',
    emoji: '🐦',
    name: 'Twitter',
    description: 'Landscape format for Twitter',
    options: {
      size: '1536x1024' as const,
      quality: 'medium' as const,
      format: 'jpeg' as const,
      background: 'auto' as const,
    },
    className: 'border-blue-300 hover:bg-blue-50',
  },
  {
    id: 'story',
    label: '📱 Story',
    emoji: '📱',
    name: 'Story',
    description: 'Portrait format for Stories',
    options: {
      size: '1024x1536' as const,
      quality: 'high' as const,
      format: 'png' as const,
      background: 'auto' as const,
    },
    className: 'border-purple-300 hover:bg-purple-50',
  },
  {
    id: 'premium',
    label: '💎 Premium',
    emoji: '💎',
    name: 'Premium',
    description: 'High quality with transparent background',
    options: {
      size: '1024x1024' as const,
      quality: 'high' as const,
      format: 'png' as const,
      background: 'transparent' as const,
    },
    className: 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600 shadow-sm',
    isGradient: true,
  },
];

export const ImagePresetButtons: React.FC<ImagePresetButtonsProps> = ({
  onPresetSelect,
  currentOptions,
  className = '',
}) => {
  const isPresetActive = (presetOptions: ImageGenerationOptions) => {
    if (!currentOptions) return false;
    return (
      currentOptions.size === presetOptions.size &&
      currentOptions.quality === presetOptions.quality &&
      currentOptions.format === presetOptions.format &&
      currentOptions.background === presetOptions.background
    );
  };

  return (
    <div className={`flex gap-1.5 flex-wrap items-center border-t border-emerald-200 pt-2 ${className}`}>
      <span className="text-xs font-semibold text-gray-600">Quick:</span>
      
      {presets.map((preset) => {
        const isActive = isPresetActive(preset.options);
        
        return (
          <button
            key={preset.id}
            onClick={() => onPresetSelect(preset.options)}
            title={preset.description}
            className={`
              text-xs px-2 py-1 rounded transition-all duration-200
              ${preset.isGradient
                ? preset.className
                : `bg-white border ${preset.className}`
              }
              ${isActive && !preset.isGradient
                ? 'ring-2 ring-emerald-500 ring-offset-1'
                : ''
              }
              ${isActive && preset.isGradient
                ? 'ring-2 ring-purple-400 ring-offset-1'
                : ''
              }
            `}
          >
            {preset.label}
          </button>
        );
      })}
    </div>
  );
};

export default ImagePresetButtons;
