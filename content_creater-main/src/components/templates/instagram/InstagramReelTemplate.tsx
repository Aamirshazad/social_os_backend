/**
 * Instagram Reel Template
 * Short vertical video (9:16 ratio, up to 90 seconds)
 */

import React from 'react'
import { Post, MediaAsset } from '@/types'
import { Heart, MessageCircle, Share2, Music } from 'lucide-react'

interface Props {
  post: Post
  content: string
  media: MediaAsset[]
  mode: 'preview' | 'edit' | 'published'
  className?: string
}

export function InstagramReelTemplate({ post, content, media, mode, className = '' }: Props) {
  const videoUrl = media.find((m) => m.type === 'video')?.url || post.generatedVideoUrl

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
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="w-16 h-16 rounded-full border-4 border-white/50 flex items-center justify-center">
                <div className="w-0 h-0 border-l-8 border-l-white border-t-5 border-t-transparent border-b-5 border-b-transparent ml-1" />
              </div>
            </div>
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-b from-gray-800 to-black">
            <p className="text-gray-400">No video</p>
          </div>
        )}

        {/* "Reels" Badge */}
        <div className="absolute top-4 left-4 bg-white/90 text-black px-2 py-1 rounded-full text-xs font-bold">
          Reels
        </div>

        {/* Action Icons (Right Sidebar) */}
        <div className="absolute right-4 bottom-20 flex flex-col gap-6">
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

        {/* Caption Overlay (Bottom) */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
          <p className="text-white text-sm font-medium break-words mb-2">
            {content.length > 150 ? content.substring(0, 147) + '...' : content}
          </p>

          {/* Audio Credit */}
          <div className="flex items-center gap-2 text-white/80 text-xs">
            <Music className="w-3 h-3" />
            <span>Original Audio - Your Account</span>
          </div>
        </div>
      </div>

      {/* Bottom Info Bar */}
      <div className="bg-black px-4 py-3 text-white text-xs flex items-center justify-between border-t border-gray-700">
        <span>36 seconds</span>
        <span className="text-gray-400">Tap to unmute</span>
      </div>
    </div>
  )
}

export default InstagramReelTemplate
