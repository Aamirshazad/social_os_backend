/**
 * DEPRECATED: This file is being phased out in favor of server-side API routes.
 * All AI generation functions have been migrated to /src/app/api/ai/
 * 
 * Client components should now call the API routes instead of importing from this file:
 * - /api/ai/content/generate - Generate social media content
 * - /api/ai/content/repurpose - Repurpose long-form content
 * - /api/ai/media/image - Generate images
 * - /api/ai/media/video - Generate videos
 * - /api/ai/prompts/improve - Improve prompts
 * - /api/ai/campaigns/brief - Generate campaign briefs
 * - /api/ai/campaigns/ideas - Generate campaign ideas
 * - /api/ai/content/engagement - Generate engagement scores
 * 
 * This file is kept for backward compatibility only.
 */

import { Agent, run, tool, setDefaultOpenAIClient } from '@openai/agents';
import { imageGenerationTool, webSearchTool } from '@openai/agents-openai';
import OpenAI from 'openai';
import { z } from 'zod';
import { Platform, Tone, ContentType, PostContent } from '@/types';
import { PLATFORMS } from '@/constants';

// DEPRECATED: Use server-side API routes instead
// Configure OpenAI SDK to use Gemini API (server-side only)
const geminiClient = new OpenAI({
    apiKey: process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY,
    baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
});

// Set Gemini as default client for Agent SDK
setDefaultOpenAIClient(geminiClient);

// DEPRECATED: Use server-side API routes instead
// Initialize OpenAI client for direct API calls (TTS, DALL-E, etc.)
const getOpenAIClient = () => {
    return new OpenAI({
        apiKey: process.env.OPENAI_API_KEY || process.env.NEXT_PUBLIC_OPENAI_API_KEY,
    });
};

const getPlatformDetails = (platforms: Platform[]) => {
    return platforms.map(p => {
        const platformInfo = PLATFORMS.find(plat => plat.id === p);
        return `- ${platformInfo?.name}: Be mindful of its audience and character limit of ${platformInfo?.characterLimit}.`;
    }).join('\n');
};

// Robustly parse JSON from model text output, handling code fences and extra text
const parseJsonFromText = <T = any>(text: string): T => {
    if (!text) {
        throw new Error('Empty JSON response');
    }
    let cleaned = text.trim();
    // Strip common code fences
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
    // Quick attempt
    try {
        return JSON.parse(cleaned) as T;
    } catch {}
    // Extract first balanced JSON block ({...} or [...])
    const firstBrace = cleaned.indexOf('{');
    const firstBracket = cleaned.indexOf('[');
    let start = -1;
    let openChar = '';
    if (firstBracket !== -1 && (firstBrace === -1 || firstBracket < firstBrace)) {
        start = firstBracket;
        openChar = '[';
    } else if (firstBrace !== -1) {
        start = firstBrace;
        openChar = '{';
    }
    if (start === -1) {
        throw new Error('No JSON found in response');
    }
    const closeChar = openChar === '[' ? ']' : '}';
    let depth = 0;
    let inString = false;
    let escape = false;
    for (let i = start; i < cleaned.length; i++) {
        const ch = cleaned[i];
        if (inString) {
            if (!escape && ch === '"') inString = false;
            escape = !escape && ch === '\\';
        } else {
            if (ch === '"') {
                inString = true;
            } else if (ch === openChar) {
                depth++;
            } else if (ch === closeChar) {
                depth--;
                if (depth === 0) {
                    const candidate = cleaned.slice(start, i + 1);
                    // Remove trailing commas before closing braces/brackets
                    const fixed = candidate.replace(/,\s*([}\]])/g, '$1');
                    return JSON.parse(fixed) as T;
                }
            }
        }
    }
    throw new Error('Failed to extract valid JSON');
};


