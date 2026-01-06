<script lang="ts">
  import { onMount, createEventDispatcher } from 'svelte';
  import { fade, scale } from 'svelte/transition';
  import type { Card } from '$lib/srs';
  import { speak } from '$lib/tts';
  import { theme } from '$lib/theme';

  // Svelte 5 props syntax
  let { queue = [], showImages = false }: { queue?: Card[], showImages?: boolean } = $props();
  const dispatch = createEventDispatcher();

  // Theme cycling
  const themeOrder = ['frost', 'zen', 'syndicate', 'ember'] as const;
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

  // Word state type (Card + positioning)
  type WordState = Card & {
    x: number;
    y: number;
    rotation: number;
    attempts: number;
    mastered: boolean;
    imageFailed?: boolean;
  };

  // Visual effect types
  type CondensationDrop = {
    id: number;
    x: number;
    y: number;
    size: number;
    opacity: number;
  };

  type BreathSpot = {
    id: number;
    x: number;
    y: number;
  };

  type Snowflake = {
    id: number;
    x: number;
    y: number;
    char: string;
    delay: number;
  };

  // Word states
  let words: WordState[] = $state([]);
  let hoveredWord: number | null = $state(null);
  let revealedWord: WordState | null = $state(null);
  let masteredWords: number[] = $state([]);
  let fadingWords: number[] = $state([]);
  let justKnownWords: number[] = $state([]); // For crystallization effect

  // Visual effects
  let condensation: CondensationDrop[] = $state([]);
  let breathSpots: BreathSpot[] = $state([]);
  let snowflakes: Snowflake[] = $state([]);
  let sessionComplete = $state(false);

  // Audio
  let audioCtx: AudioContext;

  // Derived state
  const masteredCount = $derived(masteredWords.length);
  const progressPercent = $derived((masteredCount / (words.length || 1)) * 100);

  // Generate non-overlapping positions with ADAPTIVE DENSITY
  // ≤10 words: Random positioning (organic feel)
  // 11-15 words: Tighter spacing with random positioning
  // 16-20 words: Deterministic grid layout (guaranteed no overlap)
  function generateNonOverlappingPositions(
    count: number,
    existingPositions: { x: number; y: number }[] = []
  ) {
    const positions = [...existingPositions];
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

    // Positioning bounds
    const minX = isMobile ? 12 : 10;
    const maxXRange = isMobile ? 76 : 80;
    const minY = isMobile ? 15 : 12;
    const maxYRange = isMobile ? 70 : 76;

    // ADAPTIVE DENSITY: Use grid layout for 16+ words
    const useGridLayout = count > 15;

    if (useGridLayout) {
      // Deterministic grid for many words - guaranteed no overlap
      const cols = isMobile ? 4 : 5;
      const rows = Math.ceil(count / cols);
      const cellWidth = maxXRange / cols;
      const cellHeight = maxYRange / Math.min(rows, isMobile ? 6 : 7);

      for (let i = positions.length; i < count; i++) {
        const col = i % cols;
        const row = Math.floor(i / cols);
        // Small random offset within cell for visual interest
        const jitterX = (Math.random() - 0.5) * (cellWidth * 0.3);
        const jitterY = (Math.random() - 0.5) * (cellHeight * 0.3);

        positions.push({
          x: minX + col * cellWidth + cellWidth / 2 + jitterX,
          y: minY + row * cellHeight + cellHeight / 2 + jitterY
        });
      }
    } else {
      // Random positioning for fewer words
      // Adjust spacing based on word count
      const densityFactor = count > 10 ? 0.8 : 1.0;
      const minHorizontalDist = (isMobile ? 14 : 16) * densityFactor;
      const minVerticalDist = (isMobile ? 10 : 11) * densityFactor;

      for (let i = positions.length; i < count; i++) {
        let attempts = 0;
        let validPosition = null;
        const maxAttempts = count > 10 ? 150 : 100;

        while (attempts < maxAttempts && !validPosition) {
          const candidate = {
            x: minX + Math.random() * maxXRange,
            y: minY + Math.random() * maxYRange
          };

          const isValid = !positions.some(pos => {
            const hDist = Math.abs(candidate.x - pos.x);
            const vDist = Math.abs(candidate.y - pos.y);
            return hDist < minHorizontalDist && vDist < minVerticalDist;
          });

          if (isValid) validPosition = candidate;
          attempts++;
        }

        // Grid fallback if random failed
        if (!validPosition) {
          const cols = isMobile ? 4 : 5;
          const rows = isMobile ? 6 : 7;
          const cellWidth = maxXRange / cols;
          const cellHeight = maxYRange / rows;
          const gridIndex = i % (cols * rows);
          const col = gridIndex % cols;
          const row = Math.floor(gridIndex / cols);

          validPosition = {
            x: minX + col * cellWidth + cellWidth / 2,
            y: minY + row * cellHeight + cellHeight / 2
          };
        }

        positions.push(validPosition);
      }
    }

    return positions;
  }

  onMount(() => {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();

    // Generate positions for words
    const positions = generateNonOverlappingPositions(queue.length);

    words = queue.map((card, i) => ({
      ...card,
      x: positions[i].x,
      y: positions[i].y,
      rotation: (Math.random() - 0.5) * 8,
      attempts: 0,
      mastered: (card as any).mastered || false // Preserve mastered state from parent
    }));

    // Generate condensation drops
    const initialCondensation = [];
    for (let i = 0; i < 100; i++) {
      initialCondensation.push({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: 1 + Math.random() * 3,
        opacity: 0.02 + Math.random() * 0.05
      });
    }
    condensation = initialCondensation;

    // Animate condensation dripping
    const interval = setInterval(() => {
      condensation = condensation.map(drop => ({
        ...drop,
        y: drop.y + 0.01, // Slow drip
        opacity: drop.y > 95 ? 0 : drop.opacity
      })).map(drop => drop.y > 100 ? {
        ...drop,
        y: -2,
        x: Math.random() * 100,
        opacity: 0.02 + Math.random() * 0.05
      } : drop);
    }, 100);

    return () => {
      // Close any open modals
      revealedWord = null;
      clearInterval(interval);
      if (audioCtx && audioCtx.state !== 'closed') audioCtx.close();
    };
  });

  // Check completion
  $effect(() => {
    if (words.length > 0 && masteredCount === words.length && !sessionComplete) {
      sessionComplete = true;
      setTimeout(() => playSound('complete'), 500);
    }
  });

  // Audio Engine - Crystal Tones
  function playSound(type: 'hover' | 'reveal' | 'clear' | 'fog' | 'complete' | 'snowfall') {
    if (!audioCtx) return;
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const t = audioCtx.currentTime;

    if (type === 'snowfall') {
      // Soft crystalline tinkle - high pitched shimmer
      [1800, 2200, 1600].forEach((freq, i) => {
        const osc = audioCtx.createOscillator();
        const g = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        g.gain.setValueAtTime(0.015, t + i * 0.05);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
        osc.connect(g).connect(audioCtx.destination);
        osc.start(t + i * 0.05); osc.stop(t + 0.4);
      });
    }
    else if (type === 'hover') {
      // Glass touch - soft sine
      const osc = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.value = 600;
      g.gain.setValueAtTime(0.02, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
      osc.connect(g).connect(audioCtx.destination);
      osc.start(); osc.stop(t + 0.2);
    }
    else if (type === 'reveal') {
      // Clear chime - 3 ascending tones
      [1200, 1500, 1800].forEach((freq, i) => {
        const osc = audioCtx.createOscillator();
        const g = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        g.gain.setValueAtTime(0.03, t + i * 0.08);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
        osc.connect(g).connect(audioCtx.destination);
        osc.start(t + i * 0.08); osc.stop(t + 0.5);
      });
    }
    else if (type === 'clear') {
      // Glass clearing - ascending brightness
      [400, 600, 800, 1000, 1200].forEach((freq, i) => {
        const osc = audioCtx.createOscillator();
        const g = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        g.gain.setValueAtTime(0.04, t + i * 0.1);
        g.gain.exponentialRampToValueAtTime(0.001, t + 1.5);
        osc.connect(g).connect(audioCtx.destination);
        osc.start(t + i * 0.1); osc.stop(t + 1.5);
      });
    }
    else if (type === 'fog') {
      // Fog returning - descending sweep
      const osc = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(400, t);
      osc.frequency.exponentialRampToValueAtTime(100, t + 0.8);
      g.gain.setValueAtTime(0.06, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.8);
      osc.connect(g).connect(audioCtx.destination);
      osc.start(); osc.stop(t + 0.8);
    }
    else if (type === 'complete') {
      // Full window clear - harmonic stack
      const baseFreq = 440;
      [1, 1.25, 1.5, 2, 2.5, 3].forEach((mult, i) => {
        const osc = audioCtx.createOscillator();
        const g = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.value = baseFreq * mult;
        g.gain.setValueAtTime(0.04, t + i * 0.12);
        g.gain.exponentialRampToValueAtTime(0.001, t + 3);
        osc.connect(g).connect(audioCtx.destination);
        osc.start(t + i * 0.12); osc.stop(t + 3);
      });
    }
  }

  // Hover Handler - Breath Mechanic
  function handleHover(wordId: number) {
    const word = words.find(w => w.id === wordId);
    if (!word || word.mastered || fadingWords.includes(wordId)) return;

    hoveredWord = wordId;
    playSound('hover');

    // Spawn breath spot
    breathSpots = [...breathSpots, {
      id: Date.now(),
      x: word.x,
      y: word.y
    }];

    // Auto-remove after 2s
    setTimeout(() => {
      breathSpots = breathSpots.slice(1);
    }, 2000);
  }

  // Word Selection Handler
  function handleSelect(word: any, e: MouseEvent) {
    e.stopPropagation();
    if (fadingWords.includes(word.id) || sessionComplete) return;
    playSound('reveal');
    revealedWord = word;
  }

  // Decision Handler - Pass/Fail
  function handleDecision(rating: 'pass' | 'fail') {
    if (!revealedWord) return;
    const targetId = revealedWord.id;

    if (rating === 'pass') {
      // FREEZE mechanic with crystallization effect
      playSound('clear');
      justKnownWords = [...justKnownWords, targetId]; // Trigger crystallize animation
      words = words.map(w => w.id === targetId ? { ...w, mastered: true } : w);
      masteredWords = [...masteredWords, targetId];
      dispatch('grade', { id: targetId, rating });
      revealedWord = null;

      // Remove from justKnown after animation completes
      setTimeout(() => {
        justKnownWords = justKnownWords.filter(id => id !== targetId);
      }, 1200);
    } else {
      // FOG RETURN + RESPAWN mechanic
      playSound('fog');
      fadingWords = [...fadingWords, targetId];

      setTimeout(() => {
        // Get existing positions (excluding the word being respawned)
        const existingPositions = words
          .filter(w => w.id !== targetId)
          .map(w => ({ x: w.x, y: w.y }));

        // Generate new non-overlapping position
        const newPositions = generateNonOverlappingPositions(
          existingPositions.length + 1,
          existingPositions
        );
        const newPos = newPositions[newPositions.length - 1];

        // Update word position and rotation
        words = words.map(w => w.id === targetId ? {
          ...w,
          x: newPos.x,
          y: newPos.y,
          rotation: (Math.random() - 0.5) * 8,
          attempts: w.attempts + 1
        } : w);

        // Remove from fading
        fadingWords = fadingWords.filter(id => id !== targetId);
      }, 1500);

      dispatch('grade', { id: targetId, rating });
      revealedWord = null;
    }
  }

  // Spawn snowflakes on click
  function handleContainerClick(e: MouseEvent) {
    // Don't trigger if clicking on a word or modal
    const target = e.target as HTMLElement;
    if (target.closest('.frost-floating-card') || target.closest('.fixed.inset-0.flex') || revealedWord) return;

    playSound('snowfall');

    const snowChars = ['❄', '❅', '❆', '✻', '✼'];
    const newFlakes: Snowflake[] = [];
    const baseId = Date.now();

    for (let i = 0; i < 8; i++) {
      newFlakes.push({
        id: baseId + i,
        x: e.clientX + (Math.random() - 0.5) * 60,
        y: e.clientY,
        char: snowChars[Math.floor(Math.random() * snowChars.length)],
        delay: Math.random() * 0.3
      });
    }

    snowflakes = [...snowflakes, ...newFlakes];

    // Remove after animation completes
    setTimeout(() => {
      snowflakes = snowflakes.filter(f => !newFlakes.some(nf => nf.id === f.id));
    }, 2500);
  }

  // Word Visual State (3 levels) - MUST BE READABLE on mobile
  function getWordStyle(word: any) {
    const isHovered = hoveredWord === word.id;
    const isMastered = word.mastered;

    if (isMastered) {
      // Sharp, crystal clear - strong glow
      return {
        color: 'rgba(200, 235, 255, 1)',
        filter: 'none',
        textShadow: '0 0 15px rgba(168, 216, 234, 0.8), 0 0 30px rgba(168, 216, 234, 0.4), 0 0 4px rgba(255,255,255,0.5)'
      };
    } else if (isHovered) {
      // Readable through cleared breath
      return {
        color: 'rgba(220, 240, 255, 0.95)',
        filter: 'none',
        textShadow: '0 0 10px rgba(168, 216, 234, 0.5), 0 0 3px rgba(255,255,255,0.3)'
      };
    } else {
      // Default - READABLE with subtle frost effect (no heavy blur!)
      return {
        color: 'rgba(180, 210, 235, 0.7)',
        filter: 'blur(0.5px)',
        textShadow: '0 0 8px rgba(168, 216, 234, 0.3)'
      };
    }
  }
</script>

<!-- CONTAINER -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  class="fixed inset-0 bg-gradient-to-b from-[#1a2a3a] via-[#1a2a3a] to-slate-900 overflow-hidden font-hand text-gray-300 cursor-default select-none"
  onclick={handleContainerClick}>

  <!-- Outside scene - distant lights through window -->
  <div class="absolute top-1/4 left-1/4 w-2 h-2 bg-yellow-200/30 rounded-full blur-sm"></div>
  <div class="absolute top-1/3 right-1/3 w-1 h-1 bg-yellow-100/20 rounded-full blur-sm"></div>
  <div class="absolute bottom-1/3 left-1/2 w-3 h-3 bg-blue-200/20 rounded-full blur-md"></div>

  <!-- The frosted glass pane -->
  <div
    class="absolute inset-0"
    style="background: radial-gradient(ellipse at 30% 20%, rgba(255,255,255,0.15) 0%, transparent 50%),
                      radial-gradient(ellipse at 70% 80%, rgba(255,255,255,0.1) 0%, transparent 40%),
                      linear-gradient(180deg, rgba(200,220,240,0.08) 0%, rgba(180,200,220,0.12) 100%)">
  </div>

  <!-- Condensation drops on glass -->
  {#each condensation as drop (drop.id)}
    <div
      class="absolute rounded-full bg-white pointer-events-none"
      style="left: {drop.x}%; top: {drop.y}%; width: {drop.size}px; height: {drop.size * 1.5}px; opacity: {drop.opacity}">
    </div>
  {/each}

  <!-- Breath spots (hover effects) -->
  {#each breathSpots as spot (spot.id)}
    <div
      class="absolute rounded-full animate-breath-fade pointer-events-none"
      style="left: {spot.x}%; top: {spot.y}%; width: 120px; height: 120px; transform: translate(-50%, -50%); background: radial-gradient(circle, rgba(255,255,255,0.15) 0%, transparent 70%)">
    </div>
  {/each}

  <!-- Snowflakes on click -->
  {#each snowflakes as flake (flake.id)}
    <div
      class="snowflake pointer-events-none"
      style="left: {flake.x}px; top: {flake.y}px; animation-delay: {flake.delay}s;">
      {flake.char}
    </div>
  {/each}

  <!-- Words written on glass -->
  {#each words as w, i (w.id)}
    {@const style = getWordStyle(w)}
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      class="absolute cursor-pointer transition-[opacity,filter] duration-500 select-none frost-floating-card"
      class:animate-fog-return={fadingWords.includes(w.id)}
      class:frost-mastered={w.mastered}
      class:frost-just-known={justKnownWords.includes(w.id)}
      style="left: {w.x}%; top: {w.y}%; transform: translate(-50%, -50%) rotate({w.rotation}deg); --delay: {(i * 0.5) + Math.random() * 1.5}s;"
      onmouseenter={() => handleHover(w.id)}
      onmouseleave={() => hoveredWord = null}
      onclick={(e) => handleSelect(w, e)}>

      {#if showImages && getCardImageUrl(w) && !w.imageFailed}
        <img
          src={getCardImageUrl(w)}
          alt={w.headword}
          class="w-20 h-20 md:w-24 md:h-24 object-cover rounded-lg border-2 transition-all
                 {w.mastered ? 'border-[#a8d8ea] shadow-[0_0_20px_rgba(168,216,234,0.5)] opacity-90' : 'border-white/20 opacity-30 hover:opacity-70 hover:border-[#a8d8ea]/50'}"
          style="filter: {style.filter};"
          onerror={() => { words = words.map(word => word.id === w.id ? { ...word, imageFailed: true } : word); }}
        />
      {:else}
        <span class="frost-card-text font-finger tracking-wide text-center transition-[color,text-shadow,filter] duration-500 frost-hue-{i % 5}"
              style="color: {style.color}; text-shadow: {style.textShadow}; filter: {style.filter};">
          {w.headword}
        </span>
      {/if}

      <!-- Frost Crystals for mastered words -->
      {#if w.mastered && !showImages}
        <div class="absolute inset-0 pointer-events-none">
          <!-- Top-left crystal -->
          <svg class="absolute -top-3 -left-2 w-6 h-6 animate-frost-appear" style="animation-delay: 0s">
            <path d="M3 12 L12 3 M6 12 L12 6 M9 12 L12 9" stroke="rgba(168, 216, 234, 0.6)" stroke-width="1" fill="none"/>
          </svg>
          <!-- Top-right crystal -->
          <svg class="absolute -top-3 -right-2 w-6 h-6 animate-frost-appear" style="animation-delay: 0.1s">
            <path d="M12 12 L3 3 M9 12 L3 6 M6 12 L3 9" stroke="rgba(168, 216, 234, 0.5)" stroke-width="1" fill="none"/>
          </svg>
          <!-- Bottom-left crystal -->
          <svg class="absolute -bottom-3 -left-2 w-6 h-6 animate-frost-appear" style="animation-delay: 0.2s">
            <path d="M3 3 L12 12 M6 3 L12 9 M9 3 L12 6" stroke="rgba(168, 216, 234, 0.4)" stroke-width="1" fill="none"/>
          </svg>
          <!-- Bottom-right crystal -->
          <svg class="absolute -bottom-3 -right-2 w-6 h-6 animate-frost-appear" style="animation-delay: 0.3s">
            <path d="M12 3 L3 12 M9 3 L3 9 M6 3 L3 6" stroke="rgba(168, 216, 234, 0.5)" stroke-width="1" fill="none"/>
          </svg>
          <!-- Side crystals -->
          <svg class="absolute top-1/2 -left-4 w-4 h-4 -translate-y-1/2 animate-frost-appear" style="animation-delay: 0.15s">
            <path d="M0 6 L12 6 M6 0 L6 12" stroke="rgba(168, 216, 234, 0.3)" stroke-width="0.5" fill="none"/>
          </svg>
          <svg class="absolute top-1/2 -right-4 w-4 h-4 -translate-y-1/2 animate-frost-appear" style="animation-delay: 0.25s">
            <path d="M0 6 L12 6 M6 0 L6 12" stroke="rgba(168, 216, 234, 0.3)" stroke-width="0.5" fill="none"/>
          </svg>
        </div>
      {/if}

      <!-- Attempt marks -->
      {#if w.attempts > 0 && !w.mastered}
        <div class="absolute -bottom-6 left-1/2 transform -translate-x-1/2 text-xs text-white/10">
          {#each Array(Math.min(w.attempts, 3)).fill('') as _, i (i)}
            <span class="inline-block w-1 h-1 rounded-full bg-white/20 mx-0.5"></span>
          {/each}
        </div>
      {/if}
    </div>
  {/each}

  <!-- Window frame edges -->
  <div
    class="absolute inset-0 pointer-events-none"
    style="box-shadow: inset 0 0 100px rgba(0,0,0,0.3), inset 0 0 200px rgba(0,0,0,0.1)">
  </div>

  <!-- Ice crystals in corners -->
  <div class="absolute top-0 left-0 w-32 h-32 opacity-20" style="background: linear-gradient(135deg, rgba(200,220,240,0.3) 0%, transparent 60%)"></div>
  <div class="absolute top-0 right-0 w-32 h-32 opacity-20" style="background: linear-gradient(225deg, rgba(200,220,240,0.3) 0%, transparent 60%)"></div>
  <div class="absolute bottom-0 left-0 w-32 h-32 opacity-20" style="background: linear-gradient(45deg, rgba(200,220,240,0.3) 0%, transparent 60%)"></div>
  <div class="absolute bottom-0 right-0 w-32 h-32 opacity-20" style="background: linear-gradient(315deg, rgba(200,220,240,0.3) 0%, transparent 60%)"></div>

  <!-- Reveal Modal -->
  {#if revealedWord}
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4" style="padding-top: max(1rem, env(safe-area-inset-top)); padding-bottom: max(1rem, env(safe-area-inset-bottom));" transition:fade>
      <!-- Backdrop -->
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" onclick={() => revealedWord = null}></div>

      <!-- Modal Content Container - Centered, content + buttons grouped -->
      <div class="relative flex flex-col max-w-md w-full mx-auto max-h-[85vh]" transition:scale>
        <!-- Close Button (fixed to modal, inside bounds) -->
        <button class="absolute top-2 right-2 z-20 text-gray-600 cursor-pointer hover:text-white bg-slate-800/90 border border-[#a8d8ea]/30 rounded-full w-10 h-10 flex items-center justify-center text-xl" onclick={() => revealedWord = null}>✕</button>

        <!-- Scrollable Content Area -->
        <div class="overflow-y-auto overscroll-contain rounded-lg" style="-webkit-overflow-scrolling: touch;">
          <div class="bg-slate-800/95 border border-[#a8d8ea]/30 p-6 md:p-8 pt-12 rounded-lg shadow-2xl backdrop-blur-md text-center">
            <!-- German Gloss -->
            {#if revealedWord.gloss_de}
              <div class="text-[#a8d8ea] text-lg font-hand mb-2 text-center">{revealedWord.gloss_de}</div>
            {/if}

            <!-- Headword (Click to hear - hover shows speaker) -->
            <button
              onclick={() => revealedWord && speak(revealedWord.headword)}
              class="text-4xl md:text-5xl text-[#a8d8ea] font-finger tracking-wider drop-shadow-[0_0_15px_rgba(168,216,234,0.3)] cursor-pointer hover:scale-105 transition-transform bg-transparent border-none tts-speakable mb-3">
              {revealedWord.headword}
            </button>

            <!-- IPA -->
            {#if revealedWord.ipa}
              <p class="text-[#a8d8ea]/50 text-sm mb-6 font-sans tracking-widest text-center">/{revealedWord.ipa}/</p>
            {/if}

            <!-- Definition -->
            <p class="text-lg md:text-xl text-gray-300 mb-6 leading-relaxed font-light font-hand text-center">
              {revealedWord.definition}
            </p>

            <!-- Rich Data Block -->
            {#if revealedWord.mnemonic || revealedWord.etymology || revealedWord.example}
              <div class="border-t border-[#a8d8ea]/20 pt-6 text-center space-y-5">

                {#if revealedWord.mnemonic}
                  <div class="bg-[#a8d8ea]/5 p-4 rounded border border-[#a8d8ea]/10">
                    <span class="text-[10px] uppercase text-[#a8d8ea]/70 tracking-widest block mb-2 font-hand">Hint</span>
                    <p class="text-base text-[#a8d8ea]/80 font-hand leading-snug">{revealedWord.mnemonic}</p>
                  </div>
                {/if}

                {#if revealedWord.etymology}
                  <div class="pt-2">
                    <span class="text-[10px] uppercase text-gray-500 tracking-widest block mb-1 font-hand">Etymology</span>
                    <p class="text-base text-gray-400 italic font-hand">{revealedWord.etymology}</p>
                  </div>
                {/if}

                {#if revealedWord.example}
                  <div class="pt-4">
                    <span class="text-[10px] uppercase text-[#a8d8ea]/50 tracking-[0.2em] font-hand">USAGE</span>
                    <div class="text-lg text-[#a8d8ea]/70 italic mt-2 font-hand">
                      "{revealedWord.example}"
                    </div>
                    {#if revealedWord.example_gloss}
                      <div class="text-base text-gray-300 mt-1 font-hand">
                        "{revealedWord.example_gloss}"
                      </div>
                    {/if}
                  </div>
                {/if}
              </div>
            {/if}

            <!-- Action Buttons - Inside card, below content -->
            <div class="flex gap-4 justify-center mt-6 pt-4 border-t border-[#a8d8ea]/20">
              <button
                onclick={() => handleDecision('pass')}
                class="flex-1 max-w-[150px] py-3 bg-[#2a4a6a]/80 hover:bg-[#2a4a6a] text-white rounded-lg transition-all font-hand text-lg cursor-pointer">
                I knew it
              </button>
              <button
                onclick={() => handleDecision('fail')}
                class="flex-1 max-w-[150px] py-3 bg-[#a8d8ea]/20 hover:bg-[#a8d8ea]/30 text-[#a8d8ea] rounded-lg transition-all font-hand text-lg cursor-pointer">
                Show again
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  {/if}

  <!-- Session complete overlay -->
  {#if sessionComplete}
    <div class="fixed inset-0 flex items-center justify-center z-40 pointer-events-none" transition:fade>
      <div class="text-center pointer-events-auto">
        <h1 class="text-5xl text-[#2a4a6a] font-finger tracking-widest mb-4 drop-shadow-[0_0_20px_rgba(168,216,234,0.4)] animate-pulse">
          Window Clear
        </h1>
        <p class="text-[#a8d8ea]/70 text-xl mb-8 font-light font-hand">
          Every word now perfectly visible
        </p>
        <button
          onclick={() => dispatch('complete')}
          class="px-8 py-3 border border-[#a8d8ea]/50 text-[#a8d8ea] hover:bg-[#a8d8ea]/20 rounded transition-all uppercase tracking-widest text-sm font-hand cursor-pointer">
          Return to Hub
        </button>
      </div>
    </div>
  {/if}

  <!-- Toolbar -->
  {#if !sessionComplete}
    <div class="absolute right-6 z-40 flex gap-2" style="top: max(1.5rem, env(safe-area-inset-top))">
      <button
        type="button"
        onclick={(e) => { e.stopPropagation(); dispatch('toggleImages'); }}
        class="w-10 h-9 flex items-center justify-center text-white/30 hover:text-[#a8d8ea] text-sm transition-colors border border-white/10 rounded hover:border-[#a8d8ea]/50 bg-black/50 cursor-pointer"
        title={showImages ? 'Show Text' : 'Show Images'}>
        {showImages ? 'Aa' : '🖼️'}
      </button>
      <button
        type="button"
        onclick={(e) => { e.stopPropagation(); cycleTheme(); }}
        class="w-16 h-9 flex items-center justify-center text-white/30 hover:text-[#a8d8ea] text-xs transition-colors border border-white/10 rounded hover:border-[#a8d8ea]/50 bg-black/50 cursor-pointer"
        title="Change theme">
        Fro ↻
      </button>
      <button
        type="button"
        onclick={(e) => { e.stopPropagation(); dispatch('exit'); }}
        class="w-12 h-9 flex items-center justify-center text-white/30 hover:text-[#a8d8ea] text-xs transition-colors border border-white/10 rounded hover:border-[#a8d8ea]/50 bg-black/50 cursor-pointer">
        Exit
      </button>
    </div>
  {/if}

  <!-- Progress indicator -->
  <div class="fixed bottom-8 left-1/2 -translate-x-1/2 font-hand">
    <span class="text-sm text-white/25">
      {masteredCount}/{words.length} clear
    </span>
  </div>

  <!-- Time display -->
  <div class="absolute top-4 left-4 text-white/10 text-xs font-hand">
    4:00 AM
  </div>
</div>

<style>
  /* Frost breath pulse animation - gentle breathing like fog on cold glass */
  @keyframes frost-breath {
    0%, 100% {
      transform: translate(-50%, -50%) scale(1);
      opacity: 0.9;
    }
    50% {
      transform: translate(-50%, -50%) scale(1.02);
      opacity: 1;
    }
  }

  /* Ice shimmer effect */
  @keyframes frost-shimmer {
    0%, 100% {
      filter: drop-shadow(0 0 5px rgba(168, 216, 234, 0));
    }
    50% {
      filter: drop-shadow(0 0 8px rgba(168, 216, 234, 0.4));
    }
  }

  /* Apply to floating cards */
  .frost-floating-card {
    animation:
      frost-breath 4s ease-in-out infinite,
      frost-shimmer 3s ease-in-out infinite;
    animation-delay: var(--delay, 0s);
  }

  /* Mastered cards get stronger crystallization on hover */
  .frost-mastered:hover {
    filter: drop-shadow(0 0 15px rgba(168, 216, 234, 0.6)) drop-shadow(0 0 25px rgba(168, 216, 234, 0.3)) !important;
  }

  /* "I knew it" crystallization effect - ice flash + glow */
  .frost-just-known {
    animation: frost-crystallize 1.2s ease-out forwards !important;
    z-index: 100;
  }

  @keyframes frost-crystallize {
    0% {
      filter: brightness(1) drop-shadow(0 0 0 rgba(168, 216, 234, 0));
      transform: translate(-50%, -50%) scale(1);
    }
    15% {
      filter: brightness(2.5) drop-shadow(0 0 30px rgba(168, 216, 234, 1)) drop-shadow(0 0 60px rgba(255, 255, 255, 0.8));
      transform: translate(-50%, -50%) scale(1.15);
    }
    40% {
      filter: brightness(1.8) drop-shadow(0 0 25px rgba(168, 216, 234, 0.9)) drop-shadow(0 0 50px rgba(200, 230, 255, 0.6));
      transform: translate(-50%, -50%) scale(1.1);
    }
    100% {
      filter: brightness(1) drop-shadow(0 0 15px rgba(168, 216, 234, 0.5));
      transform: translate(-50%, -50%) scale(1);
    }
  }

  /* Existing animations from app.css that may be missing */
  .animate-breath-fade {
    animation: breath-fade 2s ease-out forwards;
  }

  @keyframes breath-fade {
    0% {
      opacity: 0.5;
      transform: translate(-50%, -50%) scale(0.5);
    }
    100% {
      opacity: 0;
      transform: translate(-50%, -50%) scale(1.5);
    }
  }

  .animate-fog-return {
    animation: fog-return 1.5s ease-out;
    /* No 'forwards' - let it return to normal animation state after */
  }

  @keyframes fog-return {
    0% {
      opacity: 1;
      filter: blur(0.5px);
    }
    30% {
      opacity: 0;
      filter: blur(15px);
      transform: translate(-50%, -50%) scale(0.8);
    }
    60% {
      opacity: 0;
      filter: blur(10px);
    }
    100% {
      opacity: 1;
      filter: blur(0.5px);
      transform: translate(-50%, -50%) scale(1);
    }
  }

  .animate-frost-appear {
    animation: frost-appear 0.5s ease-out forwards;
  }

  @keyframes frost-appear {
    0% {
      opacity: 0;
      transform: scale(0);
    }
    100% {
      opacity: 1;
      transform: scale(1);
    }
  }

  /* Snowflake falling animation */
  .snowflake {
    position: absolute;
    color: rgba(168, 216, 234, 0.8);
    font-size: 16px;
    pointer-events: none;
    animation: snowfall 2s ease-out forwards;
    text-shadow: 0 0 5px rgba(168, 216, 234, 0.5);
  }

  @keyframes snowfall {
    0% {
      opacity: 1;
      transform: translateY(0) rotate(0deg);
    }
    100% {
      opacity: 0;
      transform: translateY(180px) rotate(180deg);
    }
  }

  /* Card text containment for long phrases */
  .frost-card-text {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    max-width: min(200px, 55vw);
    padding: 0.5rem 0.75rem;
    background: rgba(168, 216, 234, 0.1);
    border: 1px solid rgba(168, 216, 234, 0.25);
    border-radius: 8px;

    /* Text containment - only break on word boundaries, not mid-word */
    white-space: nowrap;
    text-align: center;

    /* Readable font size */
    line-height: 1.3;
    font-size: clamp(0.85rem, 3.5vw, 1.3rem);

    /* Touch target */
    min-height: 44px;
    min-width: 60px;
  }

  .frost-card-text:hover {
    background: rgba(168, 216, 234, 0.15);
    border-color: rgba(168, 216, 234, 0.4);
  }

  /* Mastered frost cards - crystal clear with ice glow */
  .frost-mastered .frost-card-text {
    background: rgba(168, 216, 234, 0.2);
    border-color: rgba(168, 216, 234, 0.6);
    animation: frost-mastered-shimmer 3s ease-in-out infinite;
  }

  @keyframes frost-mastered-shimmer {
    0%, 100% {
      box-shadow: 0 0 15px rgba(168, 216, 234, 0.3), inset 0 0 10px rgba(255, 255, 255, 0.1);
    }
    50% {
      box-shadow: 0 0 25px rgba(168, 216, 234, 0.5), inset 0 0 15px rgba(255, 255, 255, 0.2);
    }
  }

  @media (max-width: 768px) {
    .frost-card-text {
      max-width: min(180px, 50vw);
      font-size: 0.95rem;
      padding: 0.5rem 0.8rem;
      line-height: 1.3;
      min-height: 44px;
    }
  }

  /* Very small screens */
  @media (max-width: 400px) {
    .frost-card-text {
      max-width: min(160px, 45vw);
      font-size: 0.9rem;
      padding: 0.4rem 0.7rem;
    }
  }

  /* Frost Hue Variations - Ice blue palette */
  .frost-hue-0 {
    border-color: rgba(168, 216, 234, 0.3); /* Classic frost */
    background: rgba(168, 216, 234, 0.12);
  }
  .frost-hue-1 {
    border-color: rgba(180, 230, 250, 0.3); /* Light ice */
    background: rgba(180, 230, 250, 0.12);
  }
  .frost-hue-2 {
    border-color: rgba(150, 200, 220, 0.3); /* Deep winter */
    background: rgba(150, 200, 220, 0.12);
  }
  .frost-hue-3 {
    border-color: rgba(190, 220, 240, 0.3); /* Crystal blue */
    background: rgba(190, 220, 240, 0.12);
  }
  .frost-hue-4 {
    border-color: rgba(160, 210, 230, 0.3); /* Glacier */
    background: rgba(160, 210, 230, 0.12);
  }
</style>
