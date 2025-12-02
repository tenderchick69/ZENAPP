<script lang="ts">
  import { theme, t } from '$lib/theme';

  interface Props {
    card: {
      headword: string;
      definition: string;
      mnemonic?: string;
      etymology?: string;
      tags?: string;
    };
    currentImageUrl?: string;
    onImageGenerated?: (imageUrl: string, prompt: string) => void;
  }

  let { card, currentImageUrl = '', onImageGenerated }: Props = $props();

  let isGenerating = $state(false);
  let error = $state('');
  let previewUrl = $state(currentImageUrl);
  let generatedPrompt = $state('');

  async function generateImage() {
    if (isGenerating) return;

    isGenerating = true;
    error = '';

    try {
      const response = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ card })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to generate image');
      }

      const data = await response.json();
      previewUrl = data.imageUrl;
      generatedPrompt = data.prompt;

      if (onImageGenerated) {
        onImageGenerated(data.imageUrl, data.prompt);
      }
    } catch (e) {
      error = e instanceof Error ? e.message : 'Unknown error';
    } finally {
      isGenerating = false;
    }
  }

  function clearImage() {
    previewUrl = '';
    generatedPrompt = '';
    if (onImageGenerated) {
      onImageGenerated('', '');
    }
  }
</script>

<div class="image-generator">
  <!-- Preview Area -->
  <div class="preview-container">
    {#if previewUrl}
      <img src={previewUrl} alt={card.headword} class="preview-image" />
      <button
        onclick={clearImage}
        class="clear-btn"
        title="Remove image">
        ✕
      </button>
    {:else}
      <div class="placeholder">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
          <circle cx="8.5" cy="8.5" r="1.5"></circle>
          <polyline points="21 15 16 10 5 21"></polyline>
        </svg>
        <span class="placeholder-text">
          {$theme === 'ember' ? 'Visualize this seed' :
           $theme === 'frost' ? 'Crystallize an image' :
           $theme === 'syndicate' ? 'RENDER VISUAL' :
           'Generate image'}
        </span>
      </div>
    {/if}
  </div>

  <!-- Controls -->
  <div class="controls">
    <button
      onclick={generateImage}
      disabled={isGenerating}
      class="generate-btn"
      class:generating={isGenerating}>
      {#if isGenerating}
        <span class="spinner"></span>
        {$theme === 'ember' ? 'Growing...' :
         $theme === 'frost' ? 'Forming...' :
         $theme === 'syndicate' ? 'RENDERING...' :
         'Generating...'}
      {:else}
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 12a9 9 0 11-9-9c2.52 0 4.93 1 6.74 2.74L21 8"></path>
          <path d="M21 3v5h-5"></path>
        </svg>
        {$theme === 'ember' ? 'Grow Image' :
         $theme === 'frost' ? 'Form Image' :
         $theme === 'syndicate' ? 'GENERATE' :
         'Generate Image'}
      {/if}
    </button>
  </div>

  <!-- Error Display -->
  {#if error}
    <div class="error-message">
      {error}
    </div>
  {/if}

  <!-- Prompt Preview (collapsed by default) -->
  {#if generatedPrompt}
    <details class="prompt-details">
      <summary class="prompt-summary">View prompt</summary>
      <p class="prompt-text">{generatedPrompt}</p>
    </details>
  {/if}
</div>

<style>
  .image-generator {
    margin-top: 1rem;
  }

  .preview-container {
    position: relative;
    width: 100%;
    aspect-ratio: 1;
    max-width: 200px;
    margin: 0 auto 1rem;
    border: 2px dashed var(--color-dim);
    border-radius: 1rem;
    overflow: hidden;
    background: var(--color-bg);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .preview-image {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .clear-btn {
    position: absolute;
    top: 0.5rem;
    right: 0.5rem;
    width: 1.5rem;
    height: 1.5rem;
    border-radius: 50%;
    background: var(--color-danger);
    color: white;
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.75rem;
    opacity: 0.8;
    transition: opacity 0.2s;
  }

  .clear-btn:hover {
    opacity: 1;
  }

  .placeholder {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    color: var(--color-dim);
  }

  .placeholder-text {
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
  }

  .controls {
    display: flex;
    justify-content: center;
  }

  .generate-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1.5rem;
    background: transparent;
    border: 1px solid var(--color-accent);
    color: var(--color-accent);
    border-radius: 9999px;
    font-family: var(--font-body);
    font-size: 0.875rem;
    cursor: pointer;
    transition: all 0.2s;
  }

  .generate-btn:hover:not(:disabled) {
    background: var(--color-accent);
    color: var(--color-bg);
  }

  .generate-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .generating {
    animation: pulse 1.5s infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 0.6; }
    50% { opacity: 1; }
  }

  .spinner {
    width: 1rem;
    height: 1rem;
    border: 2px solid transparent;
    border-top-color: currentColor;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .error-message {
    margin-top: 0.75rem;
    padding: 0.5rem;
    background: var(--color-danger);
    color: white;
    font-size: 0.75rem;
    text-align: center;
    border-radius: 0.5rem;
  }

  .prompt-details {
    margin-top: 0.75rem;
  }

  .prompt-summary {
    font-size: 0.75rem;
    color: var(--color-dim);
    cursor: pointer;
    text-align: center;
  }

  .prompt-text {
    margin-top: 0.5rem;
    padding: 0.5rem;
    background: rgba(128, 128, 128, 0.1);
    border-radius: 0.5rem;
    font-size: 0.7rem;
    color: var(--color-dim);
    line-height: 1.4;
  }
</style>
