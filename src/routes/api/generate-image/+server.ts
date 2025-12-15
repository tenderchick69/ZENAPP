import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
  buildImagePrompt,
  canGenerateImage,
  generateImage,
  createRunwareProvider,
  type CardData
} from '$lib/imagegen';
import { env } from '$env/dynamic/private';
import { saveImageToStorage } from '$lib/supabase-server';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const body = await request.json();
    const { card, model, style, customPrompt, cardId } = body as {
      card: CardData;
      model?: string;
      style?: string;
      customPrompt?: string;
      cardId?: number | string;
    };

    // Validate card data
    if (!card || !card.headword || !card.definition) {
      throw error(400, 'Card data with headword and definition required');
    }

    // Check if card is suitable for image generation
    const validation = canGenerateImage(card);
    if (!validation.valid) {
      throw error(400, validation.reason || 'Card not suitable for image generation');
    }

    // Check if Runware is configured
    if (!env.RUNWARE_API_KEY) {
      throw error(500, 'Runware API key not configured');
    }

    // Use custom prompt if provided, otherwise build from card
    let finalPrompt: string;
    if (customPrompt && customPrompt.trim()) {
      finalPrompt = customPrompt.trim();
      console.log('Using custom prompt');
    } else {
      const promptResult = buildImagePrompt(card);
      finalPrompt = promptResult.prompt;
      console.log('Using auto-generated prompt');
    }

    // Apply style modifier if provided (photorealistic = no modifier)
    if (style && style !== 'photorealistic') {
      const styleModifiers: Record<string, string> = {
        illustrative: ', illustration style',
        comic: ', comic book art style',
        minimal: ', minimalist icon',
        watercolor: ', watercolor painting style'
      };
      if (styleModifiers[style]) {
        finalPrompt = `${finalPrompt}${styleModifiers[style]}`;
      }
    }

    console.log('Generating image for:', card.headword);
    console.log('Model:', model || 'sd15');
    console.log('Prompt:', finalPrompt);

    // Create Runware provider
    const provider = createRunwareProvider(env.RUNWARE_API_KEY);

    // Generate the image
    const result = await generateImage(provider, {
      prompt: finalPrompt,
      width: 512,
      height: 512,
      model: model || 'sd15'
    });

    if (!result.success) {
      console.error('Image generation failed:', result.error, result.errors);
      return json({
        error: result.error || 'Image generation failed',
        details: result.errors || []
      }, { status: 500 });
    }

    console.log(`Image generated (temp):`, result.imageUrl);

    // Save to Supabase Storage for permanent URL
    let permanentUrl = result.imageUrl;
    if (env.SUPABASE_SERVICE_ROLE_KEY) {
      try {
        const uniqueId = cardId || `${card.headword}-${Date.now()}`;
        permanentUrl = await saveImageToStorage(result.imageUrl, uniqueId);
        console.log(`Image saved to Supabase:`, permanentUrl);
      } catch (storageError) {
        // Log error but don't fail - return temp URL as fallback
        console.error('Failed to save to Supabase Storage:', storageError);
        console.log('Falling back to temporary URL');
      }
    } else {
      console.warn('SUPABASE_SERVICE_ROLE_KEY not configured - using temporary URL');
    }

    return json({
      imageUrl: permanentUrl,
      prompt: finalPrompt,
      provider: result.provider
    });

  } catch (e: unknown) {
    console.error('Generate image error:', e);

    if (e && typeof e === 'object' && 'status' in e) {
      throw e;
    }

    const message = e instanceof Error ? e.message : 'Failed to generate image';
    throw error(500, message);
  }
};
