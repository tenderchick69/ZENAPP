// src/lib/imagegen/providers/types.ts - Common types for image providers

export interface ProviderError {
  provider: string;
  error: string;
}

export interface ImageGenerationResult {
  success: boolean;
  imageUrl?: string;
  error?: string;
  errors?: ProviderError[];
  provider: string;
  cost?: number;
}

export interface ImageGenerationOptions {
  prompt: string;
  width?: number;
  height?: number;
  style?: string;
  model?: string;
}

export interface ImageProvider {
  name: string;
  generate(options: ImageGenerationOptions): Promise<ImageGenerationResult>;
  isConfigured(): boolean;
}
