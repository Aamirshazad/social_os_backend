/**
 * Facebook Carousel Template
 * Multiple images in grid or album format
 */

import React, { useState } from 'react'
import { Post, MediaAsset } from '@/types'
import { Heart, MessageCircle, Share2, Smile, ChevronLeft, ChevronRight } from 'lucide-react'

interface Props {
  post: Post
  content: string
  media: MediaAsset[]
  mode: 'preview' | 'edit' | 'published'
  className?: string
}

export function FacebookCarouselTemplate({ post, content, media, mode, className = '' }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const images = media.filter((m) => m.type === 'image')
  const displayImages = images.length > 0 ? images : post.generatedImage ? [{ url: post.generatedImage }] : []

  const next = () => {
    setCurrentIndex((prev) => (prev + 1) % displayImages.length)
  }

  const prev = () => {
    setCurrentIndex((prev) => (prev - 1 + displayImages.length) % displayImages.length)
  }

  // Determine grid layout
  const getGridLayout = () => {
    const count = displayImages.length
    if (count <= 1) return 'grid-cols-1'
    if (count === 2) return 'grid-cols-2'
    if (count === 3) return 'grid-cols-3'
    if (count === 4) return 'grid-cols-2'
    return 'grid-cols-3'
  }

  return (
    <div className={`bg-white border border-gray-300 rounded-lg shadow-lg w-full max-w-2xl mx-auto ${className}`}>
      {/* Facebook Header */}
      <div className="p-3 border-b border-gray-200">
        <div className="flex justify-between items-start">
          <div className="flex gap-2">
            <div className="w-10 h-10 rounded-full bg-blue-600" />
            <div>
              <p className="font-bold text-sm text-black">Your Page</p>
              <p className="text-xs text-gray-500">2 hours ago</p>
            </div>
          </div>
          <button className="text-gray-600 hover:text-gray-900">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <circle cx="5" cy="12" r="2" />
              <circle cx="12" cy="12" r="2" />
              <circle cx="19" cy="12" r="2" />
            </svg>
          </button>
        </div>
      </div>

      {/* Content Text */}
      <div className="p-4">
        <p className="text-sm text-black break-words mb-3">
          {content.length > 63206 ? content.substring(0, 63203) + '...' : content}
        </p>
      </div>

      {/* Carousel Display */}
      {displayImages.length > 0 ? (
        <div className="relative bg-gray-200">
          {/* Main image display (first or selected) */}
          <div className="w-full aspect-video flex items-center justify-center bg-gray-300 overflow-hidden relative">
            <img
              src={displayImages[currentIndex]?.url}
              alt={`Image ${currentIndex + 1}`}
              className="w-full h-full object-cover"
            />

            {/* Navigation Controls */}
            {displayImages.length > 1 && (
              <>
                <button
                  onClick={prev}
                  className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-1 rounded-full transition"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={next}
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-1 rounded-full transition"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </>
            )}

            {/* Image counter */}
            <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
              {currentIndex + 1}/{displayImages.length}
            </div>
          </div>

          {/* Thumbnail Strip */}
          {displayImages.length > 1 && (
            <div className="flex gap-1 p-2 bg-gray-100 overflow-x-auto">
              {displayImages.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentIndex(idx)}
                  className={`flex-shrink-0 w-12 h-12 rounded border-2 transition ${
                    idx === currentIndex ? 'border-blue-600' : 'border-gray-300'
                  }`}
                >
                  <img
                    src={img.url}
                    alt={`Thumbnail ${idx + 1}`}
                    className="w-full h-full object-cover rounded"
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="w-full aspect-video bg-gray-300 flex items-center justify-center">
          <p className="text-gray-600">No images</p>
        </div>
      )}

      {/* Engagement Stats */}
      <div className="px-4 py-2 text-xs text-gray-500 border-b border-gray-200">
        <div className="flex justify-between">
          <span>❤️ 234 👍 567 😮 89</span>
          <span>123 comments • 45 shares</span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-around py-2 border-t border-gray-200">
        <button className="flex items-center gap-1 text-gray-600 hover:bg-gray-100 flex-1 py-2 justify-center rounded hover:text-blue-600 transition">
          <Heart className="w-5 h-5" />
          <span className="text-sm">Like</span>
        </button>
        <button className="flex items-center gap-1 text-gray-600 hover:bg-gray-100 flex-1 py-2 justify-center rounded hover:text-blue-600 transition">
          <MessageCircle className="w-5 h-5" />
          <span className="text-sm">Comment</span>
        </button>
        <button className="flex items-center gap-1 text-gray-600 hover:bg-gray-100 flex-1 py-2 justify-center rounded hover:text-blue-600 transition">
          <Share2 className="w-5 h-5" />
          <span className="text-sm">Share</span>
        </button>
      </div>

      {/* Comment Section */}
      {mode !== 'published' && (
        <div className="p-3 border-t border-gray-200">
          <div className="flex gap-2">
            <Smile className="w-6 h-6 text-gray-600 cursor-pointer hover:text-blue-600" />
            <input
              type="text"
              placeholder="Write a comment..."
              className="flex-1 bg-gray-100 rounded-2xl px-4 py-2 text-sm outline-none hover:bg-gray-200 focus:bg-gray-200"
            />
          </div>
        </div>
      )}
    </div>
  )
}

export default FacebookCarouselTemplate
