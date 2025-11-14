import { NextRequest } from 'next/server';
import { successResponse, errorResponse, serverErrorResponse } from '../../../shared/response';
import { aiService } from '../../../shared/aiService';

/**
 * POST /api/ai/media/video/status
 * Check the status of a video generation job (OpenAI Sora)
 * 
 * Request body:
 * {
 *   videoId: string (the video ID from Sora video generation)
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { videoId } = body;

    if (!videoId) {
      return errorResponse('Video ID is required', 400);
    }

    // Check video status using AI service
    const video = await aiService.checkVideoStatus(videoId);

    return successResponse({ video }, 'Video status retrieved');
  } catch (error) {
    console.error('Error in /api/ai/media/video/status:', error);
    return serverErrorResponse(error);
  }
}
