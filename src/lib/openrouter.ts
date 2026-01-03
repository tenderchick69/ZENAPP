// OpenRouter API client for AI deck generation
export interface CardData {
  headword: string;
  definition: string;
  synonyms?: string;
  pos: string;
  ipa: string;
  example: string;
  exampleGloss?: string;
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
  model: 'moonshotai/kimi-k2-0905', // KIMI K2 0905 - 2x context (262K), faster
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
  let content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error('No content in OpenRouter response');
  }

  // Log raw AI response for debugging
  console.log('=== RAW AI RESPONSE START ===');
  console.log('Length:', content.length);
  console.log('First 1000 chars:', content.substring(0, 1000));
  console.log('Last 200 chars:', content.substring(content.length - 200));
  console.log('=== RAW AI RESPONSE END ===');

  // Clean up JSON response - strip markdown blocks and extra text
  let cleanedContent = content.trim();

  // Remove ALL variations of markdown code blocks (multiple passes to be safe)
  cleanedContent = cleanedContent
    .replace(/^```json\s*/gim, '')
    .replace(/^```\s*/gim, '')
    .replace(/\s*```\s*$/gim, '')
    .replace(/```json\n?/gi, '')
    .replace(/```\n?/gi, '')
    .replace(/^json\s*/gi, ''); // Sometimes AI just writes "json" before the object

  // Remove any leading/trailing whitespace again after stripping
  cleanedContent = cleanedContent.trim();

  // Find the actual JSON object using balanced brace matching
  const startIndex = cleanedContent.indexOf('{');

  if (startIndex === -1) {
    console.error('No opening brace found. Cleaned content:', cleanedContent.substring(0, 500));
    throw new Error('AI response does not contain a JSON object (no opening brace)');
  }

  // Find matching closing brace using balanced counting
  let braceCount = 0;
  let endIndex = -1;
  let inString = false;
  let escapeNext = false;

  for (let i = startIndex; i < cleanedContent.length; i++) {
    const char = cleanedContent[i];

    if (escapeNext) {
      escapeNext = false;
      continue;
    }

    if (char === '\\' && inString) {
      escapeNext = true;
      continue;
    }

    if (char === '"' && !escapeNext) {
      inString = !inString;
      continue;
    }

    if (!inString) {
      if (char === '{') braceCount++;
      if (char === '}') {
        braceCount--;
        if (braceCount === 0) {
          endIndex = i;
          break;
        }
      }
    }
  }

  if (endIndex === -1) {
    console.error('No matching closing brace found. Content from start:', cleanedContent.substring(startIndex, startIndex + 500));
    throw new Error('AI response JSON is malformed (unbalanced braces)');
  }

  // Extract just the JSON portion
  cleanedContent = cleanedContent.slice(startIndex, endIndex + 1);

  console.log('=== CLEANED JSON ===');
  console.log('Length:', cleanedContent.length);
  console.log('First 500 chars:', cleanedContent.substring(0, 500));

  // Parse JSON response
  let parsed: any;
  try {
    parsed = JSON.parse(cleanedContent);
  } catch (e: any) {
    console.error('=== JSON PARSE ERROR ===');
    console.error('Error message:', e.message);
    console.error('Content that failed (first 1000 chars):', cleanedContent.substring(0, 1000));

    // Try to fix common JSON issues
    let fixedContent = cleanedContent
      // Fix trailing commas before } or ]
      .replace(/,\s*}/g, '}')
      .replace(/,\s*]/g, ']')
      // Fix single quotes to double quotes (risky but sometimes works)
      .replace(/'/g, '"')
      // Remove control characters
      .replace(/[\x00-\x1F\x7F]/g, (char: string) => char === '\n' || char === '\r' || char === '\t' ? char : '');

    try {
      parsed = JSON.parse(fixedContent);
      console.log('JSON parsed successfully after fixes');
    } catch (e2) {
      console.error('Still failed after fixes. Final attempt content:', fixedContent.substring(0, 500));
      throw new Error(`AI returned invalid JSON format: ${e.message}`);
    }
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
      synonyms: card.synonyms || '',
      pos: card.pos || '',
      ipa: card.ipa || '',
      example: card.example || '',
      exampleGloss: card.exampleGloss || '',
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
  console.log('prepareCardsForDb called with', cards.length, 'cards for deck', deckId);

  const prepared = cards
    .filter(validateCard)
    .map((card, index) => {
      try {
        return {
          deck_id: deckId,
          headword: (card.headword || '').trim(),
          definition: (card.definition || '').trim(),
          synonyms: (card.synonyms || '').trim(),
          pos: (card.pos || '').trim(),
          ipa: (card.ipa || '').trim(),
          example: (card.example || '').trim(),
          example_gloss: (card.exampleGloss || '').trim(),
          mnemonic: (card.mnemonic || '').trim(),
          etymology: (card.etymology || '').trim(),
          tags: (card.tags || '').trim(),
          // SRS defaults
          state: 0,
          interval: 0,
          due: new Date().toISOString(),
          freq: 0,
        };
      } catch (e) {
        console.error(`Error preparing card ${index}:`, card, e);
        throw e;
      }
    });

  console.log('Prepared', prepared.length, 'valid cards');
  return prepared;
}
