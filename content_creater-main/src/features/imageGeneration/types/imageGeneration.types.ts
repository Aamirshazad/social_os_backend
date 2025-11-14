/**
 * Image Generation Type Definitions
 * Comprehensive TypeScript types for image generation features
 */

/**
 * Core image generation options
 */
export interface ImageGenerationOptions {
  size?: '1024x1024' | '1536x1024' | '1024x1536' | 'auto';
  quality?: 'low' | 'medium' | 'high' | 'auto';
  format?: 'png' | 'jpeg' | 'webp';
  background?: 'transparent' | 'opaque' | 'auto';
  output_compression?: number; // 0-100 for jpeg/webp
  moderation?: 'auto' | 'low';
}

/**
 * Extended options for advanced features
 */
export interface AdvancedImageGenerationOptions extends ImageGenerationOptions {
  input_fidelity?: 'low' | 'high';
  style_preset?: string;
  brand_guidelines?: BrandGuidelines;
}

/**
 * Streaming options
 */
export interface StreamingOptions extends ImageGenerationOptions {
  stream?: boolean;
  partial_images?: number; // 0-3, number of partial images to receive
}

/**
 * Brand guidelines for consistent image generation
 */
export interface BrandGuidelines {
  colors?: string[];
  style?: string;
  mood?: string;
  tone?: string;
  logoUrl?: string;
}

/**
 * Image generation result
 */
export interface ImageGenerationResult {
  imageUrl: string;
  metadata: ImageGenerationMetadata;
  generatedAt: number;
  generationTime?: number; // milliseconds
}

/**
 * Metadata about generated image
 */
export interface ImageGenerationMetadata extends ImageGenerationOptions {
  model: string;
  promptUsed: string;
  revisedPrompt?: string;
  tokensUsed?: number;
  costEstimate?: number;
}

/**
 * Streaming progress event
 */
export interface StreamingProgressEvent {
  type: 'partial' | 'final' | 'error';
  partial_image_index?: number; // Index of partial image (0-2)
  imageB64?: string;
  b64_json?: string; // Alternative field name from API
  progress?: number; // 0-100
  error?: string;
}

/**
 * Image editing request
 */
export interface ImageEditRequest {
  originalImageUrl: string;
  maskImageUrl: string;
  prompt: string;
  options?: ImageGenerationOptions;
}

/**
 * Image-to-image generation request
 */
export interface ImageToImageRequest {
  prompt: string;
  referenceImages: string[];
  input_fidelity?: 'low' | 'high'; // Per OpenAI docs
  options?: ImageGenerationOptions;
}

/**
 * Image generation preset
 */
export interface ImageGenerationPreset {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  options: ImageGenerationOptions;
  promptEnhancement?: string;
  category: 'platform' | 'quality' | 'style' | 'custom';
}

/**
 * Built-in presets
 */
