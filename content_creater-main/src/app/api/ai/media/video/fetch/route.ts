import { NextRequest } from 'next/server';
import { successResponse, errorResponse, serverErrorResponse } from '../../../shared/response';
import { aiService } from '../../../shared/aiService';

/**
 * POST /api/ai/media/video/fetch
 * Download a completed video from OpenAI Sora
 * 
 * Request body:
 * {
 *   videoId: string (the video ID from Sora generation)
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { videoId } = body;

    if (!videoId) {
      return errorResponse('Video ID is required', 400);
    }

    // Download the video using the AI service
    const buffer = await aiService.downloadVideo(videoId);
    
    // Convert to base64
    const base64 = buffer.toString('base64');
    const mimeType = 'video/mp4';

    return successResponse({ 
      videoData: `data:${mimeType};base64,${base64}`,
      mimeType 
    }, 'Video downloaded successfully');
  } catch (error) {
    console.error('Error in /api/ai/media/video/fetch:', error);
    return serverErrorResponse(error);
  }
}
