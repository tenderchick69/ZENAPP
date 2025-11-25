# AI Deck Generation - Implementation Plan
## OpenRouter Integration for ZenApp

**Project**: ZenApp - SRS Vocabulary Learning Application
**Feature**: AI-Powered Deck Generation via OpenRouter API
**Date**: 2025-11-25
**Status**: Planning Phase

---

## 🎯 Executive Summary

We need to integrate OpenRouter API to enable AI-powered vocabulary deck generation. Users will interact with an AI chatbot to describe their learning needs, and the AI will generate a complete CSV file with vocabulary cards that gets automatically imported into Supabase.

---

## 📊 Current System Architecture

### Database Schema (Supabase PostgreSQL)

**Table: `decks`**
```sql
CREATE TABLE decks (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Table: `cards`**
```sql
CREATE TABLE cards (
  id SERIAL PRIMARY KEY,
  deck_id INTEGER REFERENCES decks(id),
  headword TEXT NOT NULL,          -- Main word/term
  definition TEXT,                 -- Definition/translation
  pos TEXT,                        -- Part of speech
  ipa TEXT,                        -- IPA pronunciation
  example TEXT,                    -- Example sentence
  gloss_de TEXT,                   -- German translation (optional)
  mnemonic TEXT,                   -- Memory aid (optional)
  etymology TEXT,                  -- Word origin (optional)
  tags TEXT,                       -- Comma-separated tags
  freq INTEGER DEFAULT 0,          -- Frequency rank
  state INTEGER DEFAULT 0,         -- SRS state: 0=New, 1-4=Learning, 5=Mastered
  interval INTEGER DEFAULT 0,      -- Days until next review
  due TIMESTAMP DEFAULT NOW()      -- Next review date
);
```

### Card Data Structure (TypeScript)

```typescript
// src/lib/srs.ts
export type Card = {
  id: number;
  deck_id: number;
  headword: string;      // REQUIRED
  definition: string;    // REQUIRED
  pos: string;           // Part of speech (noun, verb, adj, etc.)
  ipa: string;           // IPA pronunciation
  example: string;       // Example sentence
  gloss_de?: string;     // German gloss
  mnemonic?: string;     // Mnemonic device
  etymology?: string;    // Etymology
  state: number;         // 0-5 (SRS level)
  interval: number;      // Days
  due: string;           // ISO date string
};
```

### SRS Algorithm

**Ladder**: 0 → 2 days → 5 days → 10 days → 20 days → Mastered (36500 days)

- **State 0**: New card
- **States 1-4**: Learning (2, 5, 10, 20 day intervals)
- **State 5**: Mastered (review in ~100 years)

---

## 🗂️ Current CSV Import Flow

### Location
`src/routes/import/+page.svelte`

### Dependencies
- **Papaparse** (`papaparse@5.5.3`) - CSV parsing library

### Process Flow

```typescript
// 1. User drops/selects CSV file
handleFile(file: File)

// 2. Parse with Papaparse
Papa.parse(file, {
  header: true,
  skipEmptyLines: true,
  complete: async (results) => {
    await uploadToSupabase(filename, results.data);
  }
});

// 3. Create deck in Supabase
const { data: deck } = await supabase
  .from('decks')
  .insert({ name: deckName })
  .select()
  .single();

// 4. Map CSV rows to card format
const cards = rows.map((row: any) => ({
  deck_id: deck.id,
  headword: row.headword || row.Front || 'Unknown',
  definition: row.definition || row.Back || '',
  pos: row.pos || '',
  ipa: row.ipa || '',
  example: row.example || '',
  gloss_de: row.gloss_de || '',
  etymology: row.etymology || '',
  mnemonic: row.mnemonic || '',
  tags: row.tags || '',
  freq: parseInt(row.freq) || 0
}));

// 5. Bulk insert cards
await supabase.from('cards').insert(cards);

