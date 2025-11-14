import { NextRequest } from 'next/server';
import { contentStrategistChatSchema } from '../../../shared/validation';
import { validateRequest } from '../../../shared/middleware';
import { successResponse, errorResponse, serverErrorResponse } from '../../../shared/response';
import { aiService } from '../../../shared/aiService';

/**
 * POST /api/ai/content/strategist/chat
 * Handle conversational AI chat for content strategy
 * 
 * Request body:
 * {
 *   message: string,
 *   history?: Array<{ role: 'user' | 'assistant', content: string }>
 * }
 */
export async function POST(request: NextRequest) {
  try {
    console.log('[Strategist Chat API] Request received');
    
    // Validate request body
    const validation = await validateRequest(request, contentStrategistChatSchema);
    if (!validation.valid) {
      console.error('[Strategist Chat API] Validation failed:', validation.response);
      return validation.response;
    }

    const { message, history } = validation.data;
    console.log('[Strategist Chat API] Message:', message.substring(0, 50), '... | History length:', history?.length || 0);

    // Check environment variables
    const geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey) {
      console.error('[Strategist Chat API] No Gemini API key found');
      return errorResponse(
        'GEMINI_API_KEY not configured. Please add your API key to .env.local',
        500
      );
    }

    // Call AI service for conversational chat
    console.log('[Strategist Chat API] Calling aiService.contentStrategistChat...');
    const chatResult = await aiService.contentStrategistChat(message, history);

    // Check if AI gathered all info and user confirmed
    if (chatResult.readyToGenerate && chatResult.parameters) {
      console.log('[Strategist Chat API] Ready to generate! Calling generateSocialMediaContent...');
      const { topic, platforms, contentType, tone } = chatResult.parameters;
      
      // Call the existing content generation function
      const generatedContent = await aiService.generateSocialMediaContent(
        topic,
        platforms,
        contentType,
        tone
      );

      // Return generated content with signal
      console.log('[Strategist Chat API] Content generated successfully!');
      return successResponse({
        response: chatResult.response,
        role: 'assistant',
        readyToGenerate: true,
        generatedContent: generatedContent,
        parameters: chatResult.parameters
      }, 'Content generated successfully');
    }

    // Regular conversation response
    console.log('[Strategist Chat API] Conversation response:', chatResult.response.substring(0, 100));
    return successResponse({
      response: chatResult.response,
      role: 'assistant'
    }, 'Chat response generated');

  } catch (error) {
    console.error('[Strategist Chat API] ERROR:', error);
    if (error instanceof Error) {
      console.error('[Strategist Chat API] Error message:', error.message);
      
      // Check for specific API key errors
      if (error.message.includes('API key') || error.message.includes('401') || error.message.includes('Unauthorized')) {
        return errorResponse('Invalid or missing API key. Please check your GEMINI_API_KEY in .env.local', 401);
      }
      
      // Check for rate limit errors
      if (error.message.includes('429') || error.message.includes('rate limit')) {
        return errorResponse('API rate limit exceeded. Please try again later.', 429);
      }
      
      // Return the actual error message if it's informative
      if (error.message && !error.message.includes('Failed to generate chat response')) {
        return errorResponse(error.message, 500);
      }
    }
    return serverErrorResponse(error);
  }
}
