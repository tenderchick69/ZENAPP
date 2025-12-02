// src/lib/imagegen/providers/types.ts - Common types for image providers

export interface ImageGenerationResult {
  success: boolean;
  imageUrl?: string;
  error?: string;
  provider: string;
  cost?: number;
}

export interface ImageGenerationOptions {
  prompt: string;
  width?: number;
  height?: number;
  style?: string;
}

export interface ImageProvider {
  name: string;
  generate(options: ImageGenerationOptions): Promise<ImageGenerationResult>;
  isConfigured(): boolean;
}
