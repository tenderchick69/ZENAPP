// Revolutionary category system - NOT boring textbook stuff
export const CATEGORIES = {
  // 🎯 Essentials (5 categories)
  essentials: [
    { id: 'greetings', label: 'Greetings & Introductions', icon: '👋', description: 'First impressions matter' },
    { id: 'food', label: 'Food & Dining', icon: '🍜', description: 'Order like a local' },
    { id: 'travel', label: 'Travel & Directions', icon: '✈️', description: 'Navigate confidently' },
    { id: 'family', label: 'Family & Relationships', icon: '👨‍👩‍👧', description: 'Talk about people' },
    { id: 'numbers', label: 'Numbers & Time', icon: '🔢', description: 'Count, pay, schedule' },
  ],

  // 📚 Language Building (4 categories)
  building: [
    { id: 'verbs', label: 'Verbs (Actions)', icon: '🏃', description: 'Do stuff' },
    { id: 'adjectives', label: 'Adjectives (Descriptions)', icon: '🎨', description: 'Describe the world' },
    { id: 'nouns', label: 'Nouns (Things)', icon: '📦', description: 'Name everything' },
    { id: 'idioms', label: 'Idioms & Expressions', icon: '💬', description: 'Sound native' },
  ],

  // 🌶️ Real Talk (6 categories)
  realTalk: [
    { id: 'slang', label: 'Slang & Street Language', icon: '🔥', description: 'How people actually talk' },
    { id: 'romantic', label: 'Romantic & Flirting', icon: '💕', description: 'Make connections' },
    { id: 'nightlife', label: 'Drinking & Nightlife', icon: '🍻', description: 'Party vocab' },
    { id: 'texting', label: 'Texting & Internet', icon: '📱', description: 'Chat online' },
    { id: 'insults', label: 'Playful Insults', icon: '😜', description: 'Banter with friends' },
    { id: 'taboo', label: 'Taboo & Swearing', icon: '🤬', description: 'Uncensored vocabulary' },
  ],

  // 🎭 Cultural (5 categories)
  cultural: [
    { id: 'proverbs', label: 'Proverbs & Wisdom', icon: '🦉', description: 'Ancient knowledge' },
    { id: 'untranslatable', label: 'Untranslatable Words', icon: '🌸', description: 'Words with no English equivalent' },
    { id: 'philosophical', label: 'Philosophical Concepts', icon: '🧘', description: 'Deep ideas' },
    { id: 'poetic', label: 'Poetic & Literary', icon: '📜', description: 'Beautiful language' },
    { id: 'humor', label: 'Humor & Wordplay', icon: '😂', description: 'Jokes and puns' },
  ],

  // 🎪 Fun & Unique (4 categories)
  fun: [
    { id: 'tonguetwister', label: 'Tongue Twisters', icon: '👅', description: 'Pronunciation challenge' },
    { id: 'onomatopoeia', label: 'Onomatopoeia (Sound Words)', icon: '💥', description: 'Boom, splash, meow' },
    { id: 'quotes', label: 'Famous Quotes', icon: '✨', description: 'Memorable phrases' },
    { id: 'compliments', label: 'Compliments & Flattery', icon: '🌹', description: 'Make people smile' },
  ],

  // 💼 Practical (4 categories)
  practical: [
    { id: 'negotiation', label: 'Negotiation & Haggling', icon: '🤝', description: 'Get better deals' },
    { id: 'emergency', label: 'Emergencies', icon: '🚨', description: 'Critical situations' },
    { id: 'frustration', label: 'Complaining & Frustration', icon: '😤', description: 'Express annoyance' },
    { id: 'emotions', label: 'Emotional Nuance', icon: '🎭', description: 'Subtle feelings' },
  ],

  // 🎲 Surprise Me (1 category)
  random: [
    { id: 'random', label: 'Random Mix', icon: '🎲', description: 'Surprise me with variety!' },
  ],
} as const;

// Flatten all categories for easier iteration
export const ALL_CATEGORIES = [
  ...CATEGORIES.essentials,
  ...CATEGORIES.building,
  ...CATEGORIES.realTalk,
  ...CATEGORIES.cultural,
  ...CATEGORIES.fun,
  ...CATEGORIES.practical,
  ...CATEGORIES.random,
];

export type CategoryId = typeof ALL_CATEGORIES[number]['id'];

// Helper to get category by ID
export function getCategoryById(id: CategoryId) {
  return ALL_CATEGORIES.find(cat => cat.id === id);
}

// Group labels for UI
export const CATEGORY_GROUPS = [
  { key: 'essentials', label: '🎯 Essentials', categories: CATEGORIES.essentials },
  { key: 'building', label: '📚 Language Building', categories: CATEGORIES.building },
  { key: 'realTalk', label: '🌶️ Real Talk', categories: CATEGORIES.realTalk },
  { key: 'cultural', label: '🎭 Cultural', categories: CATEGORIES.cultural },
  { key: 'fun', label: '🎪 Fun & Unique', categories: CATEGORIES.fun },
  { key: 'practical', label: '💼 Practical', categories: CATEGORIES.practical },
  { key: 'random', label: '🎲 Surprise Me', categories: CATEGORIES.random },
] as const;
