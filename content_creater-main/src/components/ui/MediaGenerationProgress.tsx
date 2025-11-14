/**
 * Media Generation Progress Component
 * Provides enhanced visual feedback during image and video generation
 */

import React, { useState, useEffect } from 'react';
import { Loader2, Sparkles, Film, Image as ImageIcon, CheckCircle } from 'lucide-react';

interface MediaGenerationProgressProps {
  type: 'image' | 'video';
  status?: string;
  height?: string;
  realProgress?: number; // Real progress from backend (0-100)
  videoOperation?: any; // Video operation object for extracting metadata
}

export const MediaGenerationProgress: React.FC<MediaGenerationProgressProps> = ({ 
  type, 
  status = 'Generating...',
  height = '300px',
  realProgress,
  videoOperation
}) => {
  const [progress, setProgress] = useState(realProgress || 0);
  const [stage, setStage] = useState(0);

  const isVideo = type === 'video';
  
  // Stages for progress animation
  const stages = isVideo 
    ? ['Initializing...', 'Processing prompt...', 'Generating frames...', 'Rendering video...', 'Finalizing...']
    : ['Initializing...', 'Processing prompt...', 'Generating image...', 'Finalizing...'];

  useEffect(() => {
    // Use real progress if provided, otherwise simulate
    if (realProgress !== undefined && realProgress !== null) {
      setProgress(realProgress);
    }
  }, [realProgress]);

  useEffect(() => {
    // Only simulate if no real progress provided
    if (realProgress !== undefined && realProgress !== null) {
      return; // Don't simulate if we have real progress
    }

    // Simulate progress - gradually increase progress bar
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        // Video generation is slower, so progress more slowly
        const increment = isVideo ? 0.5 : 1;
        if (prev >= 95) return prev; // Cap at 95% until actually complete
        return prev + increment;
      });
    }, 300);

    // Cycle through stages
    const stageInterval = setInterval(() => {
      setStage(prev => (prev + 1) % stages.length);
    }, isVideo ? 8000 : 5000);

    return () => {
      clearInterval(progressInterval);
      clearInterval(stageInterval);
    };
  }, [isVideo, stages.length, realProgress]);

  const Icon = isVideo ? Film : ImageIcon;
  const bgGradient = isVideo 
    ? 'from-purple-500 via-pink-500 to-purple-500'
    : 'from-emerald-500 via-teal-500 to-emerald-500';
  const textColor = isVideo ? 'text-purple-600' : 'text-emerald-600';
  const borderColor = isVideo ? 'border-purple-300' : 'border-emerald-300';

  return (
    <div 
      className={`relative rounded-lg overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100 border-2 ${borderColor}`}
      style={{ height }}
    >
      {/* Animated background */}
      <div className={`absolute inset-0 bg-gradient-to-r ${bgGradient} opacity-5 animate-pulse`} />
      
      {/* Main content */}
      <div className="relative h-full flex flex-col items-center justify-center p-6 space-y-6">
        
        {/* Animated icon */}
        <div className="relative">
          <div className={`absolute inset-0 bg-gradient-to-r ${bgGradient} rounded-full blur-2xl opacity-30 animate-pulse`} />
          <div className={`relative bg-white rounded-full p-6 shadow-xl border-2 ${borderColor}`}>
            <Icon className={`w-12 h-12 ${textColor} animate-pulse`} />
          </div>
          <div className="absolute -top-2 -right-2">
            <Loader2 className={`w-8 h-8 ${textColor} animate-spin`} />
          </div>
        </div>

        {/* Status text */}
        <div className="text-center space-y-2">
          <h3 className={`text-xl font-bold ${textColor}`}>
            {status || stages[stage]}
          </h3>
          <p className="text-sm text-gray-600 font-medium">
            {isVideo 
              ? 'This may take 2-5 minutes. Please be patient...' 
              : 'This may take 30-60 seconds...'}
          </p>
        </div>

        {/* Percentage display */}
        <div className="w-full max-w-md">
          <div className="flex justify-center items-center text-sm text-gray-600">
            <span className="font-bold text-lg">{Math.round(progress)}%</span>
          </div>
        </div>

        {/* Stage indicators */}
        <div className="flex items-center justify-center gap-2">
          {stages.map((_, index) => (
            <div
              key={index}
              className={`h-2 rounded-full transition-all duration-300 ${
                index <= stage
                  ? `w-8 ${isVideo ? 'bg-purple-500' : 'bg-emerald-500'}`
                  : 'w-2 bg-gray-300'
              }`}
            />
          ))}
        </div>

        {/* Fun tip */}
        <div className="absolute bottom-4 left-0 right-0 px-6">
          <div className="rounded-lg p-3">
            <p className="text-xs text-gray-600 text-center italic font-medium">
              💡 Tip: You can edit other posts while this generates in the background!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MediaGenerationProgress;
