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
  console.log('Polling for task result, taskId:', taskId);

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    // Use jobs endpoint (correct per API behavior)
    const pollUrl = `${KIE_BASE_URL}/jobs/getTaskDetail?taskId=${encodeURIComponent(taskId)}`;
    console.log('Poll URL:', pollUrl);

    const response = await fetch(pollUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    // Get raw text first to see what we're dealing with
    const rawText = await response.text();
    console.log(`Poll attempt ${attempt} - HTTP ${response.status}`);
    console.log('Raw response:', rawText.substring(0, 500));

    // Parse JSON
    let result: any;
    try {
      result = JSON.parse(rawText);
    } catch (e) {
      console.error('JSON parse error:', e);
      await new Promise(resolve => setTimeout(resolve, intervalMs));
      continue;
    }

    console.log('Parsed response:', JSON.stringify(result, null, 2));

    // Handle different response structures from Kie.ai
    const code = result.code;
    const data = result.data || result;

    // Check for API error
    if (code && code !== 200) {
      console.error('API returned error code:', code, result.msg);
      throw new Error(`Kie.ai error ${code}: ${result.msg || 'Unknown error'}`);
    }

    // Extract status - try multiple possible field names
    const status = (
      data.status ||
      data.taskStatus ||
      data.state ||
      result.status
    )?.toString()?.toLowerCase();

    console.log('Extracted status:', status);

    // Check for completion
    if (status === 'completed' || status === 'success' || status === 'finished') {
      // Try to find image URL in various possible locations
      const imageUrl =
        data.output?.images?.[0] ||
        data.output?.image ||
        data.output?.[0] ||
        data.result?.images?.[0] ||
        data.result?.image ||
        data.result?.[0] ||
        data.images?.[0] ||
        data.image ||
        data.url ||
        data.imageUrl ||
        result.output?.images?.[0] ||
        result.images?.[0];

      console.log('Found image URL:', imageUrl);

      if (!imageUrl) {
        console.error('No image URL found in response:', JSON.stringify(result, null, 2));
        throw new Error('Task completed but no image URL found');
      }

      return imageUrl;
    }

    // Check for failure
    if (status === 'failed' || status === 'error' || status === 'cancelled') {
      const errorMsg = data.error || data.message || data.errorMessage || result.msg || 'Unknown error';
      throw new Error(`Generation failed: ${errorMsg}`);
    }

    // Check for still processing
    if (status === 'pending' || status === 'processing' || status === 'running' || status === 'queued') {
      console.log(`Still ${status}, waiting ${intervalMs}ms...`);
      await new Promise(resolve => setTimeout(resolve, intervalMs));
      continue;
    }

    // Unknown status - if we have no status at all, check if maybe the task isn't ready
    if (!status) {
      console.log('No status field found, checking if task exists...');

      // Maybe the response itself indicates the task isn't ready yet
      if (attempt < 5) {
        console.log('Waiting for task to be queryable...');
        await new Promise(resolve => setTimeout(resolve, intervalMs));
        continue;
      }

      // After a few attempts, if still no status, log full response and error
      console.error('Cannot determine task status. Full response:', JSON.stringify(result, null, 2));
      throw new Error('Unable to determine task status from Kie.ai response');
    }

    // Unknown status value
    console.log(`Unknown status "${status}", treating as in-progress...`);
    await new Promise(resolve => setTimeout(resolve, intervalMs));
  }

  throw new Error(`Timeout: Task did not complete after ${maxAttempts * intervalMs / 1000} seconds`);
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
