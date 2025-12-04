// src/lib/tts.ts - Text-to-Speech utility for vocabulary learning

// Language code mapping for Web Speech API
const LANGUAGE_CODES: Record<string, string> = {
  'English': 'en-US',
  'German': 'de-DE',
  'Korean': 'ko-KR',
  'Japanese': 'ja-JP',
  'Spanish': 'es-ES',
  'French': 'fr-FR',
  'Italian': 'it-IT',
  'Mandarin': 'zh-CN',
  'Portuguese': 'pt-BR',
  'Russian': 'ru-RU',
  'Filipino (Tagalog)': 'fil-PH',
  'Cebuano (Bisaya)': 'ceb-PH', // May fall back to fil-PH
};

/**
 * Auto-detect language from text based on Unicode character ranges
 */
function detectLanguage(text: string): string {
  // Korean (Hangul): U+AC00-U+D7AF (syllables), U+1100-U+11FF (Jamo)
  if (/[\uAC00-\uD7AF\u1100-\u11FF]/.test(text)) {
    return 'ko-KR';
  }
  // Japanese: Hiragana U+3040-U+309F, Katakana U+30A0-U+30FF
  if (/[\u3040-\u309F\u30A0-\u30FF]/.test(text)) {
    return 'ja-JP';
  }
  // Chinese (CJK Unified): U+4E00-U+9FFF (also used in Japanese, but without kana = Chinese)
  if (/[\u4E00-\u9FFF]/.test(text) && !/[\u3040-\u309F\u30A0-\u30FF]/.test(text)) {
    return 'zh-CN';
  }
  // Russian (Cyrillic): U+0400-U+04FF
  if (/[\u0400-\u04FF]/.test(text)) {
    return 'ru-RU';
  }
  // Default to null (will use provided language or English)
  return '';
}

/**
 * Speak text using Web Speech API
 * @param text - The text to speak
 * @param language - The language name (e.g., 'Korean', 'Japanese') - optional, auto-detects if not provided
 */
export function speak(text: string, language: string = 'English'): void {
  console.log('TTS library speak:', { text, language, available: isTTSAvailable() });

  if (!isTTSAvailable()) {
    console.warn('TTS not available in this browser');
    return;
  }

  // Cancel any ongoing speech
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);

  // Auto-detect language from text, fall back to provided language
  const detectedLang = detectLanguage(text);
  utterance.lang = detectedLang || LANGUAGE_CODES[language] || 'en-US';

  console.log('TTS utterance:', { lang: utterance.lang, rate: 0.8, text });

  utterance.rate = 0.8; // Slower for learning
  utterance.pitch = 1;
  utterance.volume = 1;

  window.speechSynthesis.speak(utterance);
}

/**
 * Stop any ongoing speech
 */
export function stopSpeaking(): void {
  if (isTTSAvailable()) {
    window.speechSynthesis.cancel();
  }
}

/**
 * Check if TTS is available in the browser
 */
export function isTTSAvailable(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

/**
 * Get the language code for a given language name
 */
export function getLanguageCode(language: string): string {
  return LANGUAGE_CODES[language] || 'en-US';
}
