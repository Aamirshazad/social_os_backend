import { Platform, Post, PostContent, TwitterCredentials, LinkedInCredentials, FacebookCredentials, InstagramCredentials, TikTokCredentials, YouTubeCredentials } from '@/types';
import { postTweet, uploadTwitterMedia } from './platforms/twitterService';
import { postToLinkedIn, uploadLinkedInMedia } from './platforms/linkedinService';
import { postToFacebook, uploadFacebookPhoto } from './platforms/facebookService';
import { postToInstagram, uploadInstagramMedia } from './platforms/instagramService';
import { postToTikTok, uploadTikTokVideo } from './platforms/tiktokService';
import { uploadToYouTube } from './platforms/youtubeService';

export interface PublishResult {
  platform: Platform;
  success: boolean;
  postId?: string;
  url?: string;
  error?: string;
}

/**
 * Publish a post to a single platform
 */
export async function publishToSinglePlatform(
  platform: Platform,
  content: string,
  mediaUrl?: string,
  mediaType?: 'image' | 'video'
): Promise<PublishResult> {
  // Auto-detect media type if not provided
  if (!mediaType && mediaUrl) {
    mediaType = (mediaUrl.includes('.mp4') || mediaUrl.includes('.mov') || mediaUrl.includes('video'))
      ? 'video'
      : 'image';
  }
  try {
    // Create empty credentials object - backend API will validate actual credentials from database
    const emptyCredentials = {} as any;

    let result;

    switch (platform) {
      case 'twitter': {
        // Handle media upload if present
        let mediaIds: string[] | undefined;
        if (mediaUrl) {
          const mediaResult = await uploadTwitterMedia(
            emptyCredentials as TwitterCredentials,
            mediaUrl,
            mediaType || 'image'
          );
          if (mediaResult.success && mediaResult.mediaId) {
            mediaIds = [mediaResult.mediaId];
          }
        }

        result = await postTweet(emptyCredentials as TwitterCredentials, {
          text: content,
          mediaIds
        });
        break;
      }

      case 'linkedin': {
        // Handle media upload if present
        let mediaUrn: string | undefined;
        if (mediaUrl) {
          const mediaResult = await uploadLinkedInMedia(
            emptyCredentials as LinkedInCredentials,
            mediaUrl,
            mediaType || 'image'
          );
          if (mediaResult.success && mediaResult.mediaUrn) {
            mediaUrn = mediaResult.mediaUrn;
          }
        }

        result = await postToLinkedIn(emptyCredentials as LinkedInCredentials, {
          text: content,
          visibility: 'PUBLIC',
          mediaUrn
        });
        break;
      }

      case 'facebook': {
        // Handle media upload if present
        let imageUrl: string | undefined;
        if (mediaUrl) {
          const mediaResult = await uploadFacebookPhoto(emptyCredentials as FacebookCredentials, mediaUrl);
          if (mediaResult.success && mediaResult.imageUrl) {
            imageUrl = mediaResult.imageUrl;
          }
        }

        result = await postToFacebook(emptyCredentials as FacebookCredentials, {
          message: content,
          imageUrl: imageUrl,
          mediaType: mediaType
        });
        break;
      }

      case 'tiktok': {
        if (!mediaUrl) {
          return {
            platform,
            success: false,
            error: 'TikTok requires a video to post'
          };
        }

        // Upload video to get public URL (TikTok requires public URLs)
        const mediaResult = await uploadTikTokVideo(emptyCredentials as TikTokCredentials, mediaUrl);
        if (!mediaResult.success || !mediaResult.videoUrl) {
          return {
            platform,
            success: false,
            error: mediaResult.error || 'Failed to upload video'
          };
        }

        result = await postToTikTok(emptyCredentials as TikTokCredentials, {
          caption: content,
          videoUrl: mediaResult.videoUrl,
          videoSize: mediaResult.videoSize || 0
        });
        break;
      }

      case 'instagram': {
        if (!mediaUrl) {
          return {
            platform,
            success: false,
            error: 'Instagram requires an image or video to post'
          };
        }

        // Upload media to get public URL (Instagram requires public URLs)
        const mediaResult = await uploadInstagramMedia(emptyCredentials as InstagramCredentials, mediaUrl);
        if (!mediaResult.success || !mediaResult.imageUrl) {
          return {
            platform,
            success: false,
            error: mediaResult.error || 'Failed to upload media'
          };
        }

        result = await postToInstagram(emptyCredentials as InstagramCredentials, {
          caption: content,
          imageUrl: mediaResult.imageUrl,
          mediaType: mediaType
        });
        break;
      }

      case 'youtube': {
        if (!mediaUrl) {
          return {
            platform,
            success: false,
            error: 'YouTube requires a video to upload'
          };
        }

        // Convert media URL to base64 if needed (YouTube expects base64 encoded video buffer)
        // If mediaUrl is already a URL, we need to fetch and convert to base64
        let videoBuffer: string;
        if (mediaUrl.startsWith('http')) {
          // Fetch video from URL and convert to base64
          const videoResponse = await fetch(mediaUrl);
          const videoBlob = await videoResponse.blob();
          const arrayBuffer = await videoBlob.arrayBuffer();
          videoBuffer = Buffer.from(arrayBuffer).toString('base64');
        } else {
          // Already base64
          videoBuffer = mediaUrl;
        }

        result = await uploadToYouTube(emptyCredentials as YouTubeCredentials, {
          title: content.substring(0, 100), // YouTube title max 100 chars
          description: content,
          videoBuffer: videoBuffer,
          privacyStatus: 'private' // Default to private
        });
        break;
      }

      default:
        return {
          platform,
          success: false,
          error: `Unsupported platform: ${platform}`
        };
    }

    return {
      platform,
      success: result.success,
      postId: (result as any).postId ?? (result as any).tweetId,
      url: result.url,
      error: result.error
    };
  } catch (error) {
    console.error(`Failed to publish to ${platform}:`, error);
    return {
      platform,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

/**
 * Publish a post to multiple platforms
 */
export async function publishPost(post: Post): Promise<PublishResult[]> {
  const results: PublishResult[] = [];

  for (const platform of post.platforms) {
    // Get platform-specific content
    const rawContent = post.content[platform];

    if (!rawContent) {
      results.push({
        platform,
        success: false,
        error: `No content specified for ${platform}`
      });
      continue;
    }

    // Convert content to string (handle YouTube object type)
    const content = typeof rawContent === 'string'
      ? rawContent
      : typeof rawContent === 'object'
      ? (rawContent as any)?.description || ''
      : '';

    if (!content) {
      results.push({
        platform,
        success: false,
        error: `Invalid content for ${platform}`
      });
      continue;
    }

    // Determine media URL (prefer generated image/video, fall back to suggestions)
    const mediaUrl = post.generatedImage || post.generatedVideoUrl;

    const result = await publishToSinglePlatform(platform, content, mediaUrl);
    results.push(result);
  }

  return results;
}

/**
 * Check if a platform is ready to publish (connected and has valid credentials)
 * Note: This now returns true as validation is handled server-side
 * Backend APIs will return proper errors if platform is not connected
 */
export function isPlatformReady(platform: Platform): boolean {
  // Credential validation is now done server-side by backend APIs
  // which have access to database credentials
  return true;
}

/**
 * Get publishing readiness for all platforms
 */
export function getPublishingReadiness(): Record<Platform, boolean> {
  return {
    twitter: isPlatformReady('twitter'),
    linkedin: isPlatformReady('linkedin'),
    facebook: isPlatformReady('facebook'),
    instagram: isPlatformReady('instagram'),
    tiktok: isPlatformReady('tiktok'),
    youtube: isPlatformReady('youtube')
  };
}

/**
 * Validate post before publishing
 */
export function validatePostForPublishing(post: Post): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check if at least one platform is selected
  if (!post.platforms || post.platforms.length === 0) {
    errors.push('No platforms selected');
  }

  // Platform connection validation is now done server-side by backend APIs
  // No need to check client-side since backend APIs have database access

  // Check if content exists for each platform
  post.platforms.forEach(platform => {
    if (!post.content[platform]) {
      errors.push(`Missing content for ${platform}`);
    }
  });

  // Platform-specific validations
  post.platforms.forEach(platform => {
    const rawContent = post.content[platform];
    if (!rawContent) return;

    // Convert content to string (handle YouTube object type)
    const content = typeof rawContent === 'string'
      ? rawContent
      : typeof rawContent === 'object'
      ? (rawContent as any)?.description || ''
      : '';

    if (!content) return;

    switch (platform) {
      case 'twitter':
        if (content.length > 280) {
          errors.push('Twitter content exceeds 280 characters');
        }
        break;
      case 'linkedin':
        if (content.length > 3000) {
          errors.push('LinkedIn content exceeds 3000 characters');
        }
        break;
      case 'facebook':
        if (content.length > 63206) {
          errors.push('Facebook content exceeds 63206 characters');
        }
        break;
      case 'instagram':
        if (content.length > 2200) {
          errors.push('Instagram caption exceeds 2200 characters');
        }
        if (!post.generatedImage && !post.generatedVideoUrl) {
          errors.push('Instagram requires an image or video');
        }
        break;
      case 'tiktok':
        if (content.length > 2200) {
          errors.push('TikTok caption exceeds 2200 characters');
        }
        if (!post.generatedImage && !post.generatedVideoUrl) {
          errors.push('TikTok requires a video');
        }
        break;
      case 'youtube':
        if (content.length > 5000) {
          errors.push('YouTube description exceeds 5000 characters');
        }
        if (!post.generatedImage && !post.generatedVideoUrl) {
          errors.push('YouTube requires a video');
        }
        break;
    }
  });

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Publishing service namespace for compatibility
 */
export const publishingService = {
  publishToSinglePlatform,
  publishPost,
  isPlatformReady,
  getPublishingReadiness,
  validatePostForPublishing
};
