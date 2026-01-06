// src/lib/imagegen/providers/openai.ts - Direct OpenAI Image Generation

import type { ImageProvider, ImageGenerationOptions, ImageGenerationResult } from './types';

/**
 * Generate an image using OpenAI's gpt-image-1-mini model directly
 */
export async function generateWithOpenAI(
  prompt: string,
  apiKey: string,
  quality: 'low' | 'medium' | 'high' = 'medium'
): Promise<string> {
  const response = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-image-1',  // GPT Image model
      prompt: prompt,
      n: 1,
      size: '1024x1024',
      quality: quality,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('OpenAI Error response:', errorText);
    throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();

  // OpenAI returns: { data: [{ url: "...", b64_json: "..." }] }
  const imageData = data.data?.[0];

  if (!imageData) {
    console.error('No image data in response:', JSON.stringify(data).slice(0, 500));
    throw new Error('No image data in OpenAI response');
  }

  // Return the URL (temporary) - we'll upload to Supabase after
  if (imageData.url) {
    return imageData.url;
  }

  // Or return base64 if that's what we got
  if (imageData.b64_json) {
    return `data:image/png;base64,${imageData.b64_json}`;
  }

  throw new Error('No URL or base64 data in OpenAI response');
}

/**
 * Create an OpenAI image provider that implements the ImageProvider interface
 */
export function createOpenAIImageProvider(apiKey: string): ImageProvider {
  return {
    name: 'openai',

    isConfigured(): boolean {
      return !!apiKey && apiKey.length > 0;
    },

    async generate(options: ImageGenerationOptions): Promise<ImageGenerationResult> {
      try {
        const imageUrl = await generateWithOpenAI(
          options.prompt,
          apiKey,
          (options.style as 'low' | 'medium' | 'high') || 'medium'
        );

        return {
          success: true,
          imageUrl,
          provider: 'openai'
        };
      } catch (error: any) {
        console.error('OpenAI Provider error:', error);
        return {
          success: false,
          error: error.message || 'OpenAI image generation failed',
          provider: 'openai'
        };
      }
    }
  };
}
