/**
 * LinkedIn Post Template
 * Professional post with media support (3000 char limit)
 */

import React from 'react'
import { Post, MediaAsset } from '@/types'
import { Heart, MessageCircle, Repeat2, Share, MoreHorizontal } from 'lucide-react'

interface Props {
  post: Post
  content: string
  media: MediaAsset[]
  mode: 'preview' | 'edit' | 'published'
  className?: string
}

export function LinkedInPostTemplate({ post, content, media, mode, className = '' }: Props) {
  const imageUrl = media.find((m) => m.type === 'image')?.url || post.generatedImage
  const videoUrl = media.find((m) => m.type === 'video')?.url || post.generatedVideoUrl

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
        {content.length > 3000 && <p className="text-red-500 text-xs mt-2">Exceeds 3000 character limit</p>}
      </div>

      {/* Media */}
      {(imageUrl || videoUrl) && (
        <div className="w-full bg-gray-200 flex items-center justify-center overflow-hidden mx-0">
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

export default LinkedInPostTemplate
