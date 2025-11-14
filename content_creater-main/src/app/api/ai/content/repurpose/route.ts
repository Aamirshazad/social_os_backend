import { NextRequest } from 'next/server';
import { repurposeContentSchema } from '../../shared/validation';
import { validateRequest } from '../../shared/middleware';
import { successResponse, errorResponse, serverErrorResponse } from '../../shared/response';
import { aiService } from '../../shared/aiService';

/**
 * POST /api/ai/content/repurpose
 * Repurpose long-form content into multiple social media posts
 * 
 * Request body:
 * {
 *   longFormContent: string,
 *   platforms: Platform[],
 *   numberOfPosts?: number (default: 5)
 * }
 */
export async function POST(request: NextRequest) {
  try {
    console.log('[Repurpose API] Request received');
    
    // Validate request body
    const validation = await validateRequest(request, repurposeContentSchema);
    if (!validation.valid) {
      console.error('[Repurpose API] Validation failed:', validation.response);
      return validation.response;
    }

    const { longFormContent, platforms, numberOfPosts } = validation.data;
    console.log('[Repurpose API] Validated data:', { 
      contentLength: longFormContent.length, 
      platforms, 
      numberOfPosts 
    });

    // Check environment variables (prioritize NEXT_PUBLIC_GEMINI_API_KEY for production)
    const geminiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY || process.env.GEMENI_API_KEY;
    const hasGeminiKey = !!(geminiKey && geminiKey !== 'placeholder' && geminiKey !== 'your-actual-gemini-api-key-here');
    console.log('[Repurpose API] Gemini API key present:', hasGeminiKey);
    console.log('[Repurpose API] Environment variables check:', {
      hasNEXT_PUBLIC_GEMINI_API_KEY: !!process.env.NEXT_PUBLIC_GEMINI_API_KEY,
      hasGEMINI_API_KEY: !!process.env.GEMINI_API_KEY,
      keyValue: geminiKey ? `${geminiKey.substring(0, 10)}...` : 'undefined'
    });
    
    if (!hasGeminiKey) {
      console.error('[Repurpose API] CRITICAL: No valid Gemini API key found in environment');
      console.error('[Repurpose API] Please update your .env.local file with a valid API key');
      console.error('[Repurpose API] Get your API key at: https://aistudio.google.com/app/apikey');
      return errorResponse(
        'GEMINI_API_KEY not configured properly. Please add your actual Gemini API key to your .env.local file and restart the development server. Get one at: https://aistudio.google.com/app/apikey', 
        500
      );
    }

    // Repurpose content using AI service
    console.log('[Repurpose API] Calling aiService.repurposeContent...');
    const posts = await aiService.repurposeContent(
      longFormContent,
      platforms,
      numberOfPosts
    );

    console.log('[Repurpose API] Success! Generated', posts.length, 'posts');
    return successResponse(posts, `Successfully repurposed content into ${posts.length} posts`);
  } catch (error) {
    console.error('[Repurpose API] ERROR:', error);
    if (error instanceof Error) {
      console.error('[Repurpose API] Error message:', error.message);
      console.error('[Repurpose API] Error stack:', error.stack);
      
      // Check for specific API key errors
      if (error.message.includes('API key') || error.message.includes('401') || error.message.includes('Unauthorized')) {
        return errorResponse('Invalid or missing API key. Please check your GEMINI_API_KEY in .env.local', 401);
      }
      
      // Check for rate limit errors
      if (error.message.includes('429') || error.message.includes('rate limit')) {
        return errorResponse('API rate limit exceeded. Please try again later.', 429);
      }
      
      // Return the actual error message if it's informative
      if (error.message && !error.message.includes('Failed to repurpose content')) {
        return errorResponse(error.message, 500);
      }
    }
    return serverErrorResponse(error);
  }
}
