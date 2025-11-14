/**
 * TikTok Video Template
 * Standard vertical video (9:16 ratio, up to 10 minutes)
 */

import React from 'react'
import { Post, MediaAsset } from '@/types'
import { Heart, MessageCircle, Share2, Music, User } from 'lucide-react'

interface Props {
  post: Post
  content: string
  media: MediaAsset[]
  mode: 'preview' | 'edit' | 'published'
  className?: string
}

export function TikTokVideoTemplate({ post, content, media, mode, className = '' }: Props) {
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
              <div className="opacity-0 hover:opacity-100 transition">
                <div className="w-16 h-16 rounded-full border-4 border-white/50 flex items-center justify-center bg-black/30">
                  <div className="w-0 h-0 border-l-8 border-l-white border-t-5 border-t-transparent border-b-5 border-b-transparent ml-1" />
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="w-full h-full bg-gradient-to-b from-gray-800 to-black flex items-center justify-center">
            <p className="text-gray-400">No video</p>
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

        {/* Caption and Hashtags (Bottom) */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-4 z-10">
          <p className="text-white text-sm font-medium break-words mb-2">
            {content.length > 150 ? content.substring(0, 147) + '...' : content}
          </p>

          {/* Hashtags and Music Info */}
          <div className="flex items-center gap-2 text-white/80 text-xs">
            <Music className="w-3 h-3" />
            <span>Original Audio - Your Account</span>
          </div>
        </div>

        {/* Video Duration */}
        <div className="absolute top-4 left-4 bg-black/70 text-white text-xs px-2 py-1 rounded z-10">
          1:24
        </div>
      </div>

      {/* Bottom Info Bar */}
      {mode !== 'published' && (
        <div className="bg-black px-4 py-3 text-white text-xs flex items-center justify-between border-t border-gray-700">
          <span>Ready to post</span>
          <span className="text-gray-400">Tap to upload</span>
        </div>
      )}
    </div>
  )
}

export default TikTokVideoTemplate
