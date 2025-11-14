import { NextRequest } from 'next/server';
import { generateImageSchema } from '../../shared/validation';
import { validateRequest } from '../../shared/middleware';
import { successResponse, errorResponse, serverErrorResponse } from '../../shared/response';
import { imageGenerationService } from '@/features/imageGeneration';

/**
 * POST /api/ai/media/image
 * Generate an image using AI (Legacy endpoint - use /api/ai/media/image/generate for full features)
 * 
 * @deprecated Use /api/ai/media/image/generate for advanced options
 * 
 * Request body:
 * {
 *   prompt: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Validate request body
    const validation = await validateRequest(request, generateImageSchema);
    if (!validation.valid) {
      return validation.response;
    }

    const { prompt } = validation.data;

    console.log('[Legacy Image API] Using default options. Consider migrating to /api/ai/media/image/generate');

    // Use new service with default options for backward compatibility
    const result = await imageGenerationService.generateImage(prompt, {
      quality: 'medium',
      size: '1024x1024',
      format: 'png',
      background: 'auto',
    });

    return successResponse({ imageUrl: result.imageUrl }, 'Image generated successfully');
  } catch (error) {
    console.error('Error in /api/ai/media/image:', error);
    return serverErrorResponse(error);
  }
}
