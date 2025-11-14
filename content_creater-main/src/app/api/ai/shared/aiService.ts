/**
 * Server-side AI Service
 * This module provides secure server-side access to AI services
 * API keys are never exposed to the client
 */

import { Agent, run } from '@openai/agents';
import { OpenAIChatCompletionsModel } from '@openai/agents-openai';
import OpenAI from 'openai';
import { z } from 'zod';
import { GoogleGenAI, Modality } from '@google/genai';
import { Platform, Tone, ContentType, PostContent } from '@/types';
import { PLATFORMS } from '@/constants';

// Lazy initialization for API key and clients
// Lazy initialization for API key and clients
let external_client: OpenAI | null = null;
let model: OpenAIChatCompletionsModel | null = null;

function getGeminiClient() {
  if (!external_client) {
    const gemini_api_key = process.env.GEMINI_API_KEY;
    if (!gemini_api_key) {
      throw new Error("GEMINI_API_KEY environment variable is not set.");
    }
    
    external_client = new OpenAI({
      apiKey: gemini_api_key,
      baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/"
    });
    
    model = new OpenAIChatCompletionsModel(
      external_client,
      'gemini-2.0-flash'
    );
  }
  return { client: external_client, model: model! };
}

function getGeminiApiKey() {
  const gemini_api_key = process.env.GEMINI_API_KEY;
  if (!gemini_api_key) {
    throw new Error("GEMINI_API_KEY environment variable is not set.");
  }
  return gemini_api_key;
}

function getOpenAIClient() {
  const openai_api_key = process.env.OPENAI_API_KEY;
  if (!openai_api_key) {
    throw new Error("OPENAI_API_KEY environment variable is not set.");
  }
  return new OpenAI({ apiKey: openai_api_key });
}

const getPlatformDetails = (platforms: Platform[]) => {
  return platforms.map(p => {
    const platformInfo = PLATFORMS.find(plat => plat.id === p);
    return `- ${platformInfo?.name}: Be mindful of its audience and character limit of ${platformInfo?.characterLimit}.`;
  }).join('\n');
};

