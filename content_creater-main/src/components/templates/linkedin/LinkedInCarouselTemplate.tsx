/**
 * LinkedIn Carousel Template
 * Document carousel or multi-image carousel
 */

import React, { useState } from 'react'
import { Post, MediaAsset } from '@/types'
import { Heart, MessageCircle, Repeat2, Share, MoreHorizontal, ChevronLeft, ChevronRight } from 'lucide-react'

interface Props {
  post: Post
  content: string
  media: MediaAsset[]
  mode: 'preview' | 'edit' | 'published'
  className?: string
}

export function LinkedInCarouselTemplate({ post, content, media, mode, className = '' }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const images = media.filter((m) => m.type === 'image')
  const displayImages = images.length > 0 ? images : post.generatedImage ? [{ url: post.generatedImage }] : []

  const next = () => {
    setCurrentIndex((prev) => (prev + 1) % displayImages.length)
  }

  const prev = () => {
    setCurrentIndex((prev) => (prev - 1 + displayImages.length) % displayImages.length)
  }

  return (
    <div className={`bg-white border border-gray-300 rounded-lg shadow-lg w-full max-w-2xl mx-auto ${className}`}>
      {/* LinkedIn Header */}
      <div className="p-3 flex justify-between items-start border-b border-gray-200">
        <div className="flex gap-3">
          <img
            src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 48 48'%3E%3Crect fill='%230A66C2' width='48' height='48'/%3E%3C/svg%3E"
            alt="Avatar"
            className="w-12 h-12 rounded-full"
          />
          <div>
            <p className="font-bold text-sm text-black">Your Name</p>
            <p className="text-xs text-gray-500">Your Title • 1st</p>
            <p className="text-xs text-gray-500">2 hours ago • 🌍</p>
          </div>
        </div>
        <button className="text-gray-600 hover:text-gray-900">
          <MoreHorizontal className="w-5 h-5" />
        </button>
      </div>

      {/* Content */}
      <div className="px-4 py-3">
        <p className="text-sm text-gray-900 break-words">
          {content.length > 3000 ? content.substring(0, 2997) + '...' : content}
        </p>
      </div>

      {/* Carousel Container */}
      {displayImages.length > 0 ? (
        <div className="relative bg-gray-200 border-t border-b border-gray-200">
          {/* Main Image */}
          <div className="w-full aspect-video flex items-center justify-center bg-gray-300 relative overflow-hidden">
            <img
              src={displayImages[currentIndex]?.url}
              alt={`Document page ${currentIndex + 1}`}
              className="w-full h-full object-cover"
            />

            {/* Navigation */}
            {displayImages.length > 1 && (
              <>
                <button
                  onClick={prev}
                  className="absolute left-3 top-1/2 -translate-y-1/2 bg-blue-600 hover:bg-blue-700 text-white p-1 rounded-full transition"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={next}
                  className="absolute right-3 top-1/2 -translate-y-1/2 bg-blue-600 hover:bg-blue-700 text-white p-1 rounded-full transition"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </>
            )}

            {/* Page Counter */}
            <div className="absolute top-3 right-3 bg-black/70 text-white text-xs px-2 py-1 rounded">
              {currentIndex + 1} / {displayImages.length}
            </div>

            {/* Carousel Badge */}
            <div className="absolute top-3 left-3 bg-blue-600 text-white px-3 py-1 rounded-full text-xs font-bold">
              📄 Carousel
            </div>
          </div>

          {/* Thumbnail Strip */}
          {displayImages.length > 1 && (
            <div className="flex gap-2 p-3 bg-gray-100 overflow-x-auto">
              {displayImages.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentIndex(idx)}
                  className={`flex-shrink-0 w-16 h-16 rounded border-2 transition ${
                    idx === currentIndex ? 'border-blue-600 ring-2 ring-blue-400' : 'border-gray-300'
                  }`}
                >
                  <img
                    src={img.url}
                    alt={`Thumbnail ${idx + 1}`}
                    className="w-full h-full object-cover rounded"
                  />
                  <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white bg-black/50 rounded">
                    {idx + 1}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="w-full aspect-video bg-gray-300 flex items-center justify-center border-t border-b border-gray-200">
          <p className="text-gray-600">No images</p>
        </div>
      )}

      {/* Reaction Summary */}
      <div className="px-4 py-2 text-xs text-gray-500 border-t border-gray-200 border-b">
        <div className="flex justify-between">
          <span>
            <span className="text-blue-600">👍</span> <span className="text-blue-600">❤️</span>{' '}
            <span className="text-blue-600">🎉</span> 234 likes
          </span>
          <span>45 comments • 12 reposts</span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-around py-2">
        <button className="flex items-center gap-2 text-gray-600 hover:text-blue-600 flex-1 py-2 justify-center hover:bg-gray-100 rounded transition">
          <Heart className="w-5 h-5" />
          <span className="text-sm">Like</span>
        </button>
        <button className="flex items-center gap-2 text-gray-600 hover:text-blue-600 flex-1 py-2 justify-center hover:bg-gray-100 rounded transition">
          <MessageCircle className="w-5 h-5" />
          <span className="text-sm">Comment</span>
        </button>
        <button className="flex items-center gap-2 text-gray-600 hover:text-blue-600 flex-1 py-2 justify-center hover:bg-gray-100 rounded transition">
          <Repeat2 className="w-5 h-5" />
          <span className="text-sm">Repost</span>
        </button>
        <button className="flex items-center gap-2 text-gray-600 hover:text-blue-600 flex-1 py-2 justify-center hover:bg-gray-100 rounded transition">
          <Share className="w-5 h-5" />
          <span className="text-sm">Send</span>
        </button>
      </div>

      {/* Comment Section */}
      {mode !== 'published' && (
        <div className="p-3 border-t border-gray-200 flex gap-2">
          <div className="w-8 h-8 rounded-full bg-gray-300" />
          <input
            type="text"
            placeholder="Add a comment..."
            className="flex-1 bg-gray-100 rounded-2xl px-4 py-2 text-sm outline-none hover:bg-gray-200 focus:bg-gray-200"
          />
        </div>
      )}
    </div>
  )
}

export default LinkedInCarouselTemplate
