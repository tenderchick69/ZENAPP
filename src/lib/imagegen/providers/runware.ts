// src/lib/imagegen/providers/runware.ts - Runware image generation provider
// Fast and cost-effective option for vocabulary images

import type { ImageProvider, ImageGenerationOptions, ImageGenerationResult } from './types';

const RUNWARE_API_URL = 'https://api.runware.ai/v1';

export function createRunwareProvider(apiKey: string): ImageProvider {
  return {
    name: 'runware',

    isConfigured(): boolean {
      return !!apiKey && apiKey.length > 0;
    },

    async generate(options: ImageGenerationOptions): Promise<ImageGenerationResult> {
      if (!this.isConfigured()) {
        return {
          success: false,
          error: 'Runware API key not configured',
          provider: 'runware'
        };
      }

      try {
        const response = await fetch(`${RUNWARE_API_URL}/images/generations`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            positivePrompt: options.prompt,
            width: options.width || 512,
            height: options.height || 512,
            model: 'runware:100@1', // Fast model
            numberResults: 1,
            outputFormat: 'WEBP'
          })
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          return {
            success: false,
            error: errorData.message || `HTTP ${response.status}`,
            provider: 'runware'
          };
        }

        const data = await response.json();

        if (data.data && data.data[0]?.imageURL) {
          return {
            success: true,
            imageUrl: data.data[0].imageURL,
            provider: 'runware',
            cost: 0.001 // ~$0.001 per image
          };
        }

        return {
          success: false,
          error: 'No image URL in response',
          provider: 'runware'
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          provider: 'runware'
        };
      }
    }
  };
}
