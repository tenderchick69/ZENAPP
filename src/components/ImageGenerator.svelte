<script lang="ts">
  import { theme } from '$lib/theme';
  import { onMount, onDestroy } from 'svelte';
  import { getSignedImageUrls } from '$lib/storage';

  interface Props {
    card: {
      id?: number;
      headword: string;
      definition: string;
      mnemonic?: string;
      etymology?: string;
      tags?: string;
    };
    imageUrls?: string[];
    selectedImageIndex?: number;
    onImagesChanged?: (urls: string[], selectedIndex: number) => void;
    userId?: string; // For user-scoped storage paths
  }

  let { card, imageUrls = [], selectedImageIndex = 0, onImagesChanged, userId }: Props = $props();

  // State
  let isGenerating = $state(false);
  let error = $state('');
  let currentIndex = $state(selectedImageIndex);
  let images = $state<string[]>([...imageUrls]); // Filepaths stored in DB
  let displayUrls = $state<string[]>([]); // Signed URLs for display

  // Track which card we're initialized for (using headword as identifier)
  let initializedFor = $state('');

  // Sync with props when a NEW card is opened (detected by headword change)
  $effect(() => {
    if (card.headword !== initializedFor) {
      images = [...imageUrls];
      currentIndex = selectedImageIndex;
      initializedFor = card.headword;
      refreshDisplayUrls();
    }
  });

  // Convert filepaths to signed URLs for display
  async function refreshDisplayUrls() {
    if (images.length === 0) {
      displayUrls = [];
      return;
    }
    try {
      displayUrls = await getSignedImageUrls(images);
    } catch (_) {
      // Fallback: use images directly (works for legacy full URLs)
      displayUrls = [...images];
    }
  }

  // Refresh display URLs whenever images array changes
  $effect(() => {
    // Track images array to trigger refresh
    const _ = images.length;
    refreshDisplayUrls();
  });

  // Modal state
  let showModal = $state(false);
  let selectedProvider = $state('kie'); // 'kie' | 'kie-flux' | 'openai'
  let selectedStyle = $state('photorealistic');
  let customPrompt = $state('');
  let modalElement: HTMLDivElement | null = $state(null);

  // Teleport modal to body when it appears (escapes parent modal's overflow)
  $effect(() => {
    if (showModal && modalElement && typeof document !== 'undefined') {
      // Move modal to body to escape any parent overflow/containment
      document.body.appendChild(modalElement);
    }
  });

  // Provider options - Kie.ai (Z-Image & Flux) + OpenAI
  const providers = [
    { id: 'kie', name: 'Z-Image Turbo', desc: '$0.004, fast' },
    { id: 'kie-flux', name: 'Flux 2 Flex', desc: '~$0.02, high quality' },
    { id: 'openai', name: 'GPT Image', desc: '~$0.02, best quality' }
  ];

  // Aspect ratio always 1:1 for consistent display everywhere
  const selectedAspectRatio = '1:1';

  // Style options
  const styles = [
    { id: 'photorealistic', name: 'Photorealistic' },
    { id: 'illustrative', name: 'Illustrative' },
    { id: 'comic', name: 'Comic' },
    { id: 'minimal', name: 'Minimal' },
    { id: 'watercolor', name: 'Watercolor' }
  ];

  const MAX_IMAGES = 5;

  /**
   * Build a smart default prompt based on the card data.
   * For abstract verbs/concepts, adds context to help AI visualize.
   */
  function buildSmartPrompt(): string {
    const { headword, definition, mnemonic } = card;

    // Check if it's a verb (starts with "to " in definition or headword)
    const isVerb = definition.toLowerCase().startsWith('to ') ||
                   headword.toLowerCase().startsWith('to ');

    // Check if it's abstract (short definition, common abstract words)
    const abstractIndicators = ['to go', 'to be', 'to have', 'to do', 'to make', 'to get', 'to know', 'to think', 'to want', 'to see', 'to come', 'to give', 'to take'];
    const isAbstract = abstractIndicators.some(a => definition.toLowerCase().includes(a)) ||
                       definition.split(' ').length <= 3;

    let prompt = definition;

    if (isVerb && isAbstract) {
      // For abstract verbs, create a scene description
      const action = definition.replace(/^to /i, '');
      prompt = `A person ${action}, realistic scene, clear action`;
    } else if (isVerb) {
      // For other verbs, show the action
      const action = definition.replace(/^to /i, '');
      prompt = `Someone ${action}`;
    }

    // If we have a mnemonic with imagery, use it
    if (mnemonic && mnemonic.length > 10) {
      // Check if mnemonic contains visual imagery
      const visualWords = ['imagine', 'picture', 'visualize', 'looks like', 'like a', 'resembles'];
      if (visualWords.some(w => mnemonic.toLowerCase().includes(w))) {
        prompt = `${prompt}. ${mnemonic}`;
      }
    }

    return prompt;
  }

  // Load saved preferences
  onMount(() => {
    const savedProvider = localStorage.getItem('vocapp_imagegen_provider');
    const savedStyle = localStorage.getItem('vocapp_imagegen_style');
    if (savedProvider) selectedProvider = savedProvider;
    if (savedStyle) selectedStyle = savedStyle;
  });

  function openModal() {
    // Initialize custom prompt with smart default
    customPrompt = buildSmartPrompt();
    showModal = true;
    // Prevent background scroll on mobile
    if (typeof document !== 'undefined') {
      document.body.style.overflow = 'hidden';
    }
  }

  function closeModal() {
    showModal = false;
    // Restore background scroll
    if (typeof document !== 'undefined') {
      document.body.style.overflow = '';
    }
  }

  // Cleanup on destroy
  onDestroy(() => {
    if (typeof document !== 'undefined') {
      document.body.style.overflow = '';
      // Remove teleported modal from body if it exists
      if (modalElement && modalElement.parentNode === document.body) {
        document.body.removeChild(modalElement);
      }
    }
  });

  async function handleGenerate() {
    localStorage.setItem('vocapp_imagegen_provider', selectedProvider);
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
          cardId: card.id,
          userId, // Pass userId for user-scoped storage paths
          provider: selectedProvider,
          style: selectedStyle,
          aspectRatio: selectedAspectRatio,
          customPrompt: customPrompt.trim() || undefined
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
      onImagesChanged([...images], currentIndex);
    }
  }
