// src/lib/imagegen/providers/replicate.ts - Replicate image generation provider
// Higher quality option with SDXL/Flux models

import type { ImageProvider, ImageGenerationOptions, ImageGenerationResult } from './types';

const REPLICATE_API_URL = 'https://api.replicate.com/v1';

// Default to SDXL for good quality/speed balance
const DEFAULT_MODEL = 'stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b';

export function createReplicateProvider(apiKey: string): ImageProvider {
  return {
    name: 'replicate',

    isConfigured(): boolean {
      return !!apiKey && apiKey.length > 0;
    },

    async generate(options: ImageGenerationOptions): Promise<ImageGenerationResult> {
      if (!this.isConfigured()) {
        return {
          success: false,
          error: 'Replicate API key not configured',
          provider: 'replicate'
        };
      }

      try {
        // Create prediction
        const createResponse = await fetch(`${REPLICATE_API_URL}/predictions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Token ${apiKey}`
          },
          body: JSON.stringify({
            version: DEFAULT_MODEL.split(':')[1],
            input: {
              prompt: options.prompt,
              width: options.width || 512,
              height: options.height || 512,
              num_outputs: 1
            }
          })
        });

        if (!createResponse.ok) {
          const errorData = await createResponse.json().catch(() => ({}));
          return {
            success: false,
            error: errorData.detail || `HTTP ${createResponse.status}`,
            provider: 'replicate'
          };
        }

        const prediction = await createResponse.json();

        // Poll for completion (max 60 seconds)
        const startTime = Date.now();
        const timeout = 60000;

        while (Date.now() - startTime < timeout) {
          const statusResponse = await fetch(prediction.urls.get, {
            headers: {
              'Authorization': `Token ${apiKey}`
            }
          });

          const status = await statusResponse.json();

          if (status.status === 'succeeded') {
            if (status.output && status.output[0]) {
              return {
                success: true,
                imageUrl: status.output[0],
                provider: 'replicate',
                cost: 0.003 // ~$0.003 per SDXL image
              };
            }
            return {
              success: false,
              error: 'No output in completed prediction',
              provider: 'replicate'
            };
          }

          if (status.status === 'failed') {
            return {
              success: false,
              error: status.error || 'Prediction failed',
              provider: 'replicate'
            };
          }

          // Wait 1 second before polling again
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

        return {
          success: false,
          error: 'Timeout waiting for image generation',
          provider: 'replicate'
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          provider: 'replicate'
        };
      }
    }
  };
}
