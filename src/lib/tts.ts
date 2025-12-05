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

// Cache for loaded voices
let cachedVoices: SpeechSynthesisVoice[] = [];
let voicesLoaded = false;

// Initialize voices - call this early to ensure voices are loaded
function initVoices(): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      resolve([]);
      return;
    }

    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      cachedVoices = voices;
      voicesLoaded = true;
      resolve(voices);
      return;
    }

    // Voices not loaded yet, wait for the event
    const handleVoicesChanged = () => {
      cachedVoices = window.speechSynthesis.getVoices();
      voicesLoaded = true;
      window.speechSynthesis.removeEventListener('voiceschanged', handleVoicesChanged);
      resolve(cachedVoices);
    };

    window.speechSynthesis.addEventListener('voiceschanged', handleVoicesChanged);

    // Fallback timeout in case voiceschanged never fires
    setTimeout(() => {
      if (!voicesLoaded) {
        cachedVoices = window.speechSynthesis.getVoices();
        voicesLoaded = true;
        resolve(cachedVoices);
      }
    }, 1000);
  });
}

// Ensure voices are loaded on module init
if (typeof window !== 'undefined') {
  initVoices();
}

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
  if (!isTTSAvailable()) {
    console.warn('TTS not available in this browser');
    return;
  }

  // Cancel any ongoing speech
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);

  // Auto-detect language from text, fall back to provided language
  const detectedLang = detectLanguage(text);
  const targetLang = detectedLang || LANGUAGE_CODES[language] || 'en-US';
  utterance.lang = targetLang;

  // Use cached voices if available, otherwise try to get them
  let voices = cachedVoices;
  if (voices.length === 0) {
    voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      cachedVoices = voices;
      voicesLoaded = true;
    }
  }

  // Find matching voice - try exact match first, then language prefix
  if (voices.length > 0) {
    const langPrefix = targetLang.split('-')[0];

    // Try exact match first (e.g., ko-KR)
    let matchingVoice = voices.find(v => v.lang === targetLang);

    // Try prefix match (e.g., ko)
    if (!matchingVoice) {
      matchingVoice = voices.find(v => v.lang.startsWith(langPrefix));
    }

    // Try any voice that contains the language code
    if (!matchingVoice) {
      matchingVoice = voices.find(v => v.lang.toLowerCase().includes(langPrefix.toLowerCase()));
    }

    if (matchingVoice) {
      utterance.voice = matchingVoice;
      console.log(`TTS: Using voice "${matchingVoice.name}" for language ${targetLang}`);
    } else {
      console.warn(`TTS: No voice found for ${targetLang}, using default. Available voices:`,
        voices.map(v => `${v.name} (${v.lang})`).join(', '));
    }
  } else {
    console.warn('TTS: No voices available yet');
  }

  utterance.rate = 0.8; // Slower for learning
  utterance.pitch = 1;
  utterance.volume = 1;

  // Add error handling
  utterance.onerror = (event) => {
    console.error('TTS error:', event.error);
  };

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
