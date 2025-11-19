<script lang="ts">
  import { onMount, createEventDispatcher } from 'svelte';
  import { fade, scale } from 'svelte/transition';

  export let queue: any[] = [];
  const dispatch = createEventDispatcher();

  // State
  let words: any[] = [];
  let embers: any[] = [];
  let revealedWord: any = null;
  let audioCtx: AudioContext;
  let animationFrame: number;

  // Progression
  $: masteredCount = words.filter(w => w.mastered).length;
  $: warmth = (masteredCount / (words.length || 1)) * 100;

  onMount(() => {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();

    // Init Words with Collision Check
    words = queue.map((card) => {
      const pos = findSafeSpot([]);
      return {
        ...card,
        x: pos.x,
        y: pos.y,
        drift: Math.random() * Math.PI * 2,
        mastered: false,
        burning: false
      };
    });

    // Init Embers (More of them!)
    for (let i = 0; i < 80; i++) spawnEmber();

    loop();

    return () => {
      cancelAnimationFrame(animationFrame);
      if (audioCtx && audioCtx.state !== 'closed') audioCtx.close();
    };
  });

  function findSafeSpot(currentWords: any[]) {
    let safe = false;
    let x = 0, y = 0;
    let attempts = 0;
    while (!safe && attempts < 100) {
      x = 10 + Math.random() * 80; // Keep within 10-90%
      y = 10 + Math.random() * 70; // Keep within 10-80%

      // Simple distance check
      const tooClose = currentWords.some(w => Math.abs(w.x - x) < 15 && Math.abs(w.y - y) < 10);
      if (!tooClose) safe = true;
      attempts++;
    }
    return { x, y };
  }

  function spawnEmber(golden = false, x?: number, y?: number) {
    embers.push({
      id: Math.random(),
      x: x !== undefined ? x : Math.random() * 100,
      y: y !== undefined ? y : Math.random() * 100 + 20, // Start lower
      size: 1 + Math.random() * 3,
      speed: 0.02 + Math.random() * 0.05,
      brightness: golden ? 1 : (0.2 + Math.random() * 0.5),
      phase: Math.random() * Math.PI * 2,
      golden
    });
  }

  function handleBackgroundClick(e: MouseEvent) {
    // Interaction: Spawn gold embers on click
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    playSound('solidify'); // Subtle feedback
    for(let i=0; i<5; i++) spawnEmber(true, x, y);
  }

  function loop() {
    // 1. Animate Words
    words = words.map(w => {
      if (w.mastered) return w; // Frozen
      return {
        ...w,
        x: w.x + Math.sin(w.drift) * 0.02,
        y: w.y + Math.cos(w.drift) * 0.01,
        drift: w.drift + 0.005
      };
    });

    // 2. Animate Embers
    embers = embers.map(e => ({
      ...e,
      y: e.y - e.speed,
      x: e.x + Math.sin(e.phase) * 0.02,
      phase: e.phase + 0.02,
      brightness: e.brightness + Math.sin(e.phase * 2) * 0.05
    })).filter(e => e.y > -10);

    if (embers.length < 80) spawnEmber(); // Maintain high density

    animationFrame = requestAnimationFrame(loop);
  }

  // Audio Engine (Preserved)
  function playSound(type: 'hover' | 'reveal' | 'solidify' | 'burn') {
    if (!audioCtx) return;
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const t = audioCtx.currentTime;

    if (type === 'hover') {
      const osc = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      osc.frequency.setValueAtTime(220, t);
      g.gain.setValueAtTime(0.05, t);
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
       // Warm Chord
       [220, 277, 330, 440].forEach((f, i) => {
        const osc = audioCtx.createOscillator();
        const g = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.value = f;
        g.gain.setValueAtTime(0.05, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 2);
        osc.connect(g).connect(audioCtx.destination);
        osc.start(t + i * 0.05); osc.stop(t + 2);
      });
    } else if (type === 'burn') {
      const osc = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(150, t);
      osc.frequency.exponentialRampToValueAtTime(10, t + 0.8);
      g.gain.setValueAtTime(0.2, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.8);
      osc.connect(g).connect(audioCtx.destination);
      osc.start(); osc.stop(t + 0.8);
    }
  }

  function handleSelect(word: any, e: MouseEvent) {
    e.stopPropagation(); // Prevent background click
    if (word.mastered || word.burning) return;
    playSound('reveal');
    revealedWord = word;
  }

  function handleDecision(rating: 'pass' | 'fail') {
    if (!revealedWord) return;

    if (rating === 'pass') {
      playSound('solidify');
      words = words.map(w => w.id === revealedWord.id ? { ...w, mastered: true } : w);
      for(let i=0; i<15; i++) spawnEmber(true, revealedWord.x, revealedWord.y);
    } else {
      playSound('burn');
      // 1. Burn Animation
      words = words.map(w => w.id === revealedWord.id ? { ...w, burning: true } : w);

      // 2. Respawn Logic (Wait 1s then move)
      setTimeout(() => {
        const newPos = findSafeSpot(words);
        words = words.map(w => w.id === revealedWord.id ? {
          ...w,
          burning: false,
          x: newPos.x,
          y: newPos.y
        } : w);
      }, 1200);
    }

    dispatch('grade', { id: revealedWord.id, rating });
    revealedWord = null;
  }
