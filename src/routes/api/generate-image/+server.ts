import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
  buildImagePrompt,
  canGenerateImage,
  generateWithOpenAI,
  type CardData
} from '$lib/imagegen';
import {
  generateWithKie,
  type KieModel,
  type AspectRatio,
  type Resolution
} from '$lib/imagegen/providers/kie';
import { env } from '$env/dynamic/private';
import { saveImageToStorage, saveBase64ToStorage } from '$lib/supabase-server';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const body = await request.json();
    const {
      card,
      model,
      style,
      customPrompt,
      cardId,
      userId,
      provider: requestedProvider,
      quality,
      aspectRatio,
      resolution
    } = body as {
      card: CardData;
      model?: string;
      style?: string;
      customPrompt?: string;
      cardId?: number | string;
      userId?: string;
      provider?: string; // 'kie' | 'kie-flux' | 'openai'
      quality?: 'low' | 'medium' | 'high';
      aspectRatio?: AspectRatio;
      resolution?: Resolution;
    };

    console.log('=== IMAGE GENERATION REQUEST ===');
    console.log('Card:', card?.headword);
    console.log('Provider requested:', requestedProvider);
    console.log('Model:', model);
    console.log('Quality:', quality);
    console.log('Aspect Ratio:', aspectRatio);
    console.log('Resolution:', resolution);
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
    const useOpenAI = requestedProvider === 'openai' || requestedProvider === 'gpt-image';
    const useKieFlux = requestedProvider === 'kie-flux';
    const useKie = requestedProvider === 'kie' || (!useOpenAI && !useKieFlux); // Default to Kie Z-Image

    // Check API key availability
    if (useOpenAI) {
      if (!env.OPENAI_API_KEY) {
        console.error('OPENAI_API_KEY not configured');
        throw error(500, 'OpenAI API key not configured');
      }
      console.log('Using OpenAI with API key:', env.OPENAI_API_KEY.slice(0, 10) + '...');
    } else {
      if (!env.KIE_API_KEY) {
        console.error('KIE_API_KEY not configured');
        throw error(500, 'Kie.ai API key not configured');
      }
      console.log('Using Kie.ai with API key:', env.KIE_API_KEY.slice(0, 10) + '...');
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

    let imageUrl: string;
    let providerName: string;

    if (useOpenAI) {
      // Use direct OpenAI API
      console.log('=== CALLING OPENAI DIRECTLY ===');
      providerName = 'openai';
      imageUrl = await generateWithOpenAI(finalPrompt, env.OPENAI_API_KEY!, quality || 'medium');
      console.log('OpenAI returned image');
    } else {
      // Use Kie.ai provider
      const kieModel: KieModel = useKieFlux ? 'flux-2/flex-text-to-image' : 'z-image';
      console.log('=== CALLING KIE.AI ===');
      console.log('Kie Model:', kieModel);
      providerName = useKieFlux ? 'kie-flux' : 'kie';

      imageUrl = await generateWithKie(
        finalPrompt,
        env.KIE_API_KEY!,
        kieModel,
        aspectRatio || '1:1',
        kieModel === 'flux-2/flex-text-to-image' ? (resolution || '1K') : undefined
      );
      console.log('Kie.ai returned image');
    }

    console.log('=== IMAGE GENERATED SUCCESSFULLY ===');
    console.log('Provider:', providerName);
    console.log('Image URL type:', imageUrl?.startsWith('data:') ? 'base64' : 'URL');
    console.log('Image URL length:', imageUrl?.length);

    // ALWAYS try to save to Supabase Storage
    let finalImageUrl = imageUrl; // Fallback
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
        const isBase64 = imageUrl?.startsWith('data:');
        console.log('Image format:', isBase64 ? 'base64' : 'URL');

        if (isBase64) {
          console.log('Saving base64 image to Supabase...');
          filepath = await saveBase64ToStorage(imageUrl!, userId, uniqueCardId);
        } else {
          console.log('Downloading and saving URL image to Supabase...');
          filepath = await saveImageToStorage(imageUrl!, userId, uniqueCardId);
        }

        console.log('=== IMAGE SAVED TO SUPABASE ===');
        console.log('Filepath:', filepath);
        finalImageUrl = filepath; // Use Supabase filepath instead of temp URL
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
    console.log('Final imageUrl:', finalImageUrl?.slice(0, 100));

    return json({
      success: true,
      imageUrl: finalImageUrl,
      prompt: finalPrompt,
      provider: providerName
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
