import { NextRequest } from 'next/server';
import { generateEngagementScoreSchema } from '../../shared/validation';
import { validateRequest } from '../../shared/middleware';
import { successResponse, errorResponse, serverErrorResponse } from '../../shared/response';
import { aiService } from '../../shared/aiService';

/**
 * POST /api/ai/content/engagement
 * Generate engagement score for a post
 * 
 * Request body:
 * {
 *   postContent: string,
 *   platform: Platform,
 *   hasImage: boolean,
 *   hasVideo: boolean
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Validate request body
    const validation = await validateRequest(request, generateEngagementScoreSchema);
    if (!validation.valid) {
      return validation.response;
    }

    const { postContent, platform, hasImage, hasVideo } = validation.data;

    // Generate engagement score using AI service
    const result = await aiService.generateEngagementScore(
      postContent,
      platform,
      hasImage,
      hasVideo
    );

    return successResponse(result, 'Engagement score generated successfully');
  } catch (error) {
    console.error('Error in /api/ai/content/engagement:', error);
    return serverErrorResponse(error);
  }
}
