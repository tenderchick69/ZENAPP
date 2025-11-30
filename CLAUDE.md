# CLAUDE.md - Project Guide for AI Assistants

## Project Overview

**ZenApp (VOCAPP)** is a revolutionary vocabulary learning platform with AI-powered deck generation and spaced repetition system.

### Core Philosophy
> "We do not build another Anki clone with better lipstick. We build the feeling of walking barefoot on cool tatami at 5 a.m. while the world is still asleep."

**Core Law (non-negotiable):** One path. Two buttons. No noise.

### What Makes ZenApp Different
- **Culturally Authentic Learning** - Real language native speakers use (slang, romantic, cultural concepts)
- **29 Categories** - From greetings to swearing, proverbs to tongue twisters
- **4 Immersive Themes** - Each transforms the entire UI
- **Rich Card Data** - 10 fields including etymology, mnemonics, IPA
- **Simplified SRS** - Fixed intervals, just "pass" or "fail"

## Tech Stack

| Category | Technology | Version |
|----------|------------|---------|
| Framework | SvelteKit | 2.47.1 |
| UI | Svelte 5 (Runes) | 5.41.0 |
| Styling | Tailwind CSS | 4.1.17 |
| Database | Supabase (PostgreSQL) | 2.83.0 |
| AI | OpenRouter (KIMI K2) | - |
| Deployment | Vercel | - |
| Package Manager | pnpm | - |

### AI Configuration
- **Model**: KIMI K2 (`moonshotai/kimi-k2`)
- **Cost**: ~$0.0003 per deck ($0.30 for 1000 decks)
- **Max Tokens**: 4000
- **Temperature**: 0.7

## Project Structure

```
src/
├── app.css                    # Theme system & global styles (540 lines)
├── routes/
│   ├── +page.svelte          # Home (deck grid)
│   ├── +layout.svelte        # Header, auth, theme toggle, onboarding
│   ├── study/+page.svelte    # Neural Lobby + study session
│   ├── generate/+page.svelte # AI deck generator (Chat + Quick)
│   ├── import/+page.svelte   # CSV import
│   ├── graveyard/+page.svelte# Mastered cards archive
│   └── api/
│       ├── generate-deck/+server.ts    # AI generation endpoint
│       ├── verify-admin/+server.ts     # Admin approval
│       └── verify-password/+server.ts  # Legacy password check
├── lib/
│   ├── supabase.ts           # Database client
│   ├── auth.ts               # Google OAuth + user preferences
│   ├── theme.ts              # Theme store + 4 theme dictionaries (THE SKIN ENGINE)
│   ├── srs.ts                # Spaced repetition algorithm
│   ├── openrouter.ts         # AI API client
│   ├── prompts.ts            # System/user prompt builders
│   ├── categories.ts         # 29 category definitions
│   ├── languages.ts          # 12 target languages
│   └── tooltip.ts            # Help mode logic
└── components/
    ├── AIChat.svelte         # Conversational AI mode
    ├── QuickGenerate.svelte  # Quick form-based generation
    ├── DeckPreview.svelte    # Preview cards before import
    ├── EmberGarden.svelte    # Ember theme study view (fire/physics)
    ├── FrostGlass.svelte     # Frost theme study view (glass/breath)
    ├── Onboarding.svelte     # First-time user setup modal
    └── Tooltip.svelte        # Help tooltips
```

## Database Schema

### Tables

**decks**
```sql
id BIGSERIAL PRIMARY KEY
name TEXT NOT NULL
created_at TIMESTAMP DEFAULT NOW()
```

**cards** (10-column rich data)
```sql
id BIGSERIAL PRIMARY KEY
deck_id BIGINT REFERENCES decks(id) ON DELETE CASCADE

-- Content
headword TEXT NOT NULL      -- Target language word
definition TEXT NOT NULL    -- Meaning in native language
pos TEXT                    -- Part of speech
ipa TEXT                    -- Pronunciation
example TEXT                -- Example sentence
example_gloss TEXT          -- Example translation

-- Rich Data
synonyms TEXT               -- Related words in TARGET language
gloss_de TEXT               -- German translation
etymology TEXT              -- Word origin
mnemonic TEXT               -- Memory aid
tags TEXT                   -- Categories

-- SRS
state INTEGER DEFAULT 0     -- 0:New, 1-4:Learning, 5:Mastered
interval INTEGER DEFAULT 0  -- Days until next review
due TIMESTAMP DEFAULT NOW() -- Next review date
```

**user_preferences**
```sql
id TEXT PRIMARY KEY         -- Matches Supabase auth.users.id
native_language TEXT        -- 'English' or 'German'
target_language TEXT        -- Any supported language
experience_level TEXT       -- beginner/intermediate/advanced
theme TEXT                  -- syndicate/zen/ember/frost
is_approved BOOLEAN         -- Admin approval for AI access
```

## Theme System

Four visual themes with unique dictionaries. Theme changes **everything**.

| Theme | Aesthetic | Fonts | Example Text |
|-------|-----------|-------|--------------|
| **syndicate** | Cyberpunk terminal | Orbitron + Share Tech Mono | "NEURAL SYNTHESIS LAB" |
| **zen** | Minimalist sanctuary | Cormorant Garamond + Zen Kaku Gothic | "Create New Deck" |
| **ember** | Mystical fire garden | Cormorant Garamond | "Forge New Knowledge" |
| **frost** | Winter glass window | Caveat + Patrick Hand | "Crystallize Words" |

