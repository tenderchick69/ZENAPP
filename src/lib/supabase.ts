import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';

// Debug check - this will show in the browser console if the connection fails
if (!PUBLIC_SUPABASE_URL || !PUBLIC_SUPABASE_ANON_KEY) {
    console.error('🚨 CRITICAL ERROR: Supabase Variables missing.');
    console.error('Ensure Vercel Environment Variables are named PUBLIC_SUPABASE_URL and PUBLIC_SUPABASE_ANON_KEY');
}

export const supabase = createClient(
    PUBLIC_SUPABASE_URL || '',
    PUBLIC_SUPABASE_ANON_KEY || ''
);
