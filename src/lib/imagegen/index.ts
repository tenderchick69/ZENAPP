// src/lib/imagegen/index.ts - Main image generation module

export { buildImagePrompt, canGenerateImage, shouldSkipImage } from './promptBuilder';
export type { CardData, PromptResult } from './promptBuilder';

export { createOpenAIImageProvider, generateWithOpenAI } from './providers/openai';
export { generateWithKie, KIE_MODELS, ASPECT_RATIOS, RESOLUTIONS } from './providers/kie';
export type { KieModel, AspectRatio, Resolution } from './providers/kie';
export type { ImageProvider, ImageGenerationOptions, ImageGenerationResult, ProviderError } from './providers/types';
