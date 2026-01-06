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
                content: options.prompt // Just the prompt, no prefix
              }
            ],
            modalities: ['image', 'text'], // REQUIRED for image generation
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('OpenRouter Image error:', errorText);

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
        const message = data.choices?.[0]?.message;

        if (!message) {
          console.error('OpenRouter Image: No message in response');
          return {
            success: false,
            error: 'No message in OpenRouter response',
            provider: 'openrouter-image'
          };
        }

        // Try multiple response formats
        let imageData: string | null = null;

        // Format 1: message.images[].image_url.url (OpenRouter standard)
        if (message.images && Array.isArray(message.images) && message.images.length > 0) {
          const imageUrl = message.images[0]?.image_url?.url;
          if (imageUrl) {
            imageData = imageUrl;
          }
        }

        // Format 2: message.content as array with image parts
        if (!imageData && message.content && Array.isArray(message.content)) {
          const imageContent = message.content.find(
            (item: any) => item.type === 'image' || item.type === 'image_url'
          );

          if (imageContent?.source?.data) {
            imageData = imageContent.source.data;
          } else if (imageContent?.image_url?.url) {
            imageData = imageContent.image_url.url;
          }
        }

        // Format 3: Direct base64 in content
        if (!imageData && typeof message.content === 'string' && message.content.startsWith('data:image')) {
          imageData = message.content;
        }

        if (!imageData) {
          console.error('OpenRouter Image: No image found in response');
          return {
            success: false,
            error: 'No image returned from OpenRouter - check response format',
            provider: 'openrouter-image'
          };
        }

        // Ensure it's a proper data URL
        if (!imageData.startsWith('data:')) {
          imageData = `data:image/png;base64,${imageData}`;
        }

        return {
          success: true,
          imageUrl: imageData,
          provider: 'openrouter-image',
          cost: 0.03
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
