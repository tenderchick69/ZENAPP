// src/lib/imagegen/providers/openai.ts - OpenAI DALL-E image generation provider
// Premium quality option with DALL-E 3

import type { ImageProvider, ImageGenerationOptions, ImageGenerationResult } from './types';

const OPENAI_API_URL = 'https://api.openai.com/v1';

export function createOpenAIProvider(apiKey: string): ImageProvider {
  return {
    name: 'openai',

    isConfigured(): boolean {
      return !!apiKey && apiKey.length > 0;
    },

    async generate(options: ImageGenerationOptions): Promise<ImageGenerationResult> {
      if (!this.isConfigured()) {
        return {
          success: false,
          error: 'OpenAI API key not configured',
          provider: 'openai'
        };
      }

      try {
        // DALL-E 3 only supports specific sizes
        const size = getSupportedSize(options.width, options.height);

        const response = await fetch(`${OPENAI_API_URL}/images/generations`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: 'dall-e-3',
            prompt: options.prompt,
            n: 1,
            size: size,
            quality: 'standard',
            response_format: 'url'
          })
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          return {
            success: false,
            error: errorData.error?.message || `HTTP ${response.status}`,
            provider: 'openai'
          };
        }

        const data = await response.json();

        if (data.data && data.data[0]?.url) {
          return {
            success: true,
            imageUrl: data.data[0].url,
            provider: 'openai',
            cost: getCost(size)
          };
        }

        return {
          success: false,
          error: 'No image URL in response',
          provider: 'openai'
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          provider: 'openai'
        };
      }
    }
  };
}

// DALL-E 3 only supports: 1024x1024, 1792x1024, 1024x1792
function getSupportedSize(width?: number, height?: number): string {
  if (!width || !height) return '1024x1024';

  const ratio = width / height;
  if (ratio > 1.5) return '1792x1024'; // Landscape
  if (ratio < 0.67) return '1024x1792'; // Portrait
  return '1024x1024'; // Square
}

function getCost(size: string): number {
  // DALL-E 3 standard quality pricing
  switch (size) {
    case '1024x1024': return 0.04;
    case '1792x1024': return 0.08;
    case '1024x1792': return 0.08;
    default: return 0.04;
  }
}