</script>

<div class="image-generator">
  <!-- Carousel / Preview Area -->
  <div class="carousel-wrapper">
    {#if images.length > 1}
      <button
        onclick={prevImage}
        disabled={currentIndex === 0}
        class="nav-arrow nav-arrow-left">
        ‹
      </button>
    {/if}

    <div class="preview-container">
      {#if images.length > 0 && displayUrls[currentIndex]}
        <img src={displayUrls[currentIndex]} alt={card.headword} class="preview-image" />
        <button
          onclick={() => deleteImage(currentIndex)}
          class="delete-btn"
          title="Delete this image">
          ✕
        </button>
        {#if images.length > 1}
          <div class="image-counter">{currentIndex + 1} / {images.length}</div>
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

    {#if images.length > 1}
      <button
        onclick={nextImage}
        disabled={currentIndex === images.length - 1}
        class="nav-arrow nav-arrow-right">
        ›
      </button>
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

<!-- Model/Style Selection Modal - Teleported to body to escape parent modal overflow -->
{#if showModal}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    bind:this={modalElement}
    class="image-gen-modal-overlay"
    onclick={closeModal}
    onwheel={(e) => e.stopPropagation()}>
    <div class="image-gen-modal" onclick={(e) => e.stopPropagation()}>
      <!-- Fixed Header -->
      <div class="image-gen-modal-header">
        <h3>Generate Image</h3>
        <button class="modal-close" onclick={closeModal}>✕</button>
      </div>

      <!-- Scrollable Content -->
      <div class="image-gen-modal-content">
        <!-- Provider Selection -->
        <div class="section">
          <label class="section-label">Provider:</label>
          <div class="option-list">
            {#each providers as provider}
              <label class="option-item">
                <input
                  type="radio"
                  name="provider"
                  value={provider.id}
                  bind:group={selectedProvider}
                />
                <span class="option-name">{provider.name}</span>
                <span class="option-desc">({provider.desc})</span>
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

        <!-- Custom Prompt -->
        <div class="section">
          <label class="section-label" for="custom-prompt">
            Image Prompt:
            <span class="label-hint">(edit to customize what the AI visualizes)</span>
          </label>
          <textarea
            id="custom-prompt"
            class="prompt-textarea"
            bind:value={customPrompt}
            placeholder="Describe what the image should show..."
            rows="3"
          ></textarea>
          <button
            type="button"
            class="reset-prompt-btn"
            onclick={() => customPrompt = buildSmartPrompt()}
          >
            ↺ Reset to default
          </button>
        </div>
      </div>

      <!-- Fixed Footer -->
      <div class="image-gen-modal-footer">
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

  .carousel-wrapper {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
  }

  .nav-arrow {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2rem;
    height: 2rem;
    background: var(--color-panel);
    border: 1px solid var(--color-dim);
    border-radius: 50%;
    color: var(--color-accent);
    font-size: 1.5rem;
    line-height: 1;
    cursor: pointer;
    transition: all 0.2s;
    flex-shrink: 0;
  }

  .nav-arrow:hover:not(:disabled) {
    background: var(--color-accent);
    color: var(--color-bg);
    border-color: var(--color-accent);
  }

  .nav-arrow:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }

  .preview-container {
    position: relative;
    width: 100%;
    aspect-ratio: 1;
    max-width: 200px;
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

  .image-counter {
    position: absolute;
    bottom: 0.5rem;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(0, 0, 0, 0.6);
    color: white;
    padding: 0.25rem 0.75rem;
    border-radius: 1rem;
    font-size: 0.7rem;
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

  /* Modal Styles - Fixed header/footer with scrollable content */
  .image-gen-modal-overlay {
    position: fixed;
    inset: 0;
    z-index: 9999; /* Must be higher than parent Gardener modal (z-50) */
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.9);
    backdrop-filter: blur(8px);
    padding: 1rem;
    padding-top: max(1rem, env(safe-area-inset-top));
    padding-bottom: max(1rem, env(safe-area-inset-bottom));
    /* Prevent scroll bleed-through to parent modals */
    overscroll-behavior: contain;
    overflow: hidden;
  }

  .image-gen-modal {
    display: flex;
    flex-direction: column;
    background: var(--color-panel);
    border: 2px solid var(--color-accent);
    border-radius: 1.5rem;
    width: 100%;
    max-width: 400px;
    max-height: min(90vh, calc(100dvh - 2rem));
    overflow: hidden;
    box-shadow: 0 20px 80px rgba(0, 0, 0, 0.6), 0 0 40px rgba(var(--color-accent-rgb), 0.2);
  }

  .image-gen-modal-header {
    flex-shrink: 0;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.25rem 1.5rem;
    border-bottom: 1px solid var(--color-dim);
    background: var(--color-panel);
  }

  .image-gen-modal-header h3 {
    margin: 0;
    font-size: 1.25rem;
    color: var(--color-accent);
    font-weight: 600;
  }

  .modal-close {
    width: 44px;
    height: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--color-bg);
    border: 1px solid var(--color-dim);
    border-radius: 50%;
    color: var(--color-dim);
    font-size: 1.25rem;
    cursor: pointer;
    line-height: 1;
    transition: all 0.2s;
  }

  .modal-close:hover {
    color: var(--color-accent);
    border-color: var(--color-accent);
  }

  .image-gen-modal-content {
    flex: 1;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
    overscroll-behavior: contain;
    padding: 1.5rem;
  }

  .image-gen-modal-footer {
    flex-shrink: 0;
    display: flex;
    gap: 1rem;
    padding: 1.25rem 1.5rem;
    padding-bottom: max(1.25rem, env(safe-area-inset-bottom));
    border-top: 1px solid var(--color-dim);
    background: var(--color-panel);
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

  .label-hint {
    font-weight: normal;
    font-size: 0.7rem;
    opacity: 0.7;
    text-transform: none;
    letter-spacing: normal;
  }

  .prompt-textarea {
    width: 100%;
    padding: 0.75rem;
    background: var(--color-bg);
    border: 1px solid var(--color-dim);
    border-radius: 0.5rem;
    color: var(--color-main);
    font-size: 0.85rem;
    font-family: inherit;
    resize: vertical;
    min-height: 60px;
    line-height: 1.4;
  }

  .prompt-textarea:focus {
    outline: none;
    border-color: var(--color-accent);
  }

  .prompt-textarea::placeholder {
    color: var(--color-dim);
    opacity: 0.7;
  }

  .reset-prompt-btn {
    margin-top: 0.5rem;
    padding: 0.4rem 0.75rem;
    background: transparent;
    border: 1px solid var(--color-dim);
    border-radius: 0.25rem;
    color: var(--color-dim);
    font-size: 0.75rem;
    cursor: pointer;
    transition: all 0.2s;
  }

  .reset-prompt-btn:hover {
    border-color: var(--color-accent);
    color: var(--color-accent);
  }

  .btn-cancel, .btn-generate {
    flex: 1;
    min-height: 48px; /* Mobile touch target */
    padding: 0.875rem 1rem;
    border-radius: 0.75rem;
    font-size: 1rem;
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

  /* Option items need proper touch targets on mobile */
  @media (max-width: 768px) {
    .option-item {
      min-height: 48px;
    }

    .style-select {
      min-height: 48px;
      font-size: 16px; /* Prevent iOS zoom */
    }

    .prompt-textarea {
      font-size: 16px; /* Prevent iOS zoom */
    }
  }
</style>
