// OpenRouter API client for AI deck generation
export interface CardData {
  headword: string;
  definition: string;
  pos: string;
  ipa: string;
  example: string;
  exampleTranslation?: string;
  mnemonic: string;
  etymology: string;
  tags: string;
}

export interface DeckGeneration {
  deckName: string;
  cards: CardData[];
}

export interface OpenRouterConfig {
  apiKey: string;
  model: string;
  maxTokens: number;
  temperature: number;
}

export const DEFAULT_CONFIG: Partial<OpenRouterConfig> = {
  model: 'moonshotai/kimi-k2', // KIMI K2 - cheap and effective
  maxTokens: 4000,
  temperature: 0.7, // Some creativity, not too wild
};

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

export async function generateDeckContent(
  systemPrompt: string,
  userPrompt: string,
  apiKey: string,
  config: Partial<OpenRouterConfig> = {}
): Promise<DeckGeneration> {
  const finalConfig = { ...DEFAULT_CONFIG, ...config, apiKey };

  const response = await fetch(OPENROUTER_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${finalConfig.apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://zenapp.vercel.app', // Update with your actual domain
      'X-Title': 'ZenApp Vocabulary Generator',
    },
    body: JSON.stringify({
      model: finalConfig.model,
      max_tokens: finalConfig.maxTokens,
      temperature: finalConfig.temperature,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' }, // Force JSON output
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenRouter API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error('No content in OpenRouter response');
  }

  // Parse JSON response
  let parsed: any;
  try {
    parsed = JSON.parse(content);
  } catch (e) {
    console.error('Failed to parse JSON:', content);
    throw new Error('AI returned invalid JSON format');
  }

  // Validate response structure
  if (!parsed.cards || !Array.isArray(parsed.cards)) {
    throw new Error('AI response missing cards array');
  }

  if (parsed.cards.length === 0) {
    throw new Error('AI returned zero cards');
  }

  // Validate and clean cards
  const validatedCards: CardData[] = parsed.cards.map((card: any, index: number) => {
    if (!card.headword || !card.definition) {
      console.warn(`Card ${index} missing required fields:`, card);
    }

    return {
      headword: card.headword || 'Unknown',
      definition: card.definition || '',
      pos: card.pos || '',
      ipa: card.ipa || '',
      example: card.example || '',
      exampleTranslation: card.exampleTranslation || '',
      mnemonic: card.mnemonic || '',
      etymology: card.etymology || '',
      tags: card.tags || '',
    };
  });

  return {
    deckName: parsed.deckName || 'AI Generated Deck',
    cards: validatedCards,
  };
}

// Validate card data before inserting to database
export function validateCard(card: CardData): boolean {
  return Boolean(card.headword && card.definition);
}

// Clean and prepare cards for Supabase insertion
export function prepareCardsForDb(cards: CardData[], deckId: number) {
  return cards
    .filter(validateCard)
    .map(card => ({
      deck_id: deckId,
      headword: card.headword.trim(),
      definition: card.definition.trim(),
      pos: card.pos.trim(),
      ipa: card.ipa.trim(),
      example: card.example.trim(),
      mnemonic: card.mnemonic.trim(),
      etymology: card.etymology.trim(),
      tags: card.tags.trim(),
      // SRS defaults
      state: 0,
      interval: 0,
      due: new Date().toISOString(),
      freq: 0,
    }));
}
