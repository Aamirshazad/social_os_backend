/**
 * Image Generation Prompt Templates
 * Professional prompt engineering for consistent, high-quality results
 */

/**
 * Improve Image Generation Prompt
 * Enhances user's basic idea into detailed, production-ready prompt
 */
export const improveImagePromptTemplate = (
  originalPrompt: string,
  userGuidance?: string,
  targetPlatforms?: string[]
) => {
  const platformContext = targetPlatforms?.length
    ? `\nTarget platforms: ${targetPlatforms.join(', ')}. Consider their visual style and audience.`
    : '';

  const guidanceText = userGuidance
    ? `\n\nUser's specific guidance: "${userGuidance}"\nMake sure to incorporate this guidance into your improvements.`
    : '';

  return `You are a professional prompt engineer specializing in image generation AI.
Your task is to transform a basic idea into a rich, detailed, production-ready prompt that will produce stunning visuals.

FOCUS AREAS:
- Visual composition and layout
- Lighting and atmosphere
- Color palette and mood
- Style and artistic direction
- Technical details (camera angle, depth of field, etc.)
- Context and environment${platformContext}

ORIGINAL IDEA:
"${originalPrompt}"${guidanceText}

REQUIREMENTS:
1. Expand the concept with vivid, specific details
2. Include professional photography/art direction terms
3. Specify lighting, mood, and atmosphere
4. Add technical details that enhance quality
5. Keep it concise but comprehensive (100-200 words)
6. Do NOT include explanations or preambles
7. Return ONLY the improved prompt text

IMPROVED PROMPT:`;
};

/**
 * Improve Video Generation Prompt
 * Optimized for motion, timing, and cinematic qualities
 */
export const improveVideoPromptTemplate = (
  originalPrompt: string,
  userGuidance?: string
) => {
  const guidanceText = userGuidance
    ? `\n\nUser's specific guidance: "${userGuidance}"\nMake sure to incorporate this guidance into your improvements.`
    : '';

  return `You are a professional prompt engineer specializing in AI video generation.
Your task is to transform a basic concept into a cinematic, detailed prompt for video generation.

FOCUS AREAS:
- Camera movement and angles
- Scene transitions and pacing
- Motion and dynamics
- Lighting and cinematography
- Mood and atmosphere
- Sound design elements (implied visually)
- Story and narrative flow

ORIGINAL CONCEPT:
"${originalPrompt}"${guidanceText}

REQUIREMENTS:
1. Describe the visual narrative with cinematic detail
2. Include camera movements (pan, zoom, dolly, etc.)
3. Specify timing and pacing
4. Add atmospheric and lighting details
5. Consider the 8-second duration constraint
6. Keep it concise but vivid (100-200 words)
7. Return ONLY the improved prompt text

IMPROVED PROMPT:`;
};

/**
 * Social Media Image Prompt Enhancement
 * Optimized for engagement and platform-specific requirements
 */
export const socialMediaImagePromptTemplate = (
  basePrompt: string,
  platform: string,
  contentType: 'product' | 'promotional' | 'educational' | 'engaging'
) => {
  const platformGuidelines = {
    instagram: 'Vibrant colors, bold composition, highly visual appeal, professional aesthetic',
    twitter: 'Clear focal point, text-readable at small sizes, punchy visual impact',
    linkedin: 'Professional, clean design, corporate aesthetic, trustworthy feel',
    facebook: 'Relatable, emotional connection, community-focused, approachable',
    tiktok: 'Dynamic, trendy, youthful energy, bold and eye-catching',
  };

  const contentGuidelines = {
    product: 'Clean background, professional lighting, showcase key features, commercial photography style',
    promotional: 'Eye-catching, bold typography integration, call-to-action visual hierarchy',
    educational: 'Clear and informative, digestible visual elements, professional but approachable',
    engaging: 'Emotionally resonant, relatable scenarios, human connection, authentic feel',
  };

  return `${basePrompt}

Style: ${platformGuidelines[platform.toLowerCase() as keyof typeof platformGuidelines] || 'Professional and engaging'}
Content approach: ${contentGuidelines[contentType]}
Format: Optimized for ${platform} feed, high-quality, attention-grabbing
Aesthetic: Modern, professional, on-brand`;
};

/**
 * Transparent Background Image Prompt
 * Special instructions for clean transparency
 */
