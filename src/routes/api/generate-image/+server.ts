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
    } else {
      if (!env.KIE_API_KEY) {
        console.error('KIE_API_KEY not configured');
        throw error(500, 'Kie.ai API key not configured');
      }
    }

    // Use custom prompt if provided, otherwise build from card
    let finalPrompt: string;
    if (customPrompt && customPrompt.trim()) {
      finalPrompt = customPrompt.trim();
    } else {
      const promptResult = buildImagePrompt(card);
      finalPrompt = promptResult.prompt;
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

    let imageUrl: string;
    let providerName: string;

    if (useOpenAI) {
      providerName = 'openai';
      imageUrl = await generateWithOpenAI(finalPrompt, env.OPENAI_API_KEY!, quality || 'medium');
    } else {
      const kieModel: KieModel = useKieFlux ? 'flux-2/flex-text-to-image' : 'z-image';
      providerName = useKieFlux ? 'kie-flux' : 'kie';

      imageUrl = await generateWithKie(
        finalPrompt,
        env.KIE_API_KEY!,
        kieModel,
        aspectRatio || '1:1',
        kieModel === 'flux-2/flex-text-to-image' ? (resolution || '1K') : undefined
      );
    }

    // ALWAYS try to save to Supabase Storage
    let finalImageUrl = imageUrl; // Fallback
    const canSaveToStorage = env.SUPABASE_SERVICE_ROLE_KEY && userId;

    if (canSaveToStorage) {
      try {
        const uniqueCardId = cardId || `temp-${Date.now()}`;
        let filepath: string;

        // Check if image is base64 or URL
        const isBase64 = imageUrl?.startsWith('data:');

        if (isBase64) {
          filepath = await saveBase64ToStorage(imageUrl!, userId, uniqueCardId);
        } else {
          filepath = await saveImageToStorage(imageUrl!, userId, uniqueCardId);
        }

        finalImageUrl = filepath; // Use Supabase filepath instead of temp URL
      } catch (storageError) {
        console.error('Supabase storage error:', storageError);
        // Keep the temp URL as fallback
      }
    }

    return json({
      success: true,
      imageUrl: finalImageUrl,
      prompt: finalPrompt,
      provider: providerName
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
