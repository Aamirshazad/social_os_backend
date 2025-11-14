/**
 * API Route: Stream Image Generation
 * Server-Sent Events for progressive image generation
 */

import { NextRequest } from 'next/server';
import { imageGenerationService } from '@/features/imageGeneration';
import {
  streamingImageRequestSchema,
  type StreamingImageRequestInput,
} from '@/features/imageGeneration/schemas/imageGeneration.schema';

/**
 * POST /api/ai/media/image/stream
 * Generate image with streaming progress
 */
export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body: StreamingImageRequestInput = await request.json();
    const validation = streamingImageRequestSchema.safeParse(body);

    if (!validation.success) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid request data',
          details: validation.error.errors,
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const { prompt, options, partial_images } = validation.data;

    console.log('[Image Streaming] Request received:', {
      promptLength: prompt.length,
      options,
      partial_images: partial_images ?? 2,
    });

    // Create a ReadableStream for Server-Sent Events
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Generate with streaming progress (per OpenAI docs: 0-3 partial images)
          const result = await imageGenerationService.generateImageStreaming(
            prompt,
            options,
            (event) => {
              // Send progress event (partial images)
              const data = JSON.stringify(event);
              controller.enqueue(encoder.encode(`data: ${data}\n\n`));
            },
            partial_images ?? 2 // Default to 2 partial images
          );

          // Send final image with complete data
          // Extract base64 from data URL if needed
          const imageBase64 = result.imageUrl.includes('base64,')
            ? result.imageUrl.split('base64,')[1]
            : result.imageUrl;

          const finalData = JSON.stringify({
            type: 'complete',
            imageUrl: result.imageUrl, // Full data URL
            b64_json: imageBase64, // Just base64 for compatibility
            metadata: result.metadata,
            generatedAt: result.generatedAt,
            generationTime: result.generationTime,
          });
          controller.enqueue(encoder.encode(`data: ${finalData}\n\n`));

          controller.close();
        } catch (error) {
          const errorData = JSON.stringify({
            type: 'error',
            error: error instanceof Error ? error.message : 'Unknown error',
          });
          controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    console.error('[Image Streaming] Error:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
