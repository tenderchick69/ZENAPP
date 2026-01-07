import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { generateDeckContent, prepareCardsForDb } from '$lib/openrouter';
import { buildSystemPrompt, buildUserPrompt, type GenerationParams } from '$lib/prompts';
import { OPENROUTER_API_KEY } from '$env/static/private';
import { supabase } from '$lib/supabase';

// Environment variable for API key
// Add to .env: OPENROUTER_API_KEY=sk-or-v1-...

interface GenerateRequest extends GenerationParams {
  userId?: string;
}

export const POST: RequestHandler = async ({ request }) => {
  try {
    // Check API key is configured
    if (!OPENROUTER_API_KEY) {
      console.error('OPENROUTER_API_KEY not configured');
      throw error(500, 'API key not configured. Please set OPENROUTER_API_KEY in .env file.');
    }

    // Parse request body
    const params: GenerateRequest = await request.json();

    // Validate required fields
    if (!params.nativeLanguage) {
      throw error(400, 'Native language is required');
    }

    if (!params.customRequest && !params.targetLanguage) {
      throw error(400, 'Target language is required for Quick Generate mode');
    }

    if (!params.customRequest && !params.category) {
      throw error(400, 'Category is required for Quick Generate mode');
    }

    if (!params.cardCount || params.cardCount < 1 || params.cardCount > 20) {
      throw error(400, 'Card count must be between 1 and 20');
    }

    // Build prompts
    const systemPrompt = buildSystemPrompt(params.nativeLanguage);
    const userPrompt = buildUserPrompt(params);

    // Call OpenRouter API
    const result = await generateDeckContent(
      systemPrompt,
      userPrompt,
      OPENROUTER_API_KEY
    );

    // AUTO-SAVE: If userId provided, save deck immediately after generation
    let deckId: number | null = null;

    if (params.userId) {
      try {
        // Create deck in Supabase
        const deckResult = await supabase
          .from('decks')
          .insert({
            name: result.deckName,
            user_id: params.userId
          })
          .select()
          .single();

        if (deckResult.error) {
          console.error('Failed to auto-save deck:', deckResult.error);
          // Don't throw - still return the generated deck, just without auto-save
        } else {
          const newDeckId = deckResult.data.id;

          // Insert cards
          const cardsToInsert = prepareCardsForDb(result.cards, newDeckId);
          const cardsResult = await supabase
            .from('cards')
            .insert(cardsToInsert);

          if (cardsResult.error) {
            console.error('Failed to insert cards:', cardsResult.error);
            // Rollback deck creation
            await supabase.from('decks').delete().eq('id', newDeckId);
          } else {
            deckId = newDeckId;
          }
        }
      } catch (saveError) {
        console.error('Auto-save error:', saveError);
        // Continue without auto-save
      }
    }

    // Return generated deck (with deckId if auto-saved)
    return json({
      deckId,
      deckName: result.deckName,
      cards: result.cards,
    });

  } catch (e: any) {
    console.error('Generate deck error:', e);

    // Return appropriate error
    if (e.status) {
      // Already a SvelteKit error
      throw e;
    }

    // Wrap other errors
    throw error(500, e.message || 'Failed to generate deck');
  }
};
