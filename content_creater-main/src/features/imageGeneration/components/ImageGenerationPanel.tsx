/**
 * Image Generation Panel - Premium UI Component
 * High-standard design with advanced features
 */

'use client'

import React, { useState } from 'react';
import { 
  Settings, 
  Sparkles, 
  Image as ImageIcon,
  Wand2,
  Loader2,
  ChevronDown,
  ChevronUp,
  Info
} from 'lucide-react';
import { ImageGenerationOptions, imageGenerationPresets } from '../types/imageGeneration.types';

interface ImageGenerationPanelProps {
  prompt: string;
  onPromptChange: (prompt: string) => void;
  options: ImageGenerationOptions;
  onOptionsChange: (options: ImageGenerationOptions) => void;
  onGenerate: () => void;
  onImprovePrompt: () => void;
  isGenerating: boolean;
  isImprovingPrompt: boolean;
  generatedImage?: string;
  onImageClick?: () => void;
  showProgress?: boolean;
  progress?: number;
}

export const ImageGenerationPanel: React.FC<ImageGenerationPanelProps> = ({
  prompt,
  onPromptChange,
  options,
  onOptionsChange,
  onGenerate,
  onImprovePrompt,
  isGenerating,
  isImprovingPrompt,
  generatedImage,
  onImageClick,
  showProgress,
  progress = 0,
}) => {
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [showPresets, setShowPresets] = useState(false);

  const handlePresetClick = (presetId: string) => {
    const preset = imageGenerationPresets[presetId];
    if (preset) {
      onOptionsChange(preset.options);
      setShowPresets(false);
    }
  };

  const getQualityLabel = (quality?: string) => {
    const labels = {
      low: { text: 'Fast', emoji: '⚡', color: 'text-orange-600' },
      medium: { text: 'Balanced', emoji: '⭐', color: 'text-blue-600' },
      high: { text: 'Premium', emoji: '💎', color: 'text-purple-600' },
      auto: { text: 'Auto', emoji: '🤖', color: 'text-gray-600' },
    };
    return labels[quality as keyof typeof labels] || labels.auto;
  };

  const currentQuality = getQualityLabel(options.quality);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg shadow-lg">
            <ImageIcon className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">Image Generation</h3>
            <p className="text-xs text-gray-500">Powered by GPT Image 1</p>
          </div>
        </div>
        <div className="flex items-center gap-1 text-xs">
          <span className={`font-semibold ${currentQuality.color}`}>
            {currentQuality.emoji} {currentQuality.text}
          </span>
          <span className="text-gray-400">•</span>
          <span className="text-gray-600">{options.size?.replace('x', '×')}</span>
        </div>
      </div>

      {/* Prompt Input */}
      <div className="relative">
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Image Description
        </label>
        <textarea
          value={prompt}
          onChange={(e) => onPromptChange(e.target.value)}
          placeholder="Describe the image you want to generate..."
          className="w-full h-24 px-4 py-3 bg-white border-2 border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all resize-none"
          disabled={isGenerating}
        />
        <div className="absolute bottom-3 right-3">
          <button
            onClick={onImprovePrompt}
            disabled={isImprovingPrompt || !prompt.trim()}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-xs font-semibold rounded-lg shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isImprovingPrompt ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Wand2 className="w-3.5 h-3.5" />
            )}
            {isImprovingPrompt ? 'Improving...' : 'Enhance'}
          </button>
        </div>
      </div>

      {/* Quick Presets */}
      <div>
        <button
          onClick={() => setShowPresets(!showPresets)}
          className="flex items-center gap-2 text-sm font-semibold text-gray-700 hover:text-purple-600 transition-colors mb-2"
        >
          <Sparkles className="w-4 h-4" />
          Quick Presets
          {showPresets ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </button>

        {showPresets && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {Object.values(imageGenerationPresets).slice(0, 8).map((preset) => (
              <button
                key={preset.id}
                onClick={() => handlePresetClick(preset.id)}
                className="flex flex-col items-center gap-1 p-3 bg-white border-2 border-gray-200 hover:border-purple-400 hover:bg-purple-50 rounded-lg transition-all group"
              >
                <span className="text-2xl">{preset.icon}</span>
                <span className="text-xs font-semibold text-gray-700 group-hover:text-purple-700">
                  {preset.name}
                </span>
                <span className="text-xs text-gray-500 text-center line-clamp-1">
                  {preset.description}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Advanced Options */}
      <div>
        <button
          onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
          className="flex items-center gap-2 text-sm font-semibold text-gray-700 hover:text-purple-600 transition-colors mb-2"
        >
          <Settings className="w-4 h-4" />
          Advanced Options
          {showAdvancedOptions ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </button>

        {showAdvancedOptions && (
          <div className="bg-gradient-to-br from-purple-50 via-pink-50 to-purple-50 border-2 border-purple-200 rounded-xl p-4 space-y-4">
            {/* Quality */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-2">
                Quality
              </label>
              <div className="grid grid-cols-4 gap-2">
                {['low', 'medium', 'high', 'auto'].map((quality) => {
                  const label = getQualityLabel(quality);
                  const isActive = options.quality === quality;
                  return (
                    <button
                      key={quality}
                      onClick={() => onOptionsChange({ ...options, quality: quality as any })}
                      className={`flex flex-col items-center gap-1 p-2 rounded-lg font-semibold text-xs transition-all ${
                        isActive
                          ? 'bg-purple-600 text-white shadow-lg scale-105'
                          : 'bg-white text-gray-700 hover:bg-purple-100'
                      }`}
                    >
                      <span className="text-lg">{label.emoji}</span>
                      {label.text}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Size */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-2">
                Size / Aspect Ratio
              </label>
              <select
                value={options.size || '1024x1024'}
                onChange={(e) => onOptionsChange({ ...options, size: e.target.value as any })}
                className="w-full px-3 py-2 bg-white border-2 border-purple-200 rounded-lg text-sm font-medium text-gray-700 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all"
              >
                <option value="auto">🤖 Auto (AI Decides)</option>
                <option value="1024x1024">📸 Square (1024×1024)</option>
                <option value="1536x1024">🖼️ Landscape (1536×1024)</option>
                <option value="1024x1536">📱 Portrait (1024×1536)</option>
              </select>
            </div>

            {/* Format */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-2">
                Format
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: 'png', label: 'PNG', desc: 'Best quality' },
                  { value: 'jpeg', label: 'JPEG', desc: 'Faster' },
                  { value: 'webp', label: 'WebP', desc: 'Balanced' },
                ].map((format) => {
                  const isActive = options.format === format.value;
                  return (
                    <button
                      key={format.value}
                      onClick={() => onOptionsChange({ ...options, format: format.value as any })}
                      className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-all ${
                        isActive
                          ? 'bg-purple-600 text-white shadow-lg'
                          : 'bg-white text-gray-700 hover:bg-purple-100'
                      }`}
                    >
                      <span className="text-xs font-bold">{format.label}</span>
                      <span className="text-xs opacity-80">{format.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Background */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-2 flex items-center gap-1">
                Background
                {options.background === 'transparent' && (
                  <span className="text-purple-600 text-xs">✨ Premium</span>
                )}
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: 'auto', label: 'Auto', emoji: '🤖' },
                  { value: 'opaque', label: 'Solid', emoji: '🎨' },
                  { value: 'transparent', label: 'Clear', emoji: '✨' },
                ].map((bg) => {
                  const isActive = options.background === bg.value;
                  return (
                    <button
                      key={bg.value}
                      onClick={() => onOptionsChange({ ...options, background: bg.value as any })}
                      className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-all ${
                        isActive
                          ? 'bg-purple-600 text-white shadow-lg'
                          : 'bg-white text-gray-700 hover:bg-purple-100'
                      }`}
                    >
                      <span className="text-lg">{bg.emoji}</span>
                      <span className="text-xs font-semibold">{bg.label}</span>
                    </button>
                  );
                })}
              </div>
              {options.background === 'transparent' && (
                <div className="mt-2 p-2 bg-purple-100 rounded-lg flex items-start gap-2">
                  <Info className="w-4 h-4 text-purple-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-purple-800">
                    Perfect for logos, overlays, and product images
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Generate Button */}
      <button
        onClick={onGenerate}
        disabled={isGenerating || !prompt.trim()}
        className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600 hover:from-purple-700 hover:via-pink-700 hover:to-purple-700 text-white font-bold rounded-xl shadow-xl hover:shadow-2xl transition-all disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden group"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000" />
        {isGenerating ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Generating{showProgress ? ` ${Math.round(progress)}%` : '...'}</span>
          </>
        ) : (
          <>
            <Sparkles className="w-5 h-5" />
            <span>Generate Image</span>
          </>
        )}
      </button>

      {/* Image Preview */}
      {generatedImage && (
        <div className="relative group">
          <img
            src={generatedImage}
            alt="Generated"
            onClick={onImageClick}
            className="w-full rounded-xl border-4 border-purple-200 shadow-xl cursor-pointer hover:border-purple-400 transition-all"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-end p-4">
            <div className="text-white text-sm font-semibold">
              <p>{options.size} • {options.format?.toUpperCase()} • {options.quality}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageGenerationPanel;