// 6. Redirect to home
goto('/');
```

### CSV Format Examples

**Minimal CSV:**
```csv
headword,definition
hello,a greeting
goodbye,a farewell
```

**Full CSV:**
```csv
headword,definition,pos,ipa,example,mnemonic,etymology,tags,freq
안녕하세요,hello,interjection,annyeonghaseyo,안녕하세요! 만나서 반갑습니다,안녕 (peace) + 하세요 (do),Korean,greetings;basic,1
```

---

## 🎨 Theme System

### Themes (4 total)
1. **Syndicate** (Cyberpunk) - Default
2. **Zen** (Natural/Calm)
3. **Ember** (Fire/Warmth)
4. **Frost** (Winter/Ice)

### Theme Colors (from `src/app.css`)

```css
/* Syndicate */
--color-main: #e5e5e5;
--color-accent: #00fff2; /* Cyan */
--color-danger: #ff0040; /* Hot pink */
--color-success: #39ff14; /* Neon green */
--color-bg: #050505;
--color-panel: #0a0a0a;

/* Zen */
--color-main: #fafaf9; /* Stone */
--color-accent: #a8c5c5; /* Calm teal */
--color-danger: #c9a89a; /* Terracotta */
--color-success: #8a9a5b; /* Moss green */
--color-bg: #1c1917;
--color-panel: rgba(250, 250, 249, 0.06);

/* Ember */
--color-main: #ffd700; /* Golden */
--color-accent: #ff6b35; /* Ember orange */
--color-danger: #ff4500; /* Deep red */
--color-success: #ff9f1c; /* Golden orange */
--color-bg: #000000;
--color-panel: #1a1a1a;

/* Frost */
--color-main: #e8f4f8; /* Glass tint */
--color-accent: #a8d8ea; /* Frost blue */
--color-danger: #2a4a6a; /* Dark blue */
--color-success: #a8d8ea; /* Frost glow */
--color-bg: #1a2a3a;
--color-panel: rgba(232, 244, 248, 0.05);
```

### Theme Terminology

| Element | Syndicate | Zen | Ember | Frost |
|---------|-----------|-----|-------|-------|
| Import button | "Data Ingestion" | "Import CSV" | "Sow Seeds" | "Condensation" |
| AI button | "AI Generation Offline" | "AI Generator" | "Spark Life" | "Breathe Words" |
| Deck name | "Cognitive Shard" | "Vocabulary Deck" | "" | "Memory Trace" |

---

## 🏗️ Application Structure

### Tech Stack
- **Framework**: SvelteKit 2.47.1 (Svelte 5.41.0)
- **Styling**: Tailwind CSS 4.1.17
- **Database**: Supabase (PostgreSQL)
- **CSV Parsing**: Papaparse 5.5.3
- **Build**: Vite 7.1.10
- **Desktop**: Tauri 2.9.4 (optional)

### File Structure
```
src/
├── lib/
│   ├── supabase.ts          # Supabase client
│   ├── srs.ts               # SRS algorithm & Card type
│   ├── theme.ts             # Theme store & translations
│   └── tooltip.ts           # Tooltip help mode store
├── routes/
│   ├── +layout.svelte       # App layout with header
│   ├── +page.svelte         # Home: Deck list
│   ├── study/+page.svelte   # Study session (lobby + flashcards)
│   ├── import/+page.svelte  # CSV import page
│   └── graveyard/+page.svelte # Mastered cards archive
├── components/
│   ├── EmberGarden.svelte   # Ember theme study UI
│   ├── FrostGlass.svelte    # Frost theme study UI
│   └── Tooltip.svelte       # Tooltip wrapper component
└── app.css                  # Global styles & theme definitions
```

### Routing
- `/` - Home page (deck grid)
- `/import` - CSV upload page
- `/study?id={deckId}` - Study session
- `/graveyard` - Mastered cards view

---

## 🤖 AI Feature Requirements

### User Experience Flow

#### Option 1: Conversational AI
```
1. User clicks "AI Generator" button on home page
2. Chat interface appears (overlay or dedicated route)
3. AI greets: "What would you like to learn today?"
4. User: "Korean words for beginners"
5. AI: "Great! What category interests you?"
   - Greetings & introductions
   - Food & dining
   - Family & relationships
   - Verbs (actions)
   - Adjectives (descriptions)
   - Random mix
