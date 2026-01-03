import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
  buildImagePrompt,
  canGenerateImage,
  generateImage,
  createRunwareProvider,
  createOpenRouterImageProvider,
  type CardData
} from '$lib/imagegen';
import { env } from '$env/dynamic/private';
import { saveImageToStorage, saveBase64ToStorage } from '$lib/supabase-server';
import { OPENROUTER_API_KEY } from '$env/static/private';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const body = await request.json();
    const { card, model, style, customPrompt, cardId, userId, provider: requestedProvider } = body as {
      card: CardData;
      model?: string;
      style?: string;
      customPrompt?: string;
      cardId?: number | string;
      userId?: string;
      provider?: string; // 'runware' | 'openrouter-image'
    };

    console.log('=== IMAGE GENERATION REQUEST ===');
    console.log('Card:', card?.headword);
    console.log('Provider requested:', requestedProvider);
    console.log('Model:', model);
    console.log('UserId:', userId ? 'provided' : 'MISSING');
    console.log('CardId:', cardId);

    // Validate card data
    if (!card || !card.headword || !card.definition) {
      throw error(400, 'Card data with headword and definition required');
    }

    // Check if card is suitable for image generation
    const validation = canGenerateImage(card);
    if (!validation.valid) {
      throw error(400, validation.reason || 'Card not suitable for image generation');
    }

    // Determine which provider to use
    const useOpenRouter = requestedProvider === 'openrouter-image';

    // Check API key availability
    if (useOpenRouter) {
      if (!OPENROUTER_API_KEY) {
        console.error('OPENROUTER_API_KEY not configured');
        throw error(500, 'OpenRouter API key not configured');
      }
      console.log('Using OpenRouter with API key:', OPENROUTER_API_KEY.slice(0, 10) + '...');
    } else {
      if (!env.RUNWARE_API_KEY) {
        console.error('RUNWARE_API_KEY not configured');
        throw error(500, 'Runware API key not configured');
      }
      console.log('Using Runware with API key:', env.RUNWARE_API_KEY.slice(0, 10) + '...');
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

    console.log('Final prompt:', finalPrompt.slice(0, 200));

    // Create provider based on selection
    const provider = useOpenRouter
      ? createOpenRouterImageProvider(OPENROUTER_API_KEY)
      : createRunwareProvider(env.RUNWARE_API_KEY);

    console.log('Provider configured:', provider.name);

    // Generate the image
    const result = await generateImage(provider, {
      prompt: finalPrompt,
      width: 512,
      height: 512,
      model: model || 'sdxl' // Default to SDXL for better quality
    });

    if (!result.success) {
      console.error('=== IMAGE GENERATION FAILED ===');
      console.error('Error:', result.error);
      console.error('Errors:', result.errors);
      return json({
        error: result.error || 'Image generation failed',
        details: result.errors || []
      }, { status: 500 });
    }

    console.log('=== IMAGE GENERATED SUCCESSFULLY ===');
    console.log('Provider:', result.provider);
    console.log('Image URL type:', result.imageUrl?.startsWith('data:') ? 'base64' : 'URL');
    console.log('Image URL length:', result.imageUrl?.length);

    // ALWAYS try to save to Supabase Storage
    let imageUrl = result.imageUrl; // Fallback
    const canSaveToStorage = env.SUPABASE_SERVICE_ROLE_KEY && userId;

    console.log('=== SUPABASE STORAGE CHECK ===');
    console.log('SUPABASE_SERVICE_ROLE_KEY:', env.SUPABASE_SERVICE_ROLE_KEY ? 'configured' : 'MISSING');
    console.log('userId:', userId || 'MISSING');
    console.log('Can save to storage:', canSaveToStorage);

    if (canSaveToStorage) {
      try {
        const uniqueCardId = cardId || `temp-${Date.now()}`;
        let filepath: string;

        // Check if image is base64 or URL
        const isBase64 = result.imageUrl?.startsWith('data:');
        console.log('Image format:', isBase64 ? 'base64' : 'URL');

        if (isBase64) {
          console.log('Saving base64 image to Supabase...');
          filepath = await saveBase64ToStorage(result.imageUrl!, userId, uniqueCardId);
        } else {
          console.log('Downloading and saving URL image to Supabase...');
          filepath = await saveImageToStorage(result.imageUrl!, userId, uniqueCardId);
        }

        console.log('=== IMAGE SAVED TO SUPABASE ===');
        console.log('Filepath:', filepath);
        imageUrl = filepath; // Use Supabase filepath instead of temp URL
      } catch (storageError) {
        console.error('=== SUPABASE STORAGE ERROR ===');
        console.error('Error:', storageError);
        console.log('Falling back to temporary URL (will expire!)');
        // Keep the temp URL as fallback
      }
    } else {
      console.warn('=== CANNOT SAVE TO SUPABASE ===');
      console.warn('Image will use temporary URL that may expire');
    }

    console.log('=== RETURNING RESPONSE ===');
    console.log('Final imageUrl:', imageUrl?.slice(0, 100));

    return json({
      imageUrl,
      prompt: finalPrompt,
      provider: result.provider
    });

  } catch (e: unknown) {
    console.error('=== GENERATE IMAGE ERROR ===');
    console.error('Error:', e);

    if (e && typeof e === 'object' && 'status' in e) {
      throw e;
    }

    const message = e instanceof Error ? e.message : 'Failed to generate image';
    throw error(500, message);
  }
};
