# TODO.md - ZenApp Design & Implementation Tasks

## Priority 1: Critical UI Fixes

### Header Inconsistency Across Themes
**Problem**: When switching between themes (Syndicate → Zen → Ember → Frost), the header experiences inconsistent:
- Font sizes (Orbitron vs Cormorant Garamond vs Caveat have different visual sizes)
- Letter spacing (tracking-widest applied globally but fonts handle it differently)
- Overall visual height despite fixed 60px container

**Solution**:
- [x] Normalize header font sizes per theme to achieve visual consistency
- [x] Create theme-specific header styles in app.css
- [x] Use consistent sizing units (rem) rather than relying on font defaults
- [ ] Test header on all 4 themes to ensure identical visual weight

**Files to modify**:
- `src/routes/+layout.svelte` - Header component
- `src/app.css` - Theme-specific header overrides

---

### Hero Text Cutoff on Dashboard
**Problem**: The hero text (subtitle like "Upgrade Your Wetware") gets cut off on the right edge of the screen on the home page.

**Root cause**:
- `overflow-visible` on container but parent constraints cause clipping
- Large italic text with `tracking-tighter` extends beyond container
- `clamp(2.5rem, 10vw, 6rem)` combined with gradient text causes edge issues

**Solution**:
- [x] Add horizontal padding to hero container
- [x] Ensure parent elements don't clip the text
- [x] Consider reducing max font size or adjusting tracking
- [ ] Test on multiple viewport widths (mobile, tablet, desktop)

**Files to modify**:
- `src/routes/+page.svelte` - Hero section

---

## Priority 2: Design Polish

### Theme-Specific Typography Normalization
- [ ] Ensure all themes have consistent visual hierarchy
- [ ] Normalize button sizes across themes
- [ ] Fix Zen theme's aggressive `!important` overrides
- [ ] Ensure Frost's handwritten fonts don't break layouts

### Mobile Responsiveness
- [ ] Test header on mobile (320px - 768px)
- [ ] Ensure hero text is readable on small screens
- [ ] Fix any overflow issues on deck cards

### Animation Consistency
- [ ] Review animation speeds across themes
- [ ] Ensure `animate-flicker` only applies to Syndicate
- [ ] Test `ember-pulse` and `float` animations don't conflict

---

## Priority 3: New Features - Image Generation

### AI Image Generation for Cards
**Goal**: Allow users to generate images for flashcards using AI

**Requirements**:
- [ ] Research image generation APIs (DALL-E, Midjourney, Stable Diffusion via API)
- [ ] Design image field in card schema (URL storage vs blob)
- [ ] Create image generation prompt builder in `src/lib/prompts.ts`
- [ ] Add image generation endpoint `src/routes/api/generate-image/+server.ts`
- [ ] Design UI for image preview/selection
- [ ] Add image display to card view in study mode

**Technical considerations**:
- Image storage: Supabase Storage vs external CDN
- Cost management: Image generation is expensive ($0.02-0.04 per image)
- Caching: Avoid regenerating same images
- Fallbacks: Handle API failures gracefully

**Database changes**:
```sql
ALTER TABLE cards ADD COLUMN image_url TEXT;
ALTER TABLE cards ADD COLUMN image_prompt TEXT;
```

**UI changes**:
- Add image placeholder in DeckPreview.svelte
- Add image toggle in QuickGenerate.svelte
- Display image in study view (all themes)

---

## Priority 4: Future Enhancements

### Deck Export
- [ ] Export to CSV format
- [ ] Export to Anki format (.apkg)
- [ ] Include all card fields

### Offline Support
- [ ] Service worker for PWA
- [ ] Local storage caching
- [ ] Sync when online

### TTS Upgrade
- [ ] Replace Web Speech API with premium TTS (ElevenLabs)
- [ ] Cache audio files
- [ ] Add audio to card schema

### Script Learning
- [ ] Add writing practice mode
- [ ] Support Hangul, Hiragana, Katakana, etc.
- [ ] Stroke order animations

---

## Completed Tasks

- [x] Initial CLAUDE.md creation
- [x] Update CLAUDE.md with PROJECT_SUMMARY.md and TECH_STACK.md info

---

**Last Updated**: 2025-11-30
