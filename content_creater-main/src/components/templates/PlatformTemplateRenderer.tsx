/**
 * Platform Template Renderer
 * Intelligent routing component that selects the correct template based on platform and post type
 * Supports all 6 platforms with multiple post types per platform
 */

import React from 'react'
import { Post, Platform, PostType, MediaAsset } from '@/types'

// Import template components (will be created)
import TwitterPostTemplate from './twitter/TwitterPostTemplate'
import InstagramFeedTemplate from './instagram/InstagramFeedTemplate'
import InstagramCarouselTemplate from './instagram/InstagramCarouselTemplate'
import InstagramReelTemplate from './instagram/InstagramReelTemplate'
import InstagramStoryTemplate from './instagram/InstagramStoryTemplate'
import FacebookPostTemplate from './facebook/FacebookPostTemplate'
import FacebookCarouselTemplate from './facebook/FacebookCarouselTemplate'
import FacebookReelTemplate from './facebook/FacebookReelTemplate'
import FacebookStoryTemplate from './facebook/FacebookStoryTemplate'
import TikTokVideoTemplate from './tiktok/TikTokVideoTemplate'
import TikTokSlideshowTemplate from './tiktok/TikTokSlideshowTemplate'
import YouTubeVideoTemplate from './youtube/YouTubeVideoTemplate'
import YouTubeShortsTemplate from './youtube/YouTubeShortsTemplate'
import LinkedInPostTemplate from './linkedin/LinkedInPostTemplate'
import LinkedInCarouselTemplate from './linkedin/LinkedInCarouselTemplate'

export interface PlatformTemplateRendererProps {
  post: Post
  platform: Platform
  postType?: PostType
  media?: MediaAsset[]
  mode: 'preview' | 'edit' | 'published'
  className?: string
}

/**
 * Main rendering component
 * Routes to appropriate template based on platform and post type
 */
export function PlatformTemplateRenderer({
  post,
  platform,
  postType = 'post',
  media = [],
  mode,
  className = '',
}: PlatformTemplateRendererProps) {
  // Get platform-specific content
  const getContent = (): string => {
    if (typeof post.content[platform as keyof typeof post.content] === 'string') {
      return (post.content[platform as keyof typeof post.content] as string) || ''
    }
    if (platform === 'youtube' && typeof post.content.youtube === 'object') {
      return post.content.youtube?.description || ''
    }
    return ''
  }

  const content = getContent()

  // Route to appropriate template
  switch (platform) {
    // ==================== INSTAGRAM ====================
    case 'instagram':
      switch (postType) {
        case 'feed':
          return (
            <InstagramFeedTemplate
              post={post}
              content={content}
              media={media}
              mode={mode}
              className={className}
            />
          )
        case 'carousel':
          return (
            <InstagramCarouselTemplate
              post={post}
              content={content}
              media={media}
              mode={mode}
              className={className}
            />
          )
        case 'reel':
          return (
            <InstagramReelTemplate
              post={post}
              content={content}
              media={media}
              mode={mode}
              className={className}
            />
          )
        case 'story':
          return (
            <InstagramStoryTemplate
              post={post}
              content={content}
              media={media}
              mode={mode}
              className={className}
            />
          )
        default:
          return (
            <InstagramFeedTemplate
              post={post}
              content={content}
              media={media}
              mode={mode}
              className={className}
            />
          )
      }

    // ==================== FACEBOOK ====================
    case 'facebook':
      switch (postType) {
        case 'carousel':
          return (
            <FacebookCarouselTemplate
              post={post}
              content={content}
              media={media}
              mode={mode}
              className={className}
            />
          )
        case 'reel':
          return (
            <FacebookReelTemplate
              post={post}
              content={content}
              media={media}
              mode={mode}
              className={className}
            />
          )
        case 'story':
          return (
            <FacebookStoryTemplate
              post={post}
              content={content}
              media={media}
              mode={mode}
              className={className}
            />
          )
        default:
          return (
            <FacebookPostTemplate
              post={post}
              content={content}
              media={media}
              mode={mode}
              className={className}
            />
          )
      }

    // ==================== TIKTOK ====================
    case 'tiktok':
      switch (postType) {
        case 'slideshow':
          return (
            <TikTokSlideshowTemplate
              post={post}
              content={content}
              media={media}
              mode={mode}
              className={className}
            />
          )
        default:
          return (
            <TikTokVideoTemplate
              post={post}
              content={content}
              media={media}
              mode={mode}
              className={className}
            />
          )
      }

    // ==================== YOUTUBE ====================
    case 'youtube':
      switch (postType) {
        case 'short':
          return (
            <YouTubeShortsTemplate
              post={post}
              content={content}
              media={media}
              mode={mode}
              className={className}
            />
          )
        default:
          return (
            <YouTubeVideoTemplate
              post={post}
              content={content}
              media={media}
              mode={mode}
              className={className}
            />
          )
      }

    // ==================== TWITTER ====================
    case 'twitter':
      return (
        <TwitterPostTemplate
          post={post}
          content={content}
          media={media}
          mode={mode}
          className={className}
        />
      )

    // ==================== LINKEDIN ====================
    case 'linkedin':
      switch (postType) {
        case 'carousel':
          return (
            <LinkedInCarouselTemplate
              post={post}
              content={content}
              media={media}
              mode={mode}
              className={className}
            />
          )
        default:
          return (
            <LinkedInPostTemplate
              post={post}
              content={content}
              media={media}
              mode={mode}
              className={className}
            />
          )
      }

    // Fallback
    default:
      return (
        <div className="p-4 bg-gray-100 rounded border border-gray-300">
          <p className="text-gray-600">Template not found for {platform}</p>
        </div>
      )
  }
}

export default PlatformTemplateRenderer
