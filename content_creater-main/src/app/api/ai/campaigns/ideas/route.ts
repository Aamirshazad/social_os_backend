import { NextRequest } from 'next/server';
import { generateCampaignIdeasSchema } from '../../shared/validation';
import { validateRequest } from '../../shared/middleware';
import { successResponse, errorResponse, serverErrorResponse } from '../../shared/response';
import { aiService } from '../../shared/aiService';

/**
 * POST /api/ai/campaigns/ideas
 * Generate campaign ideas
 * 
 * Request body:
 * {
 *   name: string,
 *   pillars: string[],
 *   platforms: Platform[]
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Validate request body
    const validation = await validateRequest(request, generateCampaignIdeasSchema);
    if (!validation.valid) {
      return validation.response;
    }

    const { name, pillars, platforms } = validation.data;

    // Generate campaign ideas using AI service
    const ideas = await aiService.generateCampaignIdeas(name, pillars, platforms);

    return successResponse(ideas, `Generated ${ideas.length} campaign ideas`);
  } catch (error) {
    console.error('Error in /api/ai/campaigns/ideas:', error);
    return serverErrorResponse(error);
  }
}
