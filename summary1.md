code
Markdown
# PROJECT HANDOVER: VOCAPP ZEN / EMBER GARDEN
**Date:** November 20, 2025
**Status:** Production-Ready Core / Styling Phase
**Framework:** SvelteKit + Tailwind v4 + Supabase

## 1. The Vision
A minimalist, "Local-First" feeling vocabulary app with three distinct "Skins" (Themes) that change the entire UI paradigm while sharing a single backend logic.
1.  **Zen Mode:** Minimalist, Tatami colors, clean text.
2.  **Syndicate Mode:** Cyberpunk, scanlines, glitches, neon cyan/red.
3.  **Ember Mode:** Gamified "Garden" physics, floating words, particle effects, generative audio, golden warmth.

---

## 2. Tech Stack & Architecture
*   **Frontend:** SvelteKit (Svelte 5 syntax).
*   **Styling:** Tailwind CSS v4 (using CSS variables for theming).
*   **Database:** Supabase (PostgreSQL).
*   **Audio:** Web Audio API (Oscillators for Ember) + Web Speech API (TTS).
*   **Icons:** SVG inline.

### Folder Structure
```text
src/
├── lib/
│   ├── db.ts          (Legacy/Unused - replaced by Supabase)
│   ├── srs.ts         (Spaced Repetition Logic - Soft Ladder)
│   ├── supabase.ts    (Client initialization)
│   ├── theme.ts       (The Skin Engine & Dictionary)
│   └── tooltip.ts     (Help Mode Logic)
├── components/
│   ├── EmberGarden.svelte (Physics & Audio Engine for Ember Mode)
│   └── Tooltip.svelte     (Hover explanation wrapper)
├── routes/
│   ├── +layout.svelte     (Theme toggler, Font loading, Global Styles)
│   ├── +page.svelte       (Home: Deck Grid, logic varies by theme)
│   ├── import/            (CSV Upload & Parsing)
│   ├── graveyard/         (Mastered cards list & Resurrection)
│   └── study/             (The Core Loop: Lobby, Flashcard, or Garden)
3. Database Schema (Supabase)
Table: decks
id (int8), name (text), created_at.
Table: cards (Rich 10-Column Spec)
id, deck_id (FK).
SRS Data: state (0-5), due (timestamp), interval (days).
Content:
headword
pos (Part of Speech)
ipa (Pronunciation)
definition
example
gloss_de (German Translation)
etymology
mnemonic
tags
freq
4. Key Features Implemented
A. The Theme Engine (src/lib/theme.ts)
Uses a Svelte store (theme) to toggle data-theme attribute on body.
Uses a derived store (t) to hot-swap text (e.g., "Import" becomes "Sow Seeds" in Ember).
Cycle: Syndicate → Zen → Ember.
B. The SRS Logic ("Soft Ladder")
New: Level 0.
Intervals: 2 days, 5 days, 10 days, 20 days.
Mastery: Level 5 (Eternal). Moves to Graveyard.
Failure: Does not reset to 0. Drops 1 level (Soft Penalty).
C. The Neural Lobby (study/+page.svelte)
A dashboard before the session starts.
Stats: Shows Fading (Due), Rising (Learning), Eternal (Mastered).
Modes:
Standard: Only due cards.
Weakness: All learning cards (Level 1-4).
Overclock: Random selection (Cramming).
Charts: Visual bar chart of card distribution by level.
D. Ember Garden (components/EmberGarden.svelte)
Physics: Words float using Math.sin/cos drift.
Particles: 150+ embers that wrap around the screen (Infinite Scroll).
Audio: Generative oscillators (Chords for success, Crackle for burn, Sine for hover).
Warmth: A bottom gradient that grows as you master words.
Interaction:
Pass: Word turns Gold, emits particles.
Fail: Word burns (opacity 0), Teleports to a safe spot (collision checked), and fades back in.
Victory: "Garden Complete" overlay when all words are Gold.
E. Deck Management
Renaming: Click deck title in Lobby to rename.
Deleting: Hover over deck in Home to see Trash icon.
Rich Editing: In-session "Pencil" icon to edit card text live.
5. Current Status & Recent Fixes (CRITICAL)
Teleport Glitch Fixed: We removed transition-all from the Ember words to prevent the "worm" effect (sliding across screen) when respawning. It now snaps instantly while invisible.
Hearthstone Styling: The Ember Home Page now uses Cormorant Garamond, removes rigid borders, and centers single decks for a "mystical artifact" look.
Rich Data Modal: The card view now displays Mnemonic, Etymology, Usage, and German Gloss cleanly.
Tooltips: Added a ? toggle in the header to explain UI terms ("Wildfire", "Sparks").
6. Outstanding Tasks / Next Steps
AI Integration: We have a Prompt Blueprint (AI_PROMPT_TEMPLATE.txt) but no direct API connection yet. The user wants to generate decks via prompt eventually.
Mobile Optimization: The "Ember Garden" physics need testing on touch devices (hover sounds don't work on touch).
Frost Mode: The user mentioned a potential 4th skin ("Frozen") for the future.
7. How to Continue
To Run: pnpm dev
To Deploy: pnpm build (Vercel Adapter Static)
Database: Ensure Supabase schema matches the 10-column spec above.