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

    // Accumulate placed words to prevent overlap
    const placedWords: { x: number; y: number; headword: string }[] = [];
    words = queue.map((card) => {
      const pos = findSafeSpot(placedWords, card.headword);
      placedWords.push({ x: pos.x, y: pos.y, headword: card.headword });
      return {
        ...card,
        x: pos.x,
        y: pos.y,
        drift: Math.random() * Math.PI * 2,
        mastered: card.mastered || false, // Preserve mastered state from parent
        burning: false
      };
    });

    for (let i = 0; i < 150; i++) spawnEmber();
    loop();

    return () => {
      cancelAnimationFrame(animationFrame);
      if (audioCtx && audioCtx.state !== 'closed') audioCtx.close();
    };
  });

  function findSafeSpot(
    currentWords: { x: number; y: number; headword?: string }[],
    newHeadword?: string,
    avoidX?: number,
    avoidY?: number
  ) {
    let safe = false;
    let x = 0, y = 0;
    let attempts = 0;

    // Calculate spacing based on word length
    const newWordLen = newHeadword?.length || 8;
    const baseHorizontalSpacing = 12;
    const charWidth = 1.2;

    while (!safe && attempts < 200) {
      x = 8 + Math.random() * 84;
      y = 12 + Math.random() * 76;

      // Check collision with all existing words
      const hasCollision = currentWords.some(w => {
        const existingWordLen = w.headword?.length || 8;
        const requiredHSpacing = baseHorizontalSpacing + ((newWordLen + existingWordLen) / 2) * charWidth;
        const requiredVSpacing = 8;

        const hDist = Math.abs(w.x - x);
        const vDist = Math.abs(w.y - y);

        return hDist < requiredHSpacing && vDist < requiredVSpacing;
      });

      // Check distance from Old Spot (for teleporting on fail)
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
      const gridCols = 4;
      const gridRows = 5;
      const cellWidth = 80 / gridCols;
      const cellHeight = 70 / gridRows;
      const index = currentWords.length % (gridCols * gridRows);
      const col = index % gridCols;
      const row = Math.floor(index / gridCols);
      x = 10 + col * cellWidth + cellWidth / 2 + (Math.random() - 0.5) * 5;
      y = 15 + row * cellHeight + cellHeight / 2 + (Math.random() - 0.5) * 5;
    }

    return { x, y };
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
    words = words.map(w => {
      if (w.mastered) return w;
      return {
        ...w,
        x: w.x + Math.sin(w.drift) * 0.02,
        y: w.y + Math.cos(w.drift) * 0.01,
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
  class="fixed inset-0 bg-[#050505] overflow-hidden font-ember text-gray-300 cursor-crosshair select-none"
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
  {#each words as w (w.id)}
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
        <span class="transition-[color,text-shadow] duration-1000
                     {w.mastered ? 'text-yellow-400 drop-shadow-[0_0_15px_rgba(255,215,0,0.8)] scale-110' : 'text-white/20 hover:text-orange-200 hover:scale-110'}"
              style="font-size: {w.mastered ? '2rem' : '1.5rem'};">
          {w.headword}
        </span>
      {/if}
    </div>
  {/each}

  <!-- Session Complete Overlay -->
  {#if sessionComplete}
    <div class="absolute inset-0 flex items-center justify-center z-40 pointer-events-none" transition:fade>
      <div class="text-center pointer-events-auto">
        <h1 class="text-6xl text-yellow-500 font-ember tracking-widest mb-4 drop-shadow-[0_0_20px_gold] animate-pulse">GARDEN COMPLETE</h1>
        <p class="text-orange-300/70 text-xl mb-8 font-light">All embers now burn eternal.</p>
        <button
          onclick={() => dispatch('complete')}
          class="px-8 py-3 border border-yellow-600/50 text-yellow-500 hover:bg-yellow-900/30 rounded transition-all uppercase tracking-widest text-sm cursor-pointer">
          Return to Hub
        </button>
      </div>
    </div>
  {/if}

  <!-- Toolbar (Hidden if complete) -->
  {#if !sessionComplete}
    <div class="absolute top-6 right-6 z-40 flex gap-2">
      <button
        type="button"
        onclick={(e) => { e.stopPropagation(); dispatch('toggleImages'); }}
        class="text-orange-900 hover:text-orange-500 text-xs tracking-widest transition-colors uppercase border border-orange-900/30 px-3 py-2 rounded hover:border-orange-500 bg-black/50 cursor-pointer"
        title={showImages ? 'Show Text' : 'Show Images'}>
        {showImages ? 'Aa' : '🖼️'}
      </button>
      <button
        type="button"
        onclick={(e) => { e.stopPropagation(); cycleTheme(); }}
        class="text-orange-900 hover:text-orange-500 text-xs tracking-widest transition-colors uppercase border border-orange-900/30 px-3 py-2 rounded hover:border-orange-500 bg-black/50 cursor-pointer"
        title="Change theme">
        EMBER ↻
      </button>
      <button
        type="button"
        onclick={(e) => { e.stopPropagation(); dispatch('exit'); }}
        class="text-orange-900 hover:text-orange-500 text-xs tracking-widest transition-colors uppercase border border-orange-900/30 px-4 py-2 rounded hover:border-orange-500 bg-black/50 cursor-pointer">
        Exit Garden
      </button>
    </div>
  {/if}

  <!-- Modal -->
  {#if revealedWord}
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-[2px]" transition:fade>
      <div class="bg-gradient-to-b from-[#121212] to-black border border-orange-900/40 p-12 rounded-xl max-w-lg w-full text-center shadow-[0_0_100px_rgba(255,69,0,0.15)] relative" transition:scale>

        <!-- Close Button -->
        <button class="absolute top-4 right-4 text-gray-600 cursor-pointer hover:text-white bg-transparent border-none text-xl" onclick={() => revealedWord = null}>✕</button>

        <!-- German Gloss -->
        {#if revealedWord.gloss_de}
          <div class="text-orange-500 text-lg font-serif mb-2 text-center">{revealedWord.gloss_de}</div>
        {/if}

        <!-- Headword (Click to hear - hover shows speaker) -->
        <button
          onclick={() => speak(revealedWord.headword)}
          class="text-5xl md:text-6xl text-orange-100 font-ember tracking-wider drop-shadow-[0_0_15px_rgba(255,100,0,0.4)] cursor-pointer hover:scale-105 transition-transform bg-transparent border-none tts-speakable mb-3">
          {revealedWord.headword}
        </button>

        {#if revealedWord.ipa}
          <!-- Use font-sans for IPA legibility -->
          <p class="text-orange-500/50 text-sm mb-8 font-sans tracking-widest text-center">/{revealedWord.ipa}/</p>
        {/if}

        <p class="text-2xl text-gray-200 mb-10 leading-relaxed font-light font-ember">{revealedWord.definition}</p>

        {#if getCardImageUrl(revealedWord) && !revealedWord.imageFailed}
          <div class="mb-6 flex justify-center">
            <img
              src={getCardImageUrl(revealedWord)}
              alt={revealedWord.headword}
              class="max-w-[160px] max-h-[160px] rounded-lg border border-orange-900/30 opacity-80 hover:opacity-100 transition-opacity"
              onerror={() => { words = words.map(word => word.id === revealedWord.id ? { ...word, imageFailed: true } : word); revealedWord = { ...revealedWord, imageFailed: true }; }}
            />
          </div>
        {/if}

        <!-- RICH DATA BLOCK -->
        <div class="border-t border-orange-900/30 pt-6 mb-8 text-center space-y-5">

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

        <!-- Controls -->
        <div class="flex gap-6 justify-center mt-4">
          <button onclick={() => handleDecision('pass')}
            class="px-10 py-4 bg-yellow-900/10 border border-yellow-600/30 text-yellow-500 hover:bg-yellow-500/20 hover:border-yellow-500 rounded-lg transition-all tracking-widest uppercase text-sm shadow-[0_0_20px_rgba(255,215,0,0.05)] cursor-pointer">
            I knew it
          </button>
          <button onclick={() => handleDecision('fail')}
            class="px-10 py-4 bg-orange-900/10 border border-orange-600/30 text-orange-500 hover:bg-orange-500/20 hover:border-orange-500 rounded-lg transition-all tracking-widest uppercase text-sm shadow-[0_0_20px_rgba(255,69,0,0.05)] cursor-pointer">
            Show again
          </button>
        </div>

      </div>
    </div>
  {/if}
</div>
