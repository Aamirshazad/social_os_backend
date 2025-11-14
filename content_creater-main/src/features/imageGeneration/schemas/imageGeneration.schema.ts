/**
 * Image Generation Schemas
 * Zod validation schemas for image generation features
 */

import { z } from 'zod';

/**
 * Image Generation Options Schema
 */
export const imageGenerationOptionsSchema = z.object({
  size: z.enum(['1024x1024', '1536x1024', '1024x1536', 'auto']).optional(),
  quality: z.enum(['low', 'medium', 'high', 'auto']).optional(),
  format: z.enum(['png', 'jpeg', 'webp']).optional(),
  background: z.enum(['transparent', 'opaque', 'auto']).optional(),
  output_compression: z.number().min(0).max(100).optional(),
  moderation: z.enum(['auto', 'low']).optional(),
});

/**
 * Basic Image Generation Request Schema
 */
export const generateImageRequestSchema = z.object({
  prompt: z.string().min(3, 'Prompt must be at least 3 characters').max(2000, 'Prompt is too long'),
  options: imageGenerationOptionsSchema.optional(),
});

/**
 * Streaming Image Generation Request Schema
 * Per OpenAI docs: partial_images can be 0-3
 */
export const streamingImageRequestSchema = z.object({
  prompt: z.string().min(3, 'Prompt must be at least 3 characters'),
  options: imageGenerationOptionsSchema.optional(),
  partial_images: z.number().min(0).max(3).default(2), // Number of partial images (0-3)
});

/**
 * Image Editing with Mask Request Schema
 */
export const editImageWithMaskSchema = z.object({
  prompt: z.string().min(3, 'Edit prompt is required'),
  imageUrl: z.string().url('Valid image URL required'),
  maskUrl: z.string().url('Valid mask URL required'),
  options: imageGenerationOptionsSchema.optional(),
});

/**
 * Image from References Request Schema
 * Per OpenAI docs: supports multiple input images with input_fidelity
 */
export const generateFromReferencesSchema = z.object({
  prompt: z.string().min(3, 'Prompt is required'),
  referenceImageUrls: z.array(z.string().url()).min(1).max(4, 'Maximum 4 reference images'),
  input_fidelity: z.enum(['low', 'high']).default('high'), // Per OpenAI docs
  options: imageGenerationOptionsSchema.optional(),
});

/**
 * Improve Prompt Request Schema
 */
export const improvePromptSchema = z.object({
  originalPrompt: z.string().min(1, 'Original prompt is required'),
  type: z.enum(['image', 'video']),
  userGuidance: z.string().optional(),
  targetPlatforms: z.array(z.string()).optional(),
});

/**
 * Image Generation Preset Schema
 */
export const imagePresetSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  options: imageGenerationOptionsSchema,
  icon: z.string().optional(),
});

// Export types
export type ImageGenerationOptionsInput = z.infer<typeof imageGenerationOptionsSchema>;
export type GenerateImageRequestInput = z.infer<typeof generateImageRequestSchema>;
export type StreamingImageRequestInput = z.infer<typeof streamingImageRequestSchema>;
export type EditImageWithMaskInput = z.infer<typeof editImageWithMaskSchema>;
export type GenerateFromReferencesInput = z.infer<typeof generateFromReferencesSchema>;
export type ImprovePromptInput = z.infer<typeof improvePromptSchema>;
export type ImagePresetInput = z.infer<typeof imagePresetSchema>;
