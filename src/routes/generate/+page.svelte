<script lang="ts">
  import { theme, t } from '$lib/theme';
  import AIChat from '$components/AIChat.svelte';
  import QuickGenerate from '$components/QuickGenerate.svelte';
  import DeckPreview from '$components/DeckPreview.svelte';
  import Tooltip from '$components/Tooltip.svelte';
  import type { GenerationParams } from '$lib/prompts';
  import type { CardData } from '$lib/openrouter';

  type Mode = 'chat' | 'quick';
  type State = 'input' | 'loading' | 'preview';

  let mode: Mode = 'chat';
  let state: State = 'input';
  let generatedCards: CardData[] = [];
  let deckName = '';
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

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Generation failed');
      }

      const data = await response.json();
      generatedCards = data.cards;
      deckName = data.deckName;
      state = 'preview';
    } catch (e: any) {
      console.error('Generation error:', e);
      error = e.message || 'Failed to generate deck';
      state = 'input';
    }
  }

  function handleRegenerate() {
    state = 'input';
    generatedCards = [];
    error = null;
  }

  function handleRename(name: string) {
    deckName = name;
  }
</script>

<div class="generate-page" data-theme={$theme}>
  <header class="page-header">
    <a href="/" class="back-link">← Back to Home</a>
    <h1 class="page-title">{$t.generateTitle || 'AI Deck Generator'}</h1>
  </header>

  {#if state === 'input'}
    <div class="mode-toggle">
      <Tooltip text="Chat with AI to describe exactly what you want">
        <button
          class="mode-btn"
          class:active={mode === 'chat'}
          onclick={() => mode = 'chat'}>
          💬 {$t.chatMode || 'Chat Mode'}
        </button>
      </Tooltip>
      <Tooltip text="Quick options - select language, category, and go">
        <button
          class="mode-btn"
          class:active={mode === 'quick'}
          onclick={() => mode = 'quick'}>
          ⚡ {$t.quickMode || 'Quick Generate'}
        </button>
      </Tooltip>
    </div>

    {#if mode === 'chat'}
      <AIChat {onGenerate:handleGenerate} />
    {:else}
      <QuickGenerate {onGenerate:handleGenerate} />
    {/if}

    {#if error}
      <div class="error-message">
        <strong>Error:</strong> {error}
        <button onclick={() => error = null} class="dismiss-btn">×</button>
      </div>
    {/if}

  {:else if state === 'loading'}
    <div class="loading-state">
      <div class="spinner"></div>
      <p class="loading-text">Generating your deck...</p>
      <p class="loading-subtext">
        {#if mode === 'quick'}
          Creating {generatedCards.length || '...'} cards...
        {:else}
          Crafting something special for you...
        {/if}
      </p>
    </div>

  {:else if state === 'preview'}
    <DeckPreview
      cards={generatedCards}
      {deckName}
      onRegenerate={handleRegenerate}
      onRename={handleRename}
    />
  {/if}
</div>

<style>
  .generate-page {
    min-height: 100vh;
    padding: 1rem;
    background: var(--color-bg);
    color: var(--color-main);
  }

  .page-header {
    max-width: 900px;
    margin: 0 auto 2rem;
    padding: 1rem 0;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .back-link {
    color: var(--color-accent);
    text-decoration: none;
    font-size: 0.9rem;
    transition: all 0.2s;
  }

  .back-link:hover {
    transform: translateX(-4px);
    color: var(--color-success);
  }

  .page-title {
    font-size: 2.5rem;
    font-weight: 700;
    color: var(--color-main);
    margin: 0;
    text-align: center;
  }

  .mode-toggle {
    max-width: 600px;
    margin: 0 auto 2rem;
    display: flex;
    gap: 0.5rem;
    padding: 0.5rem;
    background: var(--color-panel);
    border-radius: 12px;
    border: 1px solid var(--color-dim);
  }

  .mode-btn {
    flex: 1;
    padding: 0.75rem 1.5rem;
    border: 1px solid transparent;
    background: transparent;
    color: var(--color-main);
    cursor: pointer;
    border-radius: 8px;
    font-size: 1rem;
    font-weight: 500;
    transition: all 0.2s;
  }

  .mode-btn:hover {
    background: var(--color-bg);
  }

  .mode-btn.active {
    background: var(--color-accent);
    color: var(--color-bg);
    border-color: var(--color-accent);
  }

  .error-message {
    max-width: 600px;
    margin: 1rem auto;
    padding: 1rem;
    background: var(--color-danger);
    color: white;
    border-radius: 8px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .dismiss-btn {
    background: none;
    border: none;
    color: white;
    font-size: 1.5rem;
    cursor: pointer;
    padding: 0 0.5rem;
    opacity: 0.8;
    transition: opacity 0.2s;
  }

  .dismiss-btn:hover {
    opacity: 1;
  }

  .loading-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 400px;
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

  .loading-text {
    font-size: 1.2rem;
    font-weight: 600;
    color: var(--color-main);
  }

  .loading-subtext {
    color: var(--color-accent);
    font-size: 0.9rem;
  }

  /* Theme-specific overrides */
  [data-theme="syndicate"] .page-title {
    text-shadow: 0 0 20px var(--color-accent);
    letter-spacing: 0.05em;
  }

  [data-theme="ember"] .page-title {
    background: linear-gradient(135deg, #ffd700, #ff6b35);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  [data-theme="frost"] .mode-toggle {
    background: rgba(232, 244, 248, 0.03);
    backdrop-filter: blur(10px);
  }

  [data-theme="zen"] .mode-toggle {
    border-color: rgba(168, 197, 197, 0.2);
  }

  @media (max-width: 640px) {
    .page-title {
      font-size: 2rem;
    }

    .mode-toggle {
      flex-direction: column;
      gap: 0.5rem;
    }

    .mode-btn {
      width: 100%;
    }
  }
</style>
