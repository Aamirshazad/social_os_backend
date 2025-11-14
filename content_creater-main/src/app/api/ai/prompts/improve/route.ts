import { NextRequest } from 'next/server';
import { improvePromptSchema } from '../../shared/validation';
import { validateRequest } from '../../shared/middleware';
import { successResponse, errorResponse, serverErrorResponse } from '../../shared/response';
import { aiService } from '../../shared/aiService';

/**
 * POST /api/ai/prompts/improve
 * Improve a prompt for image or video generation
 * 
 * Request body:
 * {
 *   prompt: string,
 *   type: 'image' | 'video',
 *   userGuidance?: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Validate request body
    const validation = await validateRequest(request, improvePromptSchema);
    if (!validation.valid) {
      return validation.response;
    }

    const { prompt, type, userGuidance } = validation.data;

    // Improve prompt using AI service
    const improvedPrompt = await aiService.improvePrompt(prompt, type, userGuidance);

    return successResponse({ improvedPrompt }, 'Prompt improved successfully');
  } catch (error) {
    console.error('Error in /api/ai/prompts/improve:', error);
    return serverErrorResponse(error);
  }
}