export const generateSocialMediaContent = async (
    topic: string,
    platforms: Platform[],
    contentType: ContentType,
    tone: Tone
): Promise<PostContent> => {
    const platformDetails = getPlatformDetails(platforms);

    const prompt = `
        You are an expert AI social agent your name is Agent OS . Your task is to generate content for a social media post based on the provided topic your main task is genrate video content.

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
        const agent = new Agent({
            name: 'Gemini Content Generator',
            instructions: prompt,
            model: 'gemini-2.0-flash-exp',
            outputType: contentSchema
        });

        const result = await run(agent, `Generate social media content for topic: "${topic}" with ${contentType} style and ${tone} tone for platforms: ${platforms.join(', ')}`);

        if (!result.finalOutput) {
            throw new Error('No output generated');
        }

        return result.finalOutput;
    } catch (error) {
        console.error("Error generating social media content:", error);
        throw new Error("Failed to generate content. Please try again.");
    }
};

export const generateCampaignBrief = async (
    name: string,
    goals: string[],
    platforms: Platform[]
): Promise<{ audience: string; pillars: string[]; cadence: string; keyMessages: string[]; risks: string[]; }> => {
    const platformDetails = getPlatformDetails(platforms);
    const prompt = `You are a senior social media strategist. Create a brief for the campaign "${name}".
Goals:\n- ${goals.join('\n- ')}\nPlatforms:\n${platformDetails}\nReturn JSON with keys: audience, pillars (array), cadence (string), keyMessages (array), risks (array).`;

    // Define Zod schema for structured output
    const briefSchema = z.object({
        audience: z.string(),
        pillars: z.array(z.string()),
        cadence: z.string(),
        keyMessages: z.array(z.string()),
        risks: z.array(z.string())
    });

    try {
        const agent = new Agent({
            name: 'Gemini Campaign Strategist',
            instructions: prompt,
            model: 'gemini-2.0-flash-exp',
            outputType: briefSchema
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
};

export const generateCampaignIdeas = async (
    name: string,
    pillars: string[],
    platforms: Platform[]
): Promise<Array<{ title: string; description: string; platforms?: Platform[] }>> => {
    const platformDetails = getPlatformDetails(platforms);
    const prompt = `Generate 10 organic content ideas for the campaign "${name}" based on pillars: ${pillars.join(', ')}. Target platforms:\n${platformDetails}\nReturn as JSON array of objects with title, description, and optional platforms.`;

    // Define Zod schema for structured output
    const ideaSchema = z.object({
        title: z.string(),
        description: z.string(),
        platforms: z.array(z.string()).optional()
    });

    const ideasSchema = z.array(ideaSchema);

    try {
        const agent = new Agent({
            name: 'Gemini Idea Generator',
            instructions: prompt,
            model: 'gemini-2.0-flash-exp',
            outputType: ideasSchema as any
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
};

export const improvePrompt = async (prompt: string, type: 'image' | 'video', userGuidance?: string): Promise<string> => {
    const guidanceText = userGuidance ? `\n\nUser's specific guidance: "${userGuidance}"\nMake sure to incorporate this guidance into your improvements.` : '';
    const improvePromptText = `
        You are a creative prompt engineer for an advanced generative AI.
        Your task is to take a user's idea and expand it into a rich, detailed, and evocative prompt that will produce a stunning visual.
        For an ${type}, focus on cinematic quality, lighting, composition, and mood.
        Do NOT add any explanatory text, markdown, or preamble. Return ONLY the improved prompt text.

        Original idea: "${prompt}"${guidanceText}
    `;

    try {
        const agent = new Agent({
            name: 'Gemini Prompt Optimizer',
            instructions: improvePromptText,
            model: 'gemini-2.0-flash-exp',
        });

        const result = await run(agent, `Improve this ${type} prompt: ${prompt}`);
        return (result.finalOutput || '').trim();
    } catch (error) {
        console.error("Error improving prompt:", error);
        throw new Error("Failed to improve prompt.");
    }
};

export const generateImageForPost = async (prompt: string): Promise<string> => {
    try {
        // Use Agent SDK with imageGenerationTool
        const agent = new Agent({
            name: 'Gemini Image Creator',
            instructions: `You are a creative AI assistant that generates images. Generate a high-quality image based on the user's prompt. Use the image generation tool to create the image.`,
            model: 'gemini-2.0-flash-exp',
            tools: [imageGenerationTool()],
        });

        const result = await run(agent, `Generate an image with this description: ${prompt}`);

        // The imageGenerationTool returns image URLs or base64 data
        // Extract the image from the result
        const output = result.finalOutput || '';

        // If the output contains a URL or base64 data, return it
        if (output.includes('http') || output.includes('base64')) {
            return output;
        }

        // Fallback: use direct DALL-E API
        const client = getOpenAIClient();
        const response = await client.images.generate({
            model: 'dall-e-3',
            prompt: prompt,
            size: '1024x1024',
            quality: 'standard',
            n: 1,
            response_format: 'b64_json',
        });

        const base64Image = response.data?.[0]?.b64_json;
        if (!base64Image) {
            throw new Error('No image data found in response.');
        }

        return `data:image/png;base64,${base64Image}`;
    } catch (error) {
        console.error("Error generating image:", error);
        throw new Error("Failed to generate image.");
    }
};

