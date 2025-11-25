# AI Deck Generation - Implementation Plan v2.0
## OpenRouter Integration for ZenApp

**Project**: ZenApp - SRS Vocabulary Learning Application  
**Feature**: AI-Powered Deck Generation via OpenRouter API  
**Date**: 2025-11-25  
**Status**: Ready for Implementation  
**Implementing Agent**: Pinky  

---

## 🎯 Executive Summary

We're building an AI-powered vocabulary deck generator that breaks away from boring textbook learning. Users can either chat with an AI to describe exactly what they want, or use Quick Generate for instant deck creation. The AI outputs structured JSON that gets directly inserted into Supabase - no CSV files involved.

**Philosophy**: This is NOT Duolingo's "the cat drinks milk" energy. This is cultural immersion, real language, and the stuff that makes you sound actually fluent.

---

## 📋 Key Decisions Summary

| Decision | Choice |
|----------|--------|
| UI Location | Dedicated `/generate` route |
| Preview before import | ✅ Yes, with regenerate option |
| AI readiness | User-driven with AI suggestion |
| Output format | JSON (direct to Supabase) |
| AI Model | KIMI K2 via OpenRouter |
| Clarifying questions | Up to 3 |
| Native language support | English + German (baked into Quick Gen) |
| Deck naming | Auto-generate from conversation, editable later |

---

## 🗣️ Supported Languages

```typescript
const SUPPORTED_LANGUAGES = [
  'English',      // For reverse learning
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
  'Cebuano (Bisaya)'
] as const;
```

---

## 📂 Category System

This is what makes us different. Not boring textbook categories - real, useful, cultural content.

```typescript
const CATEGORIES = {
  // 🎯 Essentials
  essentials: [
    { id: 'greetings', label: 'Greetings', icon: '👋' },
    { id: 'food', label: 'Food & Dining', icon: '🍜' },
    { id: 'travel', label: 'Travel & Directions', icon: '✈️' },
    { id: 'family', label: 'Family & Relationships', icon: '👨‍👩‍👧' },
    { id: 'numbers', label: 'Numbers & Time', icon: '🔢' },
  ],
  
  // 📚 Language Building
  building: [
    { id: 'verbs', label: 'Verbs (Actions)', icon: '🏃' },
    { id: 'adjectives', label: 'Adjectives (Descriptions)', icon: '🎨' },
    { id: 'nouns', label: 'Nouns (Things)', icon: '📦' },
    { id: 'idioms', label: 'Idioms & Expressions', icon: '💬' },
  ],
  
  // 🌶️ Real Talk
  realTalk: [
    { id: 'slang', label: 'Slang & Street', icon: '🔥' },
    { id: 'romantic', label: 'Romantic & Flirting', icon: '💕' },
    { id: 'nightlife', label: 'Drinking & Nightlife', icon: '🍻' },
    { id: 'texting', label: 'Texting & Internet', icon: '📱' },
    { id: 'insults', label: 'Playful Insults', icon: '😜' },
    { id: 'taboo', label: 'Taboo & Swearing', icon: '🤬' },
  ],
  
  // 🎭 Cultural
  cultural: [
    { id: 'proverbs', label: 'Proverbs & Wisdom', icon: '🦉' },
    { id: 'untranslatable', label: 'Untranslatable Words', icon: '🌸' },
    { id: 'philosophical', label: 'Philosophical Concepts', icon: '🧘' },
    { id: 'poetic', label: 'Poetic & Literary', icon: '📜' },
    { id: 'humor', label: 'Humor & Wordplay', icon: '😂' },
  ],
  
  // 🎪 Fun & Unique
  fun: [
    { id: 'tonguetwister', label: 'Tongue Twisters', icon: '👅' },
    { id: 'onomatopoeia', label: 'Onomatopoeia (Sound Words)', icon: '💥' },
    { id: 'quotes', label: 'Famous Quotes', icon: '✨' },
    { id: 'compliments', label: 'Compliments & Flattery', icon: '🌹' },
  ],
  
  // 💼 Practical
  practical: [
    { id: 'negotiation', label: 'Negotiation & Haggling', icon: '🤝' },
    { id: 'emergency', label: 'Emergencies', icon: '🚨' },
    { id: 'frustration', label: 'Complaining & Frustration', icon: '😤' },
    { id: 'emotions', label: 'Emotional Nuance', icon: '🎭' },
  ],
  
  // 🎲 Surprise Me
  random: [
    { id: 'random', label: 'Random Mix', icon: '🎲' },
  ],
} as const;
```

---

## 🏗️ Architecture Overview

### New Files to Create

