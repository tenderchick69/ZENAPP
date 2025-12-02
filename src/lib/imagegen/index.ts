// src/lib/imagegen/index.ts - Main image generation module

export { buildImagePrompt, canGenerateImage, shouldSkipImage } from './promptBuilder';
export type { CardData, PromptResult } from './promptBuilder';

export { createRunwareProvider } from './providers/runware';
export { createReplicateProvider } from './providers/replicate';
export { createOpenAIProvider } from './providers/openai';
export type { ImageProvider, ImageGenerationOptions, ImageGenerationResult } from './providers/types';

import type { ImageProvider, ImageGenerationResult, ImageGenerationOptions } from './providers/types';

export type ProviderName = 'runware' | 'replicate' | 'openai';

/**
 * Generate an image using the specified provider
 * Falls back to next provider if current one fails
 */
export async function generateImage(
  providers: ImageProvider[],
  options: ImageGenerationOptions
): Promise<ImageGenerationResult> {
  if (providers.length === 0) {
    return {
      success: false,
      error: 'No image providers configured',
      provider: 'none'
    };
  }

  // Try each provider in order
  for (const provider of providers) {
    if (!provider.isConfigured()) continue;

    const result = await provider.generate(options);
    if (result.success) {
      return result;
    }

    console.warn(`Provider ${provider.name} failed: ${result.error}`);
  }

  return {
    success: false,
    error: 'All providers failed',
    provider: 'none'
  };
}

/**
 * Get the preferred provider order based on cost/quality preference
 */
export function getProviderOrder(preference: 'cost' | 'quality' | 'speed'): ProviderName[] {
  switch (preference) {
    case 'cost':
      return ['runware', 'replicate', 'openai'];
    case 'quality':
      return ['openai', 'replicate', 'runware'];
    case 'speed':
      return ['runware', 'openai', 'replicate'];
    default:
      return ['runware', 'replicate', 'openai'];
  }
}