export const generateVideoForPost = async (prompt: string) => {
    try {
        // Sora API is not yet publicly available
        // This is a placeholder for future Sora API integration
        console.warn("Sora video generation API is not yet available. Returning placeholder operation.");

        // Return a mock operation object that matches the expected structure
        const mockOperation = {
            name: `operations/video-${Date.now()}`,
            metadata: {
                status: 'PENDING',
                prompt: prompt,
                createTime: new Date().toISOString(),
            },
            done: false,
        };

        return mockOperation;
    } catch (error) {
        console.error("Error starting video generation:", error);
        if (error instanceof Error && error.message.includes("API_KEY_INVALID")) {
            throw new Error('API_KEY_INVALID');
        }
        throw error;
    }
};

export const checkVideoOperationStatus = async (operation: any) => {
    try {
        // Placeholder for Sora API status checking
        console.warn("Sora video API not available. Returning mock status.");

        // Return updated mock operation
        return {
            ...operation,
            metadata: {
                ...operation.metadata,
                status: 'PROCESSING',
            },
            done: false,
        };
    } catch (error) {
        console.error("Error checking video status:", error);
        if (error instanceof Error && error.message.includes("API_KEY_INVALID")) {
            throw new Error('API_KEY_INVALID');
        }
        throw error;
    }
};

export const fetchVideo = async (uri: string): Promise<string> => {
    try {
        // Placeholder for Sora API video fetching
        console.warn("Sora video API not available. Cannot fetch video.");
        throw new Error("Video generation via Sora API is not yet available.");
    } catch (error) {
        console.error("Error fetching video data:", error);
        throw error;
    }
};

