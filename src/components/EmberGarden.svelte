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

    // Init Embers (High Density)
    for (let i = 0; i < 150; i++) spawnEmber();

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
      x = 10 + Math.random() * 80;
      y = 15 + Math.random() * 70;
      // Check distance from other words
      const tooClose = currentWords.some(w => Math.abs(w.x - x) < 12 && Math.abs(w.y - y) < 8);
      if (!tooClose) safe = true;
      attempts++;
    }
    return { x, y };
  }

  function spawnEmber(golden = false, x?: number, y?: number) {
    embers.push({
      id: Math.random(),
      x: x !== undefined ? x : Math.random() * 100,
      y: y !== undefined ? y : Math.random() * 100 + 20,
      size: 1 + Math.random() * 3,
      speed: 0.01 + Math.random() * 0.04, // Slower, floatier
      brightness: golden ? 1 : (0.1 + Math.random() * 0.4),
      phase: Math.random() * Math.PI * 2,
      golden
    });
  }

  function handleBackgroundClick(e: MouseEvent) {
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    playSound('solidify');
    for(let i=0; i<8; i++) spawnEmber(true, x, y);
  }

  function loop() {
    // 1. Animate Words
    words = words.map(w => {
      if (w.mastered) return w;
      return {
        ...w,
        x: w.x + Math.sin(w.drift) * 0.02,
        y: w.y + Math.cos(w.drift) * 0.01,
        drift: w.drift + 0.005
      };
    });

    // 2. Animate Embers (Infinite Scroll)
    embers = embers.map(e => {
      let newY = e.y - e.speed;
      let newX = e.x + Math.sin(e.phase) * 0.02;

      // Wrap around logic
      if (newY < -10) {
        newY = 110;
        newX = Math.random() * 100;
      }

      return {
        ...e,
        y: newY,
        x: newX,
        phase: e.phase + 0.02,
        brightness: e.brightness + Math.sin(e.phase * 2) * 0.05
      };
    });

    animationFrame = requestAnimationFrame(loop);
  }

  // Audio
  function playSound(type: 'hover' | 'reveal' | 'solidify' | 'burn') {
    if (!audioCtx) return;
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const t = audioCtx.currentTime;
    const g = audioCtx.createGain();
    const osc = audioCtx.createOscillator();

    osc.connect(g).connect(audioCtx.destination);

    if (type === 'hover') {
      osc.frequency.setValueAtTime(220, t);
      g.gain.setValueAtTime(0.02, t); // Quieter hover
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
      osc.start(); osc.stop(t + 0.3);
    } else if (type === 'reveal') {
      osc.frequency.setValueAtTime(440, t);
      g.gain.setValueAtTime(0.1, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
      osc.start(); osc.stop(t + 0.5);
    } else if (type === 'solidify') {
       osc.disconnect();
       [220, 277, 330, 440].forEach((f, i) => {
        const o = audioCtx.createOscillator();
        const g2 = audioCtx.createGain();
        o.frequency.value = f;
        g2.gain.setValueAtTime(0.05, t);
        g2.gain.exponentialRampToValueAtTime(0.001, t + 2);
        o.connect(g2).connect(audioCtx.destination);
        o.start(t + i * 0.05); o.stop(t + 2);
      });
    } else if (type === 'burn') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(150, t);
      osc.frequency.exponentialRampToValueAtTime(10, t + 0.8);
      g.gain.setValueAtTime(0.1, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.8);
      osc.start(); osc.stop(t + 0.8);
    }
  }

  function handleSelect(word: any, e: MouseEvent) {
    e.stopPropagation();
    if (word.mastered || word.burning) return;
    playSound('reveal');
    revealedWord = word;
  }

  function handleDecision(rating: 'pass' | 'fail') {
    if (!revealedWord) return;
    const targetId = revealedWord.id;

    if (rating === 'pass') {
      playSound('solidify');
      words = words.map(w => w.id === targetId ? { ...w, mastered: true } : w);
      for(let i=0; i<15; i++) spawnEmber(true, revealedWord.x, revealedWord.y);
    } else {
      playSound('burn');
      // 1. Burn Animation
      words = words.map(w => w.id === targetId ? { ...w, burning: true } : w);

      // 2. Respawn Logic
      setTimeout(() => {
        const newPos = findSafeSpot(words);
        words = words.map(w => w.id === targetId ? {
          ...w,
          burning: false,
          x: newPos.x,
          y: newPos.y
        } : w);
      }, 1000);
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

  <!-- Dynamic Warmth Gradient -->
  <div
    class="absolute bottom-0 left-0 right-0 transition-all duration-1000 pointer-events-none"
    style="
      height: {Math.max(15, warmth)}%;
      opacity: {0.3 + (warmth/200)};
      background: linear-gradient(to top, rgba(255,69,0,0.6), transparent);
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
      class="absolute transform -translate-x-1/2 -translate-y-1/2 transition-all duration-1000 cursor-pointer
             {w.mastered ? 'text-yellow-400 drop-shadow-[0_0_15px_rgba(255,215,0,0.8)] scale-110' : 'text-white/20 hover:text-orange-200 hover:scale-110'}
             {w.burning ? 'opacity-0 scale-150 blur-md' : 'opacity-100'}"
      style="left: {w.x}%; top: {w.y}%; font-size: {w.mastered ? '2rem' : '1.5rem'};"
      onmouseenter={() => playSound('hover')}
      onclick={(e) => handleSelect(w, e)}
    >
      {w.headword}
    </div>
  {/each}

  <!-- Exit Button -->
  <div class="absolute top-6 right-6 z-40">
     <button
       onclick={(e) => { e.stopPropagation(); dispatch('exit'); }}
       class="text-orange-900 hover:text-orange-500 text-xs tracking-widest transition-colors uppercase border border-orange-900/30 px-4 py-2 rounded hover:border-orange-500 bg-black/50">
       Exit Garden
     </button>
  </div>

  <!-- Modal -->
  {#if revealedWord}
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-sm" transition:fade>
      <div class="bg-gradient-to-b from-[#121212] to-black border border-orange-900/40 p-12 rounded-xl max-w-lg w-full text-center shadow-[0_0_100px_rgba(255,69,0,0.1)] relative" transition:scale>

        <!-- Close Button -->
        <button class="absolute top-4 right-4 text-gray-600 cursor-pointer hover:text-white bg-transparent border-none text-xl" onclick={() => revealedWord = null}>✕</button>

        <h2 class="text-6xl text-orange-100 mb-3 font-ember tracking-wider drop-shadow-[0_0_15px_rgba(255,100,0,0.4)]">{revealedWord.headword}</h2>

        {#if revealedWord.ipa}
          <p class="text-orange-500/50 text-sm mb-8 font-mono uppercase tracking-[0.2em]">/{revealedWord.ipa}/</p>
        {/if}

        <p class="text-2xl text-gray-200 mb-8 leading-relaxed font-light font-ember">{revealedWord.definition}</p>

        <!-- RICH DATA BLOCK -->
        {#if revealedWord.mnemonic || revealedWord.etymology || revealedWord.example}
           <div class="border-t border-orange-900/30 pt-6 mb-8 text-left space-y-4">
              {#if revealedWord.mnemonic}
                <div class="bg-orange-900/10 p-3 rounded border border-orange-900/20 group/hint">
                   <span class="text-[10px] uppercase text-orange-500 tracking-widest block mb-1">Mnemonic</span>
                   <p class="text-sm text-gray-400 blur-[3px] group-hover/hint:blur-0 transition-all duration-500">{revealedWord.mnemonic}</p>
                </div>
              {/if}

              {#if revealedWord.etymology}
                 <div>
                    <span class="text-[10px] uppercase text-gray-600 tracking-widest">Etymology</span>
                    <p class="text-xs text-gray-500 italic">{revealedWord.etymology}</p>
                 </div>
              {/if}

              {#if revealedWord.example}
                 <div class="text-lg text-orange-200/80 italic text-center pt-2">
                    "{revealedWord.example}"
                 </div>
              {/if}
           </div>
        {/if}

        <!-- Controls -->
        <div class="flex gap-6 justify-center mt-4">
          <button onclick={() => handleDecision('pass')}
            class="px-10 py-4 bg-yellow-900/10 border border-yellow-600/30 text-yellow-500 hover:bg-yellow-500/20 hover:border-yellow-500 rounded-lg transition-all tracking-widest uppercase text-sm shadow-[0_0_20px_rgba(255,215,0,0.05)]">
            I knew it
          </button>
          <button onclick={() => handleDecision('fail')}
            class="px-10 py-4 bg-orange-900/10 border border-orange-600/30 text-orange-500 hover:bg-orange-500/20 hover:border-orange-500 rounded-lg transition-all tracking-widest uppercase text-sm shadow-[0_0_20px_rgba(255,69,0,0.05)]">
            Show again
          </button>
        </div>

      </div>
    </div>
  {/if}
</div>
