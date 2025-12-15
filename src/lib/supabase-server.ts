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
 * Downloads an image from a temporary URL and uploads it to Supabase Storage
 * Returns the permanent public URL
 */
export async function saveImageToStorage(
  tempUrl: string,
  cardId: number | string
): Promise<string> {
  const supabase = createServerSupabase();

  // 1. Download image from temporary URL
  const response = await fetch(tempUrl);
  if (!response.ok) {
    throw new Error(`Failed to download image: ${response.statusText}`);
  }

  const imageBlob = await response.blob();

  // 2. Create unique filename
  const timestamp = Date.now();
  const filename = `card-${cardId}-${timestamp}.webp`;

  // 3. Upload to Supabase Storage
  const { data, error } = await supabase.storage
    .from('vocab-assets')
    .upload(filename, imageBlob, {
      contentType: 'image/webp',
      upsert: true
    });

  if (error) {
    throw new Error(`Storage upload failed: ${error.message}`);
  }

  // 4. Get public URL
  const { data: urlData } = supabase.storage
    .from('vocab-assets')
    .getPublicUrl(filename);

  return urlData.publicUrl;
}
