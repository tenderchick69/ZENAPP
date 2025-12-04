<script lang="ts">
  import { theme } from '$lib/theme';
  import { onMount } from 'svelte';

  interface Props {
    card: {
      headword: string;
      definition: string;
      mnemonic?: string;
      etymology?: string;
      tags?: string;
    };
    imageUrls?: string[];
    selectedImageIndex?: number;
    onImagesChanged?: (urls: string[], selectedIndex: number) => void;
  }

  let { card, imageUrls = [], selectedImageIndex = 0, onImagesChanged }: Props = $props();

  // State
  let isGenerating = $state(false);
  let error = $state('');
  let currentIndex = $state(selectedImageIndex);
  let images = $state<string[]>(imageUrls);

  // Modal state
  let showModal = $state(false);
  let selectedModel = $state('sd15');
  let selectedStyle = $state('photorealistic');

  // Model options
  const models = [
    { id: 'sd15', name: 'SD 1.5', desc: 'Fastest' },
    { id: 'sdxl', name: 'SDXL', desc: 'Better' },
    { id: 'flux', name: 'FLUX', desc: 'Best' }
  ];

  // Style options
  const styles = [
    { id: 'photorealistic', name: 'Photorealistic' },
    { id: 'illustrative', name: 'Illustrative' },
    { id: 'comic', name: 'Comic' },
    { id: 'minimal', name: 'Minimal' },
    { id: 'watercolor', name: 'Watercolor' }
  ];

  const MAX_IMAGES = 5;

  // Load saved preferences
  onMount(() => {
    const savedModel = localStorage.getItem('vocapp_imagegen_model');
    const savedStyle = localStorage.getItem('vocapp_imagegen_style');
    if (savedModel) selectedModel = savedModel;
    if (savedStyle) selectedStyle = savedStyle;
  });

  function openModal() {
    showModal = true;
  }

  function closeModal() {
    showModal = false;
  }

  async function handleGenerate() {
    localStorage.setItem('vocapp_imagegen_model', selectedModel);
    localStorage.setItem('vocapp_imagegen_style', selectedStyle);
    closeModal();
    await generateImage();
  }

  async function generateImage() {
    if (isGenerating || images.length >= MAX_IMAGES) return;

    isGenerating = true;
    error = '';

    try {
      const response = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          card,
          model: selectedModel,
          style: selectedStyle
        })
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.details && data.details.length > 0) {
          const detailStr = data.details
            .map((d: { provider: string; error: string }) => `${d.provider}: ${d.error}`)
            .join('\n');
          error = `${data.error || 'Failed'}\n${detailStr}`;
        } else {
          error = data.error || data.message || 'Failed to generate image';
        }
        return;
      }

      // Add new image to array
      images = [...images, data.imageUrl];
      currentIndex = images.length - 1;

      notifyChange();
    } catch (e) {
      error = e instanceof Error ? e.message : 'Unknown error';
    } finally {
      isGenerating = false;
    }
  }

  function prevImage() {
    if (currentIndex > 0) {
      currentIndex--;
    }
  }

  function nextImage() {
    if (currentIndex < images.length - 1) {
      currentIndex++;
    }
  }

  function deleteImage(index: number) {
    if (images.length === 0) return;

    images = images.filter((_, i) => i !== index);

    // Adjust current index if needed
    if (currentIndex >= images.length) {
      currentIndex = Math.max(0, images.length - 1);
    }

    notifyChange();
  }

  function selectThisImage() {
    notifyChange();
  }

  function notifyChange() {
    if (onImagesChanged) {
      onImagesChanged(images, currentIndex);
    }
  }
</script>