6. User selects or types preference
7. AI: "How many words would you like? (10-100)"
8. User specifies number
9. User clicks "Create Deck" button
10. AI generates CSV data
11. System auto-imports to Supabase
12. Deck appears on home page
13. Success message: "Deck '{name}' created! Ready to study."
```

#### Option 2: Quick Generate
```
1. User clicks "Quick Generate" button
2. Modal appears with:
   - Language dropdown (Korean, Spanish, French, etc.)
   - Category dropdown (Greetings, Food, Verbs, etc.)
   - Count slider (10-100)
   - Difficulty: Beginner / Intermediate / Advanced
3. User fills form
4. Clicks "Generate Deck"
5. AI creates CSV
6. Auto-import to Supabase
7. Deck ready
```

### AI Chat UI Specifications

**Location**: Bottom of screen (fixed position)
**Trigger**: Button on home page or persistent FAB (Floating Action Button)

**Components Needed**:
1. Chat button/trigger
2. Chat container (expandable/collapsible)
3. Message list (scrollable)
4. Input field
5. "Create Deck" action button
6. Loading states
7. Error handling

**Theme Styling**:
- Must adapt to current theme (Syndicate/Zen/Ember/Frost)
- Use theme CSS variables
- Match existing UI aesthetic

---

## 🔌 OpenRouter API Integration

### API Endpoint
```
POST https://openrouter.ai/api/v1/chat/completions
```

### Authentication
```typescript
headers: {
  "Authorization": "Bearer YOUR_OPENROUTER_API_KEY",
  "HTTP-Referer": "https://yourapp.com", // Optional
  "X-Title": "ZenApp" // Optional
}
```

### Recommended Models (Cost-Effective)

| Model | Cost (per 1M tokens) | Use Case |
|-------|---------------------|----------|
| **GPT-4o Mini** | $0.15 input / $0.60 output | Best balance |
| **Claude 3.5 Haiku** | $0.25 input / $1.25 output | Fast, accurate |
| **Gemini Flash 1.5** | $0.075 input / $0.30 output | Cheapest option |
| **Llama 3.1 8B** | Free | Budget option |

### Request Format

```typescript
const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model: 'openai/gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: 'You are a vocabulary deck generator for a language learning app...'
      },
      {
        role: 'user',
        content: 'Generate 20 beginner Korean greetings'
      }
    ]
  })
});
```

### Expected Response

```json
{
  "id": "gen-xxx",
  "model": "openai/gpt-4o-mini",
  "choices": [{
    "message": {
      "role": "assistant",
      "content": "headword,definition,pos,ipa,example,mnemonic\n안녕하세요,hello,interjection,annyeonghaseyo,안녕하세요! 만나서 반갑습니다,peaceful greeting\n..."
    }
  }],
  "usage": {
    "prompt_tokens": 50,
    "completion_tokens": 300,
    "total_tokens": 350
  }
}
```

---

## 📋 Implementation Plan

### Phase 1: Backend API Route

**Create**: `src/routes/api/generate-deck/+server.ts`

**Purpose**: Server-side endpoint to call OpenRouter API securely

**Code Structure**:
```typescript
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
  const { prompt, model, count } = await request.json();

  const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY;

  // Build system prompt for deck generation
  const systemPrompt = `You are a vocabulary deck generator...`;

  // Call OpenRouter API
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: model || 'openai/gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
      ]
    })
  });

  const data = await response.json();
  const csvContent = data.choices[0].message.content;

  return json({ csv: csvContent });
};
```

**Environment Variable**:
```bash
# .env.local
VITE_OPENROUTER_API_KEY=sk-or-v1-...
```

---

### Phase 2: AI Chat Component

**Create**: `src/components/AIChat.svelte`

**Features**:
- Chat UI (messages, input, send button)
- Theme-aware styling
- Expandable/collapsible
- Loading states
- Error handling
- "Create Deck" button

**Component Structure**:
```svelte
<script lang="ts">
  import { theme } from '$lib/theme';
  import { supabase } from '$lib/supabase';

  let messages: Array<{role: 'user' | 'assistant', content: string}> = [];
  let input = '';
  let isOpen = false;
  let isLoading = false;
  let conversationState: 'greeting' | 'collecting' | 'ready' = 'greeting';
  let deckConfig = { language: '', category: '', count: 20 };

  async function sendMessage() {
    // Add user message
    messages = [...messages, { role: 'user', content: input }];

    // Call API
    const response = await fetch('/api/chat', {
      method: 'POST',
      body: JSON.stringify({ messages, deckConfig })
    });

    const data = await response.json();
    messages = [...messages, { role: 'assistant', content: data.message }];

    // Update conversation state
    if (data.readyToGenerate) conversationState = 'ready';
  }

  async function createDeck() {
    isLoading = true;

    // Generate deck
    const response = await fetch('/api/generate-deck', {
      method: 'POST',
      body: JSON.stringify({
        language: deckConfig.language,
        category: deckConfig.category,
        count: deckConfig.count
      })
    });

    const { csv } = await response.json();

    // Parse CSV and import
    const rows = parseCSV(csv);
    await importDeck(rows);

    isLoading = false;
    isOpen = false;
  }
