<script lang="ts">
  import { onMount, createEventDispatcher } from 'svelte';
  import { fade, scale } from 'svelte/transition';
  import { speak } from '$lib/tts';

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
    mastered: boolean;
    decrypting: boolean;
    glitching: boolean;
  };

  // Pixel particle for dissolve effect
  type Pixel = {
    id: number;
    x: number;
    y: number;
    vx: number;
    vy: number;
    char: string;
    opacity: number;
    color: string;
  };

  // Data rain drop
  type DataDrop = {
    id: number;
    x: number;
    y: number;
    speed: number;
    chars: string[];
    opacity: number;
  };

  let words: WordState[] = [];
  let pixels: Pixel[] = [];
  let dataRain: DataDrop[] = [];
  let revealedWord: WordState | null = null;
  let audioCtx: AudioContext;
  let animationFrame: number;
  let sessionComplete = false;
  let scanlineOffset = 0;

  $: masteredCount = words.filter(w => w.mastered).length;

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

    // Initialize words with grid-like positions
    words = queue.map((card, i) => {
      const pos = findSafeSpot([]);
      return {
        ...card,
        x: pos.x,
        y: pos.y,
        mastered: false,
        decrypting: false,
        glitching: false
      };
    });

    // Initialize data rain
    for (let i = 0; i < 15; i++) {
      spawnDataDrop();
    }

    loop();

    return () => {
      cancelAnimationFrame(animationFrame);
      if (audioCtx && audioCtx.state !== 'closed') audioCtx.close();
    };
  });

  function findSafeSpot(currentWords: { x: number; y: number }[], avoidX?: number, avoidY?: number) {
    let safe = false;
    let x = 0, y = 0;
    let attempts = 0;
    while (!safe && attempts < 100) {
      x = 10 + Math.random() * 80;
      y = 15 + Math.random() * 70;

      const crowdCheck = currentWords.some(w => Math.abs(w.x - x) < 15 && Math.abs(w.y - y) < 12);

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

  function spawnDataDrop() {
    const chars = '01アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン'.split('');
    const dropChars: string[] = [];
    const length = 5 + Math.floor(Math.random() * 10);
    for (let i = 0; i < length; i++) {
      dropChars.push(chars[Math.floor(Math.random() * chars.length)]);
    }
    dataRain.push({
      id: Date.now() + Math.random(),
      x: Math.random() * 100,
      y: -10,
      speed: 0.3 + Math.random() * 0.5,
      chars: dropChars,
      opacity: 0.1 + Math.random() * 0.2
    });
  }

  function spawnPixels(x: number, y: number, text: string) {
    const colors = ['#00fff2', '#39ff14', '#ff0040'];
    const chars = text.split('').concat(['0', '1', '#', '@', '%', '&']);

    for (let i = 0; i < 40; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * 3;
      pixels.push({
        id: Date.now() + i,
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        char: chars[Math.floor(Math.random() * chars.length)],
        opacity: 1,
        color: colors[Math.floor(Math.random() * colors.length)]
      });
    }
  }

  function loop() {
    // Animate data rain
    dataRain = dataRain.map(drop => ({
      ...drop,
      y: drop.y + drop.speed
    })).filter(drop => drop.y < 120);

    // Spawn new drops
    if (dataRain.length < 15 && Math.random() < 0.1) {
      spawnDataDrop();
    }

    // Animate pixels
    pixels = pixels.map(p => ({
      ...p,
      x: p.x + p.vx,
      y: p.y + p.vy,
      vy: p.vy + 0.1, // gravity
      opacity: Math.max(0, p.opacity - 0.02)
    })).filter(p => p.opacity > 0);

    // Scanline animation
    scanlineOffset = (scanlineOffset + 0.5) % 100;

    animationFrame = requestAnimationFrame(loop);
  }

  function playSound(type: 'hover' | 'reveal' | 'decrypt' | 'corrupt' | 'complete') {
    if (!audioCtx) return;
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const t = audioCtx.currentTime;

    if (type === 'hover') {
      const osc = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      osc.type = 'square';
      osc.frequency.value = 800;
      g.gain.setValueAtTime(0.02, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
      osc.connect(g).connect(audioCtx.destination);
      osc.start(); osc.stop(t + 0.05);
    } else if (type === 'reveal') {
      // Digital beep sequence
      [1200, 1400, 1600].forEach((freq, i) => {
        const osc = audioCtx.createOscillator();
        const g = audioCtx.createGain();
        osc.type = 'square';
        osc.frequency.value = freq;
        g.gain.setValueAtTime(0.03, t + i * 0.05);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
        osc.connect(g).connect(audioCtx.destination);
        osc.start(t + i * 0.05); osc.stop(t + 0.2);
      });
    } else if (type === 'decrypt') {
      // Success sound - ascending digital tones
      [400, 600, 800, 1000, 1200].forEach((freq, i) => {
        const osc = audioCtx.createOscillator();
        const g = audioCtx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.value = freq;
        g.gain.setValueAtTime(0.04, t + i * 0.08);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.8);
        osc.connect(g).connect(audioCtx.destination);
        osc.start(t + i * 0.08); osc.stop(t + 0.8);
      });
    } else if (type === 'corrupt') {
      // Glitchy error sound
      const noise = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      noise.type = 'sawtooth';
      noise.frequency.setValueAtTime(200, t);
      noise.frequency.linearRampToValueAtTime(50, t + 0.3);
      g.gain.setValueAtTime(0.06, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
      noise.connect(g).connect(audioCtx.destination);
      noise.start(); noise.stop(t + 0.3);
    } else if (type === 'complete') {
      // Victory fanfare
      [523, 659, 784, 1047].forEach((f, i) => {
        const o = audioCtx.createOscillator();
        const g = audioCtx.createGain();
        o.type = 'square';
        o.frequency.value = f;
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.05, t + 0.1 + i * 0.15);
        g.gain.exponentialRampToValueAtTime(0.001, t + 2);
        o.connect(g).connect(audioCtx.destination);
        o.start(t + i * 0.15); o.stop(t + 2);
      });
    }
  }

  function handleWordClick(word: WordState, e: MouseEvent) {
    e.stopPropagation();
    if (word.decrypting || word.mastered || sessionComplete) return;
    playSound('reveal');
    revealedWord = word;
  }

  function handleDecision(rating: 'pass' | 'fail') {
    if (!revealedWord) return;
    const targetId = revealedWord.id;
    const targetWord = words.find(w => w.id === targetId);

    if (rating === 'pass') {
      playSound('decrypt');

      // Spawn pixel explosion
      if (targetWord) {
        const rect = document.querySelector('.syndicate-grid-container')?.getBoundingClientRect();
        if (rect) {
          spawnPixels(
            (targetWord.x / 100) * rect.width,
            (targetWord.y / 100) * rect.height,
            targetWord.headword
          );
        }
      }

      // Mark as decrypting, then mastered
      words = words.map(w => w.id === targetId ? { ...w, decrypting: true } : w);
      setTimeout(() => {
        words = words.map(w => w.id === targetId ? { ...w, mastered: true, decrypting: false } : w);
      }, 800);
    } else {
      playSound('corrupt');
      const oldX = targetWord?.x;
      const oldY = targetWord?.y;

      // Mark as glitching
      words = words.map(w => w.id === targetId ? { ...w, glitching: true } : w);

      setTimeout(() => {
        const others = words.filter(w => w.id !== targetId);
        const newPos = findSafeSpot(others, oldX, oldY);
        words = words.map(w => w.id === targetId ? {
          ...w,
          glitching: false,
          x: newPos.x,
          y: newPos.y
        } : w);
      }, 600);
    }

    dispatch('grade', { id: targetId, rating });
    revealedWord = null;
  }
</script>

<!-- CONTAINER -->
<div class="syndicate-grid-container fixed inset-0 bg-[#050505] overflow-hidden font-mono text-gray-400 select-none">

  <!-- Grid background -->
  <div class="absolute inset-0 opacity-10"
    style="background-image: linear-gradient(#00fff2 1px, transparent 1px), linear-gradient(90deg, #00fff2 1px, transparent 1px);
           background-size: 50px 50px;">
  </div>

  <!-- Scanlines -->
  <div class="absolute inset-0 pointer-events-none opacity-30"
    style="background: repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.3) 2px, rgba(0,0,0,0.3) 4px);">
  </div>

  <!-- Data rain -->
  {#each dataRain as drop (drop.id)}
    <div
      class="absolute text-[10px] leading-tight pointer-events-none font-mono"
      style="left: {drop.x}%; top: {drop.y}%; opacity: {drop.opacity}; color: #00fff2;">
      {#each drop.chars as char, i}
        <div style="opacity: {1 - i * 0.08};">{char}</div>
      {/each}
    </div>
  {/each}

  <!-- Pixel particles -->
  {#each pixels as p (p.id)}
    <div
      class="absolute text-xs font-mono pointer-events-none"
      style="left: {p.x}px; top: {p.y}px; opacity: {p.opacity}; color: {p.color};">
      {p.char}
    </div>
  {/each}

  <!-- Words -->
  {#each words as w, i (w.id)}
    {#if !w.mastered}
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div
        class="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer
               transition-all duration-300 text-lg md:text-2xl lg:text-3xl tracking-widest
               {w.decrypting ? 'syndicate-decrypt' : ''}
               {w.glitching ? 'syndicate-glitch' : ''}
               {!w.decrypting && !w.glitching ? 'text-[#00fff2]/60 hover:text-[#00fff2] syndicate-glow-subtle' : ''}"
        style="left: {w.x}%; top: {w.y}%;"
        onclick={(e) => handleWordClick(w, e)}>
        <span class="opacity-50">[</span>{w.headword}<span class="opacity-50">]</span>
      </div>
    {/if}
  {/each}

  <!-- Progress -->
  <div class="fixed bottom-8 left-1/2 -translate-x-1/2 font-mono">
    <span class="text-sm text-[#00fff2]/30">
      DECRYPTED: <span class="text-[#39ff14]">{masteredCount}</span>/<span class="text-[#00fff2]">{words.length}</span>
    </span>
  </div>

  <!-- Exit Button -->
  {#if !sessionComplete}
    <div class="absolute top-6 right-6 z-40">
      <button
        type="button"
        onclick={(e) => { e.stopPropagation(); dispatch('exit'); }}
        class="text-[#00fff2]/50 hover:text-[#00fff2] text-xs tracking-[0.3em] transition-colors uppercase border border-[#00fff2]/30 px-4 py-2 hover:border-[#00fff2] bg-black/50 cursor-pointer font-mono">
        [ESC] EXIT
      </button>
    </div>
  {/if}

  <!-- Session Complete Overlay -->
  {#if sessionComplete}
    <div class="absolute inset-0 flex items-center justify-center z-40 pointer-events-none" transition:fade>
      <div class="text-center pointer-events-auto">
        <h1 class="text-4xl md:text-6xl text-[#39ff14] font-mono tracking-widest mb-4 syndicate-pulse">
          [DECRYPTION COMPLETE]
        </h1>
        <p class="text-[#00fff2]/70 text-lg mb-8 font-mono">
          All data packets successfully decoded.
        </p>
        <button
          onclick={() => dispatch('complete')}
          class="px-8 py-3 border border-[#39ff14]/50 text-[#39ff14] hover:bg-[#39ff14]/20 transition-all uppercase tracking-widest text-sm font-mono cursor-pointer">
          [RETURN TO HUB]
        </button>
      </div>
    </div>
  {/if}

  <!-- Reveal Modal -->
  {#if revealedWord}
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/95" transition:fade>
      <div class="bg-[#0a0a0a] border border-[#00fff2]/50 p-8 md:p-12 max-w-lg w-full mx-4 relative font-mono" transition:scale>

        <!-- Close Button -->
        <button
          class="absolute top-4 right-4 text-[#00fff2]/50 cursor-pointer hover:text-[#00fff2] text-xl font-mono"
          onclick={() => revealedWord = null}>
          [X]
        </button>

        <!-- Terminal Header -->
        <div class="text-[10px] text-[#39ff14]/70 mb-4 tracking-widest">
          > DECRYPTING DATA PACKET...
        </div>

        <!-- German Gloss -->
        {#if revealedWord.gloss_de}
          <div class="text-[#ff0040]/70 text-sm mb-2"># {revealedWord.gloss_de}</div>
        {/if}

        <!-- Headword (Click to hear) -->
        <button
          onclick={() => revealedWord && speak(revealedWord.headword)}
          class="text-4xl md:text-5xl text-[#00fff2] mb-3 tracking-wider syndicate-pulse cursor-pointer hover:scale-105 transition-transform bg-transparent border-none tts-speakable">
          [{revealedWord.headword}]
        </button>

        <!-- IPA -->
        {#if revealedWord.ipa}
          <p class="text-[#39ff14]/50 text-sm mb-6 tracking-widest">/{revealedWord.ipa}/</p>
        {/if}

        <!-- Definition -->
        <p class="text-xl text-gray-300 mb-8 leading-relaxed">
          <span class="text-[#39ff14]">></span> {revealedWord.definition}
        </p>

        <!-- Rich Data Block -->
        {#if revealedWord.mnemonic || revealedWord.etymology || revealedWord.example}
          <div class="border-t border-[#00fff2]/20 pt-6 mb-6 space-y-4">

            {#if revealedWord.mnemonic}
              <div class="bg-[#0f0f0f] p-4 border-l-2 border-[#ff0040]">
                <span class="text-[10px] uppercase text-[#ff0040]/70 tracking-widest block mb-2">// MEMORY_HOOK</span>
                <p class="text-sm text-gray-400 leading-relaxed">{revealedWord.mnemonic}</p>
              </div>
            {/if}

            {#if revealedWord.etymology}
              <div>
                <span class="text-[10px] uppercase text-[#00fff2]/50 tracking-widest block mb-1">// ORIGIN</span>
                <p class="text-sm text-gray-500 italic">{revealedWord.etymology}</p>
              </div>
            {/if}

            {#if revealedWord.example}
              <div class="text-center pt-4">
                <span class="text-[10px] uppercase text-[#39ff14]/50 tracking-widest">// USAGE</span>
                <div class="text-base text-[#39ff14]/70 italic mt-2">
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
            class="px-6 py-3 bg-[#39ff14]/10 border border-[#39ff14]/50 text-[#39ff14] hover:bg-[#39ff14]/20 hover:border-[#39ff14] transition-all tracking-widest uppercase text-sm cursor-pointer">
            [DECRYPT]
          </button>
          <button
            onclick={() => handleDecision('fail')}
            class="px-6 py-3 bg-[#ff0040]/10 border border-[#ff0040]/50 text-[#ff0040] hover:bg-[#ff0040]/20 hover:border-[#ff0040] transition-all tracking-widest uppercase text-sm cursor-pointer">
            [CORRUPT]
          </button>
        </div>

      </div>
    </div>
  {/if}
</div>
