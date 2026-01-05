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
  // Step 1: Create task
  const taskId = await createTask(apiKey, model, prompt, aspectRatio, resolution);

  // Step 2: Poll for result using /jobs/recordInfo endpoint
  const imageUrl = await pollTaskResult(apiKey, taskId);

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
  };

  const response = await fetch(`${KIE_BASE_URL}/jobs/createTask`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  const rawText = await response.text();
  let result: KieTaskResponse;
  try {
    result = JSON.parse(rawText);
  } catch (e) {
    console.error('Kie.ai createTask JSON parse error:', response.status, rawText.substring(0, 500));
    throw new Error('Kie.ai createTask failed: Invalid JSON response');
  }

  if (result.code !== 200) {
    console.error('Kie.ai createTask error:', result.code, result.msg);
    throw new Error(`Kie.ai error ${result.code}: ${result.msg}`);
  }

  return result.data.taskId;
}

async function pollTaskResult(
  apiKey: string,
  taskId: string
): Promise<string> {
  // Polling strategy: 2s intervals for first 15 attempts (~30s), then backoff to 5s, then 10s, then 15s
  // Max total wait: ~10 minutes
  const maxAttempts = 80;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    // Calculate interval with backoff
    let intervalMs: number;
    if (attempt <= 15) intervalMs = 2000;       // First 30s: 2s intervals
    else if (attempt <= 30) intervalMs = 5000;  // Next 75s: 5s intervals
    else if (attempt <= 50) intervalMs = 10000; // Next 200s: 10s intervals
    else intervalMs = 15000;                    // Rest: 15s intervals

    // Correct endpoint per Kie Market docs: /jobs/recordInfo
    const pollUrl = `${KIE_BASE_URL}/jobs/recordInfo?taskId=${encodeURIComponent(taskId)}`;

    const response = await fetch(pollUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    const rawText = await response.text();

    // Parse JSON
    let result: any;
    try {
      result = JSON.parse(rawText);
    } catch (e) {
      console.error('Kie.ai poll JSON parse error:', rawText.substring(0, 500));
      await new Promise(resolve => setTimeout(resolve, intervalMs));
      continue;
    }

    // Check API response code
    if (result.code !== 200) {
      console.error('Kie.ai API error:', response.status, rawText.substring(0, 500));
      throw new Error(`Kie.ai error ${result.code}: ${result.message || result.msg || 'Unknown error'}`);
    }

    const data = result.data;
    if (!data) {
      console.error('Kie.ai no data in response:', rawText.substring(0, 500));
      throw new Error('Kie.ai response missing data field');
    }

    const state = data.state?.toLowerCase();

    // Still processing states
    if (state === 'waiting' || state === 'queuing' || state === 'generating') {
      await new Promise(resolve => setTimeout(resolve, intervalMs));
      continue;
    }

    // Failure state
    if (state === 'fail') {
      throw new Error(`Kie.ai task failed: ${data.failCode || ''} ${data.failMsg || 'Unknown error'}`);
    }

    // Success state - extract URL from resultJson
    if (state === 'success') {
      let resultData: any = {};
      try {
        resultData = JSON.parse(data.resultJson || '{}');
      } catch (e) {
        console.error('Kie.ai resultJson parse error:', data.resultJson);
      }

      const imageUrl =
        resultData?.resultUrls?.[0] ||
        resultData?.resultImageUrl ||
        resultData?.images?.[0] ||
        resultData?.url;

      if (!imageUrl) {
        console.error('Kie.ai success but no URL in resultJson:', data.resultJson);
        throw new Error('Kie.ai task succeeded but no image URL found in resultJson');
      }

      return imageUrl;
    }

    // Unknown state - treat as in-progress for a few attempts
    if (attempt < 5) {
      await new Promise(resolve => setTimeout(resolve, intervalMs));
      continue;
    }

    console.error('Kie.ai unknown state:', state, rawText.substring(0, 500));
    throw new Error(`Kie.ai unknown task state: ${state}`);
  }

  throw new Error('Kie.ai timeout: Task did not complete after ~10 minutes');
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
