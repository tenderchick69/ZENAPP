# VOCAPP ZEN – Rebirth Manifesto (November 19, 2025)

We do not build another Anki clone with better lipstick.  
We build the feeling of walking barefoot on cool tatami at 5 a.m. while the world is still asleep.

Core law (non-negotiable):
One path. Two buttons. No noise.

User flow (the only flow that survives):
1. Home → one deck selected → big “Study” button + three quiet numbers (due · new · mastered)
2. Study → card front → space reveals back → two full-width buttons:
   - red-brown “Didn’t Get It” → card goes to end of session queue (max 3 fails, then sleeps till tomorrow)
   - forest-green “Got It” → times_correct +1
3. Ladder (fixed, hidden in advanced):
   1 → 1 day  
   2 → 1.2 days  
   3 → 3 days  
4 → 12 days  
   5 → 30 days → mastered → sent to graveyard
4. Mastery → single falling leaf + one soft gong. No text. No modal. Silence.
5. Graveyard → tiny link “mastered · 312” → list with “bring back” button

CSV spec (10 columns, exactly as you had — we keep the richness):
headword, pos, ipa, definition, example, gloss_de, etymology, mnemonic, tags, freq

AI generator (the killer feature):
Route /ai/generate → prompt “10 German words about food” → returns perfect CSV using Groq Llama3-8b or whatever cheap API you point at.

Tech choices (minimal, no monorepo cancer):
- SvelteKit (web + Tauri desktop later)
- SQLite via sql.js (web) + Tauri sqlite (desktop) — same code
- Supabase only for future sync (optional, off by default)
- Tailwind + custom zen theme (dark, high contrast, generous whitespace)
- Zero legacy stores. Everything is < 100 lines.

Folder structure (8 folders max):
src/
  lib/          → stores, scheduler.ts (pure function), db.ts
  routes/       → +page.svelte (home), study/+page.svelte, import/+page.svelte, graveyard/+page.svelte
  components/   → CardLevel.svelte, MasteryCelebration.svelte, Header.svelte
  api/          → import/+server.ts, ai/+server.ts

No ghosts allowed. Ever.

This is the garden we plant today.