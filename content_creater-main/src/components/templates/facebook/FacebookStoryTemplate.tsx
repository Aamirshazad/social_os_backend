/**
 * Facebook Story Template
 * 24-hour story format
 */

import React from 'react'
import { Post, MediaAsset } from '@/types'
import { Heart, Send, MessageCircle, X } from 'lucide-react'

interface Props {
  post: Post
  content: string
  media: MediaAsset[]
  mode: 'preview' | 'edit' | 'published'
  className?: string
}

export function FacebookStoryTemplate({ post, content, media, mode, className = '' }: Props) {
  const mediaUrl = media.find((m) => m.type === 'image' || m.type === 'video')?.url || post.generatedImage

  return (
    <div className={`bg-black rounded-lg shadow-lg overflow-hidden flex flex-col justify-between mx-auto ${className}`} style={{ aspectRatio: '9/16', maxHeight: '700px', maxWidth: '400px' }}>
      {/* Story Container */}
      <div className="relative w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-900 to-black">
        {mediaUrl ? (
          <img
            src={mediaUrl}
            alt="Story content"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
            <p className="text-white">No content</p>
          </div>
        )}

        {/* Progress Bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gray-700">
          <div className="h-full bg-white" style={{ width: '40%' }} />
        </div>

        {/* Close Button */}
        <button className="absolute top-4 right-4 text-white hover:opacity-80 transition z-10">
          <X className="w-6 h-6" />
        </button>

        {/* Header - Page Info */}
        <div className="absolute top-4 left-4 flex items-center gap-2 z-10">
          <div className="w-8 h-8 rounded-full bg-blue-600 border-2 border-white" />
          <div>
            <p className="text-white text-sm font-semibold">Your Page</p>
            <p className="text-gray-300 text-xs">2h</p>
          </div>
        </div>

        {/* Caption Text Overlay */}
        {content && (
          <div className="absolute bottom-24 left-4 right-4 bg-black/60 backdrop-blur-sm rounded-lg p-3 z-10">
            <p className="text-white text-sm break-words">
              {content.length > 100 ? content.substring(0, 97) + '...' : content}
            </p>
          </div>
        )}

        {/* Reaction Stickers (Right Side) */}
        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-2 z-10">
          <button className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition text-lg">
            👍
          </button>
          <button className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition text-lg">
            ❤️
          </button>
          <button className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition text-lg">
            😂
          </button>
          <button className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition text-lg">
            😮
          </button>
        </div>

        {/* Bottom Interactive Section */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-4 z-10">
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              placeholder="Reply..."
              className="flex-1 bg-white/20 text-white placeholder-white/60 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-white/50"
            />
            <button className="text-white hover:opacity-80 transition">
              <Send className="w-5 h-5" />
            </button>
          </div>

          <div className="flex gap-2">
            <button className="flex-1 bg-white/20 hover:bg-white/30 text-white rounded-full py-2 text-sm transition flex items-center justify-center gap-1">
              <Heart className="w-4 h-4" />
              Like
            </button>
            <button className="flex-1 bg-white/20 hover:bg-white/30 text-white rounded-full py-2 text-sm transition flex items-center justify-center gap-1">
              <MessageCircle className="w-4 h-4" />
              Reply
            </button>
          </div>
        </div>

        {/* Story Duration Indicator */}
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 pointer-events-none">
          <div className="px-4 py-2 bg-black/70 rounded-full text-white text-xs font-semibold">
            Story expires in 24h
          </div>
        </div>
      </div>
    </div>
  )
}

export default FacebookStoryTemplate
