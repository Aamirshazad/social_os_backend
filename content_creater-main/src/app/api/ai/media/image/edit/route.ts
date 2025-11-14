/**
 * API Route: Edit Image
 * Edit existing images with new prompts (per OpenAI docs)
 */

import { NextRequest, NextResponse } from 'next/server';
import { imageGenerationService } from '@/features/imageGeneration';
import { z } from 'zod';

/**
 * Schema for image edit request
 * Per OpenAI docs: Supports input_fidelity for better reference preservation
 */
const editImageRequestSchema = z.object({
  prompt: z.string().min(3, 'Edit prompt must be at least 3 characters'),
  imageUrl: z.string().min(1, 'Image URL is required'),
  input_fidelity: z.enum(['low', 'high']).optional().default('high'),
  options: z.object({
    size: z.enum(['1024x1024', '1536x1024', '1024x1536', 'auto']).optional(),
    quality: z.enum(['low', 'medium', 'high', 'auto']).optional(),
    format: z.enum(['png', 'jpeg', 'webp']).optional(),
    background: z.enum(['transparent', 'opaque', 'auto']).optional(),
    output_compression: z.number().min(0).max(100).optional(),
    moderation: z.enum(['auto', 'low']).optional(),
  }).optional(),
});

/**
 * POST /api/ai/media/image/edit
 * Edit an existing image with a new prompt
 */
export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json();
    const validation = editImageRequestSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request data',
          details: validation.error.errors,
        },
        { status: 400 }
      );
    }

    const { prompt, imageUrl, input_fidelity, options } = validation.data;

    console.log('[Image Edit] Request received:', {
      promptLength: prompt.length,
      hasImage: !!imageUrl,
      input_fidelity,
      options,
    });

    // Use the generateFromReferences method for editing
    // Per OpenAI docs: sending an image with a new prompt edits it
    const result = await imageGenerationService.generateFromReferences({
      prompt,
      referenceImages: [imageUrl],
      input_fidelity: input_fidelity || 'high', // Preserve details from original
      options: options || {},
    });

    console.log('[Image Edit] Edit complete');

    return NextResponse.json({
      success: true,
      data: {
        imageUrl: result.imageUrl,
        metadata: result.metadata,
        generatedAt: result.generatedAt,
        generationTime: result.generationTime,
      },
    });
  } catch (error) {
    console.error('[Image Edit] Error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 }
    );
  }
}
