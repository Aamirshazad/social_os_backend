/**
 * YouTube Video Template
 * Standard long-form video (16:9 aspect ratio, up to 128GB)
 */

import React from 'react'
import { Post, MediaAsset } from '@/types'
import { Heart, MessageCircle, Share2, MoreVertical, Eye } from 'lucide-react'

interface Props {
  post: Post
  content: string
  media: MediaAsset[]
  mode: 'preview' | 'edit' | 'published'
  className?: string
}

export function YouTubeVideoTemplate({ post, content, media, mode, className = '' }: Props) {
  const videoUrl = media.find((m) => m.type === 'video')?.url || post.generatedVideoUrl
  const imageUrl = media.find((m) => m.type === 'image')?.url || post.generatedImage

  // Extract YouTube content
  const youtubeContent =
    typeof post.content.youtube === 'object' ? post.content.youtube : {}
  const title = youtubeContent?.title || content.substring(0, 100)
  const description = youtubeContent?.description || content

  return (
    <div className={`bg-white border border-gray-300 rounded-lg shadow-lg w-full max-w-2xl mx-auto ${className}`}>
      {/* Video Player */}
      <div className="w-full bg-black flex items-center justify-center overflow-hidden" style={{ aspectRatio: '16/9' }}>
        {videoUrl ? (
          <video
            src={videoUrl}
            className="w-full h-full"
            controls
            poster={imageUrl}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-gray-800 to-black flex items-center justify-center relative">
            {imageUrl && <img src={imageUrl} alt="Thumbnail" className="w-full h-full object-cover" />}
            <div className="absolute inset-0 flex items-center justify-center bg-black/40">
              <div className="w-16 h-16 rounded-full border-4 border-white/50 flex items-center justify-center bg-red-600/80">
                <div className="w-0 h-0 border-l-8 border-l-white border-t-5 border-t-transparent border-b-5 border-b-transparent ml-1" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Video Info */}
      <div className="p-4 border-b border-gray-200">
        {/* Title */}
        <h2 className="font-bold text-lg text-black mb-2 line-clamp-2">{title}</h2>

        {/* Channel Info */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-red-500 to-red-600" />
            <div>
              <p className="font-semibold text-sm text-black">Your Channel</p>
              <p className="text-xs text-gray-500">1.2M subscribers</p>
            </div>
          </div>
          <button className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-full text-sm font-bold transition">
            Subscribe
          </button>
        </div>

        {/* Stats */}
        <div className="flex gap-4 text-sm text-gray-600">
          <span className="font-semibold">1.2M views</span>
          <span>•</span>
          <span>3 days ago</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 px-4 py-3 border-b border-gray-200">
        <button className="flex-1 flex items-center justify-center gap-2 text-gray-700 hover:bg-gray-100 py-2 rounded transition">
          <Heart className="w-5 h-5" />
          <span className="text-sm">234K</span>
        </button>
        <button className="flex-1 flex items-center justify-center gap-2 text-gray-700 hover:bg-gray-100 py-2 rounded transition">
          <MessageCircle className="w-5 h-5" />
          <span className="text-sm">Share</span>
        </button>
        <button className="flex-1 flex items-center justify-center gap-2 text-gray-700 hover:bg-gray-100 py-2 rounded transition">
          <Share2 className="w-5 h-5" />
          <span className="text-sm">Save</span>
        </button>
        <button className="flex items-center justify-center text-gray-700 hover:bg-gray-100 px-3 py-2 rounded transition">
          <MoreVertical className="w-5 h-5" />
        </button>
      </div>

      {/* Description */}
      <div className="px-4 py-3">
        <p className="text-sm text-gray-900 break-words line-clamp-3">
          {description.length > 5000 ? description.substring(0, 4997) + '...' : description}
        </p>
        {description.length > 300 && <button className="text-blue-600 hover:text-blue-700 text-sm font-semibold mt-2">Show more</button>}
      </div>

      {/* Comments Preview */}
      {mode !== 'published' && (
        <div className="px-4 py-3 border-t border-gray-200">
          <p className="text-sm font-bold text-black mb-3">Comments</p>
          <div className="flex gap-2">
            <div className="w-8 h-8 rounded-full bg-gray-300" />
            <input
              type="text"
              placeholder="Add a comment..."
              className="flex-1 bg-gray-100 rounded px-3 py-2 text-sm outline-none hover:bg-gray-200 focus:bg-gray-200"
            />
          </div>
        </div>
      )}
    </div>
  )
}

export default YouTubeVideoTemplate
