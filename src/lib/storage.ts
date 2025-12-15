import { supabase } from './supabase';

/**
 * Get a signed URL for an image stored in Supabase Storage.
 * Handles both legacy full URLs and new filepath format.
 *
 * @param filepath - Either a full URL (legacy) or a storage path like "user123/card456/1234567890.webp"
 * @returns Signed URL valid for 1 hour, or null if failed
 */
export async function getSignedImageUrl(filepath: string): Promise<string | null> {
  if (!filepath) return null;

  // If it's already a full URL (legacy Runware URLs or existing Supabase URLs), return as-is
  if (filepath.startsWith('http')) {
    return filepath;
  }

  try {
    const { data, error } = await supabase.storage
      .from('vocab-assets')
      .createSignedUrl(filepath, 3600); // 1 hour expiry

    if (error) {
      console.error('Failed to get signed URL:', error);
      return null;
    }

    return data.signedUrl;
  } catch (e) {
    console.error('Error getting signed URL:', e);
    return null;
  }
}

/**
 * Get signed URLs for multiple images.
 *
 * @param filepaths - Array of filepaths or URLs
 * @returns Array of signed URLs (filters out any failures)
 */
export async function getSignedImageUrls(filepaths: string[]): Promise<string[]> {
  if (!filepaths || filepaths.length === 0) return [];

  const urls = await Promise.all(
    filepaths.map(fp => getSignedImageUrl(fp))
  );

  return urls.filter((url): url is string => url !== null);
}

/**
 * Check if a filepath is a storage path (not a full URL).
 * Storage paths need signed URL generation.
 */
export function isStoragePath(filepath: string): boolean {
  return filepath && !filepath.startsWith('http');
}
