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
import { GoogleGenAI, Type, Modality } from "@google/genai";
// Fix: Add PostContent, Tone, and ContentType to imports for the new function.
import { Platform, Tone, ContentType, PostContent } from '@/types';
import { PLATFORMS } from '@/constants';
import OpenAI from "openai";

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

// Fix: Implement the missing generateSocialMediaContent function.
export const generateSocialMediaContent = async (
    topic: string,
    platforms: Platform[],
    contentType: ContentType,
    tone: Tone
): Promise<PostContent> => {
    const ai = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.API_KEY });

    const platformDetails = getPlatformDetails(platforms);

    const prompt = `
        You are an expert social media strategist. Your task is to generate content for a social media post based on the provided topic.
        
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

    const platformProperties = platforms.reduce((acc, platform) => {
        acc[platform] = { type: Type.STRING, description: `Content for ${platform}` };
        return acc;
    }, {} as Record<string, { type: Type; description: string }>);

    const responseSchema = {
        type: Type.OBJECT,
        properties: {
            imageSuggestion: { type: Type.STRING, description: 'A creative suggestion for a compelling image.' },
            videoSuggestion: { type: Type.STRING, description: 'A creative suggestion for an engaging video.' },
            ...platformProperties
        },
        required: ['imageSuggestion', 'videoSuggestion', ...platforms]
    };
    
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: responseSchema,
            },
        });
        const jsonText = (response.text ?? '').trim();
        return parseJsonFromText(jsonText);
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
    const ai = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.API_KEY });
    const platformDetails = getPlatformDetails(platforms);
    const prompt = `You are a senior social media strategist. Create a brief for the campaign "${name}".
Goals:\n- ${goals.join('\n- ')}\nPlatforms:\n${platformDetails}\nReturn JSON with keys: audience, pillars (array), cadence (string), keyMessages (array), risks (array).`;
    try {
        const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt, config: { responseMimeType: 'application/json' } });
        return parseJsonFromText(response.text ?? '');
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
    const ai = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.API_KEY });
    const platformDetails = getPlatformDetails(platforms);
    const prompt = `Generate 10 organic content ideas for the campaign "${name}" based on pillars: ${pillars.join(', ')}. Target platforms:\n${platformDetails}\nReturn as JSON array of objects with title, description, and optional platforms.`;
    try {
        const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt, config: { responseMimeType: 'application/json' } });
        return parseJsonFromText(response.text ?? '');
    } catch (error) {
        console.error('Error generating campaign ideas:', error);
        throw new Error('Failed to generate ideas');
    }
};

export const improvePrompt = async (prompt: string, type: 'image' | 'video', userGuidance?: string): Promise<string> => {
    const ai = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.API_KEY });
    const guidanceText = userGuidance ? `\n\nUser's specific guidance: "${userGuidance}"\nMake sure to incorporate this guidance into your improvements.` : '';
    const improvePromptText = `
        You are a creative prompt engineer for an advanced generative AI.
        Your task is to take a user's idea and expand it into a rich, detailed, and evocative prompt that will produce a stunning visual.
        For an ${type}, focus on cinematic quality, lighting, composition, and mood.
        Do NOT add any explanatory text, markdown, or preamble. Return ONLY the improved prompt text.

        Original idea: "${prompt}"${guidanceText}
    `;
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: improvePromptText,
        });
        return (response.text ?? '').trim();
    } catch (error) {
        console.error("Error improving prompt:", error);
        throw new Error("Failed to improve prompt.");
    }
};

export const generateImageForPost = async (prompt: string): Promise<string> => {
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.API_KEY });
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: { parts: [{ text: prompt }] },
            config: { responseModalities: [Modality.IMAGE] },
        });

        const candidates = response.candidates ?? []
        if (candidates.length === 0) {
            throw new Error('No candidates in response')
        }
        const parts = candidates[0]?.content?.parts ?? []
        for (const part of parts) {
            if (part.inlineData && part.inlineData.data) {
                const base64ImageBytes: string = part.inlineData.data as string;
                return `data:image/png;base64,${base64ImageBytes}`;
            }
        }
        throw new Error("No image data found in response.");
    } catch (error) {
        console.error("Error generating image:", error);
        throw new Error("Failed to generate image.");
    }
};


export const generateVideoForPost = async (prompt: string) => {
     try {
        const aiWithKey = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.API_KEY });
        let operation = await aiWithKey.models.generateVideos({
            model: 'veo-3.1-fast-generate-preview',
            prompt: prompt,
            config: {
                numberOfVideos: 1,
                resolution: '720p',
                aspectRatio: '9:16'
            }
        });
        
        return operation;
    } catch (error) {
        console.error("Error starting video generation:", error);
        if (error instanceof Error && error.message.includes("Requested entity was not found")) {
            throw new Error('API_KEY_INVALID');
        }
        throw error;
    }
};

