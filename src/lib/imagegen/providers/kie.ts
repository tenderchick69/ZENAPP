// src/lib/imagegen/providers/kie.ts - Kie.ai Image Generation Provider
// Official API Docs: https://docs.kie.ai

const KIE_BASE_URL = 'https://api.kie.ai/api/v1';

// Model identifiers (exact strings from API docs)
export type KieModel =
  | 'z-image'                      // Z-Image Turbo (fast, $0.004)
  | 'flux-2/flex-text-to-image';   // Flux 2 Flex (high quality)

// Aspect ratios
export type AspectRatio = '1:1' | '4:3' | '3:4' | '16:9' | '9:16' | '3:2' | '2:3';

// Resolution (Flux-2 only)
export type Resolution = '1K' | '2K';

interface KieTaskResponse {
  code: number;
  msg: string;
  data: {
    taskId: string;
  };
}

interface KieTaskDetailResponse {
  code: number;
  msg: string;
  data: {
    status: 'pending' | 'processing' | 'completed' | 'failed';
    output?: {
      images?: string[];  // Array of image URLs
    };
    error?: string;
  };
}

export async function generateWithKie(
  prompt: string,
  apiKey: string,
  model: KieModel = 'z-image',
  aspectRatio: AspectRatio = '1:1',
  resolution?: Resolution  // Only for Flux-2
): Promise<string> {
  console.log('=== KIE.AI IMAGE GENERATION ===');
  console.log('Model:', model);
  console.log('Prompt:', prompt.substring(0, 100) + '...');
  console.log('Aspect Ratio:', aspectRatio);

  // Step 1: Create task
  const taskId = await createTask(apiKey, model, prompt, aspectRatio, resolution);
  console.log('Task ID:', taskId);

  // Step 2: Poll for result
  const imageUrl = await pollTaskResult(apiKey, taskId);
  console.log('Image URL:', imageUrl);

  return imageUrl;
}

async function createTask(
  apiKey: string,
  model: KieModel,
  prompt: string,
  aspectRatio: AspectRatio,
  resolution?: Resolution
): Promise<string> {

  // Build input based on model
  let input: Record<string, any>;

  if (model === 'z-image') {
    // Z-Image: NO resolution parameter, max 1000 chars
    input = {
      prompt: prompt.substring(0, 1000),
      aspect_ratio: aspectRatio
    };
  } else {
    // Flux-2: HAS resolution, max 5000 chars
    input = {
      prompt: prompt.substring(0, 5000),
      aspect_ratio: aspectRatio,
      resolution: resolution || '1K'
    };
  }

  const body = {
    model: model,
    input: input
    // Note: callBackUrl omitted - we'll poll instead
  };

  console.log('Request body:', JSON.stringify(body, null, 2));

  const response = await fetch(`${KIE_BASE_URL}/jobs/createTask`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  const result: KieTaskResponse = await response.json();
  console.log('Create task response:', JSON.stringify(result, null, 2));

  if (result.code !== 200) {
    throw new Error(`Kie.ai error ${result.code}: ${result.msg}`);
  }

  return result.data.taskId;
}

async function pollTaskResult(
  apiKey: string,
  taskId: string,
  maxAttempts: number = 60,
  intervalMs: number = 2000
): Promise<string> {
  console.log('Polling for task result...');

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    // Use the unified task detail endpoint
    const response = await fetch(`${KIE_BASE_URL}/jobs/getTaskDetail?taskId=${taskId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    const result: KieTaskDetailResponse = await response.json();
    console.log(`Poll attempt ${attempt}/${maxAttempts}:`, result.data?.status);

    if (result.code !== 200) {
      throw new Error(`Kie.ai poll error ${result.code}: ${result.msg}`);
    }

    const status = result.data?.status;

    if (status === 'completed') {
      const imageUrl = result.data?.output?.images?.[0];
      if (!imageUrl) {
        throw new Error('Task completed but no image URL returned');
      }
      return imageUrl;
    }

    if (status === 'failed') {
      throw new Error(`Generation failed: ${result.data?.error || 'Unknown error'}`);
    }

    // Still pending/processing - wait and retry
    await new Promise(resolve => setTimeout(resolve, intervalMs));
  }

  throw new Error(`Timeout after ${maxAttempts * intervalMs / 1000}s`);
}

// UI Options
export const KIE_MODELS = [
  {
    id: 'z-image' as KieModel,
    name: 'Z-Image Turbo',
    price: '$0.004',
    speed: 'Fast',
    maxPromptLength: 1000,
    hasResolution: false
  },
  {
    id: 'flux-2/flex-text-to-image' as KieModel,
    name: 'Flux 2 Flex',
    price: '~$0.02',
    speed: 'Medium',
    maxPromptLength: 5000,
    hasResolution: true
  }
] as const;

export const ASPECT_RATIOS = [
  { id: '1:1' as AspectRatio, name: 'Square (1:1)' },
  { id: '4:3' as AspectRatio, name: 'Landscape (4:3)' },
  { id: '3:4' as AspectRatio, name: 'Portrait (3:4)' },
  { id: '16:9' as AspectRatio, name: 'Wide (16:9)' },
  { id: '9:16' as AspectRatio, name: 'Vertical (9:16)' }
] as const;

export const RESOLUTIONS = [
  { id: '1K' as Resolution, name: '1K (Standard)' },
  { id: '2K' as Resolution, name: '2K (High Quality)' }
] as const;