```
src/
├── routes/
│   ├── generate/
│   │   └── +page.svelte          # Main AI generation page
│   └── api/
│       └── generate-deck/
│           └── +server.ts        # OpenRouter API endpoint
├── lib/
│   ├── openrouter.ts             # OpenRouter client
│   ├── categories.ts             # Category definitions
│   └── languages.ts              # Language definitions
└── components/
    ├── AIChat.svelte             # Chat interface component
    ├── QuickGenerate.svelte      # Quick generate form
    └── DeckPreview.svelte        # Preview table before import
```

### Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER INTERFACE                            │
│  ┌─────────────────────┐    ┌─────────────────────────────────┐ │
│  │    AI Chat Mode     │ OR │      Quick Generate Mode        │ │
│  │                     │    │                                 │ │
│  │ "Korean bar slang   │    │ Your Lang: [English ▼]          │ │
│  │  for beginners"     │    │ Learning:  [Korean ▼]           │ │
│  │                     │    │ Category:  [Nightlife ▼]        │ │
│  │ AI asks 1-3         │    │ Level:     [Beginner ▼]         │ │
│  │ clarifying Qs       │    │ Cards:     [25]                 │ │
│  └─────────────────────┘    └─────────────────────────────────┘ │
│                              │                                   │
│                    [Create Deck 🪄]                              │
└──────────────────────────────┼───────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                    SVELTEKIT SERVER                              │
│  POST /api/generate-deck                                         │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ 1. Receive conversation/parameters                          ││
│  │ 2. Build system prompt with CSV structure                   ││
│  │ 3. Call OpenRouter (KIMI K2)                                ││
│  │ 4. Parse JSON response                                      ││
│  │ 5. Validate card structure                                  ││
│  │ 6. Return JSON to frontend                                  ││
│  └─────────────────────────────────────────────────────────────┘│
└──────────────────────────────┼───────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                      PREVIEW SCREEN                              │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ Deck: "Korean Nightlife Basics" (25 cards)                  ││
│  │                                                             ││
│  │ ┌─────────┬───────────┬─────┬───────────────────────┐      ││
│  │ │ Word    │ Meaning   │ POS │ Example               │      ││
│  │ ├─────────┼───────────┼─────┼───────────────────────┤      ││
│  │ │ 건배    │ Cheers!   │ int │ 건배! 오늘 밤 즐기자! │      ││
│  │ │ 한잔    │ One drink │ n   │ 한잔 더 할래요?       │      ││
│  │ │ ...     │ ...       │ ... │ ...                   │      ││
│  │ └─────────┴───────────┴─────┴───────────────────────┘      ││
│  │                                                             ││
│  │ [🔄 Regenerate]  [✏️ Edit Name]  [✅ Import Deck]          ││
│  └─────────────────────────────────────────────────────────────┘│
└──────────────────────────────┼───────────────────────────────────┘
                               │
                               ▼ (on Import)
┌─────────────────────────────────────────────────────────────────┐
│                        SUPABASE                                  │
│  1. INSERT into decks (name, created_at)                        │
│  2. INSERT into cards (all card data with deck_id)              │
│  3. Return success                                               │
└──────────────────────────────┼───────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│  SUCCESS! Redirect to home page or deck view                     │
│  "Deck 'Korean Nightlife Basics' created with 25 cards!"        │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🤖 OpenRouter Integration

### API Configuration

```typescript
// src/lib/openrouter.ts

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

export interface OpenRouterConfig {
  apiKey: string;
  model: string;
  maxTokens: number;
}

export const defaultConfig: OpenRouterConfig = {
  apiKey: process.env.OPENROUTER_API_KEY || '',
  model: 'moonshotai/kimi-k2', // KIMI K2 - cheap and good
  maxTokens: 4000,
};

export async function generateDeckContent(
  systemPrompt: string,
  userPrompt: string,
  config: OpenRouterConfig = defaultConfig
): Promise<CardData[]> {
  const response = await fetch(OPENROUTER_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://zenapp.vercel.app', // Update with actual URL
      'X-Title': 'ZenApp Vocabulary Generator',
    },
    body: JSON.stringify({
      model: config.model,
      max_tokens: config.maxTokens,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' }, // Force JSON output
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenRouter API error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices[0].message.content;
  
  // Parse and validate JSON
  const parsed = JSON.parse(content);
  return validateCards(parsed.cards);
}
```

### System Prompt Template

```typescript
// src/lib/prompts.ts

export function buildSystemPrompt(nativeLanguage: string): string {
  return `You are a vocabulary deck generator for a language learning app. Your job is to create high-quality, culturally authentic vocabulary cards.

IMPORTANT: You must respond with valid JSON only. No markdown, no explanation, just JSON.

