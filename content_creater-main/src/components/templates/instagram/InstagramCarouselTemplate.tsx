/**
 * Instagram Carousel Template
 * Multi-image post (2-10 images, 1:1 ratio each)
 */

import React, { useState } from 'react'
import { Post, MediaAsset } from '@/types'
import { Heart, MessageCircle, Send, Bookmark, ChevronLeft, ChevronRight } from 'lucide-react'

interface Props {
  post: Post
  content: string
  media: MediaAsset[]
  mode: 'preview' | 'edit' | 'published'
  className?: string
}

export function InstagramCarouselTemplate({ post, content, media, mode, className = '' }: Props) {
  const [currentSlide, setCurrentSlide] = useState(0)
  const images = media.filter((m) => m.type === 'image')
  const displayImages = images.length > 0 ? images : post.generatedImage ? [{ url: post.generatedImage }] : []

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % displayImages.length)
  }

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + displayImages.length) % displayImages.length)
  }

  return (
    <div className={`bg-white rounded-lg shadow-lg overflow-hidden max-w-xl mx-auto ${className}`}>
      {/* Instagram Header */}
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-r from-yellow-400 to-pink-600 rounded-full" />
          <div>
            <p className="font-semibold text-sm">Your Account</p>
            <p className="text-xs text-gray-500">Location</p>
          </div>
        </div>
        <button className="text-gray-600 hover:text-gray-900">
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
            <circle cx="12" cy="5" r="2" />
            <circle cx="12" cy="12" r="2" />
            <circle cx="12" cy="19" r="2" />
          </svg>
        </button>
      </div>

      {/* Carousel Container */}
      <div className="relative w-full aspect-square bg-gray-200">
        {displayImages.length > 0 ? (
          <>
            <img
              src={displayImages[currentSlide]?.url}
              alt={`Slide ${currentSlide + 1}`}
              className="w-full h-full object-cover"
            />

            {/* Navigation Arrows */}
            {displayImages.length > 1 && (
              <>
                <button
                  onClick={prevSlide}
                  className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white p-2 rounded-full transition"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={nextSlide}
                  className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white p-2 rounded-full transition"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </>
            )}

            {/* Slide Counter */}
            <div className="absolute top-3 right-3 bg-black/70 text-white px-2 py-1 rounded text-xs font-semibold">
              {currentSlide + 1} / {displayImages.length}
            </div>

            {/* Carousel Dots */}
            {displayImages.length > 1 && (
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1">
                {displayImages.map((_, idx) => (
                  <div
                    key={idx}
                    className={`h-1.5 rounded-full transition ${
                      idx === currentSlide ? 'bg-white w-6' : 'bg-white/50 w-1.5'
                    }`}
                  />
                ))}
              </div>
            )}

            {/* Carousel badge */}
            <div className="absolute top-3 left-3 bg-blue-500 text-white px-2 py-1 rounded text-xs font-bold">
              CAROUSEL
            </div>
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-300 to-gray-400">
            <p className="text-gray-600">No images</p>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="px-4 pt-3 pb-2">
        <div className="flex justify-between items-center mb-3">
          <div className="flex gap-4">
            <button className="text-gray-700 hover:text-red-600 transition">
              <Heart className="w-6 h-6" />
            </button>
            <button className="text-gray-700 hover:text-gray-900 transition">
              <MessageCircle className="w-6 h-6" />
            </button>
            <button className="text-gray-700 hover:text-gray-900 transition">
              <Send className="w-6 h-6" />
            </button>
          </div>
          <button className="text-gray-700 hover:text-gray-900 transition">
            <Bookmark className="w-6 h-6" />
          </button>
        </div>

        <p className="text-sm font-semibold">1,234 likes</p>
      </div>

      {/* Caption */}
      <div className="px-4 pb-3">
        <div className="text-sm">
          <span className="font-semibold">Your Account </span>
          <span className="text-gray-800 break-words">
            {content.length > 2200 ? content.substring(0, 2197) + '...' : content}
          </span>
        </div>

        <button className="text-xs text-gray-500 mt-2 hover:text-gray-700">
          View all 45 comments
        </button>

        <p className="text-xs text-gray-500 mt-2">2 HOURS AGO</p>
      </div>

      {/* Add comment */}
      {mode !== 'published' && (
        <div className="border-t px-4 py-3 flex gap-2">
          <input
            type="text"
            placeholder="Add a comment..."
            className="flex-1 text-sm bg-transparent placeholder-gray-500 outline-none"
          />
          <button className="text-blue-500 font-semibold text-sm hover:text-blue-600">Post</button>
        </div>
      )}
    </div>
  )
}

export default InstagramCarouselTemplate