export const aiService = {
  /**
   * Generate social media content for multiple platforms
   */
  async generateSocialMediaContent(
    topic: string,
    platforms: Platform[],
    contentType: ContentType,
    tone: Tone
  ): Promise<PostContent> {
    const platformDetails = getPlatformDetails(platforms);

    const prompt = `
      You are an expert AI social agent your name is Agent OS. Your task is to generate content for a social media post based on the provided topic your main task is generate video content.

      **Topic:** ${topic}
      **Content Type:** ${contentType}
      **Tone:** ${tone}

      **Target Platforms:**
      ${platformDetails}

      Please generate the following:
      1. Content tailored for each selected platform.
      2. A creative suggestion for a compelling image to accompany the post.
      3. A creative suggestion for a short, engaging video (e.g., Reel, Short, TikTok) related to the post.

      Return the response as a single JSON object. Do not include the original topic. Do not include any markdown formatting or explanatory text outside of the JSON object.
      The JSON object must have the following keys: "imageSuggestion", "videoSuggestion", and a key for each platform: ${platforms.join(', ')}.
    `;

    // Define Zod schema for structured output
    const contentSchema = z.object({
      imageSuggestion: z.string(),
      videoSuggestion: z.string(),
      ...platforms.reduce((acc, platform) => {
        acc[platform] = z.string();
        return acc;
      }, {} as Record<string, z.ZodString>)
    });

    try {
      const { model } = getGeminiClient();
      
      // Create agent with Gemini model
      const agent = new Agent({
        name: 'Gemini Content Generator',
        instructions: prompt,
        model: model,
        outputType: contentSchema,
      });

      // Run agent
      const result = await run(agent, `Generate social media content for topic: "${topic}" with ${contentType} style and ${tone} tone for platforms: ${platforms.join(', ')}`);

      if (!result.finalOutput) {
        throw new Error('No output generated');
      }

      return result.finalOutput;
    } catch (error) {
      console.error("Error generating social media content:", error);
      throw new Error("Failed to generate content. Please try again.");
    }
  },

  /**
   * Repurpose long-form content into multiple social media posts
   */
   /**
   * Repurpose long-form content into multiple social media posts
   */
  async repurposeContent(
    longFormContent: string,
    platforms: Platform[],
    numberOfPosts: number = 5
  ): Promise<Array<{ platforms: Platform[]; content: PostContent; topic: string }>> {
    const platformDetails = getPlatformDetails(platforms);

    const prompt = `
      You are an expert social media strategist. Your task is to repurpose the following long-form content into ${numberOfPosts} distinct, engaging social media posts.

      **Long-form Content:**
      ${longFormContent}

      **Target Platforms:**
      ${platformDetails}

      Create ${numberOfPosts} unique posts. Each post should:
      1. Focus on a different angle, key point, or insight from the content
      2. Be tailored for the specified platforms
      3. Include engaging hooks and calls-to-action
      4. Have a clear, specific topic/focus
      5. Include image and video suggestions

      Return the response as a JSON array of ${numberOfPosts} post objects. Each object must have:
      - "topic": A brief description of the post's focus
      - "platforms": Array of platform names (${platforms.join(', ')})
      - "content": Object with keys for each platform (${platforms.join(', ')}) plus "imageSuggestion" and "videoSuggestion"

      Do not include any markdown formatting or explanatory text outside of the JSON array.
    `;

    // Define Zod schema for structured output
    const contentSchema = z.object({
      imageSuggestion: z.string(),
      videoSuggestion: z.string(),
      ...platforms.reduce((acc, platform) => {
        acc[platform] = z.string();
        return acc;
      }, {} as Record<string, z.ZodString>)
    });

    const postSchema = z.object({
      topic: z.string(),
      platforms: z.array(z.string()),
      content: contentSchema
    });

    const responseSchema = z.array(postSchema);

    try {
      const { model } = getGeminiClient();
      
      const agent = new Agent({
        name: 'Gemini Content Repurposer',
        instructions: prompt,
        model: model,
        outputType: responseSchema as any,
      });

      const result = await run(agent, `Repurpose this content into ${numberOfPosts} posts`);

      if (!result.finalOutput) {
        throw new Error('No output generated');
      }

      return result.finalOutput as Array<{ platforms: Platform[]; content: PostContent; topic: string }>;
    } catch (error) {
      console.error("Error repurposing content:", error);
      throw new Error("Failed to repurpose content. Please try again.");
    }
  },
  /**
   * Improve a prompt for image or video generation
   */
  async improvePrompt(
    prompt: string,
    type: 'image' | 'video',
    userGuidance?: string
  ): Promise<string> {
    const guidanceText = userGuidance ? `\n\nUser's specific guidance: "${userGuidance}"\nMake sure to incorporate this guidance into your improvements.` : '';
    const improvePromptText = `
      You are a creative prompt engineer for an advanced generative AI.
      Your task is to take a user's idea and expand it into a rich, detailed, and evocative prompt that will produce a stunning visual.
      For an ${type}, focus on cinematic quality, lighting, composition, and mood.
      Do NOT add any explanatory text, markdown, or preamble. Return ONLY the improved prompt text.

      Original idea: "${prompt}"${guidanceText}
    `;

    try {
      const { model } = getGeminiClient();
      
      const agent = new Agent({
        name: 'Gemini Prompt Optimizer',
        instructions: improvePromptText,
        model: model,
      });

      const result = await run(agent, `Improve this ${type} prompt: ${prompt}`);
      return (result.finalOutput || '').trim();
    } catch (error) {
      console.error("Error improving prompt:", error);
      throw new Error("Failed to improve prompt.");
    }
  },

  /**
   * Generate an image using AI with OpenAI
   * @deprecated Use imageGenerationService from @/features/imageGeneration for new code
   * This method is kept for backward compatibility only
   */
  async generateImage(prompt: string): Promise<string> {
    try {
      console.log('[aiService.generateImage] Delegating to new imageGenerationService');
      
      // Dynamically import to avoid circular dependencies
      const { imageGenerationService } = await import('@/features/imageGeneration');
      
      // Use new service with default options
      const result = await imageGenerationService.generateImage(prompt, {
        quality: 'medium',
        size: '1024x1024',
        format: 'png',
        background: 'auto',
      });

      console.log('[aiService.generateImage] Image generated successfully');
      return result.imageUrl;
    } catch (error) {
      console.error("[aiService.generateImage] Error:", error);
      throw new Error("Failed to generate image.");
    }
  },

  /**
   * Generate a video using AI with OpenAI Sora
   */
  async generateVideo(prompt: string) {
    try {
      const openai = getOpenAIClient();
      
      // Start video generation with Sora 2 model
      const video = await openai.videos.create({
        model: 'sora-2', // Use 'sora-2-pro' for higher quality
        prompt: prompt,
        size: '1280x720', // 720p resolution
        seconds: '8' as any, // 8 second video
      });
      
      console.log('Sora video generation started:', video);
      return video;
    } catch (error) {
      console.error("Error starting video generation:", error);
      if (error instanceof Error && error.message.includes("API key")) {
        throw new Error('API_KEY_INVALID');
      }
      throw new Error("Failed to start video generation.");
    }
  },

  /**
   * Check video generation status with OpenAI Sora
   */
  async checkVideoStatus(videoId: string) {
    try {
      const openai = getOpenAIClient();
      
      // Retrieve current status of the video generation job
      const video = await openai.videos.retrieve(videoId);
      
      console.log('Sora video status:', video.status, 'Progress:', video.progress);
      return video;
    } catch (error) {
      console.error("Error checking video status:", error);
      if (error instanceof Error && error.message.includes("API key")) {
        throw new Error('API_KEY_INVALID');
      }
      throw new Error("Failed to check video status.");
    }
  },

  /**
   * Download completed video from OpenAI Sora
   */
  async downloadVideo(videoId: string): Promise<Buffer> {
    try {
      const openai = getOpenAIClient();
      
      // Download the completed video content
      const content = await openai.videos.downloadContent(videoId);
      const arrayBuffer = await content.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      
      console.log('Sora video downloaded, size:', buffer.length, 'bytes');
      return buffer;
    } catch (error) {
      console.error("Error downloading video:", error);
      throw new Error("Failed to download video.");
    }
  },

  /**
   * Generate campaign brief
   */
  async generateCampaignBrief(
    name: string,
    goals: string[],
    platforms: Platform[]
  ): Promise<{ audience: string; pillars: string[]; cadence: string; keyMessages: string[]; risks: string[]; }> {
    const platformDetails = getPlatformDetails(platforms);
    const prompt = `You are a senior social media strategist. Create a brief for the campaign "${name}".
Goals:\n- ${goals.join('\n- ')}\nPlatforms:\n${platformDetails}\nReturn JSON with keys: audience, pillars (array), cadence (string), keyMessages (array), risks (array).`;

    const briefSchema = z.object({
      audience: z.string(),
      pillars: z.array(z.string()),
      cadence: z.string(),
      keyMessages: z.array(z.string()),
      risks: z.array(z.string())
    });

    try {
      const { model } = getGeminiClient();
      
      const agent = new Agent({
        name: 'Gemini Campaign Strategist',
        instructions: prompt,
        model: model,
        outputType: briefSchema,
      });

      const result = await run(agent, `Create campaign brief for: ${name}`);

      if (!result.finalOutput) {
        throw new Error('No output generated');
      }

      return result.finalOutput;
    } catch (error) {
      console.error('Error generating campaign brief:', error);
      throw new Error('Failed to generate brief');
    }
  },

  /**
   * Generate campaign ideas
   */
  async generateCampaignIdeas(
    name: string,
    pillars: string[],
    platforms: Platform[]
  ): Promise<Array<{ title: string; description: string; platforms?: Platform[] }>> {
    const platformDetails = getPlatformDetails(platforms);
    const prompt = `Generate 10 organic content ideas for the campaign "${name}" based on pillars: ${pillars.join(', ')}. Target platforms:\n${platformDetails}\nReturn as JSON array of objects with title, description, and optional platforms.`;

    const ideaSchema = z.object({
      title: z.string(),
      description: z.string(),
      platforms: z.array(z.string()).optional()
    });

    const ideasSchema = z.array(ideaSchema);

    try {
      const { model } = getGeminiClient();
      
      const agent = new Agent({
        name: 'Gemini Idea Generator',
        instructions: prompt,
        model: model,
        outputType: ideasSchema as any,
      });

      const result = await run(agent, `Generate ideas for campaign: ${name}`);

      if (!result.finalOutput) {
        throw new Error('No output generated');
      }

      return result.finalOutput as Array<{ title: string; description: string; platforms?: Platform[] }>;
    } catch (error) {
      console.error('Error generating campaign ideas:', error);
      throw new Error('Failed to generate ideas');
    }
  },

  /**
   * Generate engagement score for a post
   */
  async generateEngagementScore(
    postContent: string,
    platform: Platform,
    hasImage: boolean,
    hasVideo: boolean
  ): Promise<{ score: number; suggestions: string[] }> {
    const prompt = `
      You are a social media analytics expert. Analyze the following post and predict its engagement potential.

      **Platform:** ${platform}
      **Has Image:** ${hasImage ? 'Yes' : 'No'}
      **Has Video:** ${hasVideo ? 'Yes' : 'No'}
      **Post Content:**
      ${postContent}

      Analyze the post based on:
      - Readability and clarity
      - Emotional appeal and sentiment
      - Use of hashtags (if applicable)
      - Presence of call-to-action
      - Content length appropriateness for the platform
      - Visual content presence

      Return a JSON object with:
      - "score": A number between 0-100 indicating predicted engagement potential
      - "suggestions": An array of 3-5 specific, actionable suggestions to improve engagement

      Do not include markdown or explanatory text outside the JSON object.
    `;

    const scoreSchema = z.object({
      score: z.number().min(0).max(100),
      suggestions: z.array(z.string())
    });

    try {
      const { model } = getGeminiClient();
      
      const agent = new Agent({
        name: 'Gemini Engagement Analyzer',
        instructions: prompt,
        model: model,
        outputType: scoreSchema,
      });

      const result = await run(agent, `Analyze engagement for: ${postContent.substring(0, 100)}`);

      if (!result.finalOutput) {
        throw new Error('No output generated');
      }

      return result.finalOutput;
    } catch (error) {
      console.error('Error generating engagement score:', error);
      throw new Error('Failed to generate engagement score');
    }
  },

  /**
   * Content Strategist Chat - Conversational AI for gathering content strategy info
   * Guides user to provide: topic, platforms, contentType, tone
   * Returns conversation response and signals when ready to generate
   */
  async contentStrategistChat(
    message: string,
    history?: Array<{ role: 'user' | 'assistant'; content: string }>
  ): Promise<{ response: string; readyToGenerate?: boolean; parameters?: { topic: string; platforms: Platform[]; contentType: ContentType; tone: Tone } }> {
    const platformList = PLATFORMS.map(p => p.id).join(', ');

    const systemInstruction = `You are 'Cortext AI', an expert social media strategist. Your goal is to help users create social media content by gathering the necessary information through conversation.

**Available Platforms:** ${platformList}
**Content Types:** engaging, educational, promotional, storytelling
**Tones:** professional, casual, humorous, inspirational, urgent, friendly

**Your Process:**
1. Start by asking what the user wants to promote or talk about (this will be the TOPIC)
2. Guide the conversation to gather:
   - A clear **topic** (what they want to post about)
   - Target **platforms** (from the available list above)
   - **Content type** (engaging, educational, promotional, or storytelling)
   - **Tone** (professional, casual, humorous, inspirational, urgent, or friendly)

3. Once you have ALL required information, summarize the plan using this EXACT format:
   
   **Summary:**
   - **Topic:** [the topic]
   - **Platforms:** [platform1, platform2, etc.]
   - **Content Type:** [contentType]
   - **Tone:** [tone]
   
   Then ask: "Ready to generate your content? (yes/no)"

4. When the user confirms (yes/ready/go/proceed), respond with ONLY this JSON:
   \`\`\`json
   {
     "topic": "extracted topic here",
     "platforms": ["platform1", "platform2"],
     "contentType": "engaging|educational|promotional|storytelling",
     "tone": "professional|casual|humorous|inspirational|urgent|friendly"
   }
   \`\`\`

**CRITICAL RULES:**
- Be conversational and friendly
- Ask ONE question at a time
- Only show the JSON when user explicitly confirms
- Validate platforms against the available list
- Ensure contentType and tone match the allowed values`;

    // Build conversation context
    const conversationHistory = history || [];
    const contextMessages = conversationHistory
      .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
      .join('\n\n');
    
    const fullPrompt = contextMessages 
      ? `${systemInstruction}\n\n**Conversation History:**\n${contextMessages}\n\n**Current User Message:**\n${message}`
      : `${systemInstruction}\n\n**User Message:**\n${message}`;

    try {
      console.log('[contentStrategistChat] Getting Gemini client...');
      const { model } = getGeminiClient();
      
      console.log('[contentStrategistChat] Creating agent...');
      const agent = new Agent({
        name: 'Cortext AI Content Strategist',
        instructions: fullPrompt,
        model: model,
      });

      console.log('[contentStrategistChat] Running agent with message:', message.substring(0, 50));
      const result = await run(agent, message);

      console.log('[contentStrategistChat] Agent run completed. Checking result...');
      if (!result.finalOutput) {
        console.error('[contentStrategistChat] No output generated from agent');
        throw new Error('No output generated');
      }

      console.log('[contentStrategistChat] Processing result...');
      const response = typeof result.finalOutput === 'string' 
        ? result.finalOutput 
        : JSON.stringify(result.finalOutput);

      console.log('[contentStrategistChat] Response received (first 100 chars):', response.substring(0, 100));

      // Check if response contains JSON parameters (user confirmed)
      const jsonMatch = response.match(/```json\n([\s\S]*?)\n```/);
      if (jsonMatch && jsonMatch[1]) {
        console.log('[contentStrategistChat] Found JSON parameters in response');
        try {
          const parameters = JSON.parse(jsonMatch[1]);
          // Validate parameters
          if (parameters.topic && parameters.platforms && parameters.contentType && parameters.tone) {
            console.log('[contentStrategistChat] Parameters validated, ready to generate');
            // Signal that we're ready to generate
            return {
              response: "Perfect! Generating your content now...",
              readyToGenerate: true,
              parameters: parameters
            };
          }
        } catch (parseError) {
          console.error("[contentStrategistChat] JSON parsing error:", parseError);
        }
      }

      // Regular conversation response
      console.log('[contentStrategistChat] Returning regular conversation response');
      return { response };
        
    } catch (error) {
      console.error('[contentStrategistChat] Error occurred:', error);
      if (error instanceof Error) {
        console.error('[contentStrategistChat] Error message:', error.message);
        console.error('[contentStrategistChat] Error stack:', error.stack);
        
        // Preserve more specific error messages
        if (error.message.includes('API key') || error.message.includes('GEMINI_API_KEY')) {
          throw error;
        }
        
        // Provide more context in the error
        throw new Error(`Failed to generate chat response: ${error.message}`);
      }
      throw new Error('Failed to generate chat response: Unknown error');
    }
  },
};