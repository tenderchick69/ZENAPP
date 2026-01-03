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
  console.log('=== OpenAI Image Generation ===');
  console.log('Prompt:', prompt.slice(0, 100) + '...');
  console.log('Quality:', quality);
  console.log('API Key present:', !!apiKey);
  console.log('API Key prefix:', apiKey?.slice(0, 10) + '...');

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

  console.log('OpenAI Response status:', response.status);

  if (!response.ok) {
    const errorText = await response.text();
    console.error('OpenAI Error response:', errorText);
    throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  console.log('OpenAI Response received, checking data structure...');
  console.log('Response keys:', Object.keys(data));

  // OpenAI returns: { data: [{ url: "...", b64_json: "..." }] }
  const imageData = data.data?.[0];

  if (!imageData) {
    console.error('No image data in response:', JSON.stringify(data).slice(0, 500));
    throw new Error('No image data in OpenAI response');
  }

  console.log('Image data keys:', Object.keys(imageData));

  // Return the URL (temporary) - we'll upload to Supabase after
  if (imageData.url) {
    console.log('Returning URL:', imageData.url.slice(0, 80) + '...');
    return imageData.url;
  }

  // Or return base64 if that's what we got
  if (imageData.b64_json) {
    console.log('Returning base64 data (length:', imageData.b64_json.length, ')');
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
        console.log('OpenAI Provider: generate() called');
        console.log('Options:', JSON.stringify(options, null, 2));

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
