// src/lib/imagegen/promptBuilder.ts - Smart prompt construction for vocabulary images

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

// Visual styles for image generation
const STYLES = {
  default: 'clean illustration, soft lighting, centered composition, white background',
  nature: 'watercolor style, natural elements, organic shapes, earthy tones',
  action: 'dynamic pose, motion blur effect, vibrant energy',
  emotion: 'abstract expressionist, bold colors, emotional intensity',
  food: 'appetizing food photography style, warm lighting, close-up',
  place: 'architectural illustration, atmospheric perspective, scenic view'
};

// Abstract concept mappings for difficult-to-visualize words
const abstractMappings: Record<string, string> = {
  love: 'two intertwined hearts glowing warmly',
  hope: 'sunrise breaking through dark clouds',
  fear: 'shadowy figure at edge of light',
  happiness: 'person with arms raised in joy, golden light',
  sadness: 'single figure in rain, muted blue tones',
  anger: 'clenched fist with red aura',
  peace: 'calm lake at dawn, soft mist',
  freedom: 'bird soaring in open sky',
  time: 'hourglass with flowing sand',
  memory: 'faded photograph with soft edges',
  dream: 'surreal floating landscape, soft focus',
  truth: 'crystal clear mirror reflection',
  beauty: 'delicate flower in perfect bloom',
  strength: 'mountain peak against stormy sky',
  wisdom: 'ancient tree with deep roots',
  courage: 'lone figure facing vast horizon',
  patience: 'water slowly shaping stone',
  gratitude: 'open hands receiving light',
  loneliness: 'single chair in empty room',
  excitement: 'fireworks bursting in night sky'
};

/**
 * Check if a category should skip image generation
 */
export function shouldSkipImage(tags?: string): boolean {
  if (!tags) return false;
  const tagList = tags.toLowerCase().split(',').map(t => t.trim());
  return tagList.some(tag => SKIP_CATEGORIES.includes(tag));
}

/**
 * Determine the best style based on card content
 */
function selectStyle(card: CardData): string {
  const content = `${card.definition} ${card.tags || ''} ${card.example || ''}`.toLowerCase();

  if (/food|eat|drink|cook|meal|taste/.test(content)) return STYLES.food;
  if (/place|city|building|house|room|location/.test(content)) return STYLES.place;
  if (/nature|tree|flower|animal|water|sky/.test(content)) return STYLES.nature;
  if (/run|jump|move|action|verb|do/.test(content)) return STYLES.action;
  if (/feel|emotion|love|hate|happy|sad/.test(content)) return STYLES.emotion;

  return STYLES.default;
}

/**
 * Build an abstract visualization prompt for concepts
 */
export function buildAbstractPrompt(concept: string): string | null {
  const normalized = concept.toLowerCase().trim();
  return abstractMappings[normalized] || null;
}

/**
 * Build the optimal image prompt from card data
 * Priority: mnemonic > etymology story > definition
 */
export function buildImagePrompt(card: CardData): PromptResult {
  const style = selectStyle(card);
  let prompt: string;
  let isAbstract = false;

  // Priority 1: Use mnemonic if available (already visual/memorable)
  if (card.mnemonic && card.mnemonic.length > 10) {
    prompt = `${card.mnemonic}. ${style}`;
  }
  // Priority 2: Check for abstract concept mapping
  else if (buildAbstractPrompt(card.definition)) {
    prompt = `${buildAbstractPrompt(card.definition)}. ${style}`;
    isAbstract = true;
  }
  // Priority 3: Use etymology if it tells a story
  else if (card.etymology && card.etymology.length > 20) {
    prompt = `Visual representation of: ${card.etymology}. ${style}`;
  }
  // Priority 4: Fall back to definition with headword context
  else {
    prompt = `Illustration of "${card.headword}" meaning: ${card.definition}. ${style}`;
  }

  // Safety: ensure prompt isn't too long (most APIs have limits)
  if (prompt.length > 500) {
    prompt = prompt.substring(0, 497) + '...';
  }

  return {
    prompt,
    style,
    isAbstract
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
