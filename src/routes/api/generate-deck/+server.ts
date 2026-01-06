import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { generateDeckContent } from '$lib/openrouter';
import { buildSystemPrompt, buildUserPrompt, type GenerationParams } from '$lib/prompts';
import { OPENROUTER_API_KEY } from '$env/static/private';

// Environment variable for API key
// Add to .env: OPENROUTER_API_KEY=sk-or-v1-...

export const POST: RequestHandler = async ({ request }) => {
  try {
    // Check API key is configured
    if (!OPENROUTER_API_KEY) {
      console.error('OPENROUTER_API_KEY not configured');
      throw error(500, 'API key not configured. Please set OPENROUTER_API_KEY in .env file.');
    }

    // Parse request body
    const params: GenerationParams = await request.json();

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

    // Return generated deck
    return json({
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
