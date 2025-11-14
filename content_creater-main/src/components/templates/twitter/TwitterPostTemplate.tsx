/**
 * Twitter/X Post Template
 * 280 character limit, supports images, videos, and quoted tweets
 */

import React from 'react'
import { Post, MediaAsset } from '@/types'
import { Heart, MessageCircle, Repeat2, Share } from 'lucide-react'

interface Props {
  post: Post
  content: string
  media: MediaAsset[]
  mode: 'preview' | 'edit' | 'published'
  className?: string
}

export function TwitterPostTemplate({ post, content, media, mode, className = '' }: Props) {
  const imageUrl = media.find((m) => m.type === 'image')?.url || post.generatedImage
  const videoUrl = media.find((m) => m.type === 'video')?.url || post.generatedVideoUrl

  // Character count
  const charCount = content.length
  const maxChars = 280

  return (
    <div className={`bg-white border border-gray-200 rounded-2xl shadow-lg p-4 w-full max-w-2xl mx-auto ${className}`}>
      {/* Header */}
      <div className="flex justify-between items-start mb-3">
        <div className="flex gap-3 flex-1">
          <div className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-400 to-blue-600" />
          <div className="flex-1">
            <div className="flex items-center gap-1">
              <p className="font-bold text-black">Your Account</p>
              <span className="text-gray-500">@youraccount</span>
            </div>
            <p className="text-gray-500 text-sm">now</p>
          </div>
        </div>
        <button className="text-gray-500 hover:text-blue-400 transition">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <circle cx="5" cy="12" r="2" />
            <circle cx="12" cy="12" r="2" />
            <circle cx="19" cy="12" r="2" />
          </svg>
        </button>
      </div>

      {/* Content */}
      <div className="mb-3">
        <p className="text-black text-base break-words">
          {charCount > maxChars ? content.substring(0, maxChars - 3) + '...' : content}
        </p>
        {charCount > maxChars && <p className="text-red-500 text-xs mt-1">({charCount} characters - exceeds 280 limit)</p>}
      </div>

      {/* Media */}
      {(imageUrl || videoUrl) && (
        <div className="mb-3 rounded-2xl overflow-hidden bg-gray-200 flex items-center justify-center">
          {videoUrl ? (
            <video
              src={videoUrl}
              className="w-full h-auto"
              controls
              poster={imageUrl}
            />
          ) : (
            <img
              src={imageUrl}
              alt="Post media"
              className="w-full h-auto object-cover max-h-96"
            />
          )}
        </div>
      )}

      {/* Character Counter */}
      {mode !== 'published' && (
        <div className="mb-3 text-xs text-gray-500">
          {charCount}/{maxChars} characters {charCount > maxChars && '❌'}
        </div>
      )}

      {/* Engagement Stats */}
      <div className="mb-3 text-xs text-gray-500 flex gap-4 pb-3 border-b border-gray-200">
        <span>234 Replies</span>
        <span>567 Retweets</span>
        <span>1.2K Likes</span>
      </div>

      {/* Actions */}
      <div className="flex justify-between text-gray-500 text-sm">
        <button className="flex items-center gap-2 group hover:text-blue-400 transition">
          <MessageCircle className="w-4 h-4 group-hover:bg-blue-100 group-hover:bg-opacity-30 rounded-full p-2 w-8 h-8" />
          <span className="text-xs group-hover:text-blue-400">Reply</span>
        </button>
        <button className="flex items-center gap-2 group hover:text-green-400 transition">
          <Repeat2 className="w-4 h-4 group-hover:bg-green-100 group-hover:bg-opacity-30 rounded-full p-2 w-8 h-8" />
          <span className="text-xs group-hover:text-green-400">Retweet</span>
        </button>
        <button className="flex items-center gap-2 group hover:text-red-400 transition">
          <Heart className="w-4 h-4 group-hover:bg-red-100 group-hover:bg-opacity-30 rounded-full p-2 w-8 h-8" />
          <span className="text-xs group-hover:text-red-400">Like</span>
        </button>
        <button className="flex items-center gap-2 group hover:text-blue-400 transition">
          <Share className="w-4 h-4 group-hover:bg-blue-100 group-hover:bg-opacity-30 rounded-full p-2 w-8 h-8" />
          <span className="text-xs group-hover:text-blue-400">Share</span>
        </button>
      </div>
    </div>
  )
}

export default TwitterPostTemplate