</script>

<div class="ai-chat" class:open={isOpen}>
  <!-- Chat UI here -->
</div>
```

---

### Phase 3: System Prompt Engineering

**System Prompt Template**:

```
You are a vocabulary deck generator for a language learning application.

Your task is to generate CSV-formatted vocabulary cards with the following columns:
- headword: The main word or phrase in the target language
- definition: English translation or definition
- pos: Part of speech (noun, verb, adjective, etc.)
- ipa: IPA pronunciation (if applicable)
- example: Example sentence using the word in context
- mnemonic: A memory aid to help learners remember (optional)
- etymology: Word origin or root (optional)
- tags: Comma-separated tags (e.g., "greetings,basic")
- freq: Frequency rank (1=most common, higher=less common)

Rules:
1. Always output valid CSV format with headers
2. Use double quotes for fields containing commas
3. Provide accurate translations
4. Example sentences should be natural and contextual
5. Mnemonics should be creative and memorable
6. For frequency, estimate based on common usage (1-10000 scale)

User Request: {user_input}
Number of cards: {count}
Target language: {language}
Category: {category}
Difficulty: {difficulty}

Generate the CSV now.
```

---

### Phase 4: Quick Generate Modal

**Create**: `src/components/QuickGenerate.svelte`

**Form Fields**:
```svelte
<select bind:value={language}>
  <option value="korean">Korean</option>
  <option value="spanish">Spanish</option>
  <option value="french">French</option>
  <option value="japanese">Japanese</option>
  <option value="german">German</option>
  <option value="chinese">Chinese (Mandarin)</option>
</select>

<select bind:value={category}>
  <option value="greetings">Greetings & Introductions</option>
  <option value="food">Food & Dining</option>
  <option value="family">Family & Relationships</option>
  <option value="verbs">Common Verbs</option>
  <option value="adjectives">Descriptive Adjectives</option>
  <option value="numbers">Numbers & Counting</option>
  <option value="travel">Travel & Directions</option>
  <option value="business">Business & Work</option>
  <option value="random">Random Mix</option>
</select>

<input type="range" min="10" max="100" step="10" bind:value={count} />

<select bind:value={difficulty}>
  <option value="beginner">Beginner (A1-A2)</option>
  <option value="intermediate">Intermediate (B1-B2)</option>
  <option value="advanced">Advanced (C1-C2)</option>
</select>
```

---

### Phase 5: Integration Points

**Home Page (`src/routes/+page.svelte`)**:

Add AI button:
```svelte
<!-- After import button -->
<button
  onclick={() => showAIModal = true}
  class="...theme-styled-button">
  {$t.btn_ai}
</button>
```

**Import Logic Refactor**:

Extract CSV import to shared function:
```typescript
// src/lib/import.ts
export async function importCSV(csvText: string, deckName: string) {
  const rows = Papa.parse(csvText, { header: true, skipEmptyLines: true }).data;

  // Create deck
  const { data: deck } = await supabase
    .from('decks')
    .insert({ name: deckName })
    .select()
    .single();

  // Map and insert cards
  const cards = rows.map(row => ({
    deck_id: deck.id,
    headword: row.headword || 'Unknown',
    definition: row.definition || '',
    // ... rest of mapping
  }));

  await supabase.from('cards').insert(cards);

  return deck.id;
}
```

Use in both:
- Manual CSV import (`/import`)
- AI-generated CSV import

---

## 🎨 UI/UX Design Specifications

### Chat Container

**Position**: Fixed bottom-right
**Size**: 400px width × 600px height (expanded)
**Collapsed**: 60px × 60px FAB button

**Theme Styles**:

```css
/* Syndicate */
.ai-chat[data-theme="syndicate"] {
  background: rgba(10, 10, 10, 0.95);
  border: 1px solid #00fff2;
  box-shadow: 0 0 30px rgba(0, 255, 242, 0.2);
}

