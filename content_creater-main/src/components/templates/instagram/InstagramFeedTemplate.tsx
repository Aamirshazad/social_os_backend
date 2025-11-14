/**
 * Instagram Feed Template
 * Single image post or carousel (1:1 ratio, 480x480px max)
 * Displays like the actual Instagram feed post with carousel support
 */

import React, { useState } from 'react'
import { Post, MediaAsset } from '@/types'
import { Heart, MessageCircle, Send, Bookmark, ChevronLeft, ChevronRight } from 'lucide-react'
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton'

interface Props {
  post: Post
  content: string
  media: MediaAsset[]
  mode: 'preview' | 'edit' | 'published'
  className?: string
}

export function InstagramFeedTemplate({ post, content, media, mode, className = '' }: Props) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [imageLoading, setImageLoading] = useState(true)
  
  // Get all images
  const images = media.filter((m) => m.type === 'image')
  if (post.generatedImage && !images.find(img => img.url === post.generatedImage)) {
    images.push({
      id: 'generated',
      name: 'Generated Image',
      type: 'image',
      url: post.generatedImage,
      size: 0,
      tags: [],
      createdAt: new Date().toISOString(),
      source: 'ai-generated',
      usedInPosts: [post.id]
    })
  }

  const hasMultipleImages = images.length > 1
  const currentImage = images[currentImageIndex]

  const nextImage = () => {
    setImageLoading(true)
    setCurrentImageIndex((prev) => (prev + 1) % images.length)
  }

  const prevImage = () => {
    setImageLoading(true)
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length)
  }

  return (
    <div className={`bg-white rounded-lg shadow-lg overflow-hidden max-w-xl mx-auto ${className}`}>
      {/* Instagram Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600 rounded-full p-0.5">
            <div className="w-full h-full bg-white rounded-full" />
          </div>
          <div>
            <p className="font-semibold text-sm">your_account</p>
            {mode === 'published' && <p className="text-xs text-gray-500">Sponsored</p>}
          </div>
        </div>
        <button className="text-gray-900 hover:text-gray-600">
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
            <circle cx="12" cy="6" r="1.5" />
            <circle cx="12" cy="12" r="1.5" />
            <circle cx="12" cy="18" r="1.5" />
          </svg>
        </button>
      </div>

      {/* Image Carousel */}
      <div className="w-full aspect-square bg-black relative overflow-hidden">
        {imageLoading && <LoadingSkeleton type="image" className="absolute inset-0" />}
        {currentImage ? (
          <>
            <img
              src={currentImage.url}
              alt="Post content"
              className={`w-full h-full object-contain transition-opacity duration-300 ${imageLoading ? 'opacity-0' : 'opacity-100'}`}
              onLoad={() => setImageLoading(false)}
            />
            
            {/* Carousel Navigation */}
            {hasMultipleImages && (
              <>
                <button
                  onClick={prevImage}
                  className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-1 transition-all"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button
                  onClick={nextImage}
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-1 transition-all"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
                
                {/* Carousel Dots */}
                <div className="absolute top-2 left-1/2 -translate-x-1/2 flex gap-1">
                  {images.map((_, idx) => (
                    <div
                      key={idx}
                      className={`w-1.5 h-1.5 rounded-full transition-all ${
                        idx === currentImageIndex ? 'bg-blue-500 w-2 h-2' : 'bg-white/60'
                      }`}
                    />
                  ))}
                </div>
              </>
            )}
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
            <p className="text-gray-400">No image</p>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="px-3 pt-2 pb-1">
        <div className="flex justify-between items-center mb-2">
          <div className="flex gap-4">
            <button className="hover:opacity-60 transition">
              <Heart className="w-7 h-7" strokeWidth={1.5} />
            </button>
            <button className="hover:opacity-60 transition">
              <MessageCircle className="w-7 h-7" strokeWidth={1.5} />
            </button>
            <button className="hover:opacity-60 transition">
              <Send className="w-7 h-7" strokeWidth={1.5} />
            </button>
          </div>
          <button className="hover:opacity-60 transition">
            <Bookmark className="w-6 h-6" strokeWidth={1.5} />
          </button>
        </div>

        {/* Likes count */}
        <p className="text-sm font-semibold mb-1">1,234 likes</p>
      </div>

      {/* Caption */}
      <div className="px-3 pb-2">
        <div className="text-sm">
          <span className="font-semibold">your_account </span>
          <span className="text-gray-800 break-words">
            {content.length > 2200 ? content.substring(0, 2197) + '...' : content}
          </span>
        </div>

        {/* Comments count */}
        <button className="text-xs text-gray-500 mt-2 hover:text-gray-700">
          View all 45 comments
        </button>

        {/* Timestamp */}
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

export default InstagramFeedTemplate
