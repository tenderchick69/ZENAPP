import { writable } from 'svelte/store';
import { supabase } from './supabase';
import type { User } from '@supabase/supabase-js';

export const user = writable<User | null>(null);
export const userPreferences = writable<UserPreferences | null>(null);
export const authInitialized = writable(false);

export interface UserPreferences {
  id: string;
  native_language: string;
  target_language: string;
  experience_level: string;
  theme: string;
  is_approved: boolean;
}

// Store the auth listener unsubscribe function
let authUnsubscribe: (() => void) | null = null;

// Initialize auth state
export async function initAuth() {
  // Prevent multiple initializations - unsubscribe existing listener first
  if (authUnsubscribe) {
    authUnsubscribe();
    authUnsubscribe = null;
  }

  try {
    const { data: { session } } = await supabase.auth.getSession();
    user.set(session?.user ?? null);

    if (session?.user) {
      await loadPreferences(session.user.id);
    }

    // Listen for auth changes - store unsubscribe function
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      user.set(session?.user ?? null);
      if (session?.user) {
        await loadPreferences(session.user.id);
      } else {
        userPreferences.set(null);
      }
    });

    authUnsubscribe = () => subscription.unsubscribe();
  } catch (error) {
    console.error('Auth initialization failed:', error);
  } finally {
    // Mark auth as fully initialized (even on error, so UI doesn't hang)
    authInitialized.set(true);
  }
}

// Cleanup function for when the app unmounts (useful for tests/HMR)
export function cleanupAuth() {
  if (authUnsubscribe) {
    authUnsubscribe();
    authUnsubscribe = null;
  }
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
    await loadPreferences(currentUser.id);
  }
}