/* Zen */
.ai-chat[data-theme="zen"] {
  background: rgba(250, 250, 249, 0.05);
  border: 1px solid rgba(168, 197, 197, 0.3);
  backdrop-filter: blur(20px);
}

/* Ember */
.ai-chat[data-theme="ember"] {
  background: rgba(26, 26, 26, 0.95);
  border: 1px solid #ff6b35;
  box-shadow: 0 0 40px rgba(255, 107, 53, 0.15);
}

/* Frost */
.ai-chat[data-theme="frost"] {
  background: rgba(232, 244, 248, 0.05);
  border: 1px solid #a8d8ea;
  backdrop-filter: blur(15px);
}
```

### Message Bubbles

```svelte
<!-- User message -->
<div class="message user">
  <div class="bubble {theme-color}">
    {message.content}
  </div>
</div>

<!-- AI message -->
<div class="message assistant">
  <div class="bubble {theme-color}">
    {message.content}
  </div>
</div>
```

### Create Deck Button

Only shown when AI confirms it has enough information:

```svelte
{#if conversationState === 'ready'}
  <button
    onclick={createDeck}
    class="create-deck-btn">
    🪄 Create Deck
  </button>
{/if}
```

---

## 🔒 Security Considerations

### API Key Protection
- **Never expose OpenRouter API key in client-side code**
- Store in environment variables
- Use SvelteKit server routes (`+server.ts`)
- Consider rate limiting

### Input Validation
- Sanitize user prompts
- Limit message length (max 500 chars)
- Validate deck parameters (count: 1-100)
- Prevent prompt injection attacks

### Error Handling
- Catch API failures gracefully
- Show user-friendly error messages
- Log errors for debugging
- Implement retry logic for transient failures

---

## 💰 Cost Estimation

### OpenRouter Pricing (GPT-4o Mini)

**Assumption**: Average generation request
- System prompt: ~500 tokens
- User conversation: ~200 tokens
- AI response (CSV for 20 cards): ~1000 tokens
- **Total**: ~1700 tokens per deck

**Cost per deck**:
- Input: 700 tokens × $0.15/1M = $0.000105
- Output: 1000 tokens × $0.60/1M = $0.0006
- **Total**: ~$0.0007 per deck (less than 1/10th of a cent)

**Monthly budget** for 1000 deck generations: **~$0.70**

---

## 📦 Required Dependencies

### New Packages
```bash
# None required - all functionality can be built with existing dependencies
# OpenRouter uses standard fetch API
```

### Environment Variables
```bash
# .env.local (add to Vercel/hosting platform)
VITE_OPENROUTER_API_KEY=sk-or-v1-xxxxxxxxxxxxx
```

---

## 🧪 Testing Strategy

### Unit Tests
1. CSV parsing validation
2. Deck import logic
3. API response handling

### Integration Tests
1. End-to-end deck generation flow
2. Supabase insertion
3. Theme styling verification

### Manual Testing Checklist
- [ ] AI chat opens/closes correctly
- [ ] Messages display in all 4 themes
- [ ] "Create Deck" button appears at right time
- [ ] CSV is generated correctly
- [ ] Deck imports to Supabase
- [ ] Deck appears on home page
- [ ] Cards are studyable
- [ ] Error states show properly
- [ ] Loading states work
- [ ] Works on mobile

---

## 🚀 Deployment Checklist

### Pre-deployment
- [ ] Add `VITE_OPENROUTER_API_KEY` to Vercel env vars
- [ ] Test API route in production build
- [ ] Verify Supabase RLS policies allow inserts
- [ ] Test all 4 themes
- [ ] Mobile responsive check

### Post-deployment
- [ ] Monitor OpenRouter API usage
- [ ] Track deck generation success rate
- [ ] Collect user feedback
- [ ] Monitor error logs

---

## 🎯 Success Metrics

### KPIs
1. **Deck Generation Success Rate**: Target >95%
2. **Average Generation Time**: Target <5 seconds
3. **User Satisfaction**: Qualitative feedback
4. **API Cost**: <$10/month initially

### Analytics to Track
- Number of AI-generated decks
- Most popular languages
- Most popular categories
- Average cards per deck
- Failed generations (and reasons)

---

## 🔮 Future Enhancements

### Phase 2 Features
1. **Multi-language support** - Generate decks in multiple languages simultaneously
2. **Custom fields** - Let users request specific fields (e.g., conjugations, gender)
3. **Image generation** - Add AI-generated images for visual learners
4. **Audio pronunciation** - TTS for IPA/native pronunciation
5. **Deck refinement** - "Add 10 more words" or "Replace this card"
6. **Deck sharing** - Share AI-generated decks with community

### Advanced AI Features
1. **Adaptive difficulty** - AI adjusts based on user's learning progress
2. **Context-aware generation** - Generate decks based on user's existing vocabulary
3. **Conversation practice** - AI-powered dialogue practice mode
4. **Spaced repetition optimization** - AI suggests optimal review timing

---

## 📚 Reference Materials

### OpenRouter Documentation
- API Docs: https://openrouter.ai/docs
- Models: https://openrouter.ai/models
- Pricing: https://openrouter.ai/docs#pricing

### SvelteKit Resources
- Server Routes: https://kit.svelte.dev/docs/routing#server
- Environment Variables: https://kit.svelte.dev/docs/modules#$env-static-private

### Supabase Resources
- JS Client: https://supabase.com/docs/reference/javascript
- RLS Policies: https://supabase.com/docs/guides/auth/row-level-security

---

## 🛠️ Development Workflow

### Step-by-Step Implementation

#### Week 1: Backend Foundation
1. Create API route `/api/generate-deck/+server.ts`
2. Set up OpenRouter client
3. Write system prompt template
4. Test CSV generation manually

#### Week 2: AI Chat UI
1. Create `AIChat.svelte` component
2. Implement chat UI (messages, input)
3. Style for all 4 themes
4. Add expand/collapse animation

#### Week 3: Conversation Logic
1. Implement conversation state machine
2. Add "Create Deck" button logic
3. Integrate with existing CSV import
4. Test end-to-end flow

#### Week 4: Polish & Testing
1. Error handling
2. Loading states
3. Mobile responsive
4. User testing & feedback
5. Deploy to production

---

## ❓ Open Questions for Agent

### Technical Decisions
1. **Chat persistence**: Should conversation history persist across page refreshes?
2. **Model selection**: Should users choose AI model, or always use GPT-4o Mini?
3. **Conversation vs. Quick Gen**: Implement both, or start with one?
4. **Chat location**: Bottom-right FAB, or dedicated `/generate` route?

### UX Decisions
1. **Onboarding**: Show tutorial on first use?
2. **Default deck name**: Auto-generate from conversation, or prompt user?
3. **Preview**: Show CSV preview before importing?
4. **Regeneration**: Allow users to regenerate if unhappy with result?

### Architecture Decisions
1. **Streaming**: Should AI responses stream, or wait for complete CSV?
2. **Caching**: Cache common deck types to reduce API calls?
3. **Validation**: Client-side or server-side CSV validation?
4. **Error recovery**: Auto-retry failed generations, or require user action?

---

## 📞 Next Steps

1. **Review this plan** - Validate architecture and approach
2. **Discuss open questions** - Make technical/UX decisions
3. **Create implementation PRD** - Detailed spec for each component
4. **Start development** - Begin with API route + basic chat UI
5. **Iterate based on feedback** - Test with real users, refine

---

**Questions? Concerns? Better ideas?**
Let's discuss and refine this plan before implementation begins!

---

_Document Version: 1.0_
_Last Updated: 2025-11-25_
_Author: Claude (Code Assistant)_
_Next Reviewer: [Your AI Agent Name]_
