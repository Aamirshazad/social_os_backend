/**
 * Image Generation Service - Core Logic
 * Professional service for OpenAI GPT Image 1 generation
 * Separated concerns: This file contains ONLY business logic
 */

import OpenAI from 'openai';
import {
  ImageGenerationOptions,
  ImageGenerationResult,
  ImageGenerationError,
  ImageGenerationErrorType,
  StreamingProgressEvent,
  ImageEditRequest,
  ImageToImageRequest,
} from '../types/imageGeneration.types';
import {
  improveImagePromptTemplate,
  qualityEnhancements,
} from '../prompts/imageGeneration.prompts';

// Lazy client initialization
let openaiClient: OpenAI | null = null;

/**
 * Get or initialize OpenAI client
 */
function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new ImageGenerationError(
        ImageGenerationErrorType.API_KEY_INVALID,
        'OPENAI_API_KEY environment variable is not set'
      );
    }
    openaiClient = new OpenAI({ apiKey });
  }
  return openaiClient;
}

/**
 * Apply default options and validate
 */
function applyDefaults(options: ImageGenerationOptions = {}): Required<ImageGenerationOptions> {
  return {
    size: options.size || '1024x1024',
    quality: options.quality || 'medium',
    format: options.format || 'png',
    background: options.background || 'auto',
    output_compression: options.output_compression || 80,
    moderation: options.moderation || 'auto',
  };
}

/**
 * Build request parameters for OpenAI API
 * According to official OpenAI docs
 */
function buildRequestParams(
  prompt: string,
  options: Required<ImageGenerationOptions>,
  streamingOptions?: { stream: boolean; partial_images?: number }
): any {
  const params: any = {
    model: 'gpt-image-1',
    prompt,
    // NOTE: gpt-image-1 Image API does NOT support 'response_format' or 'format' parameters
    // Format is handled by saving the b64_json data with appropriate extension
    // Per OpenAI docs: size must be specific dimension, not 'auto'
    size: options.size && options.size !== 'auto' ? options.size : '1024x1024',
    quality: options.quality !== 'auto' ? options.quality : undefined,
    background: options.background !== 'auto' ? options.background : undefined,
    moderation: options.moderation,
  };

  // NOTE: output_compression is also not supported in Image API
  // Format and compression are handled when saving the base64 data

  // Add streaming params (per docs: 0-3 partial images)
  if (streamingOptions?.stream) {
    params.stream = true;
    params.partial_images = streamingOptions.partial_images ?? 2; // Default to 2 partial images
  }

  // Remove undefined values
  Object.keys(params).forEach((key) => {
    if (params[key] === undefined) {
      delete params[key];
    }
  });

  return params;
}

/**
 * Convert base64 to data URL with appropriate MIME type
 */
function base64ToDataUrl(base64: string, format: string): string {
  return `data:image/${format};base64,${base64}`;
}

/**
 * Image Generation Service
 */
