<script lang="ts">
  import { onMount, onDestroy, createEventDispatcher } from 'svelte';
  import { fade, scale } from 'svelte/transition';

  export let queue: any[] = [];
  const dispatch = createEventDispatcher();

  // State
  let words: any[] = [];
  let embers: any[] = [];
  let revealedWord: any = null;
  let audioCtx: AudioContext;
  let animationFrame: number;
  let warmth = 0;

  onMount(() => {
    // Init Audio
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();

    // Init Words (Physics State)
    words = queue.map((card) => ({
      ...card,
      x: 15 + Math.random() * 70,
      y: 15 + Math.random() * 60,
      drift: Math.random() * Math.PI * 2,
      mastered: false,
      burning: false
    }));

    // Init Embers
    for (let i = 0; i < 50; i++) spawnEmber();

    // Start Loop
    loop();

    return () => {
      cancelAnimationFrame(animationFrame);
      if (audioCtx) audioCtx.close();
    };
  });

  onDestroy(() => {
    if (animationFrame) cancelAnimationFrame(animationFrame);
    if (audioCtx) audioCtx.close();
  });

  function spawnEmber(golden = false, x = 0, y = 0) {
    embers.push({
      id: Math.random(),
      x: x || Math.random() * 100,
      y: y || Math.random() * 100,
      size: 1 + Math.random() * 3,
      speed: 0.02 + Math.random() * 0.03,
      brightness: 0.2 + Math.random() * 0.3,
      phase: Math.random() * Math.PI * 2,
      golden
    });
  }

  function loop() {
    // 1. Animate Words
    words = words.map(w => ({
      ...w,
      x: w.x + Math.sin(w.drift) * 0.02,
      y: w.y + Math.cos(w.drift) * 0.01,
      drift: w.drift + 0.005
    }));

    // 2. Animate Embers
    embers = embers.map(e => ({
      ...e,
      y: e.y - e.speed,
      x: e.x + Math.sin(e.phase) * 0.02,
      phase: e.phase + 0.02,
      brightness: e.brightness + Math.sin(e.phase * 2) * 0.05
    })).filter(e => e.y > -10);

    // Replenish embers
    if (embers.length < 50) spawnEmber();

    animationFrame = requestAnimationFrame(loop);
  }

  // --- AUDIO ENGINE ---
  function playSound(type: 'hover' | 'reveal' | 'solidify' | 'burn') {
    if (!audioCtx) return;
    const t = audioCtx.currentTime;

    if (type === 'hover') {
      const osc = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      osc.frequency.setValueAtTime(220, t);
      g.gain.setValueAtTime(0.05, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
      osc.connect(g).connect(audioCtx.destination);
      osc.start(); osc.stop(t + 0.3);
    }
    else if (type === 'reveal') {
      const osc = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      osc.frequency.setValueAtTime(440, t);
      g.gain.setValueAtTime(0.1, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
      osc.connect(g).connect(audioCtx.destination);
      osc.start(); osc.stop(t + 0.5);
    }
    else if (type === 'solidify') {
      [220, 330, 440].forEach((f, i) => {
        const osc = audioCtx.createOscillator();
        const g = audioCtx.createGain();
        osc.frequency.value = f;
        g.gain.setValueAtTime(0.08, t + i * 0.1);
        g.gain.exponentialRampToValueAtTime(0.001, t + 2);
        osc.connect(g).connect(audioCtx.destination);
        osc.start(t + i * 0.1); osc.stop(t + 2);
      });
    }
    else if (type === 'burn') {
      const osc = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(100, t);
      osc.frequency.exponentialRampToValueAtTime(10, t + 0.5);
      g.gain.setValueAtTime(0.1, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
      osc.connect(g).connect(audioCtx.destination);
      osc.start(); osc.stop(t + 0.5);
    }
  }

  function handleSelect(word: any) {
    if (word.mastered || word.burning) return;
    playSound('reveal');
    revealedWord = word;
  }

  function handleDecision(rating: 'pass' | 'fail') {
    if (!revealedWord) return;

    if (rating === 'pass') {
      playSound('solidify');
      words = words.map(w => w.id === revealedWord.id ? { ...w, mastered: true } : w);
      warmth += (100 / queue.length);
      for(let i=0; i<10; i++) spawnEmber(true, revealedWord.x, revealedWord.y);
    } else {
      playSound('burn');
      words = words.map(w => w.id === revealedWord.id ? { ...w, burning: true } : w);
      setTimeout(() => {
        words = words.map(w => w.id === revealedWord.id ? { ...w, burning: false, x: Math.random()*80+10, y: Math.random()*60+20 } : w);
      }, 1000);
    }

    dispatch('grade', { id: revealedWord.id, rating });
    revealedWord = null;
  }
</script>

<div class="fixed inset-0 bg-black overflow-hidden font-heading text-main">
  <!-- Warmth Background -->
  <div class="absolute bottom-0 left-0 right-0 transition-all duration-1000 pointer-events-none"
       style="height: {warmth}%; background: linear-gradient(to top, rgba(255,69,0,0.1), transparent);"></div>

  <!-- Embers Layer -->
  {#each embers as e (e.id)}
    <div class="absolute rounded-full {e.golden ? 'bg-main shadow-[0_0_10px_#ffd700]' : 'bg-accent shadow-[0_0_5px_#ff6b35]'}"
         style="left: {e.x}%; top: {e.y}%; width: {e.size}px; height: {e.size}px; opacity: {e.brightness};"></div>
  {/each}

  <!-- Words Layer -->
  {#each words as w (w.id)}
    <button
      type="button"
      class="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-all duration-500 hover:scale-110 bg-transparent border-none
             {w.mastered ? 'text-main drop-shadow-[0_0_10px_rgba(255,215,0,0.5)]' : 'text-dim hover:text-accent'}
             {w.burning ? 'opacity-0 scale-150 blur-sm' : ''}"
      style="left: {w.x}%; top: {w.y}%;"
      onmouseenter={() => playSound('hover')}
      onclick={() => handleSelect(w)}
      disabled={w.mastered || w.burning}
    >
      <span class="text-2xl tracking-widest">{w.headword}</span>
    </button>
  {/each}

  <!-- Modal Overlay -->
  {#if revealedWord}
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm" transition:fade>
      <div class="bg-panel border border-accent/20 p-8 rounded-lg max-w-md w-full text-center shadow-[0_0_50px_rgba(255,69,0,0.1)]" transition:scale>

        <h2 class="text-4xl text-accent mb-2 font-heading tracking-wider">{revealedWord.headword}</h2>
        <p class="text-dim text-sm mb-6 font-body">/{revealedWord.ipa || ''}/</p>

        <p class="text-xl text-main mb-4 leading-relaxed font-body">{revealedWord.definition}</p>

        {#if revealedWord.mnemonic}
          <div class="bg-dim/10 p-3 rounded border border-dim/20 text-left mb-4">
            <span class="text-[10px] uppercase text-danger font-heading block mb-1">Mnemonic</span>
            <p class="text-sm font-body text-main">{revealedWord.mnemonic}</p>
          </div>
        {/if}

        {#if revealedWord.etymology}
          <div class="text-left mb-4">
            <span class="text-[10px] uppercase text-dim font-heading">Etymology</span>
            <p class="text-xs font-body text-dim italic">{revealedWord.etymology}</p>
          </div>
        {/if}

        {#if revealedWord.example}
          <div class="text-sm text-dim border-l-2 border-danger pl-4 text-left italic mb-6">
            "{revealedWord.example}"
          </div>
        {/if}

        <div class="flex gap-4 justify-center">
          <button onclick={() => handleDecision('pass')}
            class="px-8 py-3 border border-success/30 text-success hover:bg-success/10 rounded transition-all font-heading">
            I knew it
          </button>
          <button onclick={() => handleDecision('fail')}
            class="px-8 py-3 border border-accent/30 text-accent hover:bg-accent/10 rounded transition-all font-heading">
            Show me again
          </button>
        </div>
      </div>
    </div>
  {/if}

  <!-- Exit Button -->
  <button
    onclick={() => dispatch('exit')}
    class="absolute top-4 right-4 text-dim hover:text-accent text-sm font-body z-40">
    [ Exit Garden ]
  </button>

  <!-- Progress -->
  <div class="absolute bottom-4 left-4 text-dim text-xs font-body z-40">
    {words.filter(w => w.mastered).length} / {words.length} solidified
  </div>
</div>