export const checkVideoOperationStatus = async (operation: any) => {
    try {
        const aiWithKey = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.API_KEY });
        const updatedOperation = await aiWithKey.operations.getVideosOperation({ operation: operation });
        return updatedOperation;
    } catch (error) {
        console.error("Error checking video status:", error);
        if (error instanceof Error && error.message.includes("Requested entity was not found")) {
            throw new Error('API_KEY_INVALID');
        }
        throw error;
    }
};

export const fetchVideo = async (uri: string): Promise<string> => {
    try {
        const response = await fetch(`${uri}&key=${process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.API_KEY}`);
        if (!response.ok) {
            throw new Error(`Failed to fetch video: ${response.statusText}`);
        }
        const blob = await response.blob();
        return URL.createObjectURL(blob);
    } catch (error) {
        console.error("Error fetching video data:", error);
        throw error;
    }
};

// Repurpose long-form content into multiple social media posts
export const repurposeContent = async (
    longFormContent: string,
    platforms: Platform[],
    numberOfPosts: number = 5
): Promise<Array<{ platforms: Platform[]; content: PostContent; topic: string }>> => {
    const ai = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.API_KEY });

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

    const postSchema = {
        type: Type.OBJECT,
        properties: {
            topic: { type: Type.STRING },
            platforms: { type: Type.ARRAY, items: { type: Type.STRING } },
            content: {
                type: Type.OBJECT,
                properties: {
                    ...platforms.reduce((acc, platform) => {
                        acc[platform] = { type: Type.STRING };
                        return acc;
                    }, {} as Record<string, any>),
                    imageSuggestion: { type: Type.STRING },
                    videoSuggestion: { type: Type.STRING },
                },
            },
        },
    };

    const responseSchema = {
        type: Type.ARRAY,
        items: postSchema,
    };

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: responseSchema,
            },
        });
        const jsonText = (response.text ?? '').trim();
        return parseJsonFromText(jsonText);
    } catch (error) {
        console.error("Error repurposing content:", error);
        throw new Error("Failed to repurpose content. Please try again.");
    }
};

// Generate AI engagement score and suggestions for a post
export const generateEngagementScore = async (
    postContent: string,
    platform: Platform,
    hasImage: boolean,
    hasVideo: boolean
): Promise<{ score: number; suggestions: string[] }> => {
    const ai = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.API_KEY });

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

    const responseSchema = {
        type: Type.OBJECT,
        properties: {
            score: { type: Type.NUMBER },
            suggestions: { type: Type.ARRAY, items: { type: Type.STRING } },
        },
        required: ['score', 'suggestions'],
    };

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: responseSchema,
            },
        });
        const jsonText = (response.text ?? '').trim();
        return parseJsonFromText(jsonText);
    } catch (error) {
        console.error("Error generating engagement score:", error);
        throw new Error("Failed to generate engagement score.");
    }
};

// Generate video for TikTok with platform-specific formatting (9:16 vertical, 15-60 seconds)
export const generateTikTokVideoPrompt = async (
    topic: string,
    tone: Tone,
    userGuidance?: string
): Promise<string> => {
    const ai = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.API_KEY });

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
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
        });
        return (response.text ?? '').trim();
    } catch (error) {
        console.error("Error generating TikTok video prompt:", error);
        throw new Error("Failed to generate TikTok video prompt.");
    }
};

// Generate video for YouTube with platform-specific formatting (9:16 for Shorts, 16:9 for standard)
export const generateYouTubeVideoPrompt = async (
    topic: string,
    tone: Tone,
    format: 'shorts' | 'standard' = 'shorts',
    userGuidance?: string
): Promise<string> => {
    const ai = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.API_KEY });

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
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
        });
        return (response.text ?? '').trim();
    } catch (error) {
        console.error("Error generating YouTube video prompt:", error);
        throw new Error("Failed to generate YouTube video prompt.");
    }
};

// Generate optimized content for YouTube with metadata
export const generateYouTubeMetadata = async (
    title: string,
    description: string,
    topic: string
): Promise<{ tags: string[]; seoDescription: string }> => {
    const ai = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.API_KEY });

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

    const responseSchema = {
        type: Type.OBJECT,
        properties: {
            tags: { type: Type.ARRAY, items: { type: Type.STRING } },
            seoDescription: { type: Type.STRING },
        },
        required: ['tags', 'seoDescription'],
    };

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: responseSchema,
            },
        });
        const jsonText = (response.text ?? '').trim();
        return parseJsonFromText(jsonText);
    } catch (error) {
        console.error("Error generating YouTube metadata:", error);
        throw new Error("Failed to generate YouTube metadata.");
    }
};
