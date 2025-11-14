/**
 * TikTok Slideshow Template
 * Photo montage with automatic slideshow
 */

import React, { useState } from 'react'
import { Post, MediaAsset } from '@/types'
import { Heart, MessageCircle, Share2, Music, User, ChevronLeft, ChevronRight } from 'lucide-react'

interface Props {
  post: Post
  content: string
  media: MediaAsset[]
  mode: 'preview' | 'edit' | 'published'
  className?: string
}

export function TikTokSlideshowTemplate({ post, content, media, mode, className = '' }: Props) {
  const [currentSlide, setCurrentSlide] = useState(0)
  const images = media.filter((m) => m.type === 'image')
  const displayImages = images.length > 0 ? images : post.generatedImage ? [{ url: post.generatedImage }] : []

  const next = () => {
    setCurrentSlide((prev) => (prev + 1) % displayImages.length)
  }

  const prev = () => {
    setCurrentSlide((prev) => (prev - 1 + displayImages.length) % displayImages.length)
  }

  return (
    <div className={`bg-black rounded-lg shadow-lg overflow-hidden flex flex-col justify-between mx-auto ${className}`} style={{ aspectRatio: '9/16', maxHeight: '700px', maxWidth: '400px' }}>
      {/* Slideshow Container */}
      <div className="relative w-full h-full flex items-center justify-center bg-black">
        {displayImages.length > 0 ? (
          <>
            <img
              src={displayImages[currentSlide]?.url}
              alt={`Slide ${currentSlide + 1}`}
              className="w-full h-full object-cover"
            />

            {/* Ken Burns Effect Hint */}
            <div className="absolute inset-0 bg-gradient-to-tr from-black/20 via-transparent to-transparent pointer-events-none" />

            {/* Navigation Arrows */}
            {displayImages.length > 1 && (
              <>
                <button
                  onClick={prev}
                  className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/30 hover:bg-white/50 text-white p-1 rounded-full transition z-10"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={next}
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/30 hover:bg-white/50 text-white p-1 rounded-full transition z-10"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </>
            )}

            {/* Slide Counter */}
            <div className="absolute top-4 left-4 bg-black/70 text-white text-xs px-2 py-1 rounded z-10">
              {currentSlide + 1} / {displayImages.length}
            </div>

            {/* Duration Indicator */}
            <div className="absolute top-4 right-4 bg-black/70 text-white text-xs px-2 py-1 rounded z-10">
              {displayImages.length * 3}s
            </div>

            {/* Slideshow Dots */}
            {displayImages.length > 1 && (
              <div className="absolute bottom-24 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
                {displayImages.map((_, idx) => (
                  <div
                    key={idx}
                    className={`h-2 rounded-full transition ${
                      idx === currentSlide ? 'bg-white w-4' : 'bg-white/50 w-2'
                    }`}
                  />
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="w-full h-full bg-gradient-to-b from-gray-800 to-black flex items-center justify-center">
            <p className="text-gray-400">No images</p>
          </div>
        )}

        {/* Profile Section (Bottom Left) */}
        <div className="absolute bottom-16 left-4 z-10">
          <div className="w-10 h-10 rounded-full bg-gradient-to-r from-pink-500 to-purple-600 border-2 border-white flex items-center justify-center">
            <User className="w-5 h-5 text-white" />
          </div>
        </div>

        {/* Right Action Bar */}
        <div className="absolute right-4 bottom-20 flex flex-col gap-6 z-10">
          {/* Heart */}
          <button className="flex flex-col items-center text-white hover:opacity-80 transition">
            <Heart className="w-7 h-7 mb-1" fill="white" />
            <span className="text-xs font-semibold">1.2K</span>
          </button>

          {/* Comment */}
          <button className="flex flex-col items-center text-white hover:opacity-80 transition">
            <MessageCircle className="w-7 h-7 mb-1" />
            <span className="text-xs font-semibold">234</span>
          </button>

          {/* Share */}
          <button className="flex flex-col items-center text-white hover:opacity-80 transition">
            <Share2 className="w-7 h-7 mb-1" />
            <span className="text-xs font-semibold">456</span>
          </button>

          {/* Music Note */}
          <button className="flex flex-col items-center text-white hover:opacity-80 transition animate-bounce">
            <Music className="w-7 h-7 mb-1" />
            <span className="text-xs font-semibold">Sound</span>
          </button>
        </div>

        {/* Caption (Bottom) */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-4 z-10">
          <p className="text-white text-sm font-medium break-words mb-2">
            {content.length > 150 ? content.substring(0, 147) + '...' : content}
          </p>

          {/* Hashtags and Music Info */}
          <div className="flex items-center gap-2 text-white/80 text-xs">
            <Music className="w-3 h-3" />
            <span>Slideshow - Your Account</span>
          </div>
        </div>

        {/* Slideshow Badge */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-50">
          <div className="text-white text-center">
            <p className="text-xs">📸 Photo Slideshow</p>
            <p className="text-xs">Auto-play effect</p>
          </div>
        </div>
      </div>

      {/* Bottom Info Bar */}
      {mode !== 'published' && (
        <div className="bg-black px-4 py-3 text-white text-xs flex items-center justify-between border-t border-gray-700">
          <span>{displayImages.length} photos • {displayImages.length * 3}s total</span>
          <span className="text-gray-400">Ready to post</span>
        </div>
      )}
    </div>
  )
}

export default TikTokSlideshowTemplate
