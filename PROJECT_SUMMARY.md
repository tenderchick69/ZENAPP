# ZENAPP - Complete Project Documentation

## 📖 Table of Contents
- [Project Overview](#project-overview)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Database Schema](#database-schema)
- [Authentication System](#authentication-system)
- [AI Deck Generation](#ai-deck-generation)
- [Theme System](#theme-system)
- [Spaced Repetition Algorithm](#spaced-repetition-algorithm)
- [Key Features](#key-features)
- [API Routes](#api-routes)
- [Environment Variables](#environment-variables)
- [Current State](#current-state)
- [Future Roadmap](#future-roadmap)

---

## 🎯 Project Overview

### Basic Information
- **Name**: ZenApp
- **Version**: 0.0.1
- **Type**: Language Learning SPA (Single Page Application)
- **Description**: Revolutionary vocabulary learning platform with AI-powered deck generation and spaced repetition system

### Core Philosophy

> "We do not build another Anki clone with better lipstick. We build the feeling of walking barefoot on cool tatami at 5 a.m. while the world is still asleep."

**Core Law (non-negotiable):**
- **One path. Two buttons. No noise.**

### What Makes ZenApp Different from Duolingo/Anki

1. **Culturally Authentic Learning**
   - No "the cat drinks milk" Duolingo energy
   - Real language native speakers actually use
   - Includes slang, swearing, romantic language, cultural concepts

2. **Revolutionary Category System** (29 categories)
   - Real Talk: Slang, Romantic/Flirting, Nightlife, Taboo & Swearing
   - Cultural: Untranslatable Words, Proverbs, Philosophical Concepts
   - Fun: Tongue Twisters, Onomatopoeia, Famous Quotes

3. **AI-Powered Deck Generation**
   - Chat with AI to describe exactly what you want
   - Quick Generate with smart category selection
   - Culturally authentic, high-quality cards

4. **Rich Card Data** (10 fields)
   - Etymology, mnemonics, example sentences with glosses
   - Synonyms in target language
   - IPA pronunciation
   - Cultural context

5. **4 Immersive Themes**
   - Syndicate (cyberpunk hacker terminal)
   - Zen (minimalist sanctuary)
   - Ember (mystical fire garden)
   - Frost (winter glass window)

6. **Simplified SRS**
   - Fixed intervals: 2 → 5 → 10 → 20 days → mastered
   - No complex algorithm tweaking
   - Just "pass" or "fail"

### Target Audience
- Language learners tired of boring textbook phrases
- People who want to sound like native speakers
- Learners interested in cultural depth
- Anyone who values beautiful UI/UX

---

## 🛠 Tech Stack

### Frontend Framework
- **SvelteKit**: v2.47.1 (latest)
- **Svelte**: v5.41.0 (Runes-based reactivity)
- **Adapter**: Vercel (for deployment)

### Styling
- **Tailwind CSS**: v4.1.17 (latest)
- **Custom CSS**: 540 lines in `src/app.css`
  - CSS Variables for theming
  - Custom animations (flicker, glitch, ripple, fog, breath, ember-pulse)
  - Theme-specific overrides

### Database
- **Supabase**: PostgreSQL with Row Level Security
- **Tables**: `decks`, `cards`, `user_preferences`
- **Auth**: Google OAuth via Supabase Auth

### AI Integration
- **Provider**: OpenRouter API
- **Model**: KIMI K2 (`moonshotai/kimi-k2`)
  - Cheap (~$0.0003 per deck)
  - Fast response
  - Good JSON output quality
- **Configuration**:
  - Max Tokens: 4000
  - Temperature: 0.7
  - Response Format: JSON object

### Other Libraries
- **PapaParse**: CSV parsing for import
- **UUID**: Unique ID generation
- **Tauri** (installed but not implemented): Future desktop app support

### Hosting
- **Vercel**: Production deployment
- **Auto-deploy**: Pushes to main branch

---

## 📁 Project Structure

```
d:\CODING\ZENAPP\
├── src/
│   ├── app.css                    # Theme system & global styles (540 lines)
│   ├── app.d.ts                   # TypeScript declarations
│   ├── routes/                    # SvelteKit file-based routing
│   │   ├── +page.svelte          # Home (deck list)
│   │   ├── +layout.svelte        # Header, auth, theme toggle, onboarding
│   │   ├── +error.svelte         # Error page
│   │   ├── study/+page.svelte    # Study session (all modes)
│   │   ├── generate/+page.svelte # AI deck generator (Chat + Quick)
│   │   ├── import/+page.svelte   # CSV import
│   │   ├── graveyard/+page.svelte# Mastered cards archive
│   │   └── api/
│   │       ├── generate-deck/+server.ts    # AI generation endpoint
│   │       ├── verify-password/+server.ts  # Admin password check (legacy)
│   │       └── verify-admin/+server.ts     # Admin code verification
│   ├── lib/                       # Reusable logic
│   │   ├── supabase.ts           # Database client
│   │   ├── auth.ts               # Google OAuth + user preferences
│   │   ├── theme.ts              # Theme store + 4 theme dictionaries
│   │   ├── srs.ts                # Spaced repetition algorithm
│   │   ├── openrouter.ts         # AI API client
│   │   ├── prompts.ts            # System/user prompt builders
│   │   ├── categories.ts         # 29 category system
│   │   ├── languages.ts          # 12 supported target languages
│   │   └── tooltip.ts            # Help mode
│   └── components/                # Reusable Svelte components
│       ├── AIChat.svelte         # Conversational AI mode
│       ├── QuickGenerate.svelte  # Quick form-based generation
│       ├── DeckPreview.svelte    # Preview generated cards before import
│       ├── EmberGarden.svelte    # Ember theme study view (fire aesthetic)
│       ├── FrostGlass.svelte     # Frost theme study view (glass/breath)
│       ├── Onboarding.svelte     # First-time user setup modal
│       └── Tooltip.svelte        # Help tooltips
├── static/                        # Static assets
├── package.json
├── svelte.config.js
├── tailwind.config.js
├── vite.config.ts
├── tsconfig.json
├── vision.md                      # Project manifesto & philosophy
├── AI_DECK_GENERATION_PLAN_v2.md # AI implementation spec
└── README.md
```

### Key Files Explained

**Routes (`src/routes/`)**
- `+page.svelte` = Page components
- `+layout.svelte` = Shared wrapper (header, auth, theme)
- `+server.ts` = API endpoints (server-side only)

**Lib (`src/lib/`)**
- Stores (theme, auth)
- Utility functions (SRS, prompts)
- API clients (Supabase, OpenRouter)
- Configuration (categories, languages)

**Components (`src/components/`)**
- Theme-specific views (EmberGarden, FrostGlass)
- AI generation UI (AIChat, QuickGenerate, DeckPreview)
- Modals and widgets (Onboarding, Tooltip)

---

## 💾 Database Schema

### Tables

#### `decks`
```sql
CREATE TABLE decks (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### `cards`
```sql
CREATE TABLE cards (
  id INTEGER PRIMARY KEY,
  deck_id INTEGER REFERENCES decks(id) ON DELETE CASCADE,

  -- Content Fields
  headword TEXT NOT NULL,           -- Target language word/phrase
  definition TEXT NOT NULL,         -- Meaning in native language
  pos TEXT,                         -- Part of speech (noun, verb, etc.)
  ipa TEXT,                         -- Pronunciation (IPA or romanization)
  example TEXT,                     -- Example sentence (target language)
  example_gloss TEXT,               -- Example translation (native language)

  -- Rich Data Fields
  synonyms TEXT,                    -- Related words in TARGET language
  gloss_de TEXT,                    -- German translation (optional)
  etymology TEXT,                   -- Word origin, cultural context
  mnemonic TEXT,                    -- Memory aid, humor, imagery
  tags TEXT,                        -- Comma-separated categories
  freq INTEGER DEFAULT 0,           -- Frequency rank (optional)

  -- SRS (Spaced Repetition System) Fields
  state INTEGER DEFAULT 0,          -- 0:New, 1-4:Learning, 5:Mastered
  interval INTEGER DEFAULT 0,       -- Days until next review
  due TIMESTAMP DEFAULT NOW()       -- Next review date
);
```

#### `user_preferences`
```sql
CREATE TABLE user_preferences (
  id TEXT PRIMARY KEY,              -- Matches Supabase auth.users.id
  native_language TEXT,             -- 'English' or 'German'
  target_language TEXT,             -- Any supported language
  experience_level TEXT,            -- 'beginner', 'intermediate', 'advanced'
  theme TEXT,                       -- 'syndicate', 'zen', 'ember', 'frost'
  is_approved BOOLEAN DEFAULT FALSE,-- Admin approval for AI access
  updated_at TIMESTAMP
);
```

### Relationships
- **Foreign Key**: `cards.deck_id` → `decks.id`
- **Cascade Delete**: Deleting a deck deletes all its cards

### Field Details

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `headword` | TEXT | Target language word/phrase | "안녕하세요" |
| `definition` | TEXT | Meaning in native language | "Hello (formal greeting)" |
| `synonyms` | TEXT | Related words in TARGET language | "여보세요, 하이" |
| `pos` | TEXT | Part of speech | "interjection" |
| `ipa` | TEXT | Pronunciation | "/annjʌŋhasejo/" |
| `example` | TEXT | Example sentence | "처음 뵙겠습니다. 안녕하세요." |
| `example_gloss` | TEXT | Example translation | "Nice to meet you. Hello." |
| `mnemonic` | TEXT | Memory aid | "Used when meeting elders" |
| `etymology` | TEXT | Word origin | "From 安寧 (peace)" |
| `tags` | TEXT | Categories | "greeting,formal,polite" |
| `state` | INTEGER | SRS level (0-5) | 2 (learning, 5-day interval) |
| `interval` | INTEGER | Days between reviews | 5 |
| `due` | TIMESTAMP | Next review date | "2025-12-05T10:00:00Z" |

---

## 🔐 Authentication System

### Google OAuth Flow

**File**: `src/lib/auth.ts`

**Process**:
1. User clicks "Sign in with Google" button
2. `signInWithGoogle()` function called
3. Redirects to Google OAuth consent screen
4. User approves
5. Google redirects back to app
6. Supabase auth state changes
7. `onAuthStateChange` listener fires
8. User preferences loaded from database
9. User ID stored in Svelte store

**Code**:
```typescript
export async function signInWithGoogle() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin
    }
  });
}
```

### User Preferences

**Stored in Supabase** (`user_preferences` table)

**Fields**:
- `native_language`: English or German
- `target_language`: Any of 12 supported languages
- `experience_level`: beginner, intermediate, advanced
- `theme`: syndicate, zen, ember, frost
- `is_approved`: Boolean (admin approval for AI access)

**Saved via**:
```typescript
export async function savePreferences(prefs: Partial<UserPreferences>) {
  const { error } = await supabase
    .from('user_preferences')
    .upsert({
      id: currentUser.id,
      ...prefs,
      updated_at: new Date().toISOString()
    });

  // Reload from database
  await loadPreferences(currentUser.id);
}
```

### Admin Approval System

**Purpose**: Prevent unlimited AI API usage from random users

**Flow**:
1. User signs in with Google (no code required)
2. User navigates to `/generate`
3. If `is_approved === false`, show admin code input
4. User enters admin code (from `ADMIN_PASSWORD` env var)
5. Code verified via `/api/verify-admin`
6. If valid, `user_preferences.is_approved` set to `true`
7. User can now access AI generator (forever)

**Check**:
```typescript
$: isApproved = $userPreferences?.is_approved === true;
$: showAdminGate = $user && !isApproved;
```

---

## 🤖 AI Deck Generation

### OpenRouter Configuration

**Model**: KIMI K2 (`moonshotai/kimi-k2`)

**Why KIMI K2?**
- Extremely cheap (~$0.0003 per deck = $0.30 for 1000 decks)
- Fast response times
- Good JSON output quality
- Reliable

**Settings**:
```typescript
{
  model: 'moonshotai/kimi-k2',
  maxTokens: 4000,
  temperature: 0.7,  // Some creativity
}
```

### System Prompt (Summary)

**Key Instructions**:
- Output ONLY valid JSON (no markdown code blocks)
- Be culturally authentic - phrases native speakers ACTUALLY say
- Include cultural context and nuance
- Make mnemonics memorable (humor, imagery, cultural insights)
- Examples must be natural - no "The apple is red" nonsense
- This is NOT Duolingo - this is real language learning

**Output Format**:
```json
{
  "deckName": "Suggested deck name",
  "cards": [
    {
      "headword": "Word in target language",
      "definition": "Clear meaning (1-2 sentences)",
      "synonyms": "2-4 related words in TARGET language",
      "pos": "noun, verb, adj, etc.",
      "ipa": "Pronunciation (IPA or romanization)",
      "example": "Natural example sentence",
      "exampleGloss": "Translation of example",
      "mnemonic": "Creative memory aid",
      "etymology": "Word origin",
      "tags": "category,tags,here"
    }
  ]
}
```

### Supported Categories (29 Total)

#### 🎯 Essentials (5)
- Greetings & Introductions
- Food & Dining
- Travel & Directions
- Family & Relationships
- Numbers & Time

#### 📚 Language Building (4)
- Verbs (Actions)
- Adjectives (Descriptions)
- Nouns (Things)
- Idioms & Expressions

#### 🌶️ Real Talk (6)
- Slang & Street Language
- Romantic & Flirting
- Drinking & Nightlife
- Texting & Internet
- Playful Insults
- Taboo & Swearing

#### 🎭 Cultural (5)
- Proverbs & Wisdom
- Untranslatable Words
- Philosophical Concepts
- Poetic & Literary
- Humor & Wordplay

#### 🎪 Fun & Unique (4)
- Tongue Twisters
- Onomatopoeia
- Famous Quotes
- Compliments & Flattery

#### 💼 Practical (4)
- Negotiation & Haggling
- Emergencies
- Complaining & Frustration
- Emotional Nuance

#### 🎲 Surprise Me (1)
- Random Mix

### Supported Languages

**Target Languages (12)**:
- English (for reverse learning)
- German
- Korean
- Japanese
- Spanish
- French
- Italian
- Mandarin
- Portuguese
- Russian
- Filipino (Tagalog)
- Cebuano (Bisaya)

**Native Languages (2)**:
- English
- German

### Generation Modes

#### 1. Chat Mode
**File**: `src/components/AIChat.svelte`

**Features**:
- Conversational AI interaction
- AI asks up to 3 clarifying questions
- Extracts: target language, level, card count from conversation
- User triggers deck creation when ready
- Full chat history sent to AI

**Example Flow**:
1. User: "I want to learn Korean drinking phrases"
2. AI: "Great! What's your Korean level? Beginner, intermediate, or advanced?"
3. User: "Intermediate"
4. AI: "Perfect! How many cards would you like?"
5. User: "20 cards"
6. AI shows summary, user clicks "Create Deck"

#### 2. Quick Generate
**File**: `src/components/QuickGenerate.svelte`

**Features**:
- Form-based selection
- Dropdowns for: target language, category, level
- Slider for card count (5-50)
- Pre-filled from user preferences
- One-click generation

**Fields**:
- Target Language (dropdown)
- Category (dropdown with 29 options)
- Experience Level (beginner/intermediate/advanced)
- Card Count (slider 5-50, default 20)

### Preview & Import

**Component**: `src/components/DeckPreview.svelte`

**Features**:
- Shows first 10 cards
- Editable deck name
- Regenerate button (try again with same params)
- "Add to Collection" button (saves to database)
- Session storage backup (auto-saves in case of refresh)

---

## 🎨 Theme System

### 4 Themes Overview

| Theme | Aesthetic | Fonts | Voice |
|-------|-----------|-------|-------|
| **Syndicate** | Cyberpunk hacker terminal | Orbitron + Share Tech Mono | Corporate dystopian |
| **Zen** | Minimalist sanctuary | Cormorant Garamond + Zen Kaku Gothic | Meditative, natural |
| **Ember** | Mystical fire garden | Cormorant Garamond (both) | Warmth, transformation |
| **Frost** | Winter glass window | Caveat + Patrick Hand | Ephemeral, poetic |

### Theme Details

#### 1. SYNDICATE (Cyberpunk)

**Visual Identity**:
- Colors: Cyan (#00fff2), hot pink (#ff0040), neon green (#39ff14)
- Fonts: Orbitron (sci-fi), Share Tech Mono (terminal)
- Effects: Scanlines, glitch animations, neural grid, flicker

**UI Text Examples**:
- Title: "VOCAPP SYNDICATE"
- Subtitle: "Upgrade Your Wetware"
- Import Button: "DATA INGESTION"
- AI Button: "AI NEURAL SYNTHESIS"
- Reveal Button: "DECRYPT"
- Pass/Fail: "INTEGRATE" / "REJECT"

#### 2. ZEN (Sanctuary)

**Visual Identity**:
- Colors: Water teal (#a8c5c5), moss green (#8a9a5b), stone white (#fafaf9)
- Fonts: Cormorant Garamond (elegant serif), Zen Kaku Gothic
- Effects: Glassmorphism, ripple animation, rain overlay, soft blur

**UI Text Examples**:
- Title: "VOCAPP ZEN"
- Subtitle: "One Path. No Noise."
- Import Button: "Import CSV"
- AI Button: "AI Generator"
- Reveal Button: "Reveal"
- Pass/Fail: "Good" / "Again"

#### 3. EMBER (Garden of Fire)

**Visual Identity**:
- Colors: Golden (#ffd700), ember orange (#ff6b35), deep red (#ff4500)
- Fonts: Cormorant Garamond (both heading and body)
- Effects: Radial gradients, glow, ember-pulse animation

**UI Text Examples**:
- Title: "EMBER GARDEN"
- Subtitle: "Keep the fire burning."
- Import Button: "Sow Seeds"
- AI Button: "Spark Life"
- Reveal Button: "Illuminate"
- Pass/Fail: "Brighten" / "Dim"

#### 4. FROST (Frosted Glass)

**Visual Identity**:
- Colors: Frost blue (#a8d8ea), glass tint (#e8f4f8), winter night (#1a2a3a)
- Fonts: Caveat (handwritten cursive), Patrick Hand (print)
- Effects: Breath-fade, fog-return, frost-appear, handwritten aesthetic

**UI Text Examples**:
- Title: "FROST GLASS"
- Subtitle: "Write your breath."
- Import Button: "Condensation"
- AI Button: "Breathe Words"
- Reveal Button: "Breathe"
- Pass/Fail: "Keep Clear" / "Fog Returns"

### Theme Switching

**Implementation**:
```typescript
// Store with localStorage persistence
export const theme = writable('syndicate');

theme.subscribe(val => {
  localStorage.setItem('vocapp_theme', val);
  document.body.setAttribute('data-theme', val);
});

// Cycle through themes
function toggleTheme() {
  theme.update(current => {
    if (current === 'syndicate') return 'zen';
    if (current === 'zen') return 'ember';
    if (current === 'ember') return 'frost';
    return 'syndicate';
  });
}
```

**UI**: "MODE: {theme}" button in header

**Scope**: Changes ALL text, colors, fonts, animations globally

---

## 📊 Spaced Repetition Algorithm

### SRS States

**6 States Total (0-5)**:
- `0` = New (never seen)
- `1` = Learning (2 days)
- `2` = Learning (5 days)
- `3` = Learning (10 days)
- `4` = Learning (20 days)
- `5` = Mastered (100 years = forever)

### Interval Ladder

```typescript
const LADDER = [0, 2, 5, 10, 20];

State 0 → 0 days
State 1 → 2 days
State 2 → 5 days
State 3 → 10 days
State 4 → 20 days
State 5 → 36500 days (100 years)
```

### Algorithm Logic

**On "Pass" (Correct Answer)**:
```typescript
newState = Math.min(card.state + 1, 5);  // Promote by 1 level

if (newState >= 5) {
  newInterval = 36500;  // Mastered forever
} else {
  newInterval = LADDER[newState];
}

nextDue = today + newInterval days
```

**On "Fail" (Wrong Answer)**:
```typescript
newState = Math.max(1, card.state - 1);  // Demote by 1 level (min 1)
newInterval = LADDER[newState];

// Card moves to END of session queue
// Due date only updated when finally passed
```

### Session Behavior

**Due Card Selection**:
```sql
SELECT * FROM cards
WHERE deck_id = ?
  AND state < 5
  AND (state = 0 OR due <= NOW())
ORDER BY due ASC
LIMIT 50;
```

**Translation**: Get cards that are:
- Not mastered (state < 5)
- Either new (state = 0) OR due for review (due ≤ now)
- Max 50 cards per session

**Fail Handling**:
1. Card fails
2. State demoted (e.g., 3 → 2)
3. Database updated immediately
4. Card moved to **end of session queue**
5. User sees it again later in same session

### Study Modes

| Mode | Cards Selected | Update Database? |
|------|---------------|-----------------|
| **Standard** | Due cards only (state 0 or due ≤ now) | Yes |
| **All** | All learning cards (state < 5), random | Yes |
| **Wildfire** | N random learning cards | Yes |
| **Souls** | Mastered cards only (state = 5) | No (practice mode) |

---

## ✨ Key Features

### 1. AI Deck Generation
- **Two Modes**: Chat (conversational) + Quick (form-based)
- **29 Categories**: From greetings to swearing
- **12 Target Languages**: Including Korean, Japanese, Spanish, etc.
- **Preview Before Import**: See cards, edit deck name, regenerate
- **Session Storage Backup**: Auto-saves in case of refresh

### 2. Flashcard Study System
- **4 Study Modes**: Standard, All, Wildfire, Souls
- **Spaced Repetition**: Fixed intervals (2→5→10→20 days)
- **Two-Button Grading**: Just "pass" or "fail"
- **Session Stats**: Track correct/wrong during session
- **Progress Tracking**: Due count, total count, mastered count

### 3. Rich Card Display
When card revealed:
- **Pronunciation**: IPA in gray
- **Definition**: Large accent-colored text
- **Synonyms**: Green box with "Related Words" label
- **Mnemonic**: Blur-to-reveal on hover (spoiler prevention)
- **Etymology**: Italic, accent-colored
- **Example Sentence**: Bold italic with quote marks
- **Example Translation**: Small italic below example

### 4. Text-to-Speech (TTS)
- **Web Speech API**: Built-in browser TTS
- **Speed**: 0.8x (slower for learning)
- **Language Detection**: Automatic based on target language
- **Accessible via**: Speaker icon or click on headword

### 5. Card Editing
**Two Systems**:
- **Quick Edit** (Study View): Click edit icon, change headword/definition inline
- **Gardener Modal** (Inspector View): Full modal with all fields + delete button

### 6. Theme-Specific Study Views
- **Ember Garden**: Fire aesthetic, vertical card stack, glow animations
- **Frost Glass**: Breath-on-glass effect, fog animations, crystallization sounds
- Both auto-advance through card queue

### 7. CSV Import
- **Drag & Drop**: Upload CSV file
- **PapaParse**: Automatic parsing
- **Flexible Mapping**: Supports "Front/Back" or custom column names
- **Auto-Deck Creation**: Creates deck + cards in one operation

### 8. Deck Management
- **Rename**: Click deck name in lobby
- **Delete**: Trash icon with confirmation
- **Cascade Delete**: Deletes all cards in deck
- **Stats Display**: Due (red), Total (green), Mastered (cyan)

### 9. Mastered Cards Archive
- **Route**: `/graveyard`
- **View All**: State = 5 cards across all decks
- **Resurrect**: Reset card to state 1 (bring back to learning)
- **Linked from Home**: If mastered > 0

### 10. User Onboarding
- **Google OAuth**: One-click sign in
- **First-Time Setup**: Collects native lang, target lang, level, theme
- **Shows Once**: Per user account
- **Skip Option**: With default values

### 11. Help Mode
- **Toggle**: "?" button in header
- **Tooltips**: Hover over UI elements for explanations
- **Context-Sensitive**: Different tips for different views

### 12. Theme Customization
- **4 Themes**: Syndicate, Zen, Ember, Frost
- **Cycle Button**: "MODE: {theme}" in header
- **Persistence**: Saved to localStorage + user_preferences
- **Global Scope**: Changes all text, colors, fonts, animations

---

## 🔌 API Routes

### POST `/api/generate-deck`

**Purpose**: Generate vocabulary deck using AI

**Input**:
```typescript
{
  nativeLanguage: 'English' | 'German',
  targetLanguage: string,
  category: string,
  level: 'beginner' | 'intermediate' | 'advanced',
  cardCount: number,  // 1-50
  customRequest?: string  // Full chat conversation (Chat mode)
}
```

**Output**:
```typescript
{
  deckName: string,
  cards: CardData[]  // Array of generated cards
}
```

**AI Model**: KIMI K2 (`moonshotai/kimi-k2`)
**Cost**: ~$0.0003 per request
**Max Cards**: 50 per request

**Error Responses**:
- `400`: Missing/invalid parameters
- `500`: API key not configured, AI error, invalid JSON

### POST `/api/verify-admin`

**Purpose**: Verify admin code for AI generator access

**Input**:
```json
{ "code": "string" }
```

**Output**:
```json
{ "valid": true | false }
```

**Flow**:
1. User enters code
2. Verified against `ADMIN_PASSWORD` env var
3. If valid, `user_preferences.is_approved` set to `true`
4. User gains permanent AI access

### POST `/api/verify-password`

**Purpose**: Verify admin password (legacy endpoint, same as above)

**Same functionality as `/api/verify-admin`**

---

## 🔑 Environment Variables

### Required Variables

#### 1. OpenRouter API Key (Server-Side)
```bash
OPENROUTER_API_KEY=sk-or-v1-...your-key-here...
```
- **Usage**: AI deck generation
- **Get Key**: https://openrouter.ai/keys
- **Security**: Server-side only (NOT exposed to client)
- **Required For**: `/generate` route

#### 2. Admin Password
```bash
ADMIN_PASSWORD=something-secret-123
```
- **Usage**: Gate access to AI generation
- **Security**: Server-side only
- **Required For**: `/api/verify-admin`
- **Purpose**: Prevent unlimited API usage

#### 3. Supabase Configuration (Public)
```bash
PUBLIC_SUPABASE_URL=https://your-project.supabase.co
PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```
- **Usage**: Database connection, authentication
- **Get Keys**: Supabase project settings → API
- **Security**: Public (safe to expose to client)
- **Required For**: All database operations

### Setup Instructions

**For Development**:
1. Copy `.env.example` to `.env`
2. Fill in all variables
3. Restart dev server

**For Vercel Deployment**:
1. Go to Vercel project settings
2. Add environment variables
3. Redeploy (automatic on push)

---

## 📈 Current State

### ✅ Fully Implemented

**Core**:
- Google OAuth authentication
- User preferences system
- Admin approval gate
- 4 complete themes
- Theme persistence

**Study**:
- Spaced repetition algorithm
- 4 study modes
- Card grading (pass/fail)
- Session statistics
- State progression (0-5)

**AI**:
- OpenRouter integration (KIMI K2)
- Chat + Quick generation modes
- 29 categories
- 12 target languages
- Preview + regenerate

**UI/UX**:
- Theme-specific study views
- Inline card editing
- TTS pronunciation
- Rich card data display
- Help mode
- Onboarding
- Responsive design

**Import/Export**:
- CSV import with PapaParse
- Flexible column mapping

### 🚧 Known Limitations

1. **No SQL Migration Files**
   - Schema documented in markdown only
   - Recommendation: Add `schema.sql`

2. **Limited Error Handling**
   - Some Supabase calls lack error UI

3. **No Offline Support**
   - All features require internet

4. **No Export Feature**
   - Can import CSV but not export

---

## 🚀 Future Roadmap

### Planned Features

**Phase 1 (Near-term)**:
1. **Script Learning** - Practice writing systems (Hangul, Hiragana, etc.)
2. **TTS Upgrade** - Replace Web Speech API with premium TTS (ElevenLabs)
3. **Export Decks** - Export to CSV/Anki format
4. **Offline Mode** - PWA with service worker

**Phase 2 (Mid-term)**:
5. **Multi-language Decks** - Generate in multiple languages simultaneously
6. **Image Search** - Add images via Unsplash API
7. **Audio Generation** - Auto-generate TTS for all cards
8. **Deck Templates** - Pre-made structures

**Phase 3 (Long-term)**:
9. **Curriculum System** - Guided learning paths
10. **Gamification** - Streaks, achievements, leaderboards
11. **Community Sharing** - Share AI-generated decks
12. **Progress Analytics** - Advanced stats dashboard
13. **Adaptive Difficulty** - AI adjusts level based on performance
14. **Context-Aware Generation** - Generate based on existing vocab

### Tauri Desktop App
- Dependencies installed
- Not implemented yet
- Will enable: offline-first, better performance, desktop notifications

---

## 📊 Project Metrics

### Codebase
- **Source Files**: ~27 (excluding node_modules)
- **Lines of Code**: ~5,000+ (TypeScript/Svelte)
- **CSS**: 540 lines (app.css)
- **API Routes**: 3
- **Page Routes**: 7
- **Components**: 9
- **Lib Modules**: 8

### Features
- **Themes**: 4
- **Study Modes**: 4
- **AI Categories**: 29
- **Supported Languages**: 12 target + 2 native
- **SRS States**: 6 (0-5)
- **Card Fields**: 16

### Database
- **Tables**: 3
- **Foreign Keys**: 1
- **Auth Provider**: Google OAuth via Supabase

### AI
- **Provider**: OpenRouter
- **Model**: KIMI K2
- **Cost per Deck**: ~$0.0003
- **Max Cards**: 50 per request
- **Generation Modes**: 2

---

## 📝 Notes for New Developers

### Getting Started
1. Clone repo
2. Install dependencies: `pnpm install`
3. Copy `.env.example` to `.env`
4. Fill in environment variables
5. Run dev server: `pnpm dev`

### Code Style
- **Svelte 5 Runes**: Use `$state`, `$derived`, `$effect`
- **Reactive Statements**: `$:` for Svelte stores
- **TypeScript**: Strict typing for all data structures
- **CSS**: Tailwind + custom CSS variables

### Testing Locally
1. Test all 4 themes (Syndicate, Zen, Ember, Frost)
2. Test AI generation (requires API key)
3. Test study modes (Standard, All, Wildfire, Souls)
4. Test CSV import
5. Check responsive design (mobile/desktop)

### Deployment
- **Auto-deploy**: Push to `main` branch
- **Platform**: Vercel
- **Build Command**: `pnpm build`
- **Output**: `.vercel/output`

---

**Last Updated**: 2025-01-30
**Version**: 0.0.1
**Author**: ZenApp Team
