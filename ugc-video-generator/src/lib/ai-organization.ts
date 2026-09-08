import OpenAI from 'openai';
import { VideoPlan } from './types';

const hasApiKey = !!process.env.OPENAI_API_KEY;

const openai = hasApiKey ? new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
}) : null;

const SYSTEM_PROMPT = `You are an expert UGC (User Generated Content) video strategist. Your job is to analyze a product and create a structured video plan for a short (5-10 second) UGC-style marketing video.

The video should feel authentic, like a real user sharing their experience. Think TikTok/Reels style - fast-paced, engaging, with a strong hook.

You must output a valid JSON object matching the VideoPlan schema.`;

const USER_PROMPT_TEMPLATE = `Product: {title}
Description: {description}
Images available: {imageCount}

Create a UGC video plan with:
1. A compelling hook (first 1-2 seconds)
2. 3-4 scenes, each 1.5-2.5 seconds
3. Text overlays for each scene
4. Keywords for background video/GIF/audio assets
5. Target audience and tone

The video should be 5-8 seconds total. Focus on the problem/solution format or before/after transformation.`;

// Mock video plan for development without API key
function getMockVideoPlan(productInfo: { title: string; description: string; images: string[] }): VideoPlan {
  return {
    product: {
      name: productInfo.title,
      description: productInfo.description,
      audience: 'General consumers',
      keyBenefits: ['Easy to use', 'Saves time', 'Great value'],
    },
    video: {
      hook: `Meet ${productInfo.title} - your new favorite!`,
      scenes: [
        {
          id: 'scene-0',
          text: `Tired of the same old routine?`,
          duration: 2,
          backgroundKeyword: 'lifestyle',
          gifKeyword: 'reaction',
          productImageIndex: 0,
        },
        {
          id: 'scene-1',
          text: `${productInfo.title} changes everything!`,
          duration: 2,
          backgroundKeyword: 'home',
          gifKeyword: 'excited',
          productImageIndex: 0,
        },
        {
          id: 'scene-2',
          text: 'Simple, fast, and effective.',
          duration: 2,
          backgroundKeyword: 'office',
          productImageIndex: 1,
        },
        {
          id: 'scene-3',
          text: 'Try it today and see the difference!',
          duration: 2,
          backgroundKeyword: 'celebration',
          gifKeyword: 'celebration',
          productImageIndex: 2,
        },
      ],
      tone: 'upbeat',
      duration: 8,
      assetKeywords: ['lifestyle', 'home', 'office', 'celebration'],
    },
  };
}

export async function generateVideoPlan(productInfo: {
  title: string;
  description: string;
  images: string[];
}): Promise<VideoPlan> {
  if (!hasApiKey || !openai) {
    console.warn('OpenAI API key not set, using mock video plan');
    return getMockVideoPlan(productInfo);
  }

  const userPrompt = USER_PROMPT_TEMPLATE
    .replace('{title}', productInfo.title)
    .replace('{description}', productInfo.description)
    .replace('{imageCount}', productInfo.images.length.toString());

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.7,
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) {
    throw new Error('No response from AI');
  }

  const plan = JSON.parse(content) as VideoPlan;
  
  // Validate and set defaults
  plan.video.duration = plan.video.duration || 7;
  plan.video.scenes = plan.video.scenes?.slice(0, 4) || [];
  plan.video.assetKeywords = plan.video.assetKeywords || [];
  
  // Ensure each scene has required fields
  plan.video.scenes = plan.video.scenes.map((scene, index) => ({
    ...scene,
    id: scene.id || `scene-${index}`,
    duration: scene.duration || 2,
    backgroundKeyword: scene.backgroundKeyword || 'lifestyle',
    productImageIndex: scene.productImageIndex ?? (index % productInfo.images.length),
  }));

  return plan;
}