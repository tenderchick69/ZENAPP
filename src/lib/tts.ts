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
 * Speak text using Web Speech API
 * @param text - The text to speak
 * @param language - The language name (e.g., 'Korean', 'Japanese')
 */
export function speak(text: string, language: string = 'English'): void {
  if (!isTTSAvailable()) {
    console.warn('TTS not available in this browser');
    return;
  }

  // Cancel any ongoing speech
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = LANGUAGE_CODES[language] || 'en-US';
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
