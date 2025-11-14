import { NextRequest } from 'next/server';
import { generateVideoSchema } from '../../shared/validation';
import { validateRequest } from '../../shared/middleware';
import { successResponse, errorResponse, serverErrorResponse } from '../../shared/response';
import { aiService } from '../../shared/aiService';

/**
 * POST /api/ai/media/video
 * Generate a video using OpenAI Sora API
 * 
 * Request body:
 * {
 *   prompt: string
 * }
 * 
 * Returns:
 * {
 *   operation: Video object with id, status, model, progress, etc.
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Validate request body
    const validation = await validateRequest(request, generateVideoSchema);
    if (!validation.valid) {
      return validation.response;
    }

    const { prompt } = validation.data;

    // Generate video using AI service
    const operation = await aiService.generateVideo(prompt);

    return successResponse({ operation }, 'Video generation started');
  } catch (error) {
    console.error('Error in /api/ai/media/video:', error);
    return serverErrorResponse(error);
  }
}
