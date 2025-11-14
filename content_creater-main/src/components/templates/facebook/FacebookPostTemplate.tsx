/**
 * Facebook Post Template
 * Standard text + image/video post
 * Authentic Facebook 2024 design with loading states
 */

import React, { useState } from 'react'
import { Post, MediaAsset } from '@/types'
import { ThumbsUp, MessageCircle, Share2, Globe } from 'lucide-react'
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton'

interface Props {
  post: Post
  content: string
  media: MediaAsset[]
  mode: 'preview' | 'edit' | 'published'
  className?: string
}

export function FacebookPostTemplate({ post, content, media, mode, className = '' }: Props) {
  const [mediaLoading, setMediaLoading] = useState(true)
  const imageUrl = media.find((m) => m.type === 'image')?.url || post.generatedImage
  const videoUrl = media.find((m) => m.type === 'video')?.url || post.generatedVideoUrl

  return (
    <div className={`bg-white rounded-lg shadow-md w-full max-w-2xl mx-auto ${className}`}>
      {/* Facebook Header */}
      <div className="p-3">
        <div className="flex justify-between items-start">
          <div className="flex gap-2.5">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex-shrink-0" />
            <div>
              <div className="flex items-center gap-1">
                <p className="font-semibold text-sm text-gray-900">Your Account</p>
              </div>
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <span>3h</span>
                <span>•</span>
                <Globe className="w-3 h-3" />
              </div>
            </div>
          </div>
          <button className="text-gray-500 hover:bg-gray-100 p-1.5 rounded-full transition">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <circle cx="12" cy="6" r="1.5" />
              <circle cx="12" cy="12" r="1.5" />
              <circle cx="12" cy="18" r="1.5" />
            </svg>
          </button>
        </div>
      </div>

      {/* Content Text */}
      <div className="px-3 pb-3">
        <p className="text-sm text-gray-900 break-words whitespace-pre-wrap">
          {content.length > 63206 ? content.substring(0, 63203) + '...' : content}
        </p>
      </div>

      {/* Image/Video */}
      {(imageUrl || videoUrl) && (
        <div className="w-full bg-black relative">
          {mediaLoading && <LoadingSkeleton type="image" className="absolute inset-0" />}
          {videoUrl ? (
            <video
              src={videoUrl}
              className={`w-full h-auto transition-opacity duration-300 ${mediaLoading ? 'opacity-0' : 'opacity-100'}`}
              controls
              poster={imageUrl}
              onLoadedData={() => setMediaLoading(false)}
            />
          ) : (
            <img
              src={imageUrl}
              alt="Post content"
              className={`w-full h-auto object-cover transition-opacity duration-300 ${mediaLoading ? 'opacity-0' : 'opacity-100'}`}
              onLoad={() => setMediaLoading(false)}
            />
          )}
        </div>
      )}

      {/* Engagement Stats */}
      <div className="px-3 py-2.5 text-xs text-gray-500 flex justify-between items-center">
        <div className="flex items-center gap-1">
          <div className="flex -space-x-1">
            <div className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center border border-white">
              <ThumbsUp className="w-2.5 h-2.5 text-white" fill="white" />
            </div>
            <div className="w-4 h-4 rounded-full bg-red-500 flex items-center justify-center border border-white text-xs">❤️</div>
          </div>
          <span>234</span>
        </div>
        <div className="flex gap-2">
          <span>45 comments</span>
          <span>•</span>
          <span>12 shares</span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex border-y border-gray-200">
        <button className="flex items-center justify-center gap-1.5 text-gray-600 hover:bg-gray-50 flex-1 py-2 transition font-semibold text-sm">
          <ThumbsUp className="w-5 h-5" />
          <span>Like</span>
        </button>
        <button className="flex items-center justify-center gap-1.5 text-gray-600 hover:bg-gray-50 flex-1 py-2 transition font-semibold text-sm border-x border-gray-200">
          <MessageCircle className="w-5 h-5" />
          <span>Comment</span>
        </button>
        <button className="flex items-center justify-center gap-1.5 text-gray-600 hover:bg-gray-50 flex-1 py-2 transition font-semibold text-sm">
          <Share2 className="w-5 h-5" />
          <span>Share</span>
        </button>
      </div>

      {/* Comment Section */}
      {mode !== 'published' && (
        <div className="p-3">
          <div className="flex gap-2 items-center">
            <div className="w-8 h-8 rounded-full bg-gray-300 flex-shrink-0" />
            <input
              type="text"
              placeholder="Write a comment..."
              className="flex-1 bg-gray-100 rounded-full px-4 py-2 text-sm outline-none focus:bg-gray-200 transition"
            />
          </div>
        </div>
      )}
    </div>
  )
}

export default FacebookPostTemplate