<div class="image-generator">
  <!-- Carousel / Preview Area -->
  <div class="preview-container">
    {#if images.length > 0}
      <img src={images[currentIndex]} alt={card.headword} class="preview-image" />
      <button
        onclick={() => deleteImage(currentIndex)}
        class="delete-btn"
        title="Delete this image">
        ✕
      </button>
      {#if images.length > 1}
        <div class="carousel-nav">
          <button
            onclick={prevImage}
            disabled={currentIndex === 0}
            class="nav-btn">
            ←
          </button>
          <span class="image-count">{currentIndex + 1} / {images.length}</span>
          <button
            onclick={nextImage}
            disabled={currentIndex === images.length - 1}
            class="nav-btn">
            →
          </button>
        </div>
      {/if}
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

  <!-- Selection indicator -->
  {#if images.length > 1}
    <button
      onclick={selectThisImage}
      class="select-btn"
      class:selected={currentIndex === selectedImageIndex}>
      {currentIndex === selectedImageIndex ? '✓ Selected for study' : 'Use this image'}
    </button>
  {/if}

  <!-- Controls -->
  <div class="controls">
    <button
      onclick={openModal}
      disabled={isGenerating || images.length >= MAX_IMAGES}
      class="generate-btn"
      class:generating={isGenerating}>
      {#if isGenerating}
        <span class="spinner"></span>
        Generating...
      {:else if images.length >= MAX_IMAGES}
        Max {MAX_IMAGES} images
      {:else}
        <span class="sparkle">✨</span>
        {images.length > 0 ? 'Add Image' : 'Generate Image'}
      {/if}
    </button>
  </div>

  <!-- Error Display -->
  {#if error}
    <div class="error-message">
      {error}
    </div>
  {/if}
</div>

<!-- Model/Style Selection Modal -->
{#if showModal}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="modal-backdrop" onclick={closeModal}>
    <div class="modal" onclick={(e) => e.stopPropagation()}>
      <div class="modal-header">
        <h3>Generate Image</h3>
        <button class="modal-close" onclick={closeModal}>✕</button>
      </div>

      <div class="modal-body">
        <!-- Model Selection -->
        <div class="section">
          <label class="section-label">Model:</label>
          <div class="option-list">
            {#each models as model}
              <label class="option-item">
                <input
                  type="radio"
                  name="model"
                  value={model.id}
                  bind:group={selectedModel}
                />
                <span class="option-name">{model.name}</span>
                <span class="option-desc">({model.desc})</span>
              </label>
            {/each}
          </div>
        </div>

        <!-- Style Selection -->
        <div class="section">
          <label class="section-label" for="style-select">Style:</label>
          <select id="style-select" class="style-select" bind:value={selectedStyle}>
            {#each styles as style}
              <option value={style.id}>{style.name}</option>
            {/each}
          </select>
        </div>
      </div>

      <div class="modal-footer">
        <button class="btn-cancel" onclick={closeModal}>Cancel</button>
        <button class="btn-generate" onclick={handleGenerate}>Generate</button>
      </div>
    </div>
  </div>
{/if}

<style>
  .image-generator {
    margin-top: 1rem;
  }

  .preview-container {
    position: relative;
    width: 100%;
    aspect-ratio: 1;
    max-width: 200px;
    margin: 0 auto 0.5rem;
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

  .delete-btn {
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

  .delete-btn:hover {
    opacity: 1;
  }

  .carousel-nav {
    position: absolute;
    bottom: 0.5rem;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    align-items: center;
    gap: 0.5rem;
    background: rgba(0, 0, 0, 0.6);
    padding: 0.25rem 0.5rem;
    border-radius: 1rem;
  }

  .nav-btn {
    background: none;
    border: none;
    color: white;
    font-size: 1rem;
    cursor: pointer;
    padding: 0.25rem;
    opacity: 0.8;
    transition: opacity 0.2s;
  }

  .nav-btn:hover:not(:disabled) {
    opacity: 1;
  }

  .nav-btn:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }

  .image-count {
    color: white;
    font-size: 0.7rem;
    min-width: 3rem;
    text-align: center;
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

  .select-btn {
    display: block;
    width: 100%;
    max-width: 200px;
    margin: 0.5rem auto;
    padding: 0.5rem;
    background: transparent;
    border: 1px solid var(--color-dim);
    color: var(--color-dim);
    border-radius: 0.5rem;
    font-size: 0.75rem;
    cursor: pointer;
    transition: all 0.2s;
  }

  .select-btn:hover {
    border-color: var(--color-accent);
    color: var(--color-accent);
  }

  .select-btn.selected {
    border-color: var(--color-success);
    color: var(--color-success);
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
    padding: 0.75rem;
    background: var(--color-danger);
    color: white;
    font-size: 0.7rem;
    text-align: left;
    border-radius: 0.5rem;
    white-space: pre-line;
    line-height: 1.5;
  }

  /* Modal Styles */
  .modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.7);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100;
  }

  .modal {
    background: var(--color-panel);
    border: 1px solid var(--color-dim);
    border-radius: 1rem;
    width: 90%;
    max-width: 400px;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 1.25rem;
    border-bottom: 1px solid var(--color-dim);
  }

  .modal-header h3 {
    margin: 0;
    font-size: 1.1rem;
    color: var(--color-main);
  }

  .modal-close {
    background: none;
    border: none;
    color: var(--color-dim);
    font-size: 1.25rem;
    cursor: pointer;
    padding: 0;
    line-height: 1;
  }

  .modal-close:hover {
    color: var(--color-accent);
  }

  .modal-body {
    padding: 1.25rem;
  }

  .section {
    margin-bottom: 1.25rem;
  }

  .section:last-child {
    margin-bottom: 0;
  }

  .section-label {
    display: block;
    font-size: 0.8rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--color-dim);
    margin-bottom: 0.75rem;
  }

  .option-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .option-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem;
    background: var(--color-bg);
    border: 1px solid var(--color-dim);
    border-radius: 0.5rem;
    cursor: pointer;
    transition: all 0.2s;
  }

  .option-item:hover {
    border-color: var(--color-accent);
  }

  .option-item:has(input:checked) {
    border-color: var(--color-accent);
    background: rgba(var(--color-accent-rgb), 0.1);
  }

  .option-item input[type="radio"] {
    accent-color: var(--color-accent);
  }

  .option-name {
    font-weight: 600;
    color: var(--color-main);
  }

  .option-desc {
    color: var(--color-dim);
    font-size: 0.8rem;
  }

  .style-select {
    width: 100%;
    padding: 0.75rem;
    background: var(--color-bg);
    border: 1px solid var(--color-dim);
    border-radius: 0.5rem;
    color: var(--color-main);
    font-size: 0.9rem;
    cursor: pointer;
  }

  .style-select:focus {
    outline: none;
    border-color: var(--color-accent);
  }

  .modal-footer {
    display: flex;
    gap: 0.75rem;
    padding: 1rem 1.25rem;
    border-top: 1px solid var(--color-dim);
  }

  .btn-cancel, .btn-generate {
    flex: 1;
    padding: 0.75rem;
    border-radius: 0.5rem;
    font-size: 0.9rem;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-cancel {
    background: transparent;
    border: 1px solid var(--color-dim);
    color: var(--color-dim);
  }

  .btn-cancel:hover {
    border-color: var(--color-main);
    color: var(--color-main);
  }

  .btn-generate {
    background: var(--color-accent);
    border: 1px solid var(--color-accent);
    color: var(--color-bg);
    font-weight: 600;
  }

  .btn-generate:hover {
    opacity: 0.9;
  }
</style>
