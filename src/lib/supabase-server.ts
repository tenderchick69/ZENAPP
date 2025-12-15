import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import { env } from '$env/dynamic/private';

// Server-side Supabase client with service role for storage operations
// This should ONLY be used in server-side code (+server.ts files)
export function createServerSupabase() {
  if (!PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Supabase server credentials not configured');
  }

  return createClient(PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

/**
 * Downloads an image from a temporary URL and uploads it to Supabase Storage.
 * Returns the storage FILEPATH (not URL) for database storage.
 * Signed URLs are generated on-demand when displaying images.
 *
 * @param tempUrl - Temporary URL from image provider (e.g., Runware)
 * @param userId - User ID for scoped storage path
 * @param cardId - Card ID for organizing images
 * @returns Storage filepath like "user123/card456/1234567890.webp"
 */
export async function saveImageToStorage(
  tempUrl: string,
  userId: string,
  cardId: number | string
): Promise<string> {
  const supabase = createServerSupabase();

  // 1. Download image from temporary URL
  const response = await fetch(tempUrl);
  if (!response.ok) {
    throw new Error(`Failed to download image: ${response.statusText}`);
  }

  const imageBuffer = await response.arrayBuffer();

  // 2. Create user-scoped filepath
  const timestamp = Date.now();
  const filepath = `${userId}/${cardId}/${timestamp}.webp`;

  // 3. Upload to Supabase Storage
  const { data, error } = await supabase.storage
    .from('vocab-assets')
    .upload(filepath, imageBuffer, {
      contentType: 'image/webp',
      cacheControl: '31536000', // 1 year cache
      upsert: true
    });

  if (error) {
    throw new Error(`Storage upload failed: ${error.message}`);
  }

  // 4. Return filepath (NOT full URL) - signed URLs generated on-demand
  return filepath;
}
