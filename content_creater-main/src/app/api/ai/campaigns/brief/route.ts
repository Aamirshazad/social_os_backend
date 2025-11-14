import { NextRequest } from 'next/server';
import { generateCampaignBriefSchema } from '../../shared/validation';
import { validateRequest } from '../../shared/middleware';
import { successResponse, errorResponse, serverErrorResponse } from '../../shared/response';
import { aiService } from '../../shared/aiService';

/**
 * POST /api/ai/campaigns/brief
 * Generate a campaign brief
 * 
 * Request body:
 * {
 *   name: string,
 *   goals: string[],
 *   platforms: Platform[]
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Validate request body
    const validation = await validateRequest(request, generateCampaignBriefSchema);
    if (!validation.valid) {
      return validation.response;
    }

    const { name, goals, platforms } = validation.data;

    // Generate campaign brief using AI service
    const brief = await aiService.generateCampaignBrief(name, goals, platforms);

    return successResponse(brief, 'Campaign brief generated successfully');
  } catch (error) {
    console.error('Error in /api/ai/campaigns/brief:', error);
    return serverErrorResponse(error);
  }
}
