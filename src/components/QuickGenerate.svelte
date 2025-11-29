<script lang="ts">
  import { theme } from '$lib/theme';
  import { userPreferences } from '$lib/auth';
  import { SUPPORTED_LANGUAGES } from '$lib/languages';
  import { CATEGORY_GROUPS } from '$lib/categories';
  import type { GenerationParams } from '$lib/prompts';

  export let onGenerate: (params: GenerationParams) => void;

  // Pre-fill from user preferences (with fallbacks)
  let nativeLanguage: 'English' | 'German' = ($userPreferences?.native_language as 'English' | 'German') || 'English';
  let targetLanguage = $userPreferences?.target_language || 'Korean';
  let category = 'random';
  let level: 'beginner' | 'intermediate' | 'advanced' = ($userPreferences?.experience_level as 'beginner' | 'intermediate' | 'advanced') || 'beginner';
  let cardCount = 20;

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
      <label for="target-lang">Language to Learn</label>
      <select id="target-lang" bind:value={targetLanguage}>
        {#each SUPPORTED_LANGUAGES as lang}
          <option value={lang}>{lang}</option>
        {/each}
      </select>
    </div>

    <div class="form-group">
      <label for="category">Category</label>
      <select id="category" bind:value={category}>
        {#each CATEGORY_GROUPS as group}
          <optgroup label={group.label}>
            {#each group.categories as cat}
              <option value={cat.id}>{cat.icon} {cat.label}</option>
            {/each}
          </optgroup>
        {/each}
      </select>
    </div>

    <div class="form-group">
      <label for="level">Difficulty Level</label>
      <select id="level" bind:value={level}>
        <option value="beginner">🟢 Beginner (A1-A2)</option>
        <option value="intermediate">🟡 Intermediate (B1-B2)</option>
        <option value="advanced">🔴 Advanced (C1-C2)</option>
      </select>
    </div>

    <div class="form-group">
      <label for="card-count">Number of Cards: {cardCount}</label>
      <input
        id="card-count"
        type="range"
        min="5"
        max="50"
        step="5"
        bind:value={cardCount}
      />
      <div class="range-labels">
        <span>5</span>
        <span>25</span>
        <span>50</span>
      </div>
    </div>

  </div>

  <button onclick={handleGenerate} class="generate-btn">
    🎲 Generate Deck
  </button>
</div>

<style>
  .quick-generate {
    max-width: 500px;
    margin: 0 auto;
    padding: 2rem;
    background: var(--color-panel);
    border: 1px solid var(--color-dim);
    border-radius: 12px;
  }

  .form-grid {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .form-group {
    display: flex;
    flex-direction: column;
  }

  .form-group label {
    display: block;
    margin-bottom: 0.5rem;
    color: var(--color-accent);
    font-size: 0.9rem;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .form-group select,
  .form-group input[type="range"] {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid var(--color-accent);
    background: var(--color-bg);
    color: var(--color-main);
    border-radius: 4px;
    font-size: 1rem;
    cursor: pointer;
    transition: all 0.2s;
  }

  .form-group select:focus,
  .form-group input:focus {
    outline: none;
    border-color: var(--color-success);
    box-shadow: 0 0 0 2px var(--color-success);
  }

  .form-group select option {
    background: var(--color-bg);
    color: var(--color-main);
  }

  .range-labels {
    display: flex;
    justify-content: space-between;
    font-size: 0.75rem;
    color: var(--color-dim);
    margin-top: 0.25rem;
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
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  }

  .generate-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px var(--color-accent);
  }

  .generate-btn:active {
    transform: translateY(0);
  }

  /* Theme-specific styles */
  [data-theme="syndicate"] .quick-generate {
    border-color: rgba(0, 255, 242, 0.3);
  }

  [data-theme="ember"] .generate-btn {
    background: linear-gradient(135deg, #ff6b35, #ff9f1c);
  }

  [data-theme="frost"] .quick-generate {
    background: rgba(232, 244, 248, 0.03);
    backdrop-filter: blur(10px);
    border-color: rgba(168, 216, 234, 0.3);
  }

  [data-theme="zen"] .quick-generate {
    border-color: rgba(168, 197, 197, 0.2);
  }

  @media (max-width: 640px) {
    .quick-generate {
      padding: 1.5rem;
    }

    .form-group label {
      font-size: 0.85rem;
    }
  }
</style>
