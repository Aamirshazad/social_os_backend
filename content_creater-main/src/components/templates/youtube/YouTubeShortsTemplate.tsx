/**
 * YouTube Shorts Template
 * Vertical short video (9:16 aspect ratio, up to 60 seconds)
 */

import React from 'react'
import { Post, MediaAsset } from '@/types'
import { Heart, MessageCircle, Share2, MoreVertical, Volume2 } from 'lucide-react'

interface Props {
  post: Post
  content: string
  media: MediaAsset[]
  mode: 'preview' | 'edit' | 'published'
  className?: string
}

export function YouTubeShortsTemplate({ post, content, media, mode, className = '' }: Props) {
  const videoUrl = media.find((m) => m.type === 'video')?.url || post.generatedVideoUrl
  const imageUrl = media.find((m) => m.type === 'image')?.url || post.generatedImage

  return (
    <div className={`bg-black rounded-lg shadow-lg overflow-hidden flex flex-col justify-between mx-auto ${className}`} style={{ aspectRatio: '9/16', maxHeight: '700px', maxWidth: '400px' }}>
      {/* Video Player */}
      <div className="relative w-full h-full flex items-center justify-center bg-black">
        {videoUrl ? (
          <>
            <video
              src={videoUrl}
              className="w-full h-full object-cover"
              controls
              poster={imageUrl}
            />
          </>
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

        {/* Shorts Badge */}
        <div className="absolute top-4 left-4 bg-red-600 text-white px-3 py-1 rounded-full text-xs font-bold z-10">
          Shorts
        </div>

        {/* Duration Badge */}
        <div className="absolute top-4 right-4 bg-black/70 text-white px-2 py-1 rounded text-xs z-10">
          0:45
        </div>

        {/* Right Sidebar Actions */}
        <div className="absolute right-4 bottom-20 flex flex-col gap-4 z-10">
          {/* Like */}
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

          {/* More Options */}
          <button className="flex flex-col items-center text-white hover:opacity-80 transition">
            <MoreVertical className="w-7 h-7" />
          </button>
        </div>

        {/* Bottom Information */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-4 z-10">
          {/* Channel Info */}
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-full bg-red-600" />
            <div>
              <p className="text-white text-sm font-semibold">Your Channel</p>
              <p className="text-gray-300 text-xs">1.2M subscribers</p>
            </div>
            <button className="ml-auto bg-red-600 hover:bg-red-700 text-white px-4 py-1 rounded-full text-xs font-bold transition">
              Subscribe
            </button>
          </div>

          {/* Title */}
          <p className="text-white text-sm font-medium break-words line-clamp-2 mb-2">
            {content.length > 100 ? content.substring(0, 97) + '...' : content}
          </p>

          {/* Metadata */}
          <div className="flex items-center gap-2 text-white/80 text-xs">
            <span>📺 Shorts</span>
            <span>•</span>
            <span>45s</span>
          </div>
        </div>

        {/* Mute Button (Bottom Left) */}
        <button className="absolute bottom-4 left-4 bg-black/70 hover:bg-black/90 text-white p-2 rounded-full transition z-10">
          <Volume2 className="w-5 h-5" />
        </button>
      </div>

      {/* Bottom Control Bar (if in preview mode) */}
      {mode !== 'published' && (
        <div className="bg-black/90 px-4 py-3 text-white text-xs flex items-center justify-between border-t border-gray-700">
          <span>45 seconds</span>
          <span className="text-gray-400">Ready for upload</span>
        </div>
      )}
    </div>
  )
}

export default YouTubeShortsTemplate