OUTPUT FORMAT:
{
  "deckName": "Suggested deck name",
  "cards": [
    {
      "headword": "The word/phrase in the target language",
      "definition": "Clear definition in ${nativeLanguage}",
      "pos": "Part of speech (noun, verb, adj, phrase, interjection, etc.)",
      "ipa": "Pronunciation guide (IPA or romanization)",
      "example": "Example sentence in the target language",
      "exampleTranslation": "Translation of example in ${nativeLanguage}",
      "mnemonic": "Memory aid or cultural context to help remember",
      "etymology": "Word origin or interesting background (if relevant)",
      "tags": "Comma-separated tags for categorization"
    }
  ]
}

GUIDELINES:
1. Be culturally authentic - use real phrases native speakers actually say
2. For slang/informal: include context about when it's appropriate to use
3. For untranslatable words: explain the concept thoroughly in the mnemonic
4. For idioms: include literal translation AND actual meaning
5. For proverbs: include cultural background
6. For taboo/swearing: be honest but include usage warnings
7. Always include pronunciation (IPA preferred, romanization acceptable)
8. Make mnemonics creative and memorable
9. Examples should show natural usage, not textbook sentences
10. If a category is "Random Mix", include variety from different categories

QUALITY STANDARDS:
- No boring textbook phrases like "The apple is red"
- Prefer phrases that make someone sound fluent
- Include cultural nuance and context
- Be accurate - don't make up words`;
}

export function buildUserPrompt(params: GenerationParams): string {
  const { targetLanguage, category, level, cardCount, customRequest } = params;
  
  if (customRequest) {
    // Chat mode - use the full conversation
    return customRequest;
  }
  
  // Quick Generate mode
  return `Generate ${cardCount} ${level} level vocabulary cards for learning ${targetLanguage}.

Category: ${category}
Difficulty: ${level}

Remember: This is NOT a boring textbook app. Make these cards interesting, culturally relevant, and actually useful for real conversations.`;
}
```

---

## 🖥️ UI Components

### 1. Main Generate Page

```svelte
<!-- src/routes/generate/+page.svelte -->

