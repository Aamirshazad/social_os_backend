/**
 * Facebook Reel Template
 * Vertical short video format
 */

import React from 'react'
import { Post, MediaAsset } from '@/types'
import { Heart, MessageCircle, Share2, MoreVertical } from 'lucide-react'

interface Props {
  post: Post
  content: string
  media: MediaAsset[]
  mode: 'preview' | 'edit' | 'published'
  className?: string
}

export function FacebookReelTemplate({ post, content, media, mode, className = '' }: Props) {
  const videoUrl = media.find((m) => m.type === 'video')?.url || post.generatedVideoUrl
  const imageUrl = media.find((m) => m.type === 'image')?.url || post.generatedImage

  return (
    <div className={`bg-black rounded-lg shadow-lg overflow-hidden flex flex-col justify-between mx-auto ${className}`} style={{ aspectRatio: '9/16', maxHeight: '700px', maxWidth: '400px' }}>
      {/* Video Container */}
      <div className="relative w-full h-full flex items-center justify-center bg-black">
        {videoUrl ? (
          <>
            <video
              src={videoUrl}
              className="w-full h-full object-cover"
              controls
            />
          </>
        ) : (
          <div className="w-full h-full bg-gradient-to-b from-gray-800 to-black flex items-center justify-center">
            <p className="text-gray-400">No video</p>
          </div>
        )}

        {/* Header Info */}
        <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-blue-600" />
            <div>
              <p className="text-white text-sm font-semibold">Your Page</p>
            </div>
          </div>
          <button className="text-white hover:opacity-80 transition">
            <MoreVertical className="w-5 h-5" />
          </button>
        </div>

        {/* Caption Overlay */}
        {content && (
          <div className="absolute bottom-20 left-4 right-4 bg-black/70 rounded-lg p-3 z-10">
            <p className="text-white text-sm break-words">
              {content.length > 200 ? content.substring(0, 197) + '...' : content}
            </p>
          </div>
        )}

        {/* Right Sidebar Actions */}
        <div className="absolute right-4 bottom-20 flex flex-col gap-4 z-10">
          <button className="flex flex-col items-center text-white hover:opacity-80 transition">
            <Heart className="w-7 h-7 mb-1" fill="white" />
            <span className="text-xs">1.2K</span>
          </button>
          <button className="flex flex-col items-center text-white hover:opacity-80 transition">
            <MessageCircle className="w-7 h-7 mb-1" />
            <span className="text-xs">234</span>
          </button>
          <button className="flex flex-col items-center text-white hover:opacity-80 transition">
            <Share2 className="w-7 h-7 mb-1" />
            <span className="text-xs">456</span>
          </button>
        </div>

        {/* Reel Badge */}
        <div className="absolute top-4 right-4 bg-blue-600 text-white px-2 py-1 rounded text-xs font-bold z-10">
          Reel
        </div>
      </div>

      {/* Bottom Control Bar */}
      <div className="bg-black/90 px-4 py-3 text-white text-xs flex items-center justify-between border-t border-gray-700">
        <span>1:24</span>
        <div className="flex gap-2">
          <button className="text-blue-400 hover:text-blue-300 transition">↑</button>
          <button className="text-blue-400 hover:text-blue-300 transition">✓</button>
        </div>
      </div>
    </div>
  )
}

export default FacebookReelTemplate
