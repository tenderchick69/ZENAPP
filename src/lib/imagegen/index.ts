// src/lib/imagegen/index.ts - Main image generation module

export { buildImagePrompt, canGenerateImage, shouldSkipImage } from './promptBuilder';
export type { CardData, PromptResult } from './promptBuilder';

export { createRunwareProvider, RUNWARE_MODELS } from './providers/runware';
export { createOpenRouterImageProvider } from './providers/openrouter-image';
export type { ImageProvider, ImageGenerationOptions, ImageGenerationResult, ProviderError } from './providers/types';

import type { ImageProvider, ImageGenerationResult, ImageGenerationOptions, ProviderError } from './providers/types';

/**
 * Generate an image using Runware
 */
export async function generateImage(
  provider: ImageProvider,
  options: ImageGenerationOptions
): Promise<ImageGenerationResult> {
  if (!provider.isConfigured()) {
    return {
      success: false,
      error: 'Runware API key not configured',
      errors: [{ provider: 'runware', error: 'Not configured' }],
      provider: 'none'
    };
  }

  const result = await provider.generate(options);

  if (!result.success) {
    return {
      ...result,
      errors: [{ provider: provider.name, error: result.error || 'Unknown error' }]
    };
  }

  return result;
}
