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
        throw error(500, 'OpenRouter API key not configured');
      }
    } else {
      if (!env.RUNWARE_API_KEY) {
        throw error(500, 'Runware API key not configured');
      }
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
    console.log('Provider:', useOpenRouter ? 'openrouter-image' : 'runware');
    console.log('Model:', model || 'sd15');
    console.log('Prompt:', finalPrompt);

    // Create provider based on selection
    const provider = useOpenRouter
      ? createOpenRouterImageProvider(OPENROUTER_API_KEY)
      : createRunwareProvider(env.RUNWARE_API_KEY);

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

    console.log(`Image generated via ${result.provider}`);

    // Save to Supabase Storage - returns filepath for database storage
    // Signed URLs are generated on-demand when displaying images
    let imageUrl = result.imageUrl; // Fallback
    if (env.SUPABASE_SERVICE_ROLE_KEY && userId) {
      try {
        const uniqueCardId = cardId || `temp-${Date.now()}`;
        let filepath: string;

        // OpenRouter returns base64 data URLs, Runware returns temp URLs
        if (useOpenRouter && result.imageUrl?.startsWith('data:')) {
          filepath = await saveBase64ToStorage(result.imageUrl, userId, uniqueCardId);
          console.log(`Base64 image saved to Supabase Storage:`, filepath);
        } else {
          filepath = await saveImageToStorage(result.imageUrl!, userId, uniqueCardId);
          console.log(`Image saved to Supabase Storage:`, filepath);
        }

        imageUrl = filepath; // Store filepath, not full URL
      } catch (storageError) {
        // Log error but don't fail - return temp URL as fallback
        console.error('Failed to save to Supabase Storage:', storageError);
        console.log('Falling back to temporary/base64 URL');
      }
    } else {
      if (!env.SUPABASE_SERVICE_ROLE_KEY) {
        console.warn('SUPABASE_SERVICE_ROLE_KEY not configured - using temporary URL');
      }
      if (!userId) {
        console.warn('userId not provided - using temporary URL');
      }
    }

    return json({
      imageUrl, // Either filepath (permanent) or temp URL (fallback)
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
