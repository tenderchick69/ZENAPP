// src/lib/imagegen/providers/openrouter-image.ts - GPT-5 Image Mini via OpenRouter

import type { ImageProvider, ImageGenerationOptions, ImageGenerationResult } from './types';

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

export function createOpenRouterImageProvider(apiKey: string): ImageProvider {
  return {
    name: 'openrouter-image',

    isConfigured(): boolean {
      return !!apiKey && apiKey.length > 0;
    },

    async generate(options: ImageGenerationOptions): Promise<ImageGenerationResult> {
      if (!this.isConfigured()) {
        return {
          success: false,
          error: 'OpenRouter API key not configured',
          provider: 'openrouter-image'
        };
      }

      try {
        // Build image generation prompt
        const imagePrompt = `Generate an image: ${options.prompt}`;

        console.log('OpenRouter Image request:', { prompt: options.prompt.slice(0, 100) });

        const response = await fetch(OPENROUTER_API_URL, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://zenapp.vercel.app',
            'X-Title': 'ZenApp Image Generator',
          },
          body: JSON.stringify({
            model: 'openai/gpt-5-image-mini',
            messages: [
              {
                role: 'user',
                content: imagePrompt
              }
            ],
            modalities: ['image', 'text'], // Required for image generation
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('OpenRouter Image error:', response.status, errorText);

          let errorMessage = `HTTP ${response.status}`;
          try {
            const errorJson = JSON.parse(errorText);
            errorMessage = errorJson.error?.message || errorJson.message || errorText.slice(0, 200);
          } catch {
            errorMessage = `HTTP ${response.status}: ${errorText.slice(0, 200)}`;
          }

          return {
            success: false,
            error: errorMessage,
            provider: 'openrouter-image'
          };
        }

        const data = await response.json();
        console.log('OpenRouter Image response received');

        // Extract image from response - GPT-5 Image Mini returns base64 in content array
        const content = data.choices?.[0]?.message?.content;

        if (!content) {
          return {
            success: false,
            error: 'No content in OpenRouter response',
            provider: 'openrouter-image'
          };
        }

        // Content can be an array with text and image parts, or a string
        let imageData: string | null = null;

        if (Array.isArray(content)) {
          // Find image content in array
          const imageContent = content.find(
            (item: any) => item.type === 'image' || item.type === 'image_url'
          );

          if (imageContent?.source?.data) {
            // Format: { type: 'image', source: { data: 'base64...' } }
            imageData = imageContent.source.data;
          } else if (imageContent?.image_url?.url) {
            // Format: { type: 'image_url', image_url: { url: 'data:image/...' } }
            imageData = imageContent.image_url.url;
          }
        }

        if (!imageData) {
          console.error('No image found in response. Content:', JSON.stringify(content).slice(0, 500));
          return {
            success: false,
            error: 'No image returned from OpenRouter',
            provider: 'openrouter-image'
          };
        }

        // Ensure it's a proper data URL
        if (!imageData.startsWith('data:')) {
          imageData = `data:image/png;base64,${imageData}`;
        }

        console.log('OpenRouter Image: Successfully extracted base64 image');

        return {
          success: true,
          imageUrl: imageData, // Returns base64 data URL
          provider: 'openrouter-image',
          cost: 0.03 // Approximate cost per image
        };
      } catch (error) {
        console.error('OpenRouter Image exception:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          provider: 'openrouter-image'
        };
      }
    }
  };
}
