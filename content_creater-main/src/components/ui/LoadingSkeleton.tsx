/**
 * Loading Skeleton Component
 * Provides animated skeleton loaders for better UX while content loads
 */

import React from 'react';

interface LoadingSkeletonProps {
  type?: 'image' | 'video' | 'text' | 'card' | 'avatar' | 'button';
  className?: string;
  height?: string;
  width?: string;
}

export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({ 
  type = 'card', 
  className = '',
  height,
  width 
}) => {
  const baseClass = 'animate-pulse bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 bg-[length:200%_100%]';
  
  switch (type) {
    case 'image':
      return (
        <div 
          className={`${baseClass} rounded-lg ${className}`}
          style={{ height: height || '300px', width: width || '100%' }}
        />
      );
    
    case 'video':
      return (
        <div 
          className={`${baseClass} rounded-lg relative ${className}`}
          style={{ height: height || '400px', width: width || '100%' }}
        >
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-16 h-16 border-4 border-gray-400 border-t-gray-200 rounded-full animate-spin" />
          </div>
        </div>
      );
    
    case 'text':
      return (
        <div className={`space-y-2 ${className}`}>
          <div className={`${baseClass} h-4 rounded w-full`} />
          <div className={`${baseClass} h-4 rounded w-5/6`} />
          <div className={`${baseClass} h-4 rounded w-4/6`} />
        </div>
      );
    
    case 'avatar':
      return (
        <div 
          className={`${baseClass} rounded-full ${className}`}
          style={{ height: height || '40px', width: width || '40px' }}
        />
      );
    
    case 'button':
      return (
        <div 
          className={`${baseClass} rounded-md ${className}`}
          style={{ height: height || '36px', width: width || '100px' }}
        />
      );
    
    case 'card':
    default:
      return (
        <div className={`bg-white rounded-xl border border-gray-200 p-4 ${className}`}>
          <div className="flex items-center gap-3 mb-4">
            <div className={`${baseClass} rounded-full w-10 h-10`} />
            <div className="flex-1 space-y-2">
              <div className={`${baseClass} h-4 rounded w-32`} />
              <div className={`${baseClass} h-3 rounded w-24`} />
            </div>
          </div>
          <div className={`${baseClass} h-64 rounded-lg mb-3`} />
          <div className="space-y-2">
            <div className={`${baseClass} h-4 rounded w-full`} />
            <div className={`${baseClass} h-4 rounded w-4/5`} />
          </div>
        </div>
      );
  }
};

export default LoadingSkeleton;
