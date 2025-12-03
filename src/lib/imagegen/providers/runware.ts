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
        // Sanitize prompt - strip non-ASCII if needed for Runware
        const sanitizedPrompt = options.prompt
          .replace(/[^\x00-\x7F]/g, '') // Remove non-ASCII
          .trim()
          .slice(0, 500); // Limit length

        const requestBody = {
          positivePrompt: sanitizedPrompt,
          width: options.width || 512,
          height: options.height || 512,
          model: 'runware:100@1',
          numberResults: 1,
          outputFormat: 'WEBP'
        };

        console.log('Runware request:', JSON.stringify(requestBody, null, 2));

        const response = await fetch(`${RUNWARE_API_URL}/images/generations`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
          // Get full error body for debugging
          const errorText = await response.text();
          console.error('Runware error response:', response.status, errorText);

          // Try to parse as JSON for structured error
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
        console.log('Runware success response:', JSON.stringify(data, null, 2));

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
