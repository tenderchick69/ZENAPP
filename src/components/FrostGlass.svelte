<script lang="ts">
  import { onMount, createEventDispatcher } from 'svelte';
  import { fade, scale } from 'svelte/transition';
  import type { Card } from '$lib/srs';

  // Svelte 5 props syntax
  let { queue = [] }: { queue?: Card[] } = $props();
  const dispatch = createEventDispatcher();

  // Word state type (Card + positioning)
  type WordState = Card & {
    x: number;
    y: number;
    rotation: number;
    attempts: number;
    mastered: boolean;
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

  // Word states
  let words: WordState[] = $state([]);
  let hoveredWord: number | null = $state(null);
  let revealedWord: WordState | null = $state(null);
  let masteredWords: number[] = $state([]);
  let fadingWords: number[] = $state([]);

  // Visual effects
  let condensation: CondensationDrop[] = $state([]);
  let breathSpots: BreathSpot[] = $state([]);
  let sessionComplete = $state(false);

  // Audio
  let audioCtx: AudioContext;

  // Derived state
  const masteredCount = $derived(masteredWords.length);
  const progressPercent = $derived((masteredCount / (words.length || 1)) * 100);

  // Generate non-overlapping positions (collision detection)
  function generateNonOverlappingPositions(
    count: number,
    existingPositions: { x: number; y: number }[] = []
  ) {
    const positions = [...existingPositions];
    const minDistance = 15; // 15% screen distance

    for (let i = positions.length; i < count; i++) {
      let attempts = 0;
      let validPosition = null;

      while (attempts < 50 && !validPosition) {
        const candidate = {
          x: 10 + Math.random() * 75,
          y: 10 + Math.random() * 70
        };

        // Check against all existing positions
        const isValid = !positions.some(pos => {
          const dx = candidate.x - pos.x;
          const dy = candidate.y - pos.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          return distance < minDistance;
        });

        if (isValid) validPosition = candidate;
        attempts++;
      }

      // Fallback if no valid position found
      positions.push(validPosition || {
        x: 10 + Math.random() * 75,
        y: 10 + Math.random() * 70
      });
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
      mastered: false
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
  function playSound(type: 'hover' | 'reveal' | 'clear' | 'fog' | 'complete') {
    if (!audioCtx) return;
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const t = audioCtx.currentTime;

    if (type === 'hover') {
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
    if (word.mastered || fadingWords.includes(word.id) || sessionComplete) return;
    playSound('reveal');
    revealedWord = word;
  }

  // Decision Handler - Pass/Fail
  function handleDecision(rating: 'pass' | 'fail') {
    if (!revealedWord) return;
    const targetId = revealedWord.id;

    if (rating === 'pass') {
      // FREEZE mechanic
      playSound('clear');
      words = words.map(w => w.id === targetId ? { ...w, mastered: true } : w);
      masteredWords = [...masteredWords, targetId];
      dispatch('grade', { id: targetId, rating });
      revealedWord = null;
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

  // Word Visual State (3 levels)
  function getWordStyle(word: any) {
    const isHovered = hoveredWord === word.id;
    const isMastered = word.mastered;

    if (isMastered) {
      // Sharp, crystal clear
      return {
        color: 'rgba(200, 230, 245, 0.85)',
        filter: 'none',
        textShadow: '0 0 8px rgba(168, 216, 234, 0.4), 0 0 2px rgba(255,255,255,0.2)'
      };
    } else if (isHovered) {
      // Readable through cleared breath
      return {
        color: 'rgba(220, 235, 245, 0.75)',
        filter: 'blur(0.3px)',
        textShadow: '0 0 6px rgba(255,255,255,0.2)'
      };
    } else {
      // Barely visible through heavy fog
      return {
        color: 'rgba(180, 200, 220, 0.12)',
        filter: 'blur(3px)',
        textShadow: '0 0 20px rgba(180,200,220,0.15)'
      };
    }
  }
</script>

<!-- CONTAINER -->
<div class="fixed inset-0 bg-gradient-to-b from-[#1a2a3a] via-[#1a2a3a] to-slate-900 overflow-hidden font-hand text-gray-300 cursor-default select-none">

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

  <!-- Words written on glass -->
  {#each words as w (w.id)}
    {@const style = getWordStyle(w)}
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      class="absolute cursor-pointer transition-[opacity,filter,color,text-shadow] duration-500 select-none font-finger text-5xl md:text-6xl lg:text-7xl tracking-wide whitespace-nowrap"
      class:animate-fog-return={fadingWords.includes(w.id)}
      style="left: {w.x}%; top: {w.y}%; transform: translate(-50%, -50%) rotate({w.rotation}deg); color: {style.color}; filter: {style.filter}; text-shadow: {style.textShadow};"
      onmouseenter={() => handleHover(w.id)}
      onmouseleave={() => hoveredWord = null}
      onclick={(e) => handleSelect(w, e)}>

      {w.headword}

      <!-- Frost Crystals for mastered words -->
      {#if w.mastered}
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
    <div class="fixed inset-0 flex items-center justify-center z-50" transition:fade>
      <!-- Backdrop -->
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div
        class="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onclick={() => revealedWord = null}>
      </div>

      <!-- Modal Content -->
      <div class="relative bg-slate-800/95 border border-[#a8d8ea]/30 p-8 rounded-lg max-w-md shadow-2xl backdrop-blur-md" transition:scale>

        <!-- Close Button -->
        <button
          class="absolute top-4 right-4 text-gray-600 cursor-pointer hover:text-white bg-transparent border-none text-xl"
          onclick={() => revealedWord = null}>✕</button>

        <!-- German Gloss -->
        {#if revealedWord.gloss_de}
          <div class="text-[#a8d8ea] text-lg font-hand mb-2">{revealedWord.gloss_de}</div>
        {/if}

        <!-- Headword -->
        <h2 class="text-5xl text-[#a8d8ea] mb-3 font-finger tracking-wider drop-shadow-[0_0_15px_rgba(168,216,234,0.3)]">
          {revealedWord.headword}
        </h2>

        <!-- IPA -->
        {#if revealedWord.ipa}
          <p class="text-[#a8d8ea]/50 text-sm mb-8 font-sans tracking-widest">/{revealedWord.ipa}/</p>
        {/if}

        <!-- Definition -->
        <p class="text-xl text-gray-300 mb-10 leading-relaxed font-light font-hand text-center">
          {revealedWord.definition}
        </p>

        <!-- Rich Data Block -->
        {#if revealedWord.mnemonic || revealedWord.etymology || revealedWord.example}
          <div class="border-t border-[#a8d8ea]/20 pt-6 mb-8 text-left space-y-6">

            {#if revealedWord.mnemonic}
              <div class="bg-[#a8d8ea]/5 p-4 rounded border border-[#a8d8ea]/10">
                <span class="text-[10px] uppercase text-[#a8d8ea]/70 tracking-widest block mb-2 font-hand">Hint</span>
                <p class="text-base text-[#a8d8ea]/80 font-hand leading-snug">{revealedWord.mnemonic}</p>
              </div>
            {/if}

            {#if revealedWord.etymology}
              <div>
                <span class="text-[10px] uppercase text-gray-600 tracking-widest block mb-1 font-hand">Etymology</span>
                <p class="text-sm text-gray-400 italic font-hand">{revealedWord.etymology}</p>
              </div>
            {/if}

            {#if revealedWord.example}
              <div class="text-center pt-4">
                <span class="text-[10px] uppercase text-[#a8d8ea]/40 tracking-[0.2em] font-hand">USAGE</span>
                <div class="text-lg text-[#a8d8ea]/60 italic mt-2 font-hand">
                  "{revealedWord.example}"
                </div>
              </div>
            {/if}
          </div>
        {/if}

        <!-- Action Buttons -->
        <div class="flex gap-4 justify-center mt-4">
          <button
            onclick={() => handleDecision('pass')}
            class="px-6 py-3 bg-[#2a4a6a]/80 hover:bg-[#2a4a6a] text-white rounded-lg transition-all font-hand text-lg cursor-pointer">
            I knew it
          </button>
          <button
            onclick={() => handleDecision('fail')}
            class="px-6 py-3 bg-[#a8d8ea]/20 hover:bg-[#a8d8ea]/30 text-[#a8d8ea] rounded-lg transition-all font-hand text-lg cursor-pointer">
            Show me again
          </button>
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
          onclick={() => dispatch('exit')}
          class="px-8 py-3 border border-[#a8d8ea]/50 text-[#a8d8ea] hover:bg-[#a8d8ea]/20 rounded transition-all uppercase tracking-widest text-sm font-hand">
          Step Away
        </button>
      </div>
    </div>
  {/if}

  <!-- Exit button -->
  {#if !sessionComplete}
    <div class="absolute top-6 right-6 z-40">
      <button
        onclick={(e) => { e.stopPropagation(); dispatch('exit'); }}
        class="text-white/30 hover:text-[#a8d8ea] text-xs tracking-widest transition-colors uppercase border border-white/10 px-4 py-2 rounded hover:border-[#a8d8ea]/50 bg-black/50 font-hand">
        Step Away
      </button>
    </div>
  {/if}

  <!-- Progress indicator -->
  <div class="absolute bottom-4 left-4 text-white/20 text-xs font-hand">
    <div>{masteredCount}/{words.length} clear</div>
  </div>

  <!-- Time display -->
  <div class="absolute top-4 left-4 text-white/10 text-xs font-hand">
    4:00 AM
  </div>
</div>
