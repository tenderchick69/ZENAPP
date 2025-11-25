<script lang="ts">
  import { onMount } from 'svelte';
  import { theme, t } from '$lib/theme';
  import AIChat from '../../components/AIChat.svelte';
  import QuickGenerate from '../../components/QuickGenerate.svelte';
  import DeckPreview from '../../components/DeckPreview.svelte';
  import Tooltip from '../../components/Tooltip.svelte';
  import type { GenerationParams } from '$lib/prompts';
  import type { CardData } from '$lib/openrouter';

  type Mode = 'chat' | 'quick';
  type State = 'input' | 'loading' | 'preview';

  let mode: Mode = 'chat';
  let state: State = 'input';
  let generatedCards: CardData[] = [];
  let deckName = '';
  let error: string | null = null;

  // Password gate
  let isUnlocked = false;
  let passwordInput = '';
  let passwordError = '';
  let isVerifying = false;

  // Loading messages
  let loadingMessageIndex = 0;
  let dots = '';
  let messageInterval: number | undefined;
  let dotInterval: number | undefined;

  const LOADING_MESSAGES = {
    syndicate: [
      'Initializing neural pathways',
      'Synthesizing cognitive data',
      'Compiling lexical matrices',
      'Uploading to neural network'
    ],
    zen: [
      'Gathering words quietly',
      'Letting knowledge flow',
      'Breathing meaning into cards',
      'Cultivating your deck'
    ],
    ember: [
      'Stoking the flames of knowledge',
      'Forging your vocabulary',
      'Heating up the words',
      'Igniting neural sparks'
    ],
    frost: [
      'Crystallizing words',
      'Freezing knowledge in place',
      'Forming ice patterns',
      'Condensing meanings'
    ]
  };

  $: currentThemeMessages = LOADING_MESSAGES[$theme as keyof typeof LOADING_MESSAGES] || LOADING_MESSAGES.zen;
  $: currentLoadingMessage = currentThemeMessages[loadingMessageIndex];

  function startLoadingAnimation() {
    loadingMessageIndex = 0;
    dots = '';

    // Rotate messages every 2.5 seconds
    messageInterval = setInterval(() => {
      loadingMessageIndex = (loadingMessageIndex + 1) % currentThemeMessages.length;
    }, 2500) as unknown as number;

    // Animate dots every 500ms
    dotInterval = setInterval(() => {
      dots = dots.length >= 3 ? '' : dots + '.';
    }, 500) as unknown as number;
  }

  function stopLoadingAnimation() {
    if (messageInterval) clearInterval(messageInterval);
    if (dotInterval) clearInterval(dotInterval);
    loadingMessageIndex = 0;
    dots = '';
  }

  onMount(() => {
    // Check if already unlocked in this session
    if (typeof sessionStorage !== 'undefined') {
      isUnlocked = sessionStorage.getItem('admin_unlocked') === 'true';
    }

    // Cleanup intervals on unmount
    return () => {
      stopLoadingAnimation();
    };
  });

  async function verifyPassword() {
    if (!passwordInput.trim()) {
      passwordError = 'Please enter a password';
      return;
    }

    isVerifying = true;
    passwordError = '';

    try {
      const response = await fetch('/api/verify-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: passwordInput }),
      });

      const data = await response.json();

      if (data.valid) {
        isUnlocked = true;
        if (typeof sessionStorage !== 'undefined') {
          sessionStorage.setItem('admin_unlocked', 'true');
        }
        passwordInput = '';
      } else {
        passwordError = 'Invalid password';
        passwordInput = '';
      }
    } catch (e) {
      passwordError = 'Verification failed';
    } finally {
      isVerifying = false;
    }
  }

  async function handleGenerate(params: GenerationParams) {
    state = 'loading';
    error = null;
    startLoadingAnimation();

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
    } finally {
      stopLoadingAnimation();
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

  {#if !isUnlocked}
    <!-- Password Gate -->
    <div class="password-gate">
      <div class="password-box">
        <h2 class="gate-title">🔒 Protected Access</h2>
        <p class="gate-message">This feature is password-protected to prevent unauthorized API usage.</p>

        <form onsubmit={(e) => { e.preventDefault(); verifyPassword(); }}>
          <input
            type="password"
            bind:value={passwordInput}
            placeholder="Enter admin password"
            class="password-input"
            disabled={isVerifying}
            autofocus
          />

          {#if passwordError}
            <p class="password-error">{passwordError}</p>
          {/if}

          <button type="submit" class="unlock-btn" disabled={isVerifying}>
            {#if isVerifying}
              Verifying...
            {:else}
              🔓 Unlock
            {/if}
          </button>
        </form>

        <p class="gate-note">Session unlocked until browser closes</p>
      </div>
    </div>

  {:else if state === 'input'}
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
      <AIChat onGenerate={handleGenerate} />
    {:else}
      <QuickGenerate onGenerate={handleGenerate} />
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
      <p class="loading-text">{currentLoadingMessage}{dots}</p>
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
    color: var(--color-accent);
    min-height: 1.5em;
    letter-spacing: 0.02em;
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

  /* Theme-specific loading messages */
  [data-theme="syndicate"] .loading-text {
    text-transform: uppercase;
    font-family: 'Courier New', monospace;
    letter-spacing: 0.1em;
    text-shadow: 0 0 10px var(--color-accent);
  }

  [data-theme="ember"] .loading-text {
    background: linear-gradient(135deg, #ffd700, #ff6b35);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    font-weight: 700;
  }

  [data-theme="frost"] .loading-text {
    color: #a0d8f1;
    text-shadow: 0 0 8px rgba(160, 216, 241, 0.3);
    font-weight: 500;
  }

  [data-theme="zen"] .loading-text {
    color: var(--color-accent);
    font-weight: 500;
    letter-spacing: 0.03em;
  }

  /* Password Gate Styles */
  .password-gate {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 400px;
    padding: 2rem;
  }

  .password-box {
    max-width: 450px;
    width: 100%;
    padding: 3rem 2rem;
    background: var(--color-panel);
    border: 2px solid var(--color-dim);
    border-radius: 16px;
    text-align: center;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  }

  .gate-title {
    font-size: 1.8rem;
    font-weight: 700;
    color: var(--color-main);
    margin: 0 0 1rem 0;
  }

  .gate-message {
    color: var(--color-accent);
    font-size: 0.95rem;
    margin: 0 0 2rem 0;
    line-height: 1.5;
  }

  .password-input {
    width: 100%;
    padding: 1rem;
    font-size: 1rem;
    background: var(--color-bg);
    border: 2px solid var(--color-dim);
    border-radius: 8px;
    color: var(--color-main);
    margin-bottom: 1rem;
    transition: border-color 0.2s;
  }

  .password-input:focus {
    outline: none;
    border-color: var(--color-accent);
  }

  .password-input:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .password-error {
    color: var(--color-danger);
    font-size: 0.9rem;
    margin: -0.5rem 0 1rem 0;
  }

  .unlock-btn {
    width: 100%;
    padding: 1rem 2rem;
    font-size: 1.1rem;
    font-weight: 600;
    background: var(--color-accent);
    color: var(--color-bg);
    border: none;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s;
  }

  .unlock-btn:hover:not(:disabled) {
    transform: scale(1.02);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  }

  .unlock-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .gate-note {
    margin-top: 1.5rem;
    font-size: 0.8rem;
    color: var(--color-dim);
    opacity: 0.7;
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

    .password-box {
      padding: 2rem 1.5rem;
    }

    .gate-title {
      font-size: 1.5rem;
    }
  }
</style>