export const transparentBackgroundPromptEnhancement = (basePrompt: string) => {
  return `${basePrompt}

IMPORTANT: Subject isolated on transparent background, clean edges, no background elements, perfect cutout, studio-style isolation, PNG transparency`;
};

/**
 * Product Photography Prompt Template
 */
export const productPhotographyPromptTemplate = (
  productDescription: string,
  style: 'clean' | 'lifestyle' | 'dramatic' | 'minimal'
) => {
  const styleGuides = {
    clean: 'Clean white background, soft studio lighting, commercial product photography, professional, high-key lighting',
    lifestyle: 'Natural environment, lifestyle context, authentic setting, real-world usage, warm natural lighting',
    dramatic: 'Bold dramatic lighting, deep shadows, high contrast, cinematic quality, moody atmosphere',
    minimal: 'Minimalist composition, plenty of negative space, subtle shadows, elegant simplicity, zen aesthetic',
  };

  return `Professional product photography of ${productDescription}

Style: ${styleGuides[style]}
Quality: High-resolution commercial photography
Camera: 85mm lens, f/2.8 aperture, sharp focus on product
Composition: Rule of thirds, professional framing, balanced layout
Lighting: Professional studio lighting setup, catchlights, dimension`;
};

/**
 * Image Editing Mask Prompt Template
 * For inpainting/editing specific areas
 */
export const imageEditingPromptTemplate = (
  editDescription: string,
  context: string
) => {
  return `${editDescription}

Context: ${context}
Requirements: Seamless integration, match existing lighting and style, natural blending, high quality, realistic`;
};

/**
 * Brand Consistency Prompt Enhancement
 */
export const brandConsistencyPromptTemplate = (
  basePrompt: string,
  brandGuidelines: {
    colors?: string[];
    style?: string;
    mood?: string;
    tone?: string;
  }
) => {
  const colorText = brandGuidelines.colors?.length
    ? `Brand colors: ${brandGuidelines.colors.join(', ')}`
    : '';
  const styleText = brandGuidelines.style ? `Brand style: ${brandGuidelines.style}` : '';
  const moodText = brandGuidelines.mood ? `Brand mood: ${brandGuidelines.mood}` : '';
  const toneText = brandGuidelines.tone ? `Brand tone: ${brandGuidelines.tone}` : '';

  return `${basePrompt}

BRAND GUIDELINES:
${colorText}
${styleText}
${moodText}
${toneText}
Maintain brand consistency and visual identity throughout`;
};

/**
 * Quick Preset Prompts
 */
export const presetPrompts = {
  instagram: {
    name: 'Instagram Post',
    enhancement: 'Square format, vibrant colors, bold composition, Instagram-optimized aesthetic',
  },
  twitter: {
    name: 'Twitter/X Post',
    enhancement: 'Landscape format, clear focal point, readable at thumbnail size, social media optimized',
  },
  story: {
    name: 'Instagram Story',
    enhancement: 'Vertical format, bold text-friendly composition, story-optimized layout, mobile-first',
  },
  linkedin: {
    name: 'LinkedIn Post',
    enhancement: 'Professional aesthetic, corporate style, trustworthy and polished, business-appropriate',
  },
  thumbnail: {
    name: 'Video Thumbnail',
    enhancement: 'Eye-catching, bold composition, clear focal point, high contrast, click-worthy',
  },
};

/**
 * Quality Enhancement Suffixes
 */
export const qualityEnhancements = {
  high: ', 8k ultra HD, professional photography, award-winning quality, masterpiece, highly detailed',
  medium: ', high quality, professional grade, sharp focus, well-lit',
  low: ', good quality, clear image',
};

/**
 * Style Presets
 */
export const stylePresets = {
  photorealistic: 'Photorealistic, ultra realistic, professional photography, natural lighting',
  cinematic: 'Cinematic composition, movie still, dramatic lighting, film grain, anamorphic',
  artistic: 'Artistic interpretation, creative styling, unique perspective, artistic flair',
  minimal: 'Minimalist aesthetic, clean lines, simple composition, elegant simplicity',
  vibrant: 'Vibrant colors, bold and saturated, energetic, eye-catching, punchy',
  corporate: 'Corporate style, professional, clean, business-appropriate, polished',
  editorial: 'Editorial photography, magazine quality, sophisticated, high-end',
};
