import { NextRequest } from 'next/server';
import { generateContentSchema } from '../../shared/validation';
import { validateRequest } from '../../shared/middleware';
import { successResponse, errorResponse, serverErrorResponse } from '../../shared/response';
import { aiService } from '../../shared/aiService';

/**
 * POST /api/ai/content/generate
 * Generate social media content for multiple platforms
 * 
 * Request body:
 * {
 *   topic: string,
 *   platforms: Platform[],
 *   contentType: ContentType,
 *   tone: Tone
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Validate request body
    const validation = await validateRequest(request, generateContentSchema);
    if (!validation.valid) {
      return validation.response;
    }

    const { topic, platforms, contentType, tone } = validation.data;

    // Generate content using AI service
    const content = await aiService.generateSocialMediaContent(
      topic,
      platforms,
      contentType,
      tone
    );

    return successResponse(content, 'Content generated successfully');
  } catch (error) {
    console.error('Error in /api/ai/content/generate:', error);
    if (error instanceof Error) {
      console.error('[Generate API] Error message:', error.message);
      
      // Check for specific API key errors
      if (error.message.includes('API key') || error.message.includes('401') || error.message.includes('Unauthorized')) {
        return errorResponse('Invalid or missing API key. Please check your GEMINI_API_KEY in .env.local', 401);
      }
      
      // Check for rate limit errors
      if (error.message.includes('429') || error.message.includes('rate limit')) {
        return errorResponse('API rate limit exceeded. Please try again later.', 429);
      }
      
      // Return the actual error message if it's informative
      if (error.message && !error.message.includes('Failed to generate content')) {
        return errorResponse(error.message, 500);
      }
    }
    return serverErrorResponse(error);
  }
}