export const imageGenerationService = {
  /**
   * Generate a single image with GPT Image 1
   */
  async generateImage(
    prompt: string,
    options: ImageGenerationOptions = {}
  ): Promise<ImageGenerationResult> {
    const startTime = Date.now();

    try {
      const openai = getOpenAIClient();
      const finalOptions = applyDefaults(options);
      const params = buildRequestParams(prompt, finalOptions);

      console.log('🎨 Starting image generation:', {
        model: params.model,
        size: params.size,
        quality: params.quality,
        format: params.format,
        background: params.background,
        promptLength: prompt.length,
      });

      const response = await openai.images.generate(params);

      if (!response.data || response.data.length === 0) {
        throw new ImageGenerationError(
          ImageGenerationErrorType.GENERATION_FAILED,
          'No image data received from API'
        );
      }

      const imageData = response.data[0];
      
      // OpenAI returns b64_json by default (no parameter needed)
      const base64Image = imageData.b64_json;

      if (!base64Image) {
        throw new ImageGenerationError(
          ImageGenerationErrorType.GENERATION_FAILED,
          'No base64 data in response'
        );
      }

      const generationTime = Date.now() - startTime;
      // API returns PNG format by default (format parameter not supported)
      const imageUrl = base64ToDataUrl(base64Image, 'png');

      console.log(`✅ Image generated successfully in ${generationTime}ms`);

      return {
        imageUrl,
        metadata: {
          ...finalOptions,
          model: 'gpt-image-1',
          promptUsed: prompt,
          revisedPrompt: (imageData as any).revised_prompt,
        },
        generatedAt: Date.now(),
        generationTime,
      };
    } catch (error) {
      console.error('❌ Image generation failed:', error);

      if (error instanceof ImageGenerationError) {
        throw error;
      }

      if (error instanceof Error) {
        if (error.message.includes('API key')) {
          throw new ImageGenerationError(
            ImageGenerationErrorType.API_KEY_INVALID,
            'Invalid API key',
            error
          );
        }
        if (error.message.includes('rate limit')) {
          throw new ImageGenerationError(
            ImageGenerationErrorType.RATE_LIMIT,
            'Rate limit exceeded',
            error
          );
        }
      }

      throw new ImageGenerationError(
        ImageGenerationErrorType.GENERATION_FAILED,
        error instanceof Error ? error.message : 'Unknown error occurred',
        error
      );
    }
  },

  /**
   * Generate image with streaming (progressive generation)
   * Per OpenAI docs: supports 0-3 partial images during generation
   */
  async generateImageStreaming(
    prompt: string,
    options: ImageGenerationOptions = {},
    onProgress?: (event: StreamingProgressEvent) => void,
    partialImagesCount: number = 2 // 0-3 partial images
  ): Promise<ImageGenerationResult> {
    const startTime = Date.now();

    try {
      const openai = getOpenAIClient();
      const finalOptions = applyDefaults(options);
      const params = buildRequestParams(prompt, finalOptions, {
        stream: true,
        partial_images: Math.min(Math.max(0, partialImagesCount), 3), // Clamp 0-3
      });

      console.log(`🎨 Starting streaming image generation (${params.partial_images} partial images)`);

      const stream = await openai.images.generate(params) as any;

      let finalImage: string | null = null;
      let revisedPrompt: string | undefined;
      let partialCount = 0;

      // Per OpenAI docs: stream events for progressive generation
      // @ts-ignore - OpenAI SDK streaming types may not be fully defined
      for await (const event of stream) {
        console.log('📡 Stream event:', event.type);
        
        // Partial images during generation (per docs example)
        if (event.type === 'image_generation.partial_image') {
          const idx = event.partial_image_index;
          const imageBase64 = event.b64_json;
          const progress = ((idx + 1) / (partialImagesCount + 1)) * 100;
          
          partialCount++;
          console.log(`📊 Partial image ${idx + 1}/${partialImagesCount}: ${Math.round(progress)}%`);

          if (onProgress) {
            onProgress({
              type: 'partial',
              partial_image_index: idx,
              imageB64: imageBase64,
              b64_json: imageBase64,
              progress,
            });
          }
        }
        // Final image (after all partials complete)
        // The docs don't explicitly show this, but the final image comes as a regular response
        else if (event.b64_json) {
          finalImage = event.b64_json;
          revisedPrompt = event.revised_prompt;
          console.log('✅ Final image received');
        }
        // Alternative: response data array format (non-streaming compatible)
        else if (event.data?.[0]?.b64_json) {
          finalImage = event.data[0].b64_json;
          revisedPrompt = event.data[0].revised_prompt;
          console.log('✅ Final image received (data format)');
        }
      }

      if (!finalImage) {
        throw new ImageGenerationError(
          ImageGenerationErrorType.STREAMING_FAILED,
          `No final image received from stream. Received ${partialCount} partial images. Stream may have ended prematurely.`
        );
      }

      const generationTime = Date.now() - startTime;
      const imageUrl = base64ToDataUrl(finalImage, finalOptions.format);

      if (onProgress) {
        onProgress({
          type: 'final',
          progress: 100,
        });
      }

      return {
        imageUrl,
        metadata: {
          ...finalOptions,
          model: 'gpt-image-1',
          promptUsed: prompt,
          revisedPrompt,
        },
        generatedAt: Date.now(),
        generationTime,
      };
    } catch (error) {
      console.error('❌ Streaming generation failed:', error);

      if (onProgress) {
        onProgress({
          type: 'error',
          error: error instanceof Error ? error.message : 'Generation failed',
        });
      }

      if (error instanceof ImageGenerationError) {
        throw error;
      }

      throw new ImageGenerationError(
        ImageGenerationErrorType.STREAMING_FAILED,
        error instanceof Error ? error.message : 'Streaming failed',
        error
      );
    }
  },

  /**
   * Edit image with mask (inpainting)
   * Per OpenAI docs: Uses images.edit() with mask parameter
   */
  async editImageWithMask(
    request: ImageEditRequest
  ): Promise<ImageGenerationResult> {
    const startTime = Date.now();

    try {
      const openai = getOpenAIClient();
      const finalOptions = applyDefaults(request.options);

      console.log('✂️ Starting image editing with mask');

      // Helper function to convert URL to buffer
      const urlToBuffer = async (url: string, type: string): Promise<Buffer> => {
        // Data URL (base64)
        if (url.startsWith('data:')) {
          const base64Data = url.split(',')[1];
          if (!base64Data) {
            throw new Error(`Failed to extract base64 data from ${type}`);
          }
          return Buffer.from(base64Data, 'base64');
        }
        
        // HTTP/HTTPS URL - fetch it
        if (url.startsWith('http://') || url.startsWith('https://')) {
          console.log(`📥 Fetching ${type} from URL...`);
          const response = await fetch(url);
          if (!response.ok) {
            throw new Error(`Failed to fetch ${type}: ${response.status}`);
          }
          const arrayBuffer = await response.arrayBuffer();
          return Buffer.from(arrayBuffer);
        }
        
        throw new Error(`Unsupported ${type} URL format`);
      };

      const imageBuffer = await urlToBuffer(request.originalImageUrl, 'original image');
      const maskBuffer = await urlToBuffer(request.maskImageUrl, 'mask image');

      // Per OpenAI docs: edit endpoint supports: model, image, mask, prompt
      // NOTE: quality and background are NOT supported in images.edit()
      const params: any = {
        model: 'gpt-image-1',
        image: imageBuffer,
        mask: maskBuffer,
        prompt: request.prompt,
      };

      const response = await openai.images.edit(params);

      if (!response.data || response.data.length === 0) {
        throw new ImageGenerationError(
          ImageGenerationErrorType.GENERATION_FAILED,
          'No edited image data received'
        );
      }

      const base64Image = response.data[0].b64_json;

      if (!base64Image) {
        throw new ImageGenerationError(
          ImageGenerationErrorType.GENERATION_FAILED,
          'No base64 data in edit response'
        );
      }

      const generationTime = Date.now() - startTime;
      // API returns PNG format by default
      const imageUrl = base64ToDataUrl(base64Image, 'png');

      console.log(`✅ Image editing complete in ${generationTime}ms`);

      return {
        imageUrl,
        metadata: {
          ...finalOptions,
          model: 'gpt-image-1',
          promptUsed: request.prompt,
        },
        generatedAt: Date.now(),
        generationTime,
      };
    } catch (error) {
      console.error('❌ Image editing failed:', error);

      throw new ImageGenerationError(
        ImageGenerationErrorType.GENERATION_FAILED,
        error instanceof Error ? error.message : 'Image editing failed',
        error
      );
    }
  },

  /**
   * Generate from reference images (image-to-image)
   * Per OpenAI docs: Uses images.edit() with multiple images and input_fidelity
   */
  async generateFromReferences(
    request: ImageToImageRequest
  ): Promise<ImageGenerationResult> {
    const startTime = Date.now();

    try {
      const openai = getOpenAIClient();
      const finalOptions = applyDefaults(request.options);

      console.log('🖼️ Starting image-to-image generation with', request.referenceImages.length, 'reference(s)');

      // Convert reference images to buffers (per OpenAI docs)
      const imageBuffers = await Promise.all(
        request.referenceImages.map(async (url) => {
          console.log('🔍 Processing image URL:', url.substring(0, 50) + '...');
          
          // Check if it's a data URL (base64)
          if (url.startsWith('data:')) {
            const base64Data = url.split(',')[1];
            if (!base64Data) {
              throw new Error('Failed to extract base64 data from data URL');
            }
            return Buffer.from(base64Data, 'base64');
          }
          
          // Otherwise, it's an HTTP/HTTPS URL - fetch it
          if (url.startsWith('http://') || url.startsWith('https://')) {
            console.log('📥 Fetching image from URL...');
            const response = await fetch(url);
            if (!response.ok) {
              throw new Error(`Failed to fetch image from URL: ${response.status}`);
            }
            const arrayBuffer = await response.arrayBuffer();
            return Buffer.from(arrayBuffer);
          }
          
          throw new Error(`Unsupported URL format: ${url.substring(0, 100)}`);
        })
      );

      // Per OpenAI docs: edit endpoint supports: model, image, prompt, input_fidelity
      // NOTE: quality and background are NOT supported in images.edit()
      const params: any = {
        model: 'gpt-image-1',
        image: imageBuffers, // Array of buffers for multiple references
        prompt: request.prompt,
        input_fidelity: request.input_fidelity || 'high', // 'low' | 'high' per docs
      };

      const response = await openai.images.edit(params);

      if (!response.data || response.data.length === 0) {
        throw new ImageGenerationError(
          ImageGenerationErrorType.GENERATION_FAILED,
          'No image data from reference generation'
        );
      }

      const base64Image = response.data[0].b64_json;

      if (!base64Image) {
        throw new ImageGenerationError(
          ImageGenerationErrorType.GENERATION_FAILED,
          'No base64 data in reference generation response'
        );
      }

      const generationTime = Date.now() - startTime;
      // API returns PNG format by default
      const imageUrl = base64ToDataUrl(base64Image, 'png');

      console.log(`✅ Reference-based generation complete in ${generationTime}ms`);

      return {
        imageUrl,
        metadata: {
          ...finalOptions,
          model: 'gpt-image-1',
          promptUsed: request.prompt,
        },
        generatedAt: Date.now(),
        generationTime,
      };
    } catch (error) {
      console.error('❌ Reference-based generation failed:', error);

      throw new ImageGenerationError(
        ImageGenerationErrorType.GENERATION_FAILED,
        error instanceof Error ? error.message : 'Reference generation failed',
        error
      );
    }
  },

  /**
   * Batch generate multiple variations
   */
  async generateBatch(
    prompts: string[],
    options: ImageGenerationOptions = {}
  ): Promise<ImageGenerationResult[]> {
    console.log(`🎨 Batch generating ${prompts.length} images`);

    const results = await Promise.allSettled(
      prompts.map((prompt) => this.generateImage(prompt, options))
    );

    const successfulResults = results
      .filter((r) => r.status === 'fulfilled')
      .map((r) => (r as PromiseFulfilledResult<ImageGenerationResult>).value);

    const failedCount = results.length - successfulResults.length;

    if (failedCount > 0) {
      console.warn(`⚠️ ${failedCount} of ${prompts.length} generations failed`);
    }

    return successfulResults;
  },
};

export default imageGenerationService;