<script lang="ts">
  import { theme, t } from '$lib/theme';
  import AIChat from '$components/AIChat.svelte';
  import QuickGenerate from '$components/QuickGenerate.svelte';
  import DeckPreview from '$components/DeckPreview.svelte';
  import Tooltip from '$components/Tooltip.svelte';
  
  type Mode = 'chat' | 'quick';
  type State = 'input' | 'loading' | 'preview';
  
  let mode: Mode = 'chat';
  let state: State = 'input';
  let generatedCards: CardData[] = [];
  let deckName: string = '';
  let error: string | null = null;
  
  async function handleGenerate(params: GenerationParams) {
    state = 'loading';
    error = null;
    
    try {
      const response = await fetch('/api/generate-deck', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      
      if (!response.ok) throw new Error('Generation failed');
      
      const data = await response.json();
      generatedCards = data.cards;
      deckName = data.deckName;
      state = 'preview';
    } catch (e) {
      error = e.message;
      state = 'input';
    }
  }
  
  async function handleImport() {
    // Import to Supabase logic
  }
  
  function handleRegenerate() {
    state = 'input';
    generatedCards = [];
  }
</script>

<div class="generate-page" data-theme={$theme}>
  <header class="page-header">
    <a href="/" class="back-link">← Back</a>
    <h1>{$t('generateTitle')}</h1>
  </header>
  
  {#if state === 'input'}
    <div class="mode-toggle">
      <Tooltip text="Chat with AI to describe exactly what you want">
        <button 
          class:active={mode === 'chat'}
          onclick={() => mode = 'chat'}>
          💬 Chat Mode
        </button>
      </Tooltip>
      <Tooltip text="Quick options - select language, category, and go">
        <button
          class:active={mode === 'quick'}
          onclick={() => mode = 'quick'}>
          ⚡ Quick Generate
        </button>
      </Tooltip>
    </div>
    
    {#if mode === 'chat'}
      <AIChat onGenerate={handleGenerate} />
    {:else}
      <QuickGenerate onGenerate={handleGenerate} />
    {/if}
    
    {#if error}
      <div class="error-message">{error}</div>
    {/if}
    
  {:else if state === 'loading'}
    <div class="loading-state">
      <div class="spinner"></div>
      <p>Generating your deck...</p>
      <p class="loading-subtext">Creating {mode === 'quick' ? 'cards' : 'something special'}...</p>
    </div>
    
  {:else if state === 'preview'}
    <DeckPreview 
      cards={generatedCards}
      {deckName}
      onImport={handleImport}
      onRegenerate={handleRegenerate}
      onRename={(name) => deckName = name}
    />
  {/if}
</div>
```

### 2. AI Chat Component

```svelte
<!-- src/components/AIChat.svelte -->

<script lang="ts">
  import { theme } from '$lib/theme';
  import { SUPPORTED_LANGUAGES } from '$lib/languages';
  
  export let onGenerate: (params: GenerationParams) => void;
  
  type Message = {
    role: 'user' | 'assistant';
    content: string;
  };
  
  let messages: Message[] = [
    { 
      role: 'assistant', 
      content: "Hey! What would you like to learn today? Tell me the language and what kind of vocabulary you're looking for. Be specific - the more detail, the better your deck!" 
    }
  ];
  let input: string = '';
  let nativeLanguage: string = 'English';
  let questionCount: number = 0;
  let isReady: boolean = false;
  
  // AI determines readiness after gathering enough info
  // Max 3 clarifying questions, then ready to generate
  
  async function sendMessage() {
    if (!input.trim()) return;
    
    const userMessage = input.trim();
    messages = [...messages, { role: 'user', content: userMessage }];
    input = '';
    
    // Simple heuristic: After user provides language + topic, 
    // ask 1-2 clarifying questions, then show Create Deck button
    questionCount++;
    
    if (questionCount >= 2) {
      // AI responds and indicates readiness
      messages = [...messages, { 
        role: 'assistant', 
        content: "Got it! I have enough to create a great deck for you. Click 'Create Deck' when you're ready, or tell me more if you want to refine it further." 
      }];
      isReady = true;
    } else {
      // AI asks clarifying question
      // In real implementation, this would call the API for smart responses
      messages = [...messages, { 
        role: 'assistant', 
        content: getClarifyingQuestion(questionCount) 
      }];
    }
  }
  
  function getClarifyingQuestion(count: number): string {
    // Placeholder - in real implementation, AI generates these
    const questions = [
      "Interesting! What's your level - beginner, intermediate, or advanced?",
      "How many cards would you like? I'd suggest 15-30 for a good study session.",
      "Any specific context? Like for travel, making friends, or impressing someone special? 😏"
    ];
    return questions[count - 1] || questions[0];
  }
  
  function handleCreate() {
    // Compile conversation into generation request
    const conversationText = messages
      .map(m => `${m.role}: ${m.content}`)
      .join('\n');
    
    onGenerate({
      customRequest: conversationText,
      nativeLanguage,
      targetLanguage: '', // Extracted from conversation
      category: '',       // Extracted from conversation
      level: 'beginner',  // Extracted from conversation
      cardCount: 20,      // Extracted from conversation
    });
  }
</script>

<div class="ai-chat" data-theme={$theme}>
  <div class="native-language-select">
    <label>Your language:</label>
    <select bind:value={nativeLanguage}>
      <option value="English">English</option>
      <option value="German">German</option>
    </select>
  </div>
  
  <div class="messages">
    {#each messages as message}
      <div class="message {message.role}">
        <div class="bubble">
          {message.content}
        </div>
      </div>
    {/each}
  </div>
  
  <div class="input-area">
    <input 
      type="text"
      bind:value={input}
      placeholder="Describe what you want to learn..."
      onkeydown={(e) => e.key === 'Enter' && sendMessage()}
    />
    <button onclick={sendMessage} class="send-btn">Send</button>
  </div>
  
  {#if isReady}
    <button onclick={handleCreate} class="create-deck-btn">
      🪄 Create Deck
    </button>
  {/if}
</div>
```

### 3. Quick Generate Component

```svelte
<!-- src/components/QuickGenerate.svelte -->

<script lang="ts">
  import { theme } from '$lib/theme';
  import { SUPPORTED_LANGUAGES } from '$lib/languages';
  import { CATEGORIES } from '$lib/categories';
  
  export let onGenerate: (params: GenerationParams) => void;
  
  let nativeLanguage: string = 'English';
  let targetLanguage: string = 'Korean';
  let category: string = 'random';
  let level: 'beginner' | 'intermediate' | 'advanced' = 'beginner';
  let cardCount: number = 20;
  
  // Flatten categories for dropdown
  const allCategories = Object.values(CATEGORIES).flat();
  
  function handleGenerate() {
    onGenerate({
      nativeLanguage,
      targetLanguage,
      category,
      level,
      cardCount,
      customRequest: null,
    });
  }
</script>

<div class="quick-generate" data-theme={$theme}>
  <div class="form-grid">
    
    <div class="form-group">
      <label>Your Language (definitions in)</label>
      <select bind:value={nativeLanguage}>
        <option value="English">English</option>
        <option value="German">German</option>
      </select>
    </div>
    
    <div class="form-group">
      <label>Language to Learn</label>
      <select bind:value={targetLanguage}>
        {#each SUPPORTED_LANGUAGES as lang}
          <option value={lang}>{lang}</option>
        {/each}
      </select>
    </div>
    
    <div class="form-group">
      <label>Category</label>
      <select bind:value={category}>
        <optgroup label="🎯 Essentials">
          {#each CATEGORIES.essentials as cat}
            <option value={cat.id}>{cat.icon} {cat.label}</option>
          {/each}
        </optgroup>
        <optgroup label="📚 Language Building">
          {#each CATEGORIES.building as cat}
            <option value={cat.id}>{cat.icon} {cat.label}</option>
          {/each}
        </optgroup>
        <optgroup label="🌶️ Real Talk">
          {#each CATEGORIES.realTalk as cat}
            <option value={cat.id}>{cat.icon} {cat.label}</option>
          {/each}
        </optgroup>
        <optgroup label="🎭 Cultural">
          {#each CATEGORIES.cultural as cat}
            <option value={cat.id}>{cat.icon} {cat.label}</option>
          {/each}
        </optgroup>
        <optgroup label="🎪 Fun & Unique">
          {#each CATEGORIES.fun as cat}
            <option value={cat.id}>{cat.icon} {cat.label}</option>
          {/each}
        </optgroup>
        <optgroup label="💼 Practical">
          {#each CATEGORIES.practical as cat}
            <option value={cat.id}>{cat.icon} {cat.label}</option>
          {/each}
        </optgroup>
        <optgroup label="🎲 Surprise Me">
          {#each CATEGORIES.random as cat}
            <option value={cat.id}>{cat.icon} {cat.label}</option>
          {/each}
        </optgroup>
      </select>
    </div>
    
    <div class="form-group">
      <label>Level</label>
      <select bind:value={level}>
        <option value="beginner">🟢 Beginner</option>
        <option value="intermediate">🟡 Intermediate</option>
        <option value="advanced">🔴 Advanced</option>
      </select>
    </div>
    
    <div class="form-group">
      <label>Number of Cards: {cardCount}</label>
      <input 
        type="range" 
        min="5" 
        max="50" 
        bind:value={cardCount}
      />
    </div>
    
  </div>
  
  <button onclick={handleGenerate} class="generate-btn">
    🎲 Generate Deck
  </button>
</div>
```

### 4. Deck Preview Component

```svelte
<!-- src/components/DeckPreview.svelte -->

<script lang="ts">
  import { theme } from '$lib/theme';
  import { supabase } from '$lib/supabase';
  import { goto } from '$app/navigation';
  
  export let cards: CardData[];
  export let deckName: string;
  export let onImport: () => void;
  export let onRegenerate: () => void;
  export let onRename: (name: string) => void;
  
  let isImporting: boolean = false;
  let isEditing: boolean = false;
  let editName: string = deckName;
  
  // Show first 10 cards in preview
  $: previewCards = cards.slice(0, 10);
  $: remainingCount = cards.length - 10;
  
  async function handleImport() {
    isImporting = true;
    
    try {
      // 1. Create deck
      const { data: deck, error: deckError } = await supabase
        .from('decks')
        .insert({ name: deckName })
        .select()
        .single();
      
      if (deckError) throw deckError;
      
      // 2. Insert cards
      const cardsToInsert = cards.map(card => ({
        deck_id: deck.id,
        headword: card.headword,
        definition: card.definition,
        pos: card.pos || '',
        ipa: card.ipa || '',
        example: card.example || '',
        mnemonic: card.mnemonic || '',
        etymology: card.etymology || '',
        tags: card.tags || '',
        // SRS defaults
        state: 0,
        interval: 0,
        due: new Date().toISOString(),
      }));
      
      const { error: cardsError } = await supabase
        .from('cards')
        .insert(cardsToInsert);
      
      if (cardsError) throw cardsError;
      
      // 3. Success - redirect to home
      goto('/');
      
    } catch (error) {
      console.error('Import failed:', error);
      alert('Failed to import deck. Please try again.');
    } finally {
      isImporting = false;
    }
  }
  
  function saveName() {
    onRename(editName);
    isEditing = false;
  }
</script>

<div class="deck-preview" data-theme={$theme}>
  <div class="preview-header">
    {#if isEditing}
      <input 
        type="text" 
        bind:value={editName}
        onkeydown={(e) => e.key === 'Enter' && saveName()}
        class="name-input"
      />
      <button onclick={saveName} class="save-name-btn">Save</button>
    {:else}
      <h2>{deckName}</h2>
      <button onclick={() => { isEditing = true; editName = deckName; }} class="edit-btn">
        ✏️
      </button>
    {/if}
    <span class="card-count">{cards.length} cards</span>
  </div>
  
  <div class="preview-table-container">
    <table class="preview-table">
      <thead>
        <tr>
          <th>Word</th>
          <th>Meaning</th>
          <th>POS</th>
          <th>Example</th>
          <th>Mnemonic</th>
        </tr>
      </thead>
      <tbody>
        {#each previewCards as card}
          <tr>
            <td class="headword">{card.headword}</td>
            <td>{card.definition}</td>
            <td class="pos">{card.pos}</td>
            <td class="example">{card.example}</td>
            <td class="mnemonic">{card.mnemonic}</td>
          </tr>
        {/each}
      </tbody>
    </table>
    
    {#if remainingCount > 0}
      <p class="remaining-note">...and {remainingCount} more cards</p>
    {/if}
  </div>
  
  <div class="preview-actions">
    <button onclick={onRegenerate} class="regenerate-btn">
      🔄 Regenerate
    </button>
    <button 
      onclick={handleImport} 
      class="import-btn"
      disabled={isImporting}>
      {#if isImporting}
        Importing...
      {:else}
        ✅ Import Deck
      {/if}
    </button>
  </div>
</div>
```

---

## 🔌 API Route

```typescript
// src/routes/api/generate-deck/+server.ts

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { OPENROUTER_API_KEY } from '$env/static/private';
import { buildSystemPrompt, buildUserPrompt } from '$lib/prompts';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const params = await request.json();
    
    // Validate input
    if (!params.nativeLanguage) {
      throw error(400, 'Native language is required');
    }
    
    const systemPrompt = buildSystemPrompt(params.nativeLanguage);
    const userPrompt = buildUserPrompt(params);
    
    // Call OpenRouter
    const response = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://zenapp.vercel.app',
        'X-Title': 'ZenApp',
      },
      body: JSON.stringify({
        model: 'moonshotai/kimi-k2',
        max_tokens: 4000,
        temperature: 0.7,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        response_format: { type: 'json_object' },
      }),
    });
    
    if (!response.ok) {
      const errorData = await response.text();
      console.error('OpenRouter error:', errorData);
      throw error(500, 'AI generation failed');
    }
    
    const data = await response.json();
    const content = data.choices[0].message.content;
    
    // Parse JSON response
    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch (e) {
      console.error('JSON parse error:', content);
      throw error(500, 'Invalid AI response format');
    }
    
    // Validate cards
    if (!parsed.cards || !Array.isArray(parsed.cards)) {
      throw error(500, 'AI response missing cards array');
    }
    
    // Validate each card has required fields
    const validatedCards = parsed.cards.map((card: any, index: number) => {
      if (!card.headword || !card.definition) {
        console.warn(`Card ${index} missing required fields:`, card);
      }
      return {
        headword: card.headword || 'Unknown',
        definition: card.definition || '',
        pos: card.pos || '',
        ipa: card.ipa || '',
        example: card.example || '',
        exampleTranslation: card.exampleTranslation || '',
        mnemonic: card.mnemonic || '',
        etymology: card.etymology || '',
        tags: card.tags || '',
      };
    });
    
    return json({
      deckName: parsed.deckName || 'AI Generated Deck',
      cards: validatedCards,
    });
    
  } catch (e: any) {
    console.error('Generate deck error:', e);
    throw error(e.status || 500, e.message || 'Generation failed');
  }
};
```

---

## 🎨 Theme Styling

Add to `src/app.css` or create `src/routes/generate/styles.css`:

```css
/* Generate Page Base Styles */
.generate-page {
  min-height: 100vh;
  padding: 1rem;
  background: var(--color-bg);
  color: var(--color-main);
}

.page-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 2rem;
}

.back-link {
  color: var(--color-accent);
  text-decoration: none;
}

.mode-toggle {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 2rem;
}

.mode-toggle button {
  padding: 0.75rem 1.5rem;
  border: 1px solid var(--color-accent);
  background: transparent;
  color: var(--color-main);
  cursor: pointer;
  transition: all 0.2s;
}

.mode-toggle button.active {
  background: var(--color-accent);
  color: var(--color-bg);
}

/* AI Chat Styles */
.ai-chat {
  max-width: 600px;
  margin: 0 auto;
}

.messages {
  max-height: 400px;
  overflow-y: auto;
  padding: 1rem;
  border: 1px solid var(--color-panel);
  border-radius: 8px;
  margin-bottom: 1rem;
}

.message {
  margin-bottom: 1rem;
}

.message.user {
  text-align: right;
}

.message .bubble {
  display: inline-block;
  max-width: 80%;
  padding: 0.75rem 1rem;
  border-radius: 12px;
}

.message.user .bubble {
  background: var(--color-accent);
  color: var(--color-bg);
}

.message.assistant .bubble {
  background: var(--color-panel);
  color: var(--color-main);
}

.input-area {
  display: flex;
  gap: 0.5rem;
}

.input-area input {
  flex: 1;
  padding: 0.75rem;
  border: 1px solid var(--color-accent);
  background: var(--color-panel);
  color: var(--color-main);
  border-radius: 4px;
}

.create-deck-btn {
  width: 100%;
  padding: 1rem;
  margin-top: 1rem;
  background: var(--color-success);
  color: var(--color-bg);
  border: none;
  border-radius: 8px;
  font-size: 1.1rem;
  cursor: pointer;
  transition: transform 0.2s;
}

.create-deck-btn:hover {
  transform: scale(1.02);
}

/* Quick Generate Styles */
.quick-generate {
  max-width: 500px;
  margin: 0 auto;
  padding: 2rem;
  background: var(--color-panel);
  border-radius: 12px;
}

.form-grid {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  color: var(--color-accent);
  font-size: 0.9rem;
}

.form-group select,
.form-group input[type="range"] {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid var(--color-accent);
  background: var(--color-bg);
  color: var(--color-main);
  border-radius: 4px;
}

.generate-btn {
  width: 100%;
  padding: 1rem;
  margin-top: 1.5rem;
  background: var(--color-accent);
  color: var(--color-bg);
  border: none;
  border-radius: 8px;
  font-size: 1.1rem;
  cursor: pointer;
}

/* Preview Table Styles */
.deck-preview {
  max-width: 900px;
  margin: 0 auto;
}

.preview-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.preview-header h2 {
  margin: 0;
}

.card-count {
  color: var(--color-accent);
  font-size: 0.9rem;
}

.preview-table-container {
  overflow-x: auto;
  margin-bottom: 1.5rem;
}

.preview-table {
  width: 100%;
  border-collapse: collapse;
}

.preview-table th,
.preview-table td {
  padding: 0.75rem;
  text-align: left;
  border-bottom: 1px solid var(--color-panel);
}

.preview-table th {
  color: var(--color-accent);
  font-weight: 600;
}

.preview-table .headword {
  font-weight: 600;
  color: var(--color-success);
}

.preview-table .pos {
  color: var(--color-accent);
  font-size: 0.8rem;
}

.preview-table .example {
  font-style: italic;
  font-size: 0.9rem;
}

.preview-table .mnemonic {
  font-size: 0.85rem;
  color: var(--color-main);
  opacity: 0.8;
}

.remaining-note {
  text-align: center;
  color: var(--color-accent);
  font-style: italic;
  margin-top: 1rem;
}

.preview-actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
}

.regenerate-btn,
.import-btn {
  padding: 1rem 2rem;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  cursor: pointer;
}

.regenerate-btn {
  background: var(--color-panel);
  color: var(--color-main);
  border: 1px solid var(--color-accent);
}

.import-btn {
  background: var(--color-success);
  color: var(--color-bg);
}

/* Loading State */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 300px;
  gap: 1rem;
}

.spinner {
  width: 50px;
  height: 50px;
  border: 3px solid var(--color-panel);
  border-top-color: var(--color-accent);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.loading-subtext {
  color: var(--color-accent);
  font-size: 0.9rem;
}

/* Theme-specific overrides */
[data-theme="syndicate"] .create-deck-btn {
  box-shadow: 0 0 20px rgba(0, 255, 242, 0.3);
}

[data-theme="ember"] .create-deck-btn {
  background: linear-gradient(135deg, #ff6b35, #ff9f1c);
}

[data-theme="frost"] .messages {
  background: rgba(232, 244, 248, 0.03);
  backdrop-filter: blur(10px);
}

[data-theme="zen"] .quick-generate {
  border: 1px solid rgba(168, 197, 197, 0.2);
}
```

---

## 🔐 Environment Variables

Add to `.env.local` and hosting platform (Vercel):

```bash
# OpenRouter API Key
OPENROUTER_API_KEY=sk-or-v1-xxxxxxxxxxxxxxxxxxxxx
```

**Important**: Use `$env/static/private` in SvelteKit to keep this server-side only.

---

## 📱 Mobile Considerations

For mobile, the `/generate` route should:

1. Stack the mode toggle buttons vertically on small screens
2. Make the chat messages full-width
3. Ensure the preview table scrolls horizontally
4. Keep the "Create Deck" button sticky at the bottom

```css
@media (max-width: 640px) {
  .mode-toggle {
    flex-direction: column;
  }
  
  .message .bubble {
    max-width: 90%;
  }
  
  .preview-actions {
    flex-direction: column;
  }
  
  .create-deck-btn,
  .import-btn,
  .regenerate-btn {
    width: 100%;
  }
}
```

---

## 🧪 Testing Checklist

### Functionality
- [ ] Chat mode: Can send messages and receive responses
- [ ] Chat mode: "Create Deck" button appears after 2-3 exchanges
- [ ] Quick Generate: All dropdowns populate correctly
- [ ] Quick Generate: Slider works for card count
- [ ] API: Successfully calls OpenRouter and returns JSON
- [ ] Preview: Shows first 10 cards in table format
- [ ] Preview: Can rename deck
- [ ] Preview: Regenerate resets to input state
- [ ] Import: Creates deck in Supabase
- [ ] Import: Creates all cards with correct deck_id
- [ ] Import: Redirects to home page on success

### Themes
- [ ] Syndicate: Cyan accents, dark background
- [ ] Zen: Calm teal, subtle panels
- [ ] Ember: Orange/gold gradients
- [ ] Frost: Blue frost, glass effects

### Edge Cases
- [ ] Empty response from AI handled
- [ ] Malformed JSON handled
- [ ] Network error handled
- [ ] Very long deck names truncated
- [ ] Special characters in cards escaped

### Mobile
- [ ] Responsive layout on 375px width
- [ ] Touch-friendly buttons
- [ ] Table scrolls horizontally
- [ ] Keyboard doesn't cover input

---

## 🚀 Deployment Steps

1. Add `OPENROUTER_API_KEY` to Vercel environment variables
2. Deploy to Vercel
3. Test generation with each category
4. Monitor OpenRouter usage dashboard
5. Check Supabase for successful inserts

---

## 💰 Cost Estimate

**KIMI K2 Pricing**:
- Input: $0.14 per million tokens
- Output: $0.28 per million tokens

**Per deck generation** (~1500 tokens total):
- Cost: ~$0.0003 (less than 1/30th of a cent)

**Monthly budget for 1000 decks**: ~$0.30

---

## 📝 Theme Terminology to Add

Update `src/lib/theme.ts` with generate page strings:

```typescript
const translations = {
  syndicate: {
    generateTitle: 'Neural Synthesis Lab',
    chatMode: 'Neural Link',
    quickMode: 'Rapid Fabrication',
    createDeck: 'Initialize Synthesis',
    regenerate: 'Recalibrate',
    importDeck: 'Upload to Matrix',
  },
  zen: {
    generateTitle: 'Create New Deck',
    chatMode: 'Guided Creation',
    quickMode: 'Quick Create',
    createDeck: 'Create Deck',
    regenerate: 'Try Again',
    importDeck: 'Add to Collection',
  },
  ember: {
    generateTitle: 'Forge New Knowledge',
    chatMode: 'Speak to the Flame',
    quickMode: 'Quick Spark',
    createDeck: 'Ignite Creation',
    regenerate: 'Rekindle',
    importDeck: 'Add to Garden',
  },
  frost: {
    generateTitle: 'Crystallize Words',
    chatMode: 'Whisper to Frost',
    quickMode: 'Flash Freeze',
    createDeck: 'Form Crystal',
    regenerate: 'Reshape',
    importDeck: 'Preserve in Ice',
  },
};
```

---

## ❓ Questions for Pinky

1. **Supabase RLS**: Are insert policies set up for `decks` and `cards` tables?
2. **Error boundaries**: Should we use SvelteKit's error handling or custom?
3. **Analytics**: Do we want to track deck generations? (Category, language, card count)
4. **Rate limiting**: Should we limit generations per user per day?

---

## 🎉 Summary

This implementation gives ZenApp a revolutionary AI deck generator that:

- **Breaks the mold** - Categories like "Untranslatable Words," "Taboo & Swearing," "Proverbs & Wisdom"
- **Two modes** - Chat for custom requests, Quick Gen for instant creation
- **Preview before commit** - See cards, rename deck, regenerate if needed
- **Theme-aware** - Styled for all 4 themes
- **Cost-effective** - KIMI K2 at $0.0003 per deck
- **Mobile-ready** - Dedicated route works well on all devices

Ready for Pinky to implement! 🚀

---

_Document Version: 2.0_  
_Last Updated: 2025-11-25_  
_Authors: Claude (Planning) + Saya (Direction)_  
_Implementing Agent: Pinky_
