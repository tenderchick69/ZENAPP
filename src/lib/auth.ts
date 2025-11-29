import { writable } from 'svelte/store';
import { supabase } from './supabase';
import type { User } from '@supabase/supabase-js';

export const user = writable<User | null>(null);
export const userPreferences = writable<UserPreferences | null>(null);

export interface UserPreferences {
  id: string;
  native_language: string;
  target_language: string;
  experience_level: string;
  theme: string;
}

// Initialize auth state
export async function initAuth() {
  const { data: { session } } = await supabase.auth.getSession();
  user.set(session?.user ?? null);

  if (session?.user) {
    await loadPreferences(session.user.id);
  }

  // Listen for auth changes
  supabase.auth.onAuthStateChange(async (event, session) => {
    user.set(session?.user ?? null);
    if (session?.user) {
      await loadPreferences(session.user.id);
    } else {
      userPreferences.set(null);
    }
  });
}

async function loadPreferences(userId: string) {
  const { data } = await supabase
    .from('user_preferences')
    .select('*')
    .eq('id', userId)
    .single();

  userPreferences.set(data);
}

export async function signInWithGoogle() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin
    }
  });
  if (error) console.error('Auth error:', error);
}

export async function signOut() {
  await supabase.auth.signOut();
  user.set(null);
  userPreferences.set(null);
}

export async function savePreferences(prefs: Partial<UserPreferences>) {
  const { data: { user: currentUser } } = await supabase.auth.getUser();
  if (!currentUser) return;

  const { error } = await supabase
    .from('user_preferences')
    .upsert({
      id: currentUser.id,
      ...prefs,
      updated_at: new Date().toISOString()
    });

  if (!error) {
    userPreferences.update(p => ({ ...p, ...prefs } as UserPreferences));
  }
}
