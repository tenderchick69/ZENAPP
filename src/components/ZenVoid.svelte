<script lang="ts">
  import { onMount, createEventDispatcher } from 'svelte';
  import { fade, scale } from 'svelte/transition';
  import { speak } from '$lib/tts';
  import { theme } from '$lib/theme';

  export let queue: any[] = [];
  export let showImages: boolean = false;
  const dispatch = createEventDispatcher();

  // Theme cycling
  const themeOrder = ['zen', 'syndicate', 'ember', 'frost'] as const;
  function cycleTheme() {
    const currentIdx = themeOrder.indexOf($theme as any);
    const nextIdx = (currentIdx + 1) % themeOrder.length;
    theme.set(themeOrder[nextIdx]);
  }

  // Helper to get card image URL (handles both old and new formats)
  function getCardImageUrl(card: any): string | null {
    if (card.image_urls && Array.isArray(card.image_urls) && card.image_urls.length > 0) {
      const idx = card.selected_image_index || 0;
      return card.image_urls[idx] || card.image_urls[0];
    }
    if (card.image_url) {
      return card.image_url;
    }
    return null;
  }

  // Word state
  type WordState = {
    id: number;
    headword: string;
    definition: string;
    ipa?: string;
    mnemonic?: string;
    etymology?: string;
    example?: string;
    example_gloss?: string;
    gloss_de?: string;
    image_url?: string;
    image_urls?: string[];
    selected_image_index?: number;
    x: number;
    y: number;
    drift: number;
    mastered: boolean;
    dissolving: boolean;
    waveOffset: number; // Wave ripple displacement
    imageFailed?: boolean;
  };

  // Particle type
  type Particle = {
    id: number;
    x: number;
    y: number;
    vx: number;
    vy: number;
    size: number;
    opacity: number;
  };

  let words: WordState[] = [];
  let particles: Particle[] = [];
  let revealedWord: WordState | null = null;
  let currentIndex = 0;
  let audioCtx: AudioContext;
  let animationFrame: number;
  let sessionComplete = false;
  let breathPhase = 0;

  // Wave ripple state
  let cardRefs: HTMLElement[] = [];
  let containerRef: HTMLElement;
  let ripples: { id: number; x: number; y: number }[] = [];

  // Wave ripple effect - click anywhere to create wave
  function handleContainerClick(e: MouseEvent) {
    // Don't trigger if clicking on a card or modal
    const target = e.target as HTMLElement;
    if (target.closest('.zen-word-card') || target.closest('.zen-modal') || revealedWord) return;

    // Get click position relative to container
    const rect = containerRef?.getBoundingClientRect();
    if (!rect) return;

    const clickX = e.clientX;
    const clickY = e.clientY;
    const startTime = Date.now();
    const waveSpeed = 400; // pixels per second
    const waveDuration = 2000; // ms for wave to complete
    const waveHeight = 18; // max pixels to move (increased for visibility)

    // Play subtle sound
    playSound('ripple');

    // Spawn visual ripple
    const rippleId = Date.now();
    ripples = [...ripples, { id: rippleId, x: clickX, y: clickY }];
    setTimeout(() => {
      ripples = ripples.filter(r => r.id !== rippleId);
    }, 1500);

    function animateWave() {
      const elapsed = Date.now() - startTime;
      if (elapsed > waveDuration) {
        // Reset all wave offsets
        words = words.map(w => ({ ...w, waveOffset: 0 }));
        return;
      }

      const waveRadius = (elapsed / 1000) * waveSpeed;
      const waveWidth = 150; // width of the wave band

      // Update wave offsets in state
      words = words.map(w => {
        if (w.mastered || w.dissolving) return { ...w, waveOffset: 0 };

        // Convert percentage position to pixels
        const cardX = (w.x / 100) * rect.width;
        const cardY = (w.y / 100) * rect.height;

        // Distance from click point (adjusted for container position)
        const distance = Math.sqrt(
          Math.pow(cardX - (clickX - rect.left), 2) +
          Math.pow(cardY - (clickY - rect.top), 2)
        );

        // Wave function: card moves if wave is passing through it
        const distanceFromWaveFront = Math.abs(distance - waveRadius);

        if (distanceFromWaveFront < waveWidth) {
          // Inside the wave band - apply sine displacement
          const wavePosition = 1 - (distanceFromWaveFront / waveWidth);
          const displacement = Math.sin(wavePosition * Math.PI) * waveHeight;
          return { ...w, waveOffset: displacement };
        } else if (distance < waveRadius - waveWidth) {
          // Wave has passed - ease back to rest
          return { ...w, waveOffset: w.waveOffset * 0.9 };
        }
        return w;
      });

      requestAnimationFrame(animateWave);
    }

    requestAnimationFrame(animateWave);
  }

  $: masteredCount = words.filter(w => w.mastered).length;
  $: activeWord = words.find((w, i) => i === currentIndex && !w.mastered);

  // Trigger completion check
  $: if (words.length > 0 && masteredCount === words.length && !sessionComplete) {
    finishSession();
  }

  function finishSession() {
    sessionComplete = true;
    setTimeout(() => playSound('complete'), 500);
  }

  onMount(() => {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();

    // Initialize words with positions - accumulate to prevent overlap
    // Use larger spacing when in image mode since images are bigger than text
    const placedWords: { x: number; y: number; headword: string }[] = [];
    words = queue.map((card, i) => {
      const pos = findSafeSpot(placedWords, card.headword, undefined, undefined, showImages && getCardImageUrl(card));
      placedWords.push({ x: pos.x, y: pos.y, headword: card.headword });
      return {
        ...card,
        x: pos.x,
        y: pos.y,
        drift: Math.random() * Math.PI * 2,
        mastered: card.mastered || false, // Preserve mastered state from parent
        dissolving: false,
        waveOffset: 0
      };
    });

    // Start animation loop
    loop();

    // Breathing rhythm
    const breathInterval = setInterval(() => {
      breathPhase = (breathPhase + 1) % 100;
    }, 40);

    return () => {
      // Close any open modals
      revealedWord = null;
      cancelAnimationFrame(animationFrame);
      clearInterval(breathInterval);
      if (audioCtx && audioCtx.state !== 'closed') audioCtx.close();
    };
  });

  function findSafeSpot(
    currentWords: { x: number; y: number; headword?: string }[],
    newHeadword?: string,
    avoidX?: number,
    avoidY?: number,
    isImage?: boolean
  ) {
    let safe = false;
    let x = 0, y = 0;
    let attempts = 0;

    // Calculate spacing based on content type
    // Images need more space (they're about 80-96px = ~8-10% of viewport)
    const baseHorizontalSpacing = isImage ? 14 : 12;
    const baseVerticalSpacing = isImage ? 12 : 8;
    const newWordLen = newHeadword?.length || 8;
    const charWidth = isImage ? 0 : 1.2;

    while (!safe && attempts < 200) {
      x = 12 + Math.random() * 76;
      y = 15 + Math.random() * 70;

      // Check collision with all existing words
      const hasCollision = currentWords.some(w => {
        const existingWordLen = w.headword?.length || 8;
        const requiredHSpacing = baseHorizontalSpacing + ((newWordLen + existingWordLen) / 2) * charWidth;
        const requiredVSpacing = baseVerticalSpacing;

        const hDist = Math.abs(w.x - x);
        const vDist = Math.abs(w.y - y);

        return hDist < requiredHSpacing && vDist < requiredVSpacing;
      });

      let tooCloseToAvoid = false;
      if (avoidX !== undefined && avoidY !== undefined) {
        const dist = Math.sqrt(Math.pow(x - avoidX, 2) + Math.pow(y - avoidY, 2));
        if (dist < 25) tooCloseToAvoid = true;
      }

      if (!hasCollision && !tooCloseToAvoid) safe = true;
      attempts++;
    }

    // Grid fallback if no safe spot found
    if (!safe) {
      const gridCols = isImage ? 3 : 4;
      const gridRows = isImage ? 4 : 5;
      const cellWidth = 76 / gridCols;
      const cellHeight = 65 / gridRows;
      const index = currentWords.length % (gridCols * gridRows);
      const col = index % gridCols;
      const row = Math.floor(index / gridCols);
      x = 12 + col * cellWidth + cellWidth / 2 + (Math.random() - 0.5) * 5;
      y = 15 + row * cellHeight + cellHeight / 2 + (Math.random() - 0.5) * 5;
    }

    return { x, y };
  }

  function loop() {
    // Float words gently
    words = words.map(w => {
      if (w.mastered || w.dissolving) return w;
      return {
        ...w,
        y: w.y + Math.sin(w.drift) * 0.008,
        drift: w.drift + 0.003
      };
    });

    // Animate particles (float upward)
    particles = particles
      .map(p => ({
        ...p,
        x: p.x + p.vx,
        y: p.y + p.vy,
        vy: p.vy - 0.01, // Decelerate upward
        opacity: Math.max(0, p.opacity - 0.008)
      }))
      .filter(p => p.opacity > 0);

    animationFrame = requestAnimationFrame(loop);
  }

  function spawnParticles(x: number, y: number, count: number = 80) {
    const newParticles: Particle[] = [];
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 1.5 + 0.5;
      newParticles.push({
        id: Date.now() + i,
        x: x,
        y: y,
        vx: Math.cos(angle) * speed * 0.3,
        vy: -Math.random() * 2 - 1, // Float upward
        size: 1 + Math.random() * 2,
        opacity: 0.6 + Math.random() * 0.4
      });
    }
    particles = [...particles, ...newParticles];
  }

  function playSound(type: 'hover' | 'reveal' | 'dissolve' | 'fog' | 'complete' | 'ripple') {
    if (!audioCtx) return;
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const t = audioCtx.currentTime;

    if (type === 'ripple') {
      // Soft water droplet sound - descending pitch
      const osc = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, t);
      osc.frequency.exponentialRampToValueAtTime(200, t + 0.3);
      g.gain.setValueAtTime(0.02, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
      osc.connect(g).connect(audioCtx.destination);
      osc.start(); osc.stop(t + 0.3);
    } else if (type === 'hover') {
      const osc = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.value = 400;
      g.gain.setValueAtTime(0.015, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
      osc.connect(g).connect(audioCtx.destination);
      osc.start(); osc.stop(t + 0.2);
    } else if (type === 'reveal') {
      [600, 800, 1000].forEach((freq, i) => {
        const osc = audioCtx.createOscillator();
        const g = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        g.gain.setValueAtTime(0.03, t + i * 0.05);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
        osc.connect(g).connect(audioCtx.destination);
        osc.start(t + i * 0.05); osc.stop(t + 0.4);
      });
    } else if (type === 'dissolve') {
      // Ascending harmonic dissolve
      [300, 450, 600, 750, 900].forEach((freq, i) => {
        const osc = audioCtx.createOscillator();
        const g = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        g.gain.setValueAtTime(0.04, t + i * 0.08);
        g.gain.exponentialRampToValueAtTime(0.001, t + 1.5);
        osc.connect(g).connect(audioCtx.destination);
        osc.start(t + i * 0.08); osc.stop(t + 1.5);
      });
    } else if (type === 'fog') {
      const osc = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(300, t);
      osc.frequency.exponentialRampToValueAtTime(80, t + 0.6);
      g.gain.setValueAtTime(0.05, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
      osc.connect(g).connect(audioCtx.destination);
      osc.start(); osc.stop(t + 0.6);
    } else if (type === 'complete') {
      [220, 330, 440, 550, 660, 880].forEach((f, i) => {
        const o = audioCtx.createOscillator();
        const g = audioCtx.createGain();
        o.type = 'sine';
        o.frequency.value = f;
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.04, t + 0.1 + i * 0.1);
        g.gain.exponentialRampToValueAtTime(0.001, t + 3);
        o.connect(g).connect(audioCtx.destination);
        o.start(t); o.stop(t + 3);
      });
    }
  }

  function handleWordClick(word: WordState, e: MouseEvent) {
    e.stopPropagation();
    if (word.dissolving || word.mastered || sessionComplete) return;
    playSound('reveal');
    revealedWord = word;
  }

  function handleDecision(rating: 'pass' | 'fail') {
    if (!revealedWord) return;
    const targetId = revealedWord.id;
    const targetWord = words.find(w => w.id === targetId);

    if (rating === 'pass') {
      playSound('dissolve');

      // Spawn particles at word position
      if (targetWord) {
        // Convert percentage to viewport coordinates for particles
        const rect = document.querySelector('.zen-void-container')?.getBoundingClientRect();
        if (rect) {
          spawnParticles(
            (targetWord.x / 100) * rect.width,
            (targetWord.y / 100) * rect.height
          );
        }
      }

      // Mark as dissolving, then mastered
      words = words.map(w => w.id === targetId ? { ...w, dissolving: true } : w);
      setTimeout(() => {
        words = words.map(w => w.id === targetId ? { ...w, mastered: true, dissolving: false } : w);
      }, 1000);

      // Move to next unmastered word
      const nextIndex = words.findIndex((w, i) => i > currentIndex && !w.mastered);
      if (nextIndex !== -1) currentIndex = nextIndex;
      else {
        const firstUnmastered = words.findIndex(w => !w.mastered);
        if (firstUnmastered !== -1) currentIndex = firstUnmastered;
      }
    } else {
      playSound('fog');
      const oldX = targetWord?.x;
      const oldY = targetWord?.y;
      const headword = targetWord?.headword;

      // Mark as dissolving temporarily
      words = words.map(w => w.id === targetId ? { ...w, dissolving: true } : w);

      setTimeout(() => {
        const others = words.filter(w => w.id !== targetId).map(w => ({ x: w.x, y: w.y, headword: w.headword }));
        const newPos = findSafeSpot(others, headword, oldX, oldY);
        words = words.map(w => w.id === targetId ? {
          ...w,
          dissolving: false,
          x: newPos.x,
          y: newPos.y
        } : w);
      }, 800);
    }

    dispatch('grade', { id: targetId, rating });
    revealedWord = null;
  }

  // Calculate breathing scale
  $: breathScale = 1 + Math.sin(breathPhase * 0.0628) * 0.08;
</script>

<!-- CONTAINER -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  bind:this={containerRef}
  onclick={handleContainerClick}
  class="zen-void-container fixed inset-0 bg-black overflow-hidden font-void text-gray-400 select-none cursor-pointer">

  <!-- Subtle noise texture overlay -->
  <div class="absolute inset-0 opacity-[0.02]" style="background-image: url('data:image/svg+xml,%3Csvg viewBox=%220 0 256 256%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noise%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.9%22 numOctaves=%224%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noise)%22/%3E%3C/svg%3E');"></div>

  <!-- Breathing Ring -->
  <div
    class="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none transition-transform duration-100"
    style="transform: translate(-50%, -50%) scale({breathScale});">
    <div class="w-64 h-64 md:w-96 md:h-96 rounded-full border border-[#222]/50 animate-void-breathe"></div>
  </div>

  <!-- Particles -->
  {#each particles as p (p.id)}
    <div
      class="absolute rounded-full bg-[#333] pointer-events-none"
      style="left: {p.x}px; top: {p.y}px; width: {p.size}px; height: {p.size}px; opacity: {p.opacity};">
    </div>
  {/each}

  <!-- Click Ripples -->
  {#each ripples as r (r.id)}
    <div
      class="zen-ripple pointer-events-none"
      style="left: {r.x}px; top: {r.y}px;">
    </div>
  {/each}

  <!-- Words -->
  {#each words as w, i (w.id)}
    {#if !w.mastered}
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div
        bind:this={cardRefs[i]}
        class="zen-word-card absolute cursor-pointer
               {w.dissolving ? 'opacity-0 scale-75 transition-all duration-700' : 'opacity-100'}"
        style="left: {w.x}%; top: {w.y}%; transform: translate(-50%, -50%) translateY({Math.sin(w.drift) * 8 - w.waveOffset}px);"
        onclick={(e) => handleWordClick(w, e)}>
        {#if showImages && getCardImageUrl(w) && !w.imageFailed}
          <img
            src={getCardImageUrl(w)}
            alt={w.headword}
            class="w-20 h-20 md:w-24 md:h-24 object-cover rounded-lg border border-[#333] shadow-lg
                   {i === currentIndex && !w.dissolving ? 'ring-2 ring-[#444] shadow-[0_0_20px_rgba(100,100,100,0.3)]' : 'opacity-60 hover:opacity-90'}"
            onerror={() => { words = words.map(word => word.id === w.id ? { ...word, imageFailed: true } : word); }}
          />
        {:else}
          <span class="zen-card-text tracking-wider font-light text-center
                       {i === currentIndex && !w.dissolving ? 'zen-card-active' : 'zen-card-inactive'}">
            {w.headword}
          </span>
        {/if}
      </div>
    {/if}
  {/each}

  <!-- Progress -->
  <div class="fixed bottom-8 left-1/2 -translate-x-1/2">
    <span class="text-sm animate-void-breathe-text" style="color: #1a1a1a;">
      {masteredCount}/{words.length}
    </span>
  </div>

  <!-- Exit Button & Image Toggle -->
  {#if !sessionComplete}
    <div class="absolute top-6 right-6 z-40 flex gap-2">
      <button
        type="button"
        onclick={(e) => { e.stopPropagation(); dispatch('toggleImages'); }}
        class="w-10 h-9 flex items-center justify-center text-white/50 hover:text-white/80 text-sm transition-colors border border-white/20 rounded hover:border-white/40 bg-black/60 cursor-pointer"
        title={showImages ? 'Show Text' : 'Show Images'}>
        {showImages ? 'Aa' : '🖼️'}
      </button>
      <button
        type="button"
        onclick={(e) => { e.stopPropagation(); cycleTheme(); }}
        class="w-16 h-9 flex items-center justify-center text-white/50 hover:text-white/80 text-xs transition-colors border border-white/20 rounded hover:border-white/40 bg-black/60 cursor-pointer"
        title="Change theme">
        Zen ↻
      </button>
      <button
        type="button"
        onclick={(e) => { e.stopPropagation(); dispatch('exit'); }}
        class="w-12 h-9 flex items-center justify-center text-white/50 hover:text-white/80 text-xs transition-colors border border-white/20 rounded hover:border-white/40 bg-black/60 cursor-pointer">
        Exit
      </button>
    </div>
  {/if}

  <!-- Session Complete Overlay -->
  {#if sessionComplete}
    <div class="absolute inset-0 flex items-center justify-center z-40 pointer-events-none" transition:fade>
      <div class="text-center pointer-events-auto">
        <h1 class="text-5xl md:text-6xl zen-living-gradient font-light tracking-widest mb-4 animate-pulse">
          Void Clear
        </h1>
        <p class="text-[#333] text-lg mb-8 font-light tracking-wide">
          All words have dissolved into knowing.
        </p>
        <button
          onclick={() => dispatch('complete')}
          class="px-8 py-3 border border-[#333] text-[#444] hover:text-[#666] hover:border-[#444] rounded transition-all uppercase tracking-[0.3em] text-sm cursor-pointer">
          Return to Hub
        </button>
      </div>
    </div>
  {/if}

  <!-- Reveal Modal -->
  {#if revealedWord}
    <div class="fixed inset-0 z-50 flex flex-col h-[100dvh]" transition:fade>
      <!-- Backdrop -->
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div class="absolute inset-0 bg-black/95" onclick={() => revealedWord = null}></div>

      <!-- Modal Content Container -->
      <div class="relative flex flex-col h-full max-w-lg w-full mx-auto" transition:scale>
        <!-- Header with Close Button -->
        <div class="flex-shrink-0 flex justify-end p-4">
          <button class="text-[#333] cursor-pointer hover:text-[#666] bg-[#111] border border-[#222] rounded-full w-10 h-10 flex items-center justify-center text-xl" onclick={() => revealedWord = null}>×</button>
        </div>

        <!-- Scrollable Content Area -->
        <div class="flex-1 overflow-y-auto overscroll-contain px-4 md:px-6 pb-4" style="-webkit-overflow-scrolling: touch;">
          <div class="bg-[#080808] border border-[#222] p-6 md:p-10 rounded-lg text-center">
            <!-- German Gloss -->
            {#if revealedWord.gloss_de}
              <div class="text-[#444] text-base mb-2 tracking-wide text-center">{revealedWord.gloss_de}</div>
            {/if}

            <!-- Headword (Click to hear - hover shows speaker) -->
            <button
              onclick={() => revealedWord && speak(revealedWord.headword)}
              class="text-4xl md:text-5xl lg:text-6xl zen-living-gradient font-light tracking-wider cursor-pointer hover:scale-105 transition-transform bg-transparent border-none tts-speakable mb-3">
              {revealedWord.headword}
            </button>

            <!-- IPA -->
            {#if revealedWord.ipa}
              <p class="text-[#333] text-sm mb-6 font-sans tracking-widest text-center">/{revealedWord.ipa}/</p>
            {/if}

            <!-- Definition -->
            <p class="text-lg md:text-xl lg:text-2xl text-[#555] mb-6 leading-relaxed font-light">
              {revealedWord.definition}
            </p>

            <!-- Card Image -->
            {#if getCardImageUrl(revealedWord) && !revealedWord.imageFailed}
              <div class="mb-6 flex justify-center">
                <img
                  src={getCardImageUrl(revealedWord)}
                  alt={revealedWord.headword}
                  class="max-w-[140px] max-h-[140px] md:max-w-[160px] md:max-h-[160px] rounded-lg border border-[#222] opacity-80 hover:opacity-100 transition-opacity"
                  onerror={() => { words = words.map(word => word.id === revealedWord?.id ? { ...word, imageFailed: true } : word); if (revealedWord) revealedWord = { ...revealedWord, imageFailed: true }; }}
                />
              </div>
            {/if}

            <!-- Rich Data Block -->
            {#if revealedWord.mnemonic || revealedWord.etymology || revealedWord.example}
              <div class="border-t border-[#1a1a1a] pt-6 text-center space-y-5">

                {#if revealedWord.mnemonic}
                  <div class="bg-[#111] p-4 rounded border border-[#1a1a1a]">
                    <span class="text-[10px] uppercase text-[#444] tracking-[0.2em] block mb-2">Mnemonic</span>
                    <p class="text-base text-[#666] leading-relaxed">{revealedWord.mnemonic}</p>
                  </div>
                {/if}

                {#if revealedWord.etymology}
                  <div class="pt-2">
                    <span class="text-[10px] uppercase text-[#333] tracking-[0.2em] block mb-1">Etymology</span>
                    <p class="text-base text-[#444] italic">{revealedWord.etymology}</p>
                  </div>
                {/if}

                {#if revealedWord.example}
                  <div class="pt-4">
                    <span class="text-[10px] uppercase text-[#333] tracking-[0.2em]">Usage</span>
                    <div class="text-lg text-[#555] italic mt-2">
                      "{revealedWord.example}"
                    </div>
                    {#if revealedWord.example_gloss}
                      <div class="text-base text-[#666] mt-1">
                        "{revealedWord.example_gloss}"
                      </div>
                    {/if}
                  </div>
                {/if}
              </div>
            {/if}
          </div>
        </div>

        <!-- Fixed Footer with Action Buttons -->
        <div class="flex-shrink-0 bg-gradient-to-t from-black via-black/95 to-transparent px-6 pt-4 pb-6" style="padding-bottom: max(1.5rem, env(safe-area-inset-bottom));">
          <div class="flex gap-4 justify-center">
            <button
              onclick={() => handleDecision('pass')}
              class="flex-1 max-w-[150px] py-3 bg-[#111] border border-[#333] text-[#666] hover:text-[#999] hover:border-[#444] rounded transition-all tracking-[0.2em] uppercase text-sm cursor-pointer">
              I knew it
            </button>
            <button
              onclick={() => handleDecision('fail')}
              class="flex-1 max-w-[150px] py-3 bg-[#111] border border-[#222] text-[#444] hover:text-[#666] hover:border-[#333] rounded transition-all tracking-[0.2em] uppercase text-sm cursor-pointer">
              Show again
            </button>
          </div>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  /* Zen click wave ripple effect */
  .zen-ripple {
    position: absolute;
    width: 100px;
    height: 100px;
    border-radius: 50%;
    transform: translate(-50%, -50%);
    background: radial-gradient(circle, rgba(80, 80, 80, 0.15) 0%, transparent 70%);
    animation: zen-ripple-expand 1.5s ease-out forwards;
    pointer-events: none;
  }

  @keyframes zen-ripple-expand {
    0% {
      transform: translate(-50%, -50%) scale(0);
      opacity: 0.6;
    }
    100% {
      transform: translate(-50%, -50%) scale(5);
      opacity: 0;
    }
  }

  /* Smooth wave transition for cards */
  .zen-word-card {
    transition: transform 0.1s ease-out;
  }

  /* Card text containment for long phrases */
  .zen-card-text {
    display: inline-block;
    max-width: min(280px, 75vw);
    padding: 0.5rem 0.75rem;
    background: rgba(255, 255, 255, 0.03);
    border-radius: 8px;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);

    /* Text wrapping */
    word-wrap: break-word;
    overflow-wrap: break-word;
    word-break: break-word;
    white-space: normal;

    /* Prevent line overlap */
    line-height: 1.5;
    font-size: clamp(1rem, 4vw, 1.75rem);

    /* Touch target */
    min-height: 44px;
    min-width: 60px;
  }

  .zen-card-inactive {
    /* Much more visible - soft white on dark */
    color: rgba(180, 180, 180, 0.7);
    text-shadow: 0 0 8px rgba(255, 255, 255, 0.1);
  }

  .zen-card-inactive:hover {
    color: rgba(220, 220, 220, 0.9);
    background: rgba(255, 255, 255, 0.08);
    text-shadow: 0 0 12px rgba(255, 255, 255, 0.15);
  }

  .zen-card-active {
    /* Active/current card - clearly visible */
    color: rgba(230, 230, 230, 0.95);
    background: linear-gradient(135deg, rgba(100, 100, 100, 0.2), rgba(80, 80, 80, 0.15));
    animation: zen-gradient-shift 4s ease-in-out infinite;
    text-shadow: 0 0 15px rgba(255, 255, 255, 0.2);
  }

  /* Living gradient animation - more visible */
  @keyframes zen-gradient-shift {
    0%, 100% {
      filter: brightness(1);
      box-shadow: 0 0 15px rgba(255, 255, 255, 0.05);
    }
    50% {
      filter: brightness(1.15);
      box-shadow: 0 0 25px rgba(255, 255, 255, 0.1);
    }
  }

  /* Mastered zen cards - ethereal glow */
  .zen-card-mastered {
    color: rgba(255, 255, 255, 0.95);
    background: rgba(255, 255, 255, 0.12);
    border-color: rgba(255, 255, 255, 0.3);
    text-shadow: 0 0 20px rgba(255, 255, 255, 0.3);
    animation: zen-mastered-pulse 3s ease-in-out infinite;
  }

  @keyframes zen-mastered-pulse {
    0%, 100% {
      box-shadow: 0 0 20px rgba(255, 255, 255, 0.1);
    }
    50% {
      box-shadow: 0 0 35px rgba(255, 255, 255, 0.2);
    }
  }

  @media (max-width: 768px) {
    .zen-card-text {
      max-width: min(180px, 65vw);
      font-size: 0.8rem;
      padding: 0.35rem 0.5rem;
      line-height: 1.35;
    }
  }

  /* Very small screens */
  @media (max-width: 400px) {
    .zen-card-text {
      max-width: min(150px, 60vw);
      font-size: 0.7rem;
      padding: 0.3rem 0.4rem;
    }
  }
</style>
