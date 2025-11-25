// Supported languages for vocabulary deck generation
export const SUPPORTED_LANGUAGES = [
  'English',       // For reverse learning (e.g., German speakers learning English)
  'German',
  'Korean',
  'Japanese',
  'Spanish',
  'French',
  'Italian',
  'Mandarin',
  'Portuguese',
  'Russian',
  'Filipino (Tagalog)',
  'Cebuano (Bisaya)',
] as const;

export type SupportedLanguage = typeof SUPPORTED_LANGUAGES[number];

export const NATIVE_LANGUAGES = [
  'English',
  'German',
] as const;

export type NativeLanguage = typeof NATIVE_LANGUAGES[number];
