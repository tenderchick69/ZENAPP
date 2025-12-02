// src/lib/imagegen/providers/laozhang.ts - Laozhang.ai image generation provider
// OpenAI-compatible API with different base URL, good quality at lower cost

import type { ImageProvider, ImageGenerationOptions, ImageGenerationResult } from './types';

const DEFAULT_BASE_URL = 'https://api.laozhang.ai/v1';

export function createLaozhangProvider(apiKey: string, baseUrl?: string): ImageProvider {
  const apiUrl = baseUrl || DEFAULT_BASE_URL;

  return {
    name: 'laozhang',

    isConfigured(): boolean {
      return !!apiKey && apiKey.length > 0;
    },

    async generate(options: ImageGenerationOptions): Promise<ImageGenerationResult> {
      if (!this.isConfigured()) {
        return {
          success: false,
          error: 'Laozhang API key not configured',
          provider: 'laozhang'
        };
      }

      try {
        const size = getSupportedSize(options.width, options.height);

        const response = await fetch(`${apiUrl}/images/generations`, {
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
            provider: 'laozhang'
          };
        }

        const data = await response.json();

        if (data.data && data.data[0]?.url) {
          return {
            success: true,
            imageUrl: data.data[0].url,
            provider: 'laozhang',
            cost: 0.01 // ~$0.01 per image
          };
        }

        return {
          success: false,
          error: 'No image URL in response',
          provider: 'laozhang'
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          provider: 'laozhang'
        };
      }
    }
  };
}

// Same size constraints as DALL-E 3
function getSupportedSize(width?: number, height?: number): string {
  if (!width || !height) return '1024x1024';

  const ratio = width / height;
  if (ratio > 1.5) return '1792x1024';
  if (ratio < 0.67) return '1024x1792';
  return '1024x1024';
}