**Implementation:**
- Stored in localStorage as `vocapp_theme`
- Applied via `data-theme` attribute on `<body>`
- Access translations: `$t.btn_import`, `$t.generateTitle`, etc.

## SRS Algorithm - "Soft Ladder"

**States:** 0=New, 1-4=Learning, 5=Mastered (Eternal)

**Interval Ladder:**
```
State 0 → 0 days (new)
State 1 → 2 days
State 2 → 5 days
State 3 → 10 days
State 4 → 20 days
State 5 → 36500 days (100 years)
```

**Logic:**
- **Pass**: Promote one level, set due date
- **Fail**: Demote one level (never resets to 0), card goes to end of session queue

**Study Modes:**
| Mode | Cards Selected | Updates DB? |
|------|---------------|-------------|
| Standard | Due cards only | Yes |
| All | All learning (state < 5) | Yes |
| Wildfire | N random cards | Yes |
| Souls | Mastered only (state = 5) | No |

## AI Generation

### Supported Languages (12)
English, German, Korean, Japanese, Spanish, French, Italian, Mandarin, Portuguese, Russian, Filipino (Tagalog), Cebuano (Bisaya)

### Categories (29)
- **Essentials**: Greetings, Food, Travel, Family, Numbers
- **Language Building**: Verbs, Adjectives, Nouns, Idioms
- **Real Talk**: Slang, Romantic, Nightlife, Texting, Insults, Swearing
- **Cultural**: Proverbs, Untranslatable, Philosophical, Poetic, Humor
- **Fun**: Tongue Twisters, Onomatopoeia, Famous Quotes, Compliments
- **Practical**: Negotiation, Emergencies, Complaining, Emotional Nuance
- **Surprise Me**: Random Mix

### Generation Modes
1. **Chat Mode** (`AIChat.svelte`) - Conversational, AI asks clarifying questions
2. **Quick Generate** (`QuickGenerate.svelte`) - Form-based, one-click generation

### Output Format
```json
{
  "deckName": "Suggested deck name",
  "cards": [{
    "headword": "Word in target language",
    "definition": "Clear meaning",
    "synonyms": "Related words in TARGET language",
    "pos": "noun/verb/adj/etc.",
    "ipa": "Pronunciation",
    "example": "Natural example sentence",
    "exampleGloss": "Translation",
    "mnemonic": "Creative memory aid",
    "etymology": "Word origin",
    "tags": "category,tags"
  }]
}
```

## Authentication

**Flow:**
1. User signs in with Google OAuth
2. Supabase auth state changes
3. User preferences loaded from database
4. If first time, onboarding modal shows
5. For AI access: user must enter admin code once → `is_approved = true`

## Environment Variables

```bash
# Server-side only (NOT exposed to client)
OPENROUTER_API_KEY=sk-or-v1-...   # AI generation
ADMIN_PASSWORD=...                 # Gates /generate access

# Public (safe for client)
PUBLIC_SUPABASE_URL=https://project.supabase.co
PUBLIC_SUPABASE_ANON_KEY=...
```

## Development Commands

```bash
pnpm dev          # Start dev server (localhost:5173)
pnpm build        # Production build
pnpm preview      # Preview production build
pnpm check        # TypeScript/Svelte type checking
```

## Code Style Guidelines

- Use **Svelte 5 Runes** (`$state`, `$derived`, `$effect`)
- Use `$:` reactive statements for Svelte stores
- Theme-aware styling via CSS variables or `$theme` conditionals
- Access translations via `$t.key`
- All database ops through Supabase client
- Server-side API keys stay in `+server.ts` files
- No `transition-all` on Ember words (causes teleport glitch)

## Key Features

| Feature | Description |
|---------|-------------|
| AI Deck Generation | Chat + Quick modes, 29 categories, 12 languages |
| Rich Card Display | IPA, synonyms, mnemonic (blur-reveal), etymology, example |
| TTS | Web Speech API, 0.8x speed, auto language detection |
| Theme-Specific Views | Ember Garden (fire physics), Frost Glass (breath effects) |
| Card Editing | Quick edit in study, full Gardener modal in inspector |
| CSV Import | Drag & drop, PapaParse, flexible column mapping |
| Mastered Archive | `/graveyard` route, resurrect cards to state 1 |
| Onboarding | First-time setup, collects preferences |
| Help Mode | `?` toggle, contextual tooltips |

## Important Files

| File | Purpose |
|------|---------|
| `src/lib/theme.ts` | Theme store + all UI translations (THE SKIN ENGINE) |
| `src/app.css` | Global styles, CSS variables, animations (540 lines) |
| `src/lib/srs.ts` | Spaced repetition algorithm |
| `src/lib/prompts.ts` | AI system/user prompt builders |
| `src/lib/categories.ts` | 29 category definitions |
| `src/lib/languages.ts` | 12 supported languages |
| `AI_PROMPT_SPEC.md` | Full CSV format specification |

## Known Considerations

- Mobile: Ember Garden hover sounds don't work on touch devices
- Teleport fix: Ember words use `opacity: 0` snap repositioning
- No offline support (all features require internet)
- No export feature (can import CSV but not export)

## Testing Checklist

- [ ] All 4 themes render correctly
- [ ] Theme switching persists after refresh
- [ ] Google OAuth sign in/out
- [ ] AI generation (Quick + Chat modes)
- [ ] Study modes (Standard, All, Wildfire, Souls)
- [ ] Card grading updates SRS state
- [ ] TTS pronunciation
- [ ] CSV import
- [ ] Responsive design (mobile/tablet/desktop)
