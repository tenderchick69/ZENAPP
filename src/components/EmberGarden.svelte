<script lang="ts">
  import { onMount, createEventDispatcher } from 'svelte';
  import { fade, scale } from 'svelte/transition';
  import { speak } from '$lib/tts';
  import { theme } from '$lib/theme';

  export let queue: any[] = [];
  export let showImages: boolean = false;
  const dispatch = createEventDispatcher();

  // Theme cycling
  const themeOrder = ['ember', 'frost', 'zen', 'syndicate'] as const;
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

  let words: any[] = [];
  let embers: any[] = [];
  let revealedWord: any = null;
  let audioCtx: AudioContext;
  let animationFrame: number;
  let sessionComplete = false;
  let physicsFrameCount = 0; // Track frames for physics timeout

  $: masteredCount = words.filter(w => w.mastered).length;
  // Visual warmth: Logarithmic scaling for gradual red increase
  // Uses sqrt for softer progression - won't get overwhelming with 20 cards
  $: progress = masteredCount / (words.length || 1);
  $: warmthHeight = 10 + (Math.sqrt(progress) * 20); // Slower growth: 10% to 30%

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

    // Generate all positions at once using adaptive density algorithm
    const positions = generateNonOverlappingPositions(queue.length);
    words = queue.map((card, i) => ({
      ...card,
      x: positions[i].x,
      y: positions[i].y,
      drift: Math.random() * Math.PI * 2,
      mastered: card.mastered || false,
      burning: false
    }));

    for (let i = 0; i < 150; i++) spawnEmber();
    loop();

    return () => {
      // Close any open modals
      revealedWord = null;
      cancelAnimationFrame(animationFrame);
      if (audioCtx && audioCtx.state !== 'closed') audioCtx.close();
    };
  });

  // Generate non-overlapping positions - SEQUENTIAL CENTER-OUTWARD
  // Places words one by one, starting from center, expanding outward
  // NO GRID PATTERNS - always sequential with collision detection
  function generateNonOverlappingPositions(count: number, existingPositions: { x: number; y: number; headword?: string }[] = []) {
    const positions: { x: number; y: number }[] = [];
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

    // Safe positioning bounds (cards have boxes, ~25% wide on mobile)
    const minX = isMobile ? 18 : 12;
    const maxX = isMobile ? 82 : 88;
    const minY = isMobile ? 12 : 10;
    const maxY = isMobile ? 82 : 85;

    // Center of available area
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    // Spacing between word centers - Ember cards have boxes (~25% wide)
    const spacingX = isMobile ? 22 : 18;
    const spacingY = isMobile ? 14 : 12;

    const allPositions = [...existingPositions];

    function hasCollision(x: number, y: number): boolean {
      return allPositions.some(p => {
        const hDist = Math.abs(p.x - x);
        const vDist = Math.abs(p.y - y);
        return hDist < spacingX && vDist < spacingY;
      });
    }

    function inBounds(x: number, y: number): boolean {
      return x >= minX && x <= maxX && y >= minY && y <= maxY;
    }

    // Place each word sequentially from center outward
    for (let i = 0; i < count; i++) {
      let placed = false;
      let x = centerX;
      let y = centerY;

      // First word at center
      if (i === 0) {
        x = centerX + (Math.random() - 0.5) * 5;
        y = centerY + (Math.random() - 0.5) * 5;
        if (!hasCollision(x, y) && inBounds(x, y)) {
          placed = true;
        }
      }

      // Search outward in expanding rectangles
      if (!placed) {
        for (let layer = 1; layer <= 15 && !placed; layer++) {
          const layerOffsetX = layer * spacingX * 0.7;
          const layerOffsetY = layer * spacingY * 0.7;

          const candidates: { x: number; y: number }[] = [];

          for (let dx = -layer; dx <= layer; dx++) {
            candidates.push({ x: centerX + dx * spacingX * 0.7, y: centerY - layerOffsetY });
            candidates.push({ x: centerX + dx * spacingX * 0.7, y: centerY + layerOffsetY });
          }
          for (let dy = -layer + 1; dy < layer; dy++) {
            candidates.push({ x: centerX - layerOffsetX, y: centerY + dy * spacingY * 0.7 });
            candidates.push({ x: centerX + layerOffsetX, y: centerY + dy * spacingY * 0.7 });
          }

          // Shuffle for organic feel
          for (let j = candidates.length - 1; j > 0; j--) {
            const k = Math.floor(Math.random() * (j + 1));
            [candidates[j], candidates[k]] = [candidates[k], candidates[j]];
          }

          for (const candidate of candidates) {
            const jitterX = (Math.random() - 0.5) * spacingX * 0.25;
            const jitterY = (Math.random() - 0.5) * spacingY * 0.25;
            const testX = candidate.x + jitterX;
            const testY = candidate.y + jitterY;

            if (inBounds(testX, testY) && !hasCollision(testX, testY)) {
              x = testX;
              y = testY;
              placed = true;
              break;
            }
          }
        }
      }

      // Emergency fallback
      if (!placed) {
        for (let attempt = 0; attempt < 100; attempt++) {
          x = minX + Math.random() * (maxX - minX);
          y = minY + Math.random() * (maxY - minY);
          if (!hasCollision(x, y)) break;
        }
      }

      positions.push({ x, y });
      allPositions.push({ x, y });
    }

    return positions;
  }

  // Single word repositioning (for fail case)
  function findSafeSpot(
    currentWords: { x: number; y: number; headword?: string }[],
    newHeadword?: string,
    avoidX?: number,
    avoidY?: number
  ) {
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

    const minX = isMobile ? 18 : 12;
    const maxX = isMobile ? 82 : 88;
    const minY = isMobile ? 12 : 10;
    const maxY = isMobile ? 82 : 85;

    const spacingX = isMobile ? 22 : 18;
    const spacingY = isMobile ? 14 : 12;

    // Try random positions with collision detection
    for (let attempt = 0; attempt < 200; attempt++) {
      const x = minX + Math.random() * (maxX - minX);
      const y = minY + Math.random() * (maxY - minY);

      const hasCollision = currentWords.some(w => {
        const hDist = Math.abs(w.x - x);
        const vDist = Math.abs(w.y - y);
        return hDist < spacingX && vDist < spacingY;
      });

      let tooCloseToOld = false;
      if (avoidX !== undefined && avoidY !== undefined) {
        const dist = Math.sqrt(Math.pow(x - avoidX, 2) + Math.pow(y - avoidY, 2));
        if (dist < 20) tooCloseToOld = true;
      }

      if (!hasCollision && !tooCloseToOld) {
        return { x, y };
      }
    }

    // Fallback: ignore avoid constraint
    for (let attempt = 0; attempt < 100; attempt++) {
      const x = minX + Math.random() * (maxX - minX);
      const y = minY + Math.random() * (maxY - minY);

      const hasCollision = currentWords.some(w => {
        const hDist = Math.abs(w.x - x);
        const vDist = Math.abs(w.y - y);
        return hDist < spacingX && vDist < spacingY;
      });

      if (!hasCollision) {
        return { x, y };
      }
    }

    return { x: (minX + maxX) / 2, y: (minY + maxY) / 2 };
  }

  function spawnEmber(golden = false, x?: number, y?: number, permanent = false) {
    embers.push({
      id: Math.random(),
      x: x !== undefined ? x : Math.random() * 100,
      y: y !== undefined ? y : Math.random() * 100 + 20,
      size: 1 + Math.random() * 3,
      speed: permanent ? 0.002 : (0.01 + Math.random() * 0.04),
      brightness: golden ? 1 : (0.1 + Math.random() * 0.4),
      phase: Math.random() * Math.PI * 2,
      golden,
      permanent
    });
  }

  function handleBackgroundClick(e: MouseEvent) {
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    const centerX = ((e.clientX - rect.left) / rect.width) * 100;
    const centerY = ((e.clientY - rect.top) / rect.height) * 100;

    playSound('spark');

    // Spawn scattered burst pattern - some permanent, some diffusing
    for (let i = 0; i < 12; i++) {
      // Random angle and distance for scatter effect
      const angle = Math.random() * Math.PI * 2;
      const distance = Math.random() * 8 + 2; // 2-10% spread
      const offsetX = Math.cos(angle) * distance;
      const offsetY = Math.sin(angle) * distance;

      // 40% chance to be permanent (stay), 60% chance to diffuse
      const isPermanent = Math.random() < 0.4;

      spawnEmber(true, centerX + offsetX, centerY + offsetY, isPermanent);
    }
  }

  function loop() {
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

    // Bounds for containment
    const minX = isMobile ? 18 : 12;
    const maxX = isMobile ? 82 : 88;
    const minY = isMobile ? 12 : 10;
    const maxY = isMobile ? 82 : 85;

    // Minimum distance between words (percentage)
    const minDistX = isMobile ? 20 : 16;
    const minDistY = isMobile ? 12 : 10;

    // Physics timeout - stop repulsion after 5 seconds to prevent jitter
    const maxPhysicsFrames = 300;
    physicsFrameCount++;
    const physicsActive = physicsFrameCount <= maxPhysicsFrames;

    words = words.map(w => {
      if (w.mastered) return w;

      // Start with natural drift (always continues)
      let newX = w.x + Math.sin(w.drift) * 0.02;
      let newY = w.y + Math.cos(w.drift) * 0.01;

      // Apply repulsion from other words (only while physics active)
      if (physicsActive) {
        let repelX = 0;
        let repelY = 0;

        words.forEach(other => {
          if (other.id === w.id || other.mastered) return;

          const dx = newX - other.x;
          const dy = newY - other.y;
          const distX = Math.abs(dx);
          const distY = Math.abs(dy);

          // Check if within collision zone
          if (distX < minDistX && distY < minDistY) {
            // Calculate repulsion force (stronger when closer)
            const overlapX = minDistX - distX;
            const overlapY = minDistY - distY;

            // Push away proportionally
            if (distX > 0.1) {
              repelX += (dx > 0 ? 1 : -1) * overlapX * 0.03;
            }
            if (distY > 0.1) {
              repelY += (dy > 0 ? 1 : -1) * overlapY * 0.03;
            }
          }
        });

        // Apply repulsion
        newX += repelX;
        newY += repelY;
      }

      // Keep within bounds
      newX = Math.max(minX, Math.min(maxX, newX));
      newY = Math.max(minY, Math.min(maxY, newY));

      return {
        ...w,
        x: newX,
        y: newY,
        drift: w.drift + 0.005
      };
    });

    embers = embers.map(e => {
      let newY = e.y - e.speed;
      let newX = e.x + Math.sin(e.phase) * 0.02;
      if (newY < -10) { newY = 110; newX = Math.random() * 100; }
      return { ...e, y: newY, x: newX, phase: e.phase + 0.02, brightness: e.brightness + Math.sin(e.phase * 2) * 0.05 };
    });

    animationFrame = requestAnimationFrame(loop);
  }

  function playSound(type: 'hover' | 'reveal' | 'solidify' | 'burn' | 'spark' | 'complete') {
    if (!audioCtx) return;
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const t = audioCtx.currentTime;

    if (type === 'spark') {
      const osc = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      osc.frequency.setValueAtTime(600, t);
      osc.frequency.exponentialRampToValueAtTime(300, t + 0.1);
      g.gain.setValueAtTime(0.05, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
      osc.connect(g).connect(audioCtx.destination);
      osc.start(); osc.stop(t + 0.1);
    } else if (type === 'hover') {
      const osc = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      osc.frequency.setValueAtTime(220, t);
      g.gain.setValueAtTime(0.02, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
      osc.connect(g).connect(audioCtx.destination);
      osc.start(); osc.stop(t + 0.3);
    } else if (type === 'reveal') {
      const osc = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      osc.frequency.setValueAtTime(440, t);
      g.gain.setValueAtTime(0.1, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
      osc.connect(g).connect(audioCtx.destination);
      osc.start(); osc.stop(t + 0.5);
    } else if (type === 'solidify') {
      [220, 277, 330, 440].forEach((f, i) => {
        const o = audioCtx.createOscillator();
        const g = audioCtx.createGain();
        o.frequency.value = f;
        g.gain.setValueAtTime(0.05, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 2);
        o.connect(g).connect(audioCtx.destination);
        o.start(t + i * 0.05); o.stop(t + 2);
      });
    } else if (type === 'burn') {
      const osc = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(150, t);
      osc.frequency.exponentialRampToValueAtTime(10, t + 0.8);
      g.gain.setValueAtTime(0.1, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.8);
      osc.connect(g).connect(audioCtx.destination);
      osc.start(); osc.stop(t + 0.8);
    } else if (type === 'complete') {
      // Victory Chord - rising arpeggio
      [220, 330, 440, 554, 660, 880].forEach((f, i) => {
        const o = audioCtx.createOscillator();
        const g = audioCtx.createGain();
        o.type = 'triangle';
        o.frequency.value = f;
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.05, t + 0.1 + i * 0.1);
        g.gain.exponentialRampToValueAtTime(0.001, t + 4);
        o.connect(g).connect(audioCtx.destination);
        o.start(t); o.stop(t + 4);
      });
    }
  }

  function handleSelect(word: any, e: MouseEvent) {
    e.stopPropagation();
    if (word.burning || sessionComplete) return;
    playSound('reveal');
    revealedWord = word;
  }

  function handleDecision(rating: 'pass' | 'fail') {
    if (!revealedWord) return;
    const targetId = revealedWord.id;

    if (rating === 'pass') {
      playSound('solidify');
      words = words.map(w => w.id === targetId ? { ...w, mastered: true } : w);
      for (let i = 0; i < 15; i++) spawnEmber(true, revealedWord.x, revealedWord.y);
    } else {
      playSound('burn');
      // Capture old position and headword before burning
      const targetWord = words.find(w => w.id === targetId);
      const oldX = targetWord?.x;
      const oldY = targetWord?.y;
      const headword = targetWord?.headword;

      words = words.map(w => w.id === targetId ? { ...w, burning: true } : w);
      setTimeout(() => {
        const others = words.filter(w => w.id !== targetId).map(w => ({ x: w.x, y: w.y, headword: w.headword }));
        // Pass old coordinates to force significant teleport distance
        const newPos = findSafeSpot(others, headword, oldX, oldY);
        words = words.map(w => w.id === targetId ? {
          ...w,
          burning: false,
          x: newPos.x,
          y: newPos.y
        } : w);
      }, 1200);
    }

    dispatch('grade', { id: targetId, rating });
    revealedWord = null;
  }
</script>

<!-- CONTAINER -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  class="ember-main-container fixed inset-0 bg-[#050505] overflow-hidden font-ember text-gray-300 cursor-crosshair select-none"
  onclick={handleBackgroundClick}
>

  <!-- Warmth Gradient - Logarithmic scaling for subtle progression -->
  <div
    class="absolute bottom-0 left-0 right-0 transition-all duration-1000 pointer-events-none"
    style="
      height: {warmthHeight}%;
      opacity: {0.2 + (Math.sqrt(progress) * 0.35)};
      background: linear-gradient(to top, rgba(255,69,0,0.4), transparent);
      filter: blur(30px);
    ">
  </div>

  <!-- Embers -->
  {#each embers as e (e.id)}
    <div class="absolute rounded-full transition-opacity"
         style="
           left: {e.x}%; top: {e.y}%;
           width: {e.size}px; height: {e.size}px;
           opacity: {e.brightness};
           background-color: {e.golden ? '#ffd700' : '#ff4500'};
           box-shadow: 0 0 {e.size * 4}px {e.golden ? '#ffd700' : '#ff4500'};
         ">
    </div>
  {/each}

  <!-- Words -->
  {#each words as w, i (w.id)}
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      class="absolute transform -translate-x-1/2 -translate-y-1/2 select-none cursor-pointer
             transition-[opacity,transform,filter] duration-1000
             {w.burning ? 'opacity-0 scale-150 blur-md' : 'opacity-100'}"
      style="left: {w.x}%; top: {w.y}%;"
      onmouseenter={() => playSound('hover')}
      onclick={(e) => handleSelect(w, e)}
    >
      {#if showImages && getCardImageUrl(w) && !w.imageFailed}
        <img
          src={getCardImageUrl(w)}
          alt={w.headword}
          class="w-20 h-20 md:w-24 md:h-24 object-cover rounded-lg border-2 transition-all
                 {w.mastered ? 'border-yellow-500 shadow-[0_0_20px_rgba(255,215,0,0.6)] scale-110' : 'border-orange-900/50 opacity-60 hover:opacity-100 hover:border-orange-500 hover:scale-110'}"
          onerror={() => { words = words.map(word => word.id === w.id ? { ...word, imageFailed: true } : word); }}
        />
      {:else}
        <span class="ember-card-text transition-[color,text-shadow] duration-1000 text-center ember-hue-{i % 5}
                     {w.mastered ? 'ember-card-mastered' : ''}">
          {w.headword}
        </span>
      {/if}
    </div>
  {/each}

  <!-- Session Complete Overlay -->
  {#if sessionComplete}
    <div class="absolute inset-0 z-40" transition:fade>
      <!-- Solid backdrop to hide words -->
      <div class="absolute inset-0 bg-black/95 backdrop-blur-sm"></div>
      <!-- Content -->
      <div class="absolute inset-0 flex items-center justify-center">
        <div class="text-center">
          <h1 class="text-5xl md:text-6xl text-yellow-500 font-ember tracking-widest mb-4 drop-shadow-[0_0_20px_gold] animate-pulse">GARDEN COMPLETE</h1>
          <p class="text-orange-300/70 text-lg md:text-xl mb-8 font-light">All embers now burn eternal.</p>
          <button
            onclick={() => dispatch('complete')}
            class="px-8 py-3 border border-yellow-600/50 text-yellow-500 hover:bg-yellow-900/30 rounded transition-all uppercase tracking-widest text-sm cursor-pointer">
            Return to Hub
          </button>
        </div>
      </div>
    </div>
  {/if}

  <!-- Toolbar (Hidden if complete) -->
  {#if !sessionComplete}
    <div class="absolute right-6 z-40 flex gap-2" style="top: max(1.5rem, env(safe-area-inset-top))">
      <button
        type="button"
        onclick={(e) => { e.stopPropagation(); dispatch('toggleImages'); }}
        class="w-10 h-9 flex items-center justify-center text-orange-900 hover:text-orange-500 text-sm transition-colors border border-orange-900/30 rounded hover:border-orange-500 bg-black/50 cursor-pointer"
        title={showImages ? 'Show Text' : 'Show Images'}>
        {showImages ? 'Aa' : '🖼️'}
      </button>
      <button
        type="button"
        onclick={(e) => { e.stopPropagation(); cycleTheme(); }}
        class="w-16 h-9 flex items-center justify-center text-orange-900 hover:text-orange-500 text-xs transition-colors border border-orange-900/30 rounded hover:border-orange-500 bg-black/50 cursor-pointer"
        title="Change theme">
        Emb ↻
      </button>
      <button
        type="button"
        onclick={(e) => { e.stopPropagation(); dispatch('exit'); }}
        class="w-12 h-9 flex items-center justify-center text-orange-900 hover:text-orange-500 text-xs transition-colors border border-orange-900/30 rounded hover:border-orange-500 bg-black/50 cursor-pointer">
        Exit
      </button>
    </div>
  {/if}

  <!-- Modal -->
  {#if revealedWord}
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4" style="padding-top: max(1rem, env(safe-area-inset-top)); padding-bottom: max(1rem, env(safe-area-inset-bottom));" transition:fade>
      <!-- Backdrop -->
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div class="absolute inset-0 bg-black/95 backdrop-blur-[2px]" onclick={() => revealedWord = null}></div>

      <!-- Modal Content Container - Centered, content + buttons grouped -->
      <div class="relative flex flex-col max-w-lg w-full mx-auto max-h-[85vh]" transition:scale>
        <!-- Close Button (fixed to modal, inside bounds) -->
        <button class="absolute top-2 right-2 z-20 text-gray-600 cursor-pointer hover:text-white bg-black/80 border border-orange-900/30 rounded-full w-10 h-10 flex items-center justify-center text-xl" onclick={() => revealedWord = null}>✕</button>

        <!-- Scrollable Content Area -->
        <div class="overflow-y-auto overscroll-contain rounded-xl" style="-webkit-overflow-scrolling: touch;">
          <div class="bg-gradient-to-b from-[#121212] to-black border border-orange-900/40 p-6 md:p-10 pt-12 rounded-xl text-center shadow-[0_0_100px_rgba(255,69,0,0.15)]">
            <!-- German Gloss -->
            {#if revealedWord.gloss_de}
              <div class="text-orange-500 text-lg font-serif mb-2 text-center">{revealedWord.gloss_de}</div>
            {/if}

            <!-- Headword (Click to hear - hover shows speaker) -->
            <button
              onclick={() => speak(revealedWord.headword)}
              class="text-4xl md:text-5xl lg:text-6xl text-orange-100 font-ember tracking-wider drop-shadow-[0_0_15px_rgba(255,100,0,0.4)] cursor-pointer hover:scale-105 transition-transform bg-transparent border-none tts-speakable mb-3">
              {revealedWord.headword}
            </button>

            {#if revealedWord.ipa}
              <!-- Use font-sans for IPA legibility -->
              <p class="text-orange-500/50 text-sm mb-6 font-sans tracking-widest text-center">/{revealedWord.ipa}/</p>
            {/if}

            <p class="text-xl md:text-2xl text-gray-200 mb-6 leading-relaxed font-light font-ember">{revealedWord.definition}</p>

            {#if getCardImageUrl(revealedWord) && !revealedWord.imageFailed}
              <div class="mb-6 flex justify-center">
                <img
                  src={getCardImageUrl(revealedWord)}
                  alt={revealedWord.headword}
                  class="max-w-[140px] max-h-[140px] md:max-w-[160px] md:max-h-[160px] rounded-lg border border-orange-900/30 opacity-80 hover:opacity-100 transition-opacity"
                  onerror={() => { words = words.map(word => word.id === revealedWord.id ? { ...word, imageFailed: true } : word); revealedWord = { ...revealedWord, imageFailed: true }; }}
                />
              </div>
            {/if}

            <!-- RICH DATA BLOCK -->
            <div class="border-t border-orange-900/30 pt-6 text-center space-y-5">

               {#if revealedWord.mnemonic}
                 <div class="bg-orange-900/10 p-4 rounded border border-orange-900/20">
                    <span class="text-[10px] uppercase text-orange-500 tracking-widest block mb-2">Mnemonic</span>
                    <p class="text-base text-gray-300 font-ember leading-snug">{revealedWord.mnemonic}</p>
                 </div>
               {/if}

               {#if revealedWord.etymology}
                  <div class="pt-2">
                     <span class="text-[10px] uppercase text-gray-500 tracking-widest block mb-1">Etymology</span>
                     <p class="text-base text-gray-400 italic">{revealedWord.etymology}</p>
                  </div>
               {/if}

               {#if revealedWord.example}
                  <div class="pt-4">
                     <span class="text-[10px] uppercase text-orange-500/60 tracking-[0.2em]">USAGE</span>
                     <div class="text-lg text-orange-200/80 italic mt-2">
                        "{revealedWord.example}"
                     </div>
                     {#if revealedWord.example_gloss}
                       <div class="text-base text-gray-300 mt-1">
                          "{revealedWord.example_gloss}"
                       </div>
                     {/if}
                  </div>
               {/if}
            </div>

            <!-- Action Buttons - Inside card, below content -->
            <div class="flex gap-4 justify-center mt-6 pt-4 border-t border-orange-900/30">
              <button onclick={() => handleDecision('fail')}
                class="flex-1 max-w-[160px] py-4 bg-orange-900/10 border border-orange-600/30 text-orange-500 hover:bg-orange-500/20 hover:border-orange-500 rounded-lg transition-all cursor-pointer group">
                <span class="text-3xl drop-shadow-[0_0_8px_rgba(255,69,0,0.6)] group-hover:drop-shadow-[0_0_12px_rgba(255,69,0,0.8)] transition-all">✗</span>
              </button>
              <button onclick={() => handleDecision('pass')}
                class="flex-1 max-w-[160px] py-4 bg-yellow-900/10 border border-yellow-600/30 text-yellow-500 hover:bg-yellow-500/20 hover:border-yellow-500 rounded-lg transition-all cursor-pointer group">
                <span class="text-3xl drop-shadow-[0_0_8px_rgba(255,215,0,0.6)] group-hover:drop-shadow-[0_0_12px_rgba(255,215,0,0.8)] transition-all">✓</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  /* Main container - prevent any horizontal overflow */
  .ember-main-container {
    width: 100%;
    max-width: 100vw;
    overflow-x: hidden !important;
    overflow-y: hidden !important;
  }

  /* Card text containment for long phrases */
  .ember-card-text {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    max-width: min(200px, 55vw);
    padding: 0.5rem 0.75rem;
    background: rgba(255, 107, 53, 0.08);
    border: 1px solid rgba(255, 107, 53, 0.2);
    border-radius: 8px;

    /* Text containment - no mid-word breaks */
    white-space: nowrap;
    text-align: center;

    /* Readable font size */
    line-height: 1.3;
    font-size: clamp(0.85rem, 3.5vw, 1.2rem);

    /* Touch target */
    min-height: 44px;
    min-width: 60px;
  }

  .ember-card-unmastered {
    /* MUCH more visible - orange glow on dark */
    color: rgba(255, 180, 120, 0.85);
    text-shadow: 0 0 8px rgba(255, 100, 50, 0.4);
  }

  .ember-card-unmastered:hover {
    color: rgba(255, 220, 180, 1);
    background: rgba(255, 107, 53, 0.2);
    border-color: rgba(255, 107, 53, 0.5);
    transform: scale(1.05);
    text-shadow: 0 0 12px rgba(255, 100, 50, 0.6);
  }

  .ember-card-mastered {
    color: #ffd700;
    text-shadow: 0 0 20px rgba(255, 215, 0, 1), 0 0 40px rgba(255, 215, 0, 0.5);
    transform: scale(1.15);
    background: rgba(255, 215, 0, 0.15);
    border-color: rgba(255, 215, 0, 0.5);
    animation: ember-mastered-pulse 2s ease-in-out infinite;
  }

  @keyframes ember-mastered-pulse {
    0%, 100% {
      text-shadow: 0 0 20px rgba(255, 215, 0, 1), 0 0 40px rgba(255, 215, 0, 0.5);
      filter: brightness(1);
    }
    50% {
      text-shadow: 0 0 30px rgba(255, 215, 0, 1), 0 0 60px rgba(255, 215, 0, 0.7);
      filter: brightness(1.2);
    }
  }

  @media (max-width: 768px) {
    .ember-card-text {
      max-width: min(180px, 50vw);
      font-size: 0.95rem;
      padding: 0.5rem 0.8rem;
      line-height: 1.3;
      min-height: 44px;
    }
  }

  /* Very small screens */
  @media (max-width: 400px) {
    .ember-card-text {
      max-width: min(160px, 45vw);
      font-size: 0.9rem;
      padding: 0.4rem 0.7rem;
    }
  }

  /* Ember Hue Variations - Warm fire palette */
  .ember-hue-0 {
    color: rgba(255, 160, 100, 0.85); /* Warm orange */
    border-color: rgba(255, 140, 80, 0.25);
    background: rgba(255, 120, 60, 0.08);
  }
  .ember-hue-1 {
    color: rgba(255, 190, 120, 0.85); /* Amber gold */
    border-color: rgba(255, 180, 100, 0.25);
    background: rgba(255, 170, 80, 0.08);
  }
  .ember-hue-2 {
    color: rgba(255, 130, 100, 0.85); /* Coral red */
    border-color: rgba(255, 110, 80, 0.25);
    background: rgba(255, 100, 70, 0.08);
  }
  .ember-hue-3 {
    color: rgba(255, 200, 140, 0.85); /* Soft gold */
    border-color: rgba(255, 190, 120, 0.25);
    background: rgba(255, 180, 100, 0.08);
  }
  .ember-hue-4 {
    color: rgba(255, 145, 85, 0.85); /* Deep flame */
    border-color: rgba(255, 125, 65, 0.25);
    background: rgba(255, 110, 55, 0.08);
  }

  .ember-hue-0:hover, .ember-hue-1:hover, .ember-hue-2:hover, .ember-hue-3:hover, .ember-hue-4:hover {
    filter: brightness(1.15);
  }
</style>
