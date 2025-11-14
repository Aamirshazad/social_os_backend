/**
 * API Route: Generate Image
 * Updated to use new organized image generation service
 */

import { NextRequest, NextResponse } from 'next/server';
import { imageGenerationService } from '@/features/imageGeneration';
import {
  generateImageRequestSchema,
  type GenerateImageRequestInput,
} from '@/features/imageGeneration/schemas/imageGeneration.schema';
import { ImageGenerationError, ImageGenerationErrorType } from '@/features/imageGeneration';

/**
 * POST /api/ai/media/image/generate
 * Generate a single image with options
 */
export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body: GenerateImageRequestInput = await request.json();
    const validation = generateImageRequestSchema.safeParse(body);

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

    const { prompt, options } = validation.data;

    console.log('[Image Generation] Request received:', {
      promptLength: prompt.length,
      options,
    });

    // Generate image using service
    const result = await imageGenerationService.generateImage(prompt, options);

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
    console.error('[Image Generation] Error:', error);

    if (error instanceof ImageGenerationError) {
      const statusCode =
        error.type === ImageGenerationErrorType.API_KEY_INVALID
          ? 401
          : error.type === ImageGenerationErrorType.RATE_LIMIT
          ? 429
          : error.type === ImageGenerationErrorType.INVALID_PROMPT
          ? 400
          : 500;

      return NextResponse.json(
        {
          success: false,
          error: error.message,
          type: error.type,
        },
        { status: statusCode }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 }
    );
  }
}