</script>

<!-- CONTAINER -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  class="fixed inset-0 bg-[#050505] overflow-hidden font-ember text-gray-300 cursor-crosshair"
  onclick={handleBackgroundClick}
>

  <!-- Dynamic Warmth Gradient -->
  <div
    class="absolute bottom-0 left-0 right-0 transition-all duration-1000 pointer-events-none"
    style="
      height: {Math.max(10, warmth)}%;
      opacity: {0.2 + (warmth/200)};
      background: linear-gradient(to top, rgba(255,69,0,0.6), transparent);
      filter: blur(20px);
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
      class="absolute transform -translate-x-1/2 -translate-y-1/2 transition-all duration-1000 select-none cursor-pointer
             {w.mastered ? 'text-yellow-400 drop-shadow-[0_0_15px_rgba(255,215,0,0.8)] scale-110' : 'text-gray-500 hover:text-orange-200'}
             {w.burning ? 'opacity-0 scale-150 blur-md' : 'opacity-100'}"
      style="left: {w.x}%; top: {w.y}%; font-size: {w.mastered ? '2rem' : '1.5rem'};"
      onmouseenter={() => playSound('hover')}
      onclick={(e) => handleSelect(w, e)}
    >
      {w.headword}
    </div>
  {/each}

  <!-- Session Stats (Bottom Left) -->
  <div class="absolute bottom-6 left-6 text-orange-900/50 text-xs font-mono pointer-events-none">
    WARMTH: {Math.round(warmth)}% // EMBERS: {embers.length}
  </div>

  <!-- Exit Button (Top Right) -->
  <div class="absolute top-6 right-6 z-40">
     <button
       onclick={(e) => { e.stopPropagation(); dispatch('exit'); }}
       class="text-orange-900 hover:text-orange-500 text-xs tracking-widest transition-colors uppercase border border-orange-900/30 px-3 py-1 rounded hover:border-orange-500">
       Exit Garden
     </button>
  </div>

  <!-- Modal -->
  {#if revealedWord}
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-[2px]" transition:fade>
      <div class="bg-gradient-to-b from-[#1a1a1a] to-black border border-orange-900/30 p-10 rounded-xl max-w-md w-full text-center shadow-[0_0_100px_rgba(255,69,0,0.15)]" transition:scale>

        <h2 class="text-5xl text-orange-100 mb-2 font-ember tracking-wider drop-shadow-[0_0_10px_rgba(255,100,0,0.5)]">{revealedWord.headword}</h2>
        <p class="text-orange-900/50 text-sm mb-8 font-mono uppercase tracking-[0.3em]">/{revealedWord.ipa || ''}/</p>

        <p class="text-2xl text-gray-300 mb-10 leading-relaxed font-light">{revealedWord.definition}</p>

        <div class="flex gap-6 justify-center">
          <button onclick={() => handleDecision('pass')}
            class="px-8 py-4 bg-yellow-900/10 border border-yellow-600/30 text-yellow-500 hover:bg-yellow-500/20 hover:border-yellow-500 rounded-lg transition-all tracking-widest uppercase text-sm shadow-[0_0_20px_rgba(255,215,0,0.05)]">
            I knew it
          </button>
          <button onclick={() => handleDecision('fail')}
            class="px-8 py-4 bg-orange-900/10 border border-orange-600/30 text-orange-500 hover:bg-orange-500/20 hover:border-orange-500 rounded-lg transition-all tracking-widest uppercase text-sm shadow-[0_0_20px_rgba(255,69,0,0.05)]">
            Show again
          </button>
        </div>
      </div>
    </div>
  {/if}
</div>