export const repurposeContent = async (
    longFormContent: string,
    platforms: Platform[],
    numberOfPosts: number = 5
): Promise<Array<{ platforms: Platform[]; content: PostContent; topic: string }>> => {
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
        const agent = new Agent({
            name: 'Gemini Content Repurposer',
            instructions: prompt,
            model: 'gemini-2.0-flash-exp',
            outputType: responseSchema as any
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
};

export const generateEngagementScore = async (
    postContent: string,
    platform: Platform,
    hasImage: boolean,
    hasVideo: boolean
): Promise<{ score: number; suggestions: string[] }> => {
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

    // Define Zod schema for structured output
    const engagementSchema = z.object({
        score: z.number(),
        suggestions: z.array(z.string())
    });

    try {
        const agent = new Agent({
            name: 'Gemini Engagement Analyzer',
            instructions: prompt,
            model: 'gemini-2.0-flash-exp',
            outputType: engagementSchema
        });

        const result = await run(agent, `Analyze engagement for ${platform} post`);

        if (!result.finalOutput) {
            throw new Error('No output generated');
        }

        return result.finalOutput;
    } catch (error) {
        console.error("Error generating engagement score:", error);
        throw new Error("Failed to generate engagement score.");
    }
};

export const generateTikTokVideoPrompt = async (
    topic: string,
    tone: Tone,
    userGuidance?: string
): Promise<string> => {
    const guidanceText = userGuidance ? `\n\nUser's specific guidance: "${userGuidance}"` : '';

    const prompt = `
        You are an expert TikTok content creator. Create a detailed, creative video script for TikTok.

        **Topic:** ${topic}
        **Tone:** ${tone}
        **Format Requirements:**
        - Vertical video (9:16 aspect ratio)
        - Duration: 15-60 seconds
        - High-energy, engaging opening (first 3 seconds crucial)
        - Clear visual directions for each scene
        - Sound design suggestions
        - Hashtag recommendations

        Create a prompt for an AI video generator that will produce a TikTok video script.
        Focus on:
        1. Trending TikTok formats and hooks
        2. Fast-paced cuts and transitions
        3. Text overlays and visual effects
        4. Music beat synchronization${guidanceText}

        Do NOT add any explanatory text, markdown, or preamble. Return ONLY the detailed video generation prompt.
    `;

    try {
        const agent = new Agent({
            name: 'Gemini TikTok Specialist',
            instructions: prompt,
            model: 'gemini-2.0-flash-exp',
            tools: [webSearchTool()], // Can search for trending TikTok formats
        });

        const result = await run(agent, `Create TikTok video prompt for: ${topic}`);
        return (result.finalOutput || '').trim();
    } catch (error) {
        console.error("Error generating TikTok video prompt:", error);
        throw new Error("Failed to generate TikTok video prompt.");
    }
};

export const generateYouTubeVideoPrompt = async (
    topic: string,
    tone: Tone,
    format: 'shorts' | 'standard' = 'shorts',
    userGuidance?: string
): Promise<string> => {
    const guidanceText = userGuidance ? `\n\nUser's specific guidance: "${userGuidance}"` : '';
    const aspectRatio = format === 'shorts' ? '9:16' : '16:9';
    const duration = format === 'shorts' ? '15-60 seconds' : '2-10 minutes';

    const prompt = `
        You are an expert YouTube content creator and filmmaker. Create a detailed, high-quality video production guide for YouTube.

        **Topic:** ${topic}
        **Tone:** ${tone}
        **Format:** YouTube ${format === 'shorts' ? 'Shorts' : 'Standard'}
        **Format Requirements:**
        - Aspect Ratio: ${aspectRatio}
        - Duration: ${duration}
        - Professional production quality
        - Clear audio with narration/voiceover
        - On-screen text and graphics
        - SEO-optimized thumbnail elements
        - Chapter markers for longer content

        Create a prompt for an AI video generator that will produce a YouTube ${format} video script.
        Focus on:
        1. Professional production value
        2. Story arc with strong narrative
        3. Visual hierarchy and composition
        4. Color grading and cinematography
        5. Audio mixing and music selection${guidanceText}

        Do NOT add any explanatory text, markdown, or preamble. Return ONLY the detailed video generation prompt.
    `;

    try {
        const agent = new Agent({
            name: 'Gemini YouTube Specialist',
            instructions: prompt,
            model: 'gemini-2.0-flash-exp',
            tools: [webSearchTool()], // Can search for trending YouTube formats
        });

        const result = await run(agent, `Create YouTube ${format} prompt for: ${topic}`);
        return (result.finalOutput || '').trim();
    } catch (error) {
        console.error("Error generating YouTube video prompt:", error);
        throw new Error("Failed to generate YouTube video prompt.");
    }
};

export const generateYouTubeMetadata = async (
    title: string,
    description: string,
    topic: string
): Promise<{ tags: string[]; seoDescription: string }> => {
    const prompt = `
        You are a YouTube SEO expert. Optimize the following video metadata for better discoverability and engagement.

        **Title:** ${title}
        **Description:** ${description}
        **Topic:** ${topic}

        Generate:
        1. 10-15 relevant, trending YouTube tags
        2. An optimized description (300-500 characters) with keywords naturally incorporated

        Return as JSON with keys: "tags" (array of strings) and "seoDescription" (string).
        Do not include markdown or explanatory text outside the JSON.
    `;

    try {
        const agent = new Agent({
            name: 'Gemini SEO Optimizer',
            instructions: prompt,
            model: 'gemini-2.0-flash-exp',
            tools: [webSearchTool()], // Can search for trending keywords
        });

        const result = await run(agent, `Optimize YouTube metadata for: ${title}`);
        const jsonText = result.finalOutput || '';
        return parseJsonFromText(jsonText);
    } catch (error) {
        console.error("Error generating YouTube metadata:", error);
        throw new Error("Failed to generate YouTube metadata.");
    }
};

// BONUS: Text-to-Speech for audio narration using OpenAI TTS
export const generateAudioNarration = async (
    text: string,
    voice: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer' = 'alloy'
): Promise<Buffer> => {
    try {
        const client = getOpenAIClient();

        const response = await client.audio.speech.create({
            model: 'tts-1-hd',
            voice: voice,
            input: text,
        });

        const buffer = Buffer.from(await response.arrayBuffer());
        return buffer;
    } catch (error) {
        console.error("Error generating audio narration:", error);
        throw new Error("Failed to generate audio.");
    }
};
