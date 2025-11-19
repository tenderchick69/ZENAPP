import { writable } from 'svelte/store';
import { browser } from '$app/environment';

export type ThemeSkin = 'syndicate' | 'zen';

// Load from localStorage or default to syndicate
const stored = browser ? localStorage.getItem('vocapp_skin') as ThemeSkin : null;
export const currentSkin = writable<ThemeSkin>(stored || 'syndicate');

// Persist to localStorage
if (browser) {
  currentSkin.subscribe(value => {
    localStorage.setItem('vocapp_skin', value);
  });
}

export function toggleSkin() {
  currentSkin.update(current => current === 'syndicate' ? 'zen' : 'syndicate');
}
