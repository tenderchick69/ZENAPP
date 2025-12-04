// src/lib/imagegen/promptBuilder.ts - Simple prompt construction for vocabulary images

export interface CardData {
  headword: string;
  definition: string;
  pos?: string;
  example?: string;
  mnemonic?: string;
  etymology?: string;
  tags?: string;
}

export interface PromptResult {
  prompt: string;
  style: string;
  isAbstract: boolean;
}

// Categories that should skip image generation
const SKIP_CATEGORIES = [
  'grammar',
  'particles',
  'conjugation',
  'numbers',
  'pronouns'
];

/**
 * Check if a category should skip image generation
 */
export function shouldSkipImage(tags?: string): boolean {
  if (!tags) return false;
  const tagList = tags.toLowerCase().split(',').map(t => t.trim());
  return tagList.some(tag => SKIP_CATEGORIES.includes(tag));
}

/**
 * Build a simple image prompt from card definition
 * Just use the definition - style is applied by the API endpoint
 */
export function buildImagePrompt(card: CardData): PromptResult {
  // Just use the definition - keep it simple
  const prompt = card.definition;

  return {
    prompt,
    style: 'simple',
    isAbstract: false
  };
}

/**
 * Validate if a card is suitable for image generation
 */
export function canGenerateImage(card: CardData): { valid: boolean; reason?: string } {
  if (shouldSkipImage(card.tags)) {
    return { valid: false, reason: 'Category not suitable for images' };
  }

  if (!card.definition || card.definition.length < 3) {
    return { valid: false, reason: 'Definition too short' };
  }

  return { valid: true };
}