export const imageGenerationPresets: Record<string, ImageGenerationPreset> = {
  instagram: {
    id: 'instagram',
    name: 'Instagram Post',
    description: 'Square format, vibrant colors',
    icon: '📸',
    options: {
      size: '1024x1024',
      quality: 'medium',
      format: 'png',
      background: 'auto',
    },
    category: 'platform',
  },
  twitter: {
    id: 'twitter',
    name: 'Twitter/X',
    description: 'Landscape, optimized for feed',
    icon: '🐦',
    options: {
      size: '1536x1024',
      quality: 'medium',
      format: 'jpeg',
      background: 'auto',
    },
    category: 'platform',
  },
  story: {
    id: 'story',
    name: 'Instagram Story',
    description: 'Vertical format for stories',
    icon: '📱',
    options: {
      size: '1024x1536',
      quality: 'high',
      format: 'png',
      background: 'auto',
    },
    category: 'platform',
  },
  linkedin: {
    id: 'linkedin',
    name: 'LinkedIn',
    description: 'Professional, corporate style',
    icon: '💼',
    options: {
      size: '1024x1024',
      quality: 'high',
      format: 'png',
      background: 'auto',
    },
    category: 'platform',
  },
  facebook: {
    id: 'facebook',
    name: 'Facebook',
    description: 'Landscape format for Facebook posts',
    icon: '📘',
    options: {
      size: '1536x1024',
      quality: 'medium',
      format: 'jpeg',
      background: 'auto',
    },
    category: 'platform',
  },
  tiktok: {
    id: 'tiktok',
    name: 'TikTok',
    description: 'Vertical format for TikTok',
    icon: '🎵',
    options: {
      size: '1024x1536',
      quality: 'high',
      format: 'png',
      background: 'auto',
    },
    category: 'platform',
  },
  youtube: {
    id: 'youtube',
    name: 'YouTube Thumbnail',
    description: 'Landscape format for YouTube thumbnails',
    icon: '📺',
    options: {
      size: '1536x1024',
      quality: 'high',
      format: 'jpeg',
      background: 'auto',
    },
    category: 'platform',
  },
  fast: {
    id: 'fast',
    name: 'Fast Generation',
    description: 'Quick preview quality',
    icon: '⚡',
    options: {
      size: '1024x1024',
      quality: 'low',
      format: 'jpeg',
      output_compression: 70,
      background: 'auto',
    },
    category: 'quality',
  },
  premium: {
    id: 'premium',
    name: 'Premium Quality',
    description: 'Best quality, transparent',
    icon: '💎',
    options: {
      size: '1024x1024',
      quality: 'high',
      format: 'png',
      background: 'transparent',
    },
    category: 'quality',
  },
  product: {
    id: 'product',
    name: 'Product Photo',
    description: 'Clean background, high quality',
    icon: '📦',
    options: {
      size: '1024x1024',
      quality: 'high',
      format: 'png',
      background: 'transparent',
    },
    category: 'style',
  },
  thumbnail: {
    id: 'thumbnail',
    name: 'Video Thumbnail',
    description: 'Eye-catching, bold',
    icon: '🎬',
    options: {
      size: '1536x1024',
      quality: 'high',
      format: 'jpeg',
      background: 'auto',
    },
    category: 'style',
  },
};

/**
 * Image generation history item
 */
export interface ImageGenerationHistoryItem {
  id: string;
  imageUrl: string;
  prompt: string;
  options: ImageGenerationOptions;
  metadata: ImageGenerationMetadata;
  createdAt: number;
  isFavorite?: boolean;
}

/**
 * Image comparison data
 */
export interface ImageComparisonData {
  images: Array<{
    url: string;
    options: ImageGenerationOptions;
    label?: string;
  }>;
  selectedIndex?: number;
}

/**
 * Get image generation preset for a specific platform
 * Maps platform names to their optimal image generation settings
 */
export function getPresetForPlatform(platform: string): ImageGenerationOptions {
  const platformLower = platform.toLowerCase();
  
  // Map platform to preset
  const presetMap: Record<string, string> = {
    'instagram': 'instagram',
    'twitter': 'twitter',
    'facebook': 'facebook',
    'linkedin': 'linkedin',
    'tiktok': 'tiktok',
    'youtube': 'youtube',
  };
  
  const presetId = presetMap[platformLower];
  if (presetId && imageGenerationPresets[presetId]) {
    return imageGenerationPresets[presetId].options;
  }
  
  // Default fallback
  return {
    size: '1024x1024',
    quality: 'medium',
    format: 'png',
    background: 'auto',
  };
}

/**
 * Prompt improvement result
 */
export interface PromptImprovementResult {
  originalPrompt: string;
  improvedPrompt: string;
  changes: string[];
  enhancementsApplied: string[];
}

/**
 * Image generation statistics
 */
export interface ImageGenerationStats {
  totalGenerated: number;
  totalCost: number;
  averageGenerationTime: number;
  favoritePreset?: string;
  qualityDistribution: Record<string, number>;
  formatDistribution: Record<string, number>;
}

/**
 * Error types for better error handling
 */
export enum ImageGenerationErrorType {
  API_KEY_INVALID = 'API_KEY_INVALID',
  RATE_LIMIT = 'RATE_LIMIT',
  INVALID_PROMPT = 'INVALID_PROMPT',
  INVALID_OPTIONS = 'INVALID_OPTIONS',
  GENERATION_FAILED = 'GENERATION_FAILED',
  STREAMING_FAILED = 'STREAMING_FAILED',
  NETWORK_ERROR = 'NETWORK_ERROR',
  UNKNOWN = 'UNKNOWN',
}

/**
 * Custom error class for image generation
 */
export class ImageGenerationError extends Error {
  constructor(
    public type: ImageGenerationErrorType,
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'ImageGenerationError';
  }
}
