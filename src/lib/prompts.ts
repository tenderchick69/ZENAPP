import type { SupportedLanguage, NativeLanguage } from './languages';
import type { CategoryId } from './categories';

export interface GenerationParams {
  nativeLanguage: NativeLanguage;
  targetLanguage: SupportedLanguage | string;
  category: CategoryId | string;
  level: 'beginner' | 'intermediate' | 'advanced';
  cardCount: number;
  customRequest?: string | null;
}

export function buildSystemPrompt(nativeLanguage: NativeLanguage): string {
  return `You are a vocabulary deck generator for a language learning app called ZenApp. Your job is to create high-quality, culturally authentic vocabulary cards.

CRITICAL: You must respond with ONLY valid JSON. No markdown code blocks, no explanation, no additional text - JUST the raw JSON object.

OUTPUT FORMAT (exact structure required):
{
  "deckName": "Suggested deck name (concise and descriptive)",
  "cards": [
    {
      "headword": "The word/phrase in the target language",
      "definition": "Clear, concise meaning in ${nativeLanguage} (1-2 short definitions, NOT a paragraph)",
      "synonyms": "2-4 related words in TARGET language, comma-separated (e.g., if Korean word: 멋지다, 굉장하다, 최고)",
      "pos": "Part of speech: noun, verb, adj, adv, phrase, interjection, etc.",
      "ipa": "Pronunciation guide (IPA notation or romanization)",
      "example": "Natural example sentence in the target language",
      "exampleGloss": "Translation of the example sentence in ${nativeLanguage}",
      "mnemonic": "Creative memory aid, cultural context, or usage tip",
      "etymology": "Word origin or interesting background (if relevant, otherwise empty string)",
      "tags": "Comma-separated tags for categorization (e.g., 'casual,informal,young')"
    }
  ]
}

IMPORTANT FIELD REQUIREMENTS:
- **definition**: Keep SHORT - 1-3 words in ${nativeLanguage}. NOT a full sentence.
- **synonyms**: ALWAYS in the TARGET language (Korean synonyms for Korean words, Japanese for Japanese, etc.). Provide 2-4 related words.
- **exampleGloss**: ALWAYS translate the example sentence so learners understand the context.
- **mnemonic**: Include cultural context, memory tricks, usage warnings for slang/taboo words.

QUALITY GUIDELINES:
1. **Be culturally authentic** - Use phrases native speakers ACTUALLY say, not textbook garbage
2. **For slang/informal language**: Include context about when and how to use it appropriately
3. **For untranslatable words**: Explain the concept thoroughly in the mnemonic field
4. **For idioms**: Include literal translation AND actual meaning in the mnemonic
5. **For proverbs**: Add cultural background and when people use them
6. **For taboo/swearing**: Be honest and accurate, but include usage warnings in mnemonic
7. **Always include pronunciation** - IPA preferred, romanization acceptable
8. **Make mnemonics memorable** - Use humor, imagery, cultural insights, or clever associations
9. **Examples must be natural** - How people really talk, not "The apple is red" nonsense
10. **If category is "Random Mix"**: Include variety from different categories and difficulty levels

CRITICAL RULES:
- MAXIMUM 20 CARDS PER DECK - Never generate more than 20 cards, even if asked. If user requests more, generate exactly 20.
- NO boring textbook phrases
- Prefer vocabulary that makes learners sound fluent and natural
- Include cultural nuance and real-world context
- Be accurate - don't make up words or false etymologies
- Always provide all required fields (use empty string "" if field not applicable)

Remember: This is NOT Duolingo. This is real language learning.

CRITICAL: Your response must be ONLY valid JSON. No markdown, no \`\`\`json blocks, no explanation before or after. Just the raw JSON object starting with { and ending with }`;
}

export function buildUserPrompt(params: GenerationParams): string {
  const { targetLanguage, category, level, customRequest } = params;
  // Enforce max 20 cards
  const cardCount = Math.min(20, Math.max(1, params.cardCount));

  if (customRequest) {
    // Chat mode - use the full conversation context
    return `${customRequest}

Based on this conversation, generate ${cardCount} vocabulary cards (maximum 20). Extract the target language, category, and level from the context above.`;
  }

  // Quick Generate mode - structured request
  return `Generate ${cardCount} ${level}-level vocabulary cards for learning ${targetLanguage}.

Category: ${getCategoryDescription(category)}
Difficulty Level: ${level}

Requirements:
- All cards should fit the "${category}" category
- Appropriate for ${level} learners
- Include ${cardCount} unique, high-quality cards
- Follow all quality guidelines from the system prompt

Remember: Make these cards interesting, culturally relevant, and actually useful for real conversations. No boring textbook content!`;
}

function getCategoryDescription(category: string): string {
  const descriptions: Record<string, string> = {
    greetings: 'Greetings & Introductions - how to meet people and make first impressions',
    food: 'Food & Dining - ordering, eating, discussing cuisine',
    travel: 'Travel & Directions - navigating, asking for help, transportation',
    family: 'Family & Relationships - talking about people and connections',
    numbers: 'Numbers & Time - counting, money, scheduling, dates',
    verbs: 'Common Verbs (Actions) - essential action words',
    adjectives: 'Adjectives (Descriptions) - describing people, places, things',
    nouns: 'Nouns (Things) - important objects and concepts',
    idioms: 'Idioms & Expressions - phrases native speakers use',
    slang: 'Slang & Street Language - how people REALLY talk',
    romantic: 'Romantic & Flirting - making connections, expressing interest',
    nightlife: 'Drinking & Nightlife - bars, clubs, socializing',
    texting: 'Texting & Internet - online communication, abbreviations',
    insults: 'Playful Insults - friendly banter and teasing',
    taboo: 'Taboo & Swearing - uncensored vocabulary (use responsibly)',
    proverbs: 'Proverbs & Wisdom - traditional sayings and wisdom',
    untranslatable: 'Untranslatable Words - concepts unique to this language/culture',
    philosophical: 'Philosophical Concepts - deep ideas and abstract thought',
    poetic: 'Poetic & Literary Language - beautiful, expressive vocabulary',
    humor: 'Humor & Wordplay - jokes, puns, funny expressions',
    tonguetwister: 'Tongue Twisters - pronunciation challenges',
    onomatopoeia: 'Onomatopoeia - sound words (boom, splash, meow)',
    quotes: 'Famous Quotes - memorable phrases from culture/history',
    compliments: 'Compliments & Flattery - making people feel good',
    negotiation: 'Negotiation & Haggling - getting better deals',
    emergency: 'Emergencies - critical situations and safety',
    frustration: 'Complaining & Frustration - expressing annoyance properly',
    emotions: 'Emotional Nuance - subtle feelings and expressions',
    random: 'Random Mix - variety from multiple categories',
  };

  return descriptions[category] || category;
}
