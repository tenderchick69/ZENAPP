<script lang="ts">
  import { onMount, createEventDispatcher } from 'svelte';
  import { fade, scale } from 'svelte/transition';

  export let queue: any[] = [];
  const dispatch = createEventDispatcher();

  // Word state
  type WordState = {
    id: number;
    headword: string;
    definition: string;
    ipa?: string;
    mnemonic?: string;
    etymology?: string;
    example?: string;
    gloss_de?: string;
    x: number;
    y: number;
    drift: number;
    mastered: boolean;
    dissolving: boolean;
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

    // Initialize words with positions
    words = queue.map((card, i) => {
      const pos = findSafeSpot([]);
      return {
        ...card,
        x: pos.x,
        y: pos.y,
        drift: Math.random() * Math.PI * 2,
        mastered: false,
        dissolving: false
      };
    });

    // Start animation loop
    loop();

    // Breathing rhythm
    const breathInterval = setInterval(() => {
      breathPhase = (breathPhase + 1) % 100;
    }, 40);

    return () => {
      cancelAnimationFrame(animationFrame);
      clearInterval(breathInterval);
      if (audioCtx && audioCtx.state !== 'closed') audioCtx.close();
    };
  });

  function findSafeSpot(currentWords: { x: number; y: number }[], avoidX?: number, avoidY?: number) {
    let safe = false;
    let x = 0, y = 0;
    let attempts = 0;
    while (!safe && attempts < 100) {
      x = 15 + Math.random() * 70;
      y = 20 + Math.random() * 60;

      const crowdCheck = currentWords.some(w => Math.abs(w.x - x) < 15 && Math.abs(w.y - y) < 10);

      let selfCheck = false;
      if (avoidX !== undefined && avoidY !== undefined) {
        const dist = Math.sqrt(Math.pow(x - avoidX, 2) + Math.pow(y - avoidY, 2));
        if (dist < 25) selfCheck = true;
      }

      if (!crowdCheck && !selfCheck) safe = true;
      attempts++;
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

  function playSound(type: 'hover' | 'reveal' | 'dissolve' | 'fog' | 'complete') {
    if (!audioCtx) return;
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const t = audioCtx.currentTime;

    if (type === 'hover') {
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

      // Mark as dissolving temporarily
      words = words.map(w => w.id === targetId ? { ...w, dissolving: true } : w);

      setTimeout(() => {
        const others = words.filter(w => w.id !== targetId);
        const newPos = findSafeSpot(others, oldX, oldY);
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
<div class="zen-void-container fixed inset-0 bg-black overflow-hidden font-void text-gray-400 select-none">

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

  <!-- Words -->
  {#each words as w, i (w.id)}
    {#if !w.mastered}
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div
        class="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer
               transition-all duration-700 text-4xl md:text-5xl lg:text-6xl tracking-wider font-light
               {w.dissolving ? 'opacity-0 scale-75' : 'opacity-100'}
               {i === currentIndex && !w.dissolving ? 'zen-living-gradient' : 'text-[#1a1a1a] hover:text-[#333]'}"
        style="left: {w.x}%; top: {w.y}%; transform: translate(-50%, -50%) translateY({Math.sin(w.drift) * 8}px);"
        onclick={(e) => handleWordClick(w, e)}>
        {w.headword}
      </div>
    {/if}
  {/each}

  <!-- Progress -->
  <div class="fixed bottom-8 left-1/2 -translate-x-1/2">
    <span class="text-sm animate-void-breathe-text" style="color: #1a1a1a;">
      {masteredCount}/{words.length}
    </span>
  </div>

  <!-- Exit Button -->
  {#if !sessionComplete}
    <div class="absolute top-6 right-6 z-40">
      <button
        onclick={(e) => { e.stopPropagation(); dispatch('exit'); }}
        class="text-[#222] hover:text-[#444] text-xs tracking-[0.3em] transition-colors uppercase border border-[#1a1a1a] px-4 py-2 rounded hover:border-[#333] bg-black/50 cursor-pointer">
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
          onclick={() => dispatch('exit')}
          class="px-8 py-3 border border-[#333] text-[#444] hover:text-[#666] hover:border-[#444] rounded transition-all uppercase tracking-[0.3em] text-sm">
          Return
        </button>
      </div>
    </div>
  {/if}

  <!-- Reveal Modal -->
  {#if revealedWord}
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/95" transition:fade>
      <div class="bg-[#080808] border border-[#222] p-10 md:p-14 rounded-lg max-w-lg w-full mx-4 text-center relative" transition:scale>

        <!-- Close Button -->
        <button
          class="absolute top-4 right-4 text-[#333] cursor-pointer hover:text-[#666] bg-transparent border-none text-xl"
          onclick={() => revealedWord = null}>
          +
        </button>

        <!-- German Gloss -->
        {#if revealedWord.gloss_de}
          <div class="text-[#444] text-base mb-2 tracking-wide">{revealedWord.gloss_de}</div>
        {/if}

        <!-- Headword -->
        <h2 class="text-5xl md:text-6xl zen-living-gradient mb-3 font-light tracking-wider">
          {revealedWord.headword}
        </h2>

        <!-- IPA -->
        {#if revealedWord.ipa}
          <p class="text-[#333] text-sm mb-8 font-sans tracking-widest">/{revealedWord.ipa}/</p>
        {/if}

        <!-- Definition -->
        <p class="text-xl md:text-2xl text-[#555] mb-10 leading-relaxed font-light">
          {revealedWord.definition}
        </p>

        <!-- Rich Data Block -->
        {#if revealedWord.mnemonic || revealedWord.etymology || revealedWord.example}
          <div class="border-t border-[#1a1a1a] pt-6 mb-8 text-left space-y-5">

            {#if revealedWord.mnemonic}
              <div class="bg-[#111] p-4 rounded border border-[#1a1a1a]">
                <span class="text-[10px] uppercase text-[#444] tracking-[0.2em] block mb-2">Mnemonic</span>
                <p class="text-sm text-[#666] leading-relaxed">{revealedWord.mnemonic}</p>
              </div>
            {/if}

            {#if revealedWord.etymology}
              <div>
                <span class="text-[10px] uppercase text-[#333] tracking-[0.2em] block mb-1">Etymology</span>
                <p class="text-sm text-[#444] italic">{revealedWord.etymology}</p>
              </div>
            {/if}

            {#if revealedWord.example}
              <div class="text-center pt-4">
                <span class="text-[10px] uppercase text-[#222] tracking-[0.2em]">Usage</span>
                <div class="text-base text-[#444] italic mt-2">
                  "{revealedWord.example}"
                </div>
              </div>
            {/if}
          </div>
        {/if}

        <!-- Controls -->
        <div class="flex gap-4 justify-center mt-6">
          <button
            onclick={() => handleDecision('pass')}
            class="px-8 py-3 bg-[#111] border border-[#333] text-[#666] hover:text-[#999] hover:border-[#444] rounded transition-all tracking-[0.2em] uppercase text-sm cursor-pointer">
            I knew it
          </button>
          <button
            onclick={() => handleDecision('fail')}
            class="px-8 py-3 bg-[#111] border border-[#222] text-[#444] hover:text-[#666] hover:border-[#333] rounded transition-all tracking-[0.2em] uppercase text-sm cursor-pointer">
            Show again
          </button>
        </div>

      </div>
    </div>
  {/if}
</div>
