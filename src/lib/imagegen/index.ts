// src/lib/imagegen/index.ts - Main image generation module

export { buildImagePrompt, canGenerateImage, shouldSkipImage } from './promptBuilder';
export type { CardData, PromptResult } from './promptBuilder';

export { createRunwareProvider } from './providers/runware';
export { createReplicateProvider } from './providers/replicate';
export { createOpenAIProvider } from './providers/openai';
export { createLaozhangProvider } from './providers/laozhang';
export type { ImageProvider, ImageGenerationOptions, ImageGenerationResult, ProviderError } from './providers/types';

import type { ImageProvider, ImageGenerationResult, ImageGenerationOptions, ProviderError } from './providers/types';

export type ProviderName = 'runware' | 'replicate' | 'laozhang' | 'openai';

/**
 * Generate an image using the specified provider
 * Falls back to next provider if current one fails
 * Returns detailed errors from each provider that was tried
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

  const errors: ProviderError[] = [];

  // Try each provider in order
  for (const provider of providers) {
    if (!provider.isConfigured()) {
      errors.push({ provider: provider.name, error: 'Not configured' });
      continue;
    }

    const result = await provider.generate(options);
    if (result.success) {
      return result;
    }

    const errorMsg = result.error || 'Unknown error';
    errors.push({ provider: provider.name, error: errorMsg });
    console.warn(`Provider ${provider.name} failed: ${errorMsg}`);
  }

  return {
    success: false,
    error: 'All providers failed',
    errors,
    provider: 'none'
  };
}

/**
 * Get the preferred provider order based on cost/quality preference
 */
export function getProviderOrder(preference: 'cost' | 'quality' | 'speed'): ProviderName[] {
  switch (preference) {
    case 'cost':
      return ['runware', 'replicate', 'laozhang', 'openai'];
    case 'quality':
      return ['openai', 'laozhang', 'replicate', 'runware'];
    case 'speed':
      return ['runware', 'laozhang', 'openai', 'replicate'];
    default:
      return ['runware', 'replicate', 'laozhang', 'openai'];
  }
}
