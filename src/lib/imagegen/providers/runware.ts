// src/lib/imagegen/providers/runware.ts - Runware image generation provider

import type { ImageProvider, ImageGenerationOptions, ImageGenerationResult } from './types';

const RUNWARE_API_URL = 'https://api.runware.ai/v1';

// Model IDs for Runware
export const RUNWARE_MODELS: Record<string, { id: string; name: string; desc: string }> = {
  'sd15': { id: 'runware:100@1', name: 'SD 1.5', desc: 'Fastest, cheapest' },
  'sdxl': { id: 'civitai:101055@128078', name: 'SDXL', desc: 'Better quality' },
  'flux': { id: 'runware:101@1', name: 'FLUX Schnell', desc: 'Best quality' }
};

// Generate a UUIDv4
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

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
        // Sanitize prompt - strip non-ASCII
        const sanitizedPrompt = options.prompt
          .replace(/[^\x00-\x7F]/g, '')
          .trim()
          .slice(0, 500);

        // Get model ID from options or default to SD 1.5
        const modelKey = options.model || 'sd15';
        const modelId = RUNWARE_MODELS[modelKey]?.id || RUNWARE_MODELS['sd15'].id;

        // Runware API expects an array of task objects
        const requestBody = [{
          taskType: 'imageInference',
          taskUUID: generateUUID(),
          positivePrompt: sanitizedPrompt,
          width: options.width || 512,
          height: options.height || 512,
          model: modelId,
          numberResults: 1,
          outputFormat: 'WEBP',
          steps: modelKey === 'flux' ? 4 : 20 // FLUX needs fewer steps
        }];

        const response = await fetch(`${RUNWARE_API_URL}/images/generations`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Runware error response:', response.status, errorText);

          let errorMessage = `HTTP ${response.status}`;
          try {
            const errorJson = JSON.parse(errorText);
            errorMessage = errorJson.error?.message || errorJson.message || errorJson.detail || errorText.slice(0, 200);
          } catch {
            errorMessage = `HTTP ${response.status}: ${errorText.slice(0, 200)}`;
          }

          return {
            success: false,
            error: errorMessage,
            provider: 'runware'
          };
        }

        const data = await response.json();

        // Response is an array, find the imageInference result
        const imageResult = Array.isArray(data)
          ? data.find((item: Record<string, unknown>) => item.taskType === 'imageInference')
          : data.data?.[0];

        if (imageResult?.imageURL) {
          return {
            success: true,
            imageUrl: imageResult.imageURL,
            provider: 'runware',
            cost: modelKey === 'flux' ? 0.003 : 0.001
          };
        }

        return {
          success: false,
          error: 'No image URL in response: ' + JSON.stringify(data).slice(0, 200),
          provider: 'runware'
        };
      } catch (error) {
        console.error('Runware exception:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          provider: 'runware'
        };
      }
    }
  };
}
