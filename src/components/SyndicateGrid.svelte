<script lang="ts">
  import { onMount, createEventDispatcher } from 'svelte';
  import { fade, scale } from 'svelte/transition';
  import { speak } from '$lib/tts';
  import { theme } from '$lib/theme';

  export let queue: any[] = [];
  export let showImages: boolean = false;
  const dispatch = createEventDispatcher();

  // Theme cycling
  const themeOrder = ['syndicate', 'ember', 'frost', 'zen'] as const;
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
    mastered: boolean;
    decrypting: boolean;
    glitching: boolean;
    imageFailed?: boolean;
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

  // Grid glitch burst on click
  type GlitchBurst = {
    id: number;
    x: number;
    y: number;
  };

  let words: WordState[] = [];
  let pixels: Pixel[] = [];
  let dataRain: DataDrop[] = [];
  let glitchBursts: GlitchBurst[] = [];
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

    // Generate all positions at once using adaptive density algorithm
    const positions = generateNonOverlappingPositions(queue.length);
    words = queue.map((card, i) => ({
      ...card,
      x: positions[i].x,
      y: positions[i].y,
      mastered: card.mastered || false,
      decrypting: false,
      glitching: false
    }));

    // Initialize data rain - more visible matrix effect
    for (let i = 0; i < 25; i++) {
      spawnDataDrop();
    }

    loop();

    return () => {
      // Close any open modals
      revealedWord = null;
      cancelAnimationFrame(animationFrame);
      if (audioCtx && audioCtx.state !== 'closed') audioCtx.close();
    };
  });

  // Generate non-overlapping positions with ADAPTIVE DENSITY
  // MOBILE: Always use grid layout (cards are too wide for random positioning)
  // DESKTOP: Random for ≤15, grid for 16+
  function generateNonOverlappingPositions(count: number, existingPositions: { x: number; y: number; headword?: string }[] = []) {
    const positions: { x: number; y: number }[] = [];
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

    // Positioning bounds
    const minX = isMobile ? 15 : 10;
    const maxXRange = isMobile ? 70 : 80;
    const minY = isMobile ? 12 : 12;
    const maxYRange = isMobile ? 76 : 76;

    // MOBILE: Always use grid - cards are ~50vw wide, random positioning causes overlap
    // DESKTOP: Use grid only for 16+ words
    const useGridLayout = isMobile || count > 15;

    if (useGridLayout) {
      // GRID LAYOUT - guaranteed no overlap
      // Mobile: 3 columns max (cards are wide), Desktop: 5 columns
      const cols = isMobile ? 3 : 5;
      const rows = Math.ceil(count / cols);
      const cellWidth = maxXRange / cols;
      const cellHeight = maxYRange / Math.min(rows, isMobile ? 7 : 7);

      for (let i = 0; i < count; i++) {
        const col = i % cols;
        const row = Math.floor(i / cols);
        // Small jitter for organic feel (less on mobile to prevent edge overflow)
        const jitterX = (Math.random() - 0.5) * cellWidth * (isMobile ? 0.15 : 0.3);
        const jitterY = (Math.random() - 0.5) * cellHeight * (isMobile ? 0.15 : 0.3);
        positions.push({
          x: minX + col * cellWidth + cellWidth / 2 + jitterX,
          y: minY + row * cellHeight + cellHeight / 2 + jitterY
        });
      }
    } else {
      // RANDOM positioning for desktop ≤15 words
      const densityFactor = count > 10 ? 0.7 : 1.0;
      const baseHSpacing = 12 * densityFactor;
      const baseVSpacing = 9 * densityFactor;
      const allPositions = [...existingPositions];

      for (let i = 0; i < count; i++) {
        let x = 0, y = 0;
        let safe = false;
        let attempts = 0;

        while (!safe && attempts < 150) {
          x = minX + Math.random() * maxXRange;
          y = minY + Math.random() * maxYRange;

          const hasCollision = allPositions.some(p => {
            const hDist = Math.abs(p.x - x);
            const vDist = Math.abs(p.y - y);
            return hDist < baseHSpacing && vDist < baseVSpacing;
          });

          if (!hasCollision) safe = true;
          attempts++;
        }

        // Grid fallback for this word if random failed
        if (!safe) {
          const cols = 5;
          const cellWidth = maxXRange / cols;
          const cellHeight = maxYRange / 6;
          const idx = allPositions.length % (cols * 6);
          const col = idx % cols;
          const row = Math.floor(idx / cols);
          x = minX + col * cellWidth + cellWidth / 2 + (Math.random() - 0.5) * 3;
          y = minY + row * cellHeight + cellHeight / 2 + (Math.random() - 0.5) * 2;
        }

        positions.push({ x, y });
        allPositions.push({ x, y });
      }
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
    let x = 0, y = 0;

    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    const minX = isMobile ? 15 : 10;
    const maxXRange = isMobile ? 70 : 80;
    const minY = isMobile ? 12 : 12;
    const maxYRange = isMobile ? 76 : 76;

    // MOBILE: Use grid-based repositioning to prevent overlap
    if (isMobile) {
      const cols = 3;
      const cellWidth = maxXRange / cols;
      const cellHeight = maxYRange / 7;
      // Find an empty-ish cell by checking existing word positions
      let bestCell = { col: 0, row: 0, dist: 0 };
      for (let row = 0; row < 7; row++) {
        for (let col = 0; col < cols; col++) {
          const cellX = minX + col * cellWidth + cellWidth / 2;
          const cellY = minY + row * cellHeight + cellHeight / 2;
          // Check distance from existing words
          const minDist = Math.min(...currentWords.map(w =>
            Math.sqrt(Math.pow(w.x - cellX, 2) + Math.pow(w.y - cellY, 2))
          ), 100);
          // Also check distance from avoid position
          let avoidDist = 100;
          if (avoidX !== undefined && avoidY !== undefined) {
            avoidDist = Math.sqrt(Math.pow(cellX - avoidX, 2) + Math.pow(cellY - avoidY, 2));
          }
          // Prefer cells far from existing words AND far from avoid position
          const score = minDist + avoidDist * 0.5;
          if (score > bestCell.dist) {
            bestCell = { col, row, dist: score };
          }
        }
      }
      const jitterX = (Math.random() - 0.5) * cellWidth * 0.15;
      const jitterY = (Math.random() - 0.5) * cellHeight * 0.15;
      x = minX + bestCell.col * cellWidth + cellWidth / 2 + jitterX;
      y = minY + bestCell.row * cellHeight + cellHeight / 2 + jitterY;
      return { x, y };
    }

    // DESKTOP: Random positioning with collision detection
    let safe = false;
    let attempts = 0;
    const baseHSpacing = 10;
    const baseVSpacing = 8;

    while (!safe && attempts < 150) {
      x = minX + Math.random() * maxXRange;
      y = minY + Math.random() * maxYRange;

      const hasCollision = currentWords.some(w => {
        const hDist = Math.abs(w.x - x);
        const vDist = Math.abs(w.y - y);
        return hDist < baseHSpacing && vDist < baseVSpacing;
      });

      let tooCloseToAvoid = false;
      if (avoidX !== undefined && avoidY !== undefined) {
        const dist = Math.sqrt(Math.pow(x - avoidX, 2) + Math.pow(y - avoidY, 2));
        if (dist < 20) tooCloseToAvoid = true;
      }

      if (!hasCollision && !tooCloseToAvoid) safe = true;
      attempts++;
    }

    // Grid fallback
    if (!safe) {
      const cols = isMobile ? 4 : 5;
      const cellWidth = maxXRange / cols;
      const cellHeight = maxYRange / 6;
      const idx = currentWords.length % (cols * 6);
      const col = idx % cols;
      const row = Math.floor(idx / cols);
      x = minX + col * cellWidth + cellWidth / 2 + (Math.random() - 0.5) * 3;
      y = minY + row * cellHeight + cellHeight / 2 + (Math.random() - 0.5) * 2;
    }

    return { x, y };
  }

  function spawnDataDrop() {
    const chars = '01アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン'.split('');
    const dropChars: string[] = [];
    const length = 8 + Math.floor(Math.random() * 12);
    for (let i = 0; i < length; i++) {
      dropChars.push(chars[Math.floor(Math.random() * chars.length)]);
    }
    dataRain.push({
      id: Date.now() + Math.random(),
      x: Math.random() * 100,
      y: -10,
      speed: 0.1 + Math.random() * 0.15, // Much slower: 0.1-0.25 (was 0.4-1.0)
      chars: dropChars,
      opacity: 0.15 + Math.random() * 0.2 // Subtler: 0.15-0.35 (was 0.25-0.6)
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

    // Spawn new drops - keep matrix rain consistent
    if (dataRain.length < 25 && Math.random() < 0.15) {
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

  function playSound(type: 'hover' | 'reveal' | 'decrypt' | 'corrupt' | 'complete' | 'gridglitch') {
    if (!audioCtx) return;
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const t = audioCtx.currentTime;

    if (type === 'gridglitch') {
      // Electric surge sound
      const osc = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(100, t);
      osc.frequency.exponentialRampToValueAtTime(2000, t + 0.1);
      osc.frequency.exponentialRampToValueAtTime(50, t + 0.3);
      g.gain.setValueAtTime(0.04, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
      osc.connect(g).connect(audioCtx.destination);
      osc.start(); osc.stop(t + 0.3);
    }
    else if (type === 'hover') {
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
      const headword = targetWord?.headword;

      // Mark as glitching
      words = words.map(w => w.id === targetId ? { ...w, glitching: true } : w);

      setTimeout(() => {
        const others = words.filter(w => w.id !== targetId).map(w => ({ x: w.x, y: w.y, headword: w.headword }));
        const newPos = findSafeSpot(others, headword, oldX, oldY);
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

  // Grid glitch effect on click
  function handleContainerClick(e: MouseEvent) {
    const target = e.target as HTMLElement;
    if (target.closest('.syndicate-word-card') || target.closest('.syndicate-modal') || revealedWord) return;

    playSound('gridglitch');

    const burstId = Date.now();
    glitchBursts = [...glitchBursts, { id: burstId, x: e.clientX, y: e.clientY }];

    // Remove after animation
    setTimeout(() => {
      glitchBursts = glitchBursts.filter(b => b.id !== burstId);
    }, 800);
  }
</script>

<!-- CONTAINER -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  class="syndicate-grid-container fixed inset-0 bg-[#050505] overflow-hidden font-mono text-gray-400 select-none"
  onclick={handleContainerClick}>

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

  <!-- Grid glitch bursts -->
  {#each glitchBursts as burst (burst.id)}
    <div class="grid-glitch-burst pointer-events-none" style="left: {burst.x}px; top: {burst.y}px;">
      <!-- Central pulse -->
      <div class="glitch-pulse"></div>
      <!-- Lightning branches -->
      <svg class="glitch-lightning" viewBox="0 0 200 200">
        <path d="M100,100 L{100 + Math.random() * 80 - 40},{Math.random() * 60} L{100 + Math.random() * 60 - 30},{Math.random() * 40}" stroke="#00fff2" stroke-width="2" fill="none" opacity="0.8"/>
        <path d="M100,100 L{200 - Math.random() * 60},{100 + Math.random() * 80 - 40} L{200 - Math.random() * 40},{100 + Math.random() * 60 - 30}" stroke="#39ff14" stroke-width="2" fill="none" opacity="0.8"/>
        <path d="M100,100 L{100 + Math.random() * 80 - 40},{200 - Math.random() * 60} L{100 + Math.random() * 60 - 30},{200 - Math.random() * 40}" stroke="#ff0040" stroke-width="2" fill="none" opacity="0.8"/>
        <path d="M100,100 L{Math.random() * 60},{100 + Math.random() * 80 - 40} L{Math.random() * 40},{100 + Math.random() * 60 - 30}" stroke="#00fff2" stroke-width="1.5" fill="none" opacity="0.6"/>
      </svg>
    </div>
  {/each}

  <!-- Words - z-20 ensures they're above background elements -->
  {#each words as w, i (w.id)}
    {#if !w.mastered}
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div
        class="syndicate-word-card absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer
               transition-all duration-300 z-20
               {w.decrypting ? 'syndicate-decrypt' : ''}
               {w.glitching ? 'syndicate-glitch' : ''}
               {!w.decrypting && !w.glitching ? 'syndicate-idle-glitch' : ''}"
        style="left: {w.x}%; top: {w.y}%; --glitch-delay: {(i * 0.7) + Math.random() * 2}s; touch-action: manipulation;"
        onclick={(e) => handleWordClick(w, e)}>
        {#if showImages && getCardImageUrl(w) && !w.imageFailed}
          <img
            src={getCardImageUrl(w)}
            alt={w.headword}
            class="w-16 h-16 md:w-20 md:h-20 object-cover border-2 border-[#00fff2]/50 shadow-[0_0_15px_rgba(0,255,242,0.3)]
                   hover:border-[#00fff2] hover:shadow-[0_0_25px_rgba(0,255,242,0.5)] transition-all syndicate-img-glitch"
            onerror={() => { words = words.map(word => word.id === w.id ? { ...word, imageFailed: true } : word); }}
          />
        {:else}
          <span class="syndicate-card-text text-sm md:text-lg lg:text-xl tracking-wider syndicate-text-glitch text-center syndicate-hue-{i % 5}
                       {!w.decrypting && !w.glitching ? 'syndicate-glow-visible' : ''}">
            <span class="opacity-60">[</span>{w.headword}<span class="opacity-60">]</span>
          </span>
        {/if}
      </div>
    {/if}
  {/each}

  <!-- Progress -->
  <div class="fixed bottom-8 left-1/2 -translate-x-1/2 font-mono">
    <span class="text-sm text-[#00fff2]/30">
      DECRYPTED: <span class="text-[#39ff14]">{masteredCount}</span>/<span class="text-[#00fff2]">{words.length}</span>
    </span>
  </div>

  <!-- Exit Button & Image Toggle -->
  {#if !sessionComplete}
    <div class="absolute right-6 z-40 flex gap-2" style="top: max(1.5rem, env(safe-area-inset-top))">
      <button
        type="button"
        onclick={(e) => { e.stopPropagation(); dispatch('toggleImages'); }}
        class="w-10 h-9 flex items-center justify-center text-[#00fff2]/50 hover:text-[#00fff2] text-sm transition-colors border border-[#00fff2]/30 hover:border-[#00fff2] bg-black/50 cursor-pointer"
        title={showImages ? 'Show Text' : 'Show Images'}>
        {showImages ? 'Aa' : '🖼️'}
      </button>
      <button
        type="button"
        onclick={(e) => { e.stopPropagation(); cycleTheme(); }}
        class="w-16 h-9 flex items-center justify-center text-[#00fff2]/50 hover:text-[#00fff2] text-xs transition-colors border border-[#00fff2]/30 hover:border-[#00fff2] bg-black/50 cursor-pointer"
        title="Change theme">
        Syn ↻
      </button>
      <button
        type="button"
        onclick={(e) => { e.stopPropagation(); dispatch('exit'); }}
        class="w-12 h-9 flex items-center justify-center text-[#00fff2]/50 hover:text-[#00fff2] text-xs transition-colors border border-[#00fff2]/30 hover:border-[#00fff2] bg-black/50 cursor-pointer">
        Exit
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
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4" style="padding-top: max(1rem, env(safe-area-inset-top)); padding-bottom: max(1rem, env(safe-area-inset-bottom));" transition:fade>
      <!-- Backdrop -->
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div class="absolute inset-0 bg-black/95" onclick={() => revealedWord = null}></div>

      <!-- Modal Content Container - Centered, content + buttons grouped -->
      <div class="relative flex flex-col max-w-lg w-full mx-auto max-h-[85vh] font-mono" transition:scale>
        <!-- Close Button (fixed to modal, inside bounds) -->
        <button class="absolute top-2 right-2 z-20 text-[#00fff2]/50 cursor-pointer hover:text-[#00fff2] bg-[#0a0a0a] border border-[#00fff2]/30 rounded-full w-10 h-10 flex items-center justify-center text-sm" onclick={() => revealedWord = null}>[X]</button>

        <!-- Scrollable Content Area -->
        <div class="overflow-y-auto overscroll-contain rounded" style="-webkit-overflow-scrolling: touch;">
          <div class="bg-[#0a0a0a] border border-[#00fff2]/50 p-6 md:p-10 pt-12 text-center">
            <!-- German Gloss -->
            {#if revealedWord.gloss_de}
              <div class="text-[#ff0040]/70 text-sm mb-2 text-center"># {revealedWord.gloss_de}</div>
            {/if}

            <!-- Headword (Click to hear - hover shows speaker) -->
            <button
              onclick={() => revealedWord && speak(revealedWord.headword)}
              class="text-3xl md:text-4xl lg:text-5xl text-[#00fff2] tracking-wider syndicate-pulse cursor-pointer hover:scale-105 transition-transform bg-transparent border-none tts-speakable mb-3">
              [{revealedWord.headword}]
            </button>

            <!-- IPA -->
            {#if revealedWord.ipa}
              <p class="text-[#39ff14]/50 text-sm mb-6 tracking-widest text-center">/{revealedWord.ipa}/</p>
            {/if}

            <!-- Definition -->
            <p class="text-lg md:text-xl text-gray-300 mb-6 leading-relaxed text-center">
              {revealedWord.definition}
            </p>

            <!-- Rich Data Block -->
            {#if revealedWord.mnemonic || revealedWord.etymology || revealedWord.example}
              <div class="border-t border-[#00fff2]/20 pt-6 space-y-4 text-center">

                {#if revealedWord.mnemonic}
                  <div class="bg-[#0f0f0f] p-4 border border-[#ff0040]/30 rounded">
                    <span class="text-[10px] uppercase text-[#ff0040]/70 tracking-widest block mb-2">// MEMORY_HOOK</span>
                    <p class="text-base text-gray-400 leading-relaxed">{revealedWord.mnemonic}</p>
                  </div>
                {/if}

                {#if revealedWord.etymology}
                  <div class="pt-2">
                    <span class="text-[10px] uppercase text-[#00fff2]/50 tracking-widest block mb-1">// ORIGIN</span>
                    <p class="text-base text-gray-500 italic">{revealedWord.etymology}</p>
                  </div>
                {/if}

                {#if revealedWord.example}
                  <div class="pt-4">
                    <span class="text-[10px] uppercase text-[#39ff14]/50 tracking-widest">// USAGE</span>
                    <div class="text-lg text-[#39ff14]/70 italic mt-2">
                      "{revealedWord.example}"
                    </div>
                    {#if revealedWord.example_gloss}
                      <div class="text-base text-gray-400 mt-1">
                        "{revealedWord.example_gloss}"
                      </div>
                    {/if}
                  </div>
                {/if}
              </div>
            {/if}

            <!-- Action Buttons inside card -->
            <div class="mt-6 pt-4 border-t border-[#00fff2]/20 flex gap-4 justify-center">
              <button
                onclick={() => handleDecision('pass')}
                class="flex-1 max-w-[140px] py-3 bg-[#39ff14]/10 border border-[#39ff14]/50 text-[#39ff14] hover:bg-[#39ff14]/20 hover:border-[#39ff14] transition-all tracking-widest uppercase text-sm cursor-pointer">
                [DECRYPT]
              </button>
              <button
                onclick={() => handleDecision('fail')}
                class="flex-1 max-w-[140px] py-3 bg-[#ff0040]/10 border border-[#ff0040]/50 text-[#ff0040] hover:bg-[#ff0040]/20 hover:border-[#ff0040] transition-all tracking-widest uppercase text-sm cursor-pointer">
                [CORRUPT]
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  /* Syndicate idle glitch animation - cyberpunk digital glitch with RGB split */
  @keyframes syndicate-idle-glitch-anim {
    0%, 85%, 100% {
      transform: translate(-50%, -50%) translate(0, 0);
    }
    86% {
      transform: translate(-50%, -50%) translate(-3px, 1px);
    }
    88% {
      transform: translate(-50%, -50%) translate(3px, -1px);
    }
    90% {
      transform: translate(-50%, -50%) translate(-1px, -2px);
    }
    92% {
      transform: translate(-50%, -50%) translate(0, 0);
    }
  }

  /* RGB split text effect */
  @keyframes syndicate-rgb-split {
    0%, 85%, 100% {
      text-shadow: none;
    }
    86% {
      text-shadow: -2px 0 #ff0040, 2px 0 #00fff2;
    }
    88% {
      text-shadow: 2px 0 #ff0040, -2px 0 #00fff2;
    }
    90% {
      text-shadow: -1px 0 #ff0040, 1px 0 #00fff2;
    }
    92% {
      text-shadow: none;
    }
  }

  /* Image glitch effect - uses hue-rotate instead of text-shadow */
  @keyframes syndicate-img-glitch-anim {
    0%, 85%, 100% {
      transform: translate(0, 0);
      filter: none;
    }
    86% {
      transform: translate(-2px, 1px);
      filter: hue-rotate(30deg) saturate(1.3);
    }
    88% {
      transform: translate(2px, -1px);
      filter: hue-rotate(-30deg) saturate(1.3);
    }
    90% {
      transform: translate(-1px, -2px);
      filter: hue-rotate(15deg) saturate(1.2);
    }
    92% {
      transform: translate(0, 0);
      filter: none;
    }
  }

  /* Apply idle glitch to card container */
  .syndicate-idle-glitch {
    animation: syndicate-idle-glitch-anim 4s infinite;
    animation-delay: var(--glitch-delay, 0s);
  }

  /* Apply RGB split to text */
  .syndicate-text-glitch {
    animation: syndicate-rgb-split 4s infinite;
    animation-delay: var(--glitch-delay, 0s);
  }

  /* Apply hue-rotate glitch to images */
  .syndicate-img-glitch {
    animation: syndicate-img-glitch-anim 4s infinite;
    animation-delay: var(--glitch-delay, 0s);
  }

  /* Visible glow for idle words - stronger for readability */
  .syndicate-glow-visible {
    text-shadow: 0 0 12px var(--syn-glow, rgba(0, 255, 242, 0.5)), 0 0 4px var(--syn-glow, rgba(0, 255, 242, 0.3));
  }

  /* Subtle hue variations - cyberpunk palette */
  .syndicate-hue-0 {
    --syn-color: rgba(0, 255, 242, 0.9);     /* Pure cyan */
    --syn-glow: rgba(0, 255, 242, 0.5);
    --syn-bg: rgba(0, 255, 242, 0.08);
    --syn-border: rgba(0, 255, 242, 0.25);
    color: var(--syn-color);
    background: var(--syn-bg);
    border-color: var(--syn-border);
  }
  .syndicate-hue-1 {
    --syn-color: rgba(57, 255, 20, 0.85);    /* Neon green */
    --syn-glow: rgba(57, 255, 20, 0.5);
    --syn-bg: rgba(57, 255, 20, 0.06);
    --syn-border: rgba(57, 255, 20, 0.2);
    color: var(--syn-color);
    background: var(--syn-bg);
    border-color: var(--syn-border);
  }
  .syndicate-hue-2 {
    --syn-color: rgba(0, 200, 255, 0.9);     /* Electric blue */
    --syn-glow: rgba(0, 200, 255, 0.5);
    --syn-bg: rgba(0, 200, 255, 0.08);
    --syn-border: rgba(0, 200, 255, 0.25);
    color: var(--syn-color);
    background: var(--syn-bg);
    border-color: var(--syn-border);
  }
  .syndicate-hue-3 {
    --syn-color: rgba(180, 255, 220, 0.85);  /* Mint */
    --syn-glow: rgba(180, 255, 220, 0.4);
    --syn-bg: rgba(180, 255, 220, 0.06);
    --syn-border: rgba(180, 255, 220, 0.2);
    color: var(--syn-color);
    background: var(--syn-bg);
    border-color: var(--syn-border);
  }
  .syndicate-hue-4 {
    --syn-color: rgba(200, 100, 255, 0.85);  /* Purple glitch */
    --syn-glow: rgba(200, 100, 255, 0.4);
    --syn-bg: rgba(200, 100, 255, 0.06);
    --syn-border: rgba(200, 100, 255, 0.2);
    color: var(--syn-color);
    background: var(--syn-bg);
    border-color: var(--syn-border);
  }

  /* Mobile-safe glitch - reduced movement to prevent off-screen */
  @media (max-width: 768px) {
    @keyframes syndicate-idle-glitch-anim {
      0%, 85%, 100% {
        transform: translate(-50%, -50%) translate(0, 0);
      }
      86% {
        transform: translate(-50%, -50%) translate(-1px, 0.5px);
      }
      88% {
        transform: translate(-50%, -50%) translate(1px, -0.5px);
      }
      90% {
        transform: translate(-50%, -50%) translate(-0.5px, -1px);
      }
      92% {
        transform: translate(-50%, -50%) translate(0, 0);
      }
    }

    @keyframes syndicate-img-glitch-anim {
      0%, 85%, 100% {
        transform: translate(0, 0);
        filter: none;
      }
      86% {
        transform: translate(-1px, 0.5px);
        filter: hue-rotate(15deg) saturate(1.2);
      }
      88% {
        transform: translate(1px, -0.5px);
        filter: hue-rotate(-15deg) saturate(1.2);
      }
      90% {
        transform: translate(-0.5px, -1px);
        filter: hue-rotate(10deg) saturate(1.1);
      }
      92% {
        transform: translate(0, 0);
        filter: none;
      }
    }
  }

  /* Decrypt animation (when passing) */
  .syndicate-decrypt {
    animation: syndicate-decrypt-anim 0.8s ease-out forwards;
  }

  @keyframes syndicate-decrypt-anim {
    0% {
      opacity: 1;
      filter: none;
    }
    50% {
      opacity: 1;
      filter: brightness(2) blur(2px);
      text-shadow: 0 0 20px #39ff14;
    }
    100% {
      opacity: 0;
      filter: brightness(3) blur(5px);
    }
  }

  /* Glitch animation (when failing) */
  .syndicate-glitch {
    animation: syndicate-fail-glitch 0.6s ease-out forwards;
  }

  @keyframes syndicate-fail-glitch {
    0%, 100% {
      opacity: 1;
    }
    10%, 30%, 50%, 70%, 90% {
      opacity: 0;
      transform: translate(-50%, -50%) translate(5px, -5px);
    }
    20%, 40%, 60%, 80% {
      opacity: 1;
      transform: translate(-50%, -50%) translate(-5px, 5px);
    }
  }

  /* Pulse animation for complete text */
  .syndicate-pulse {
    animation: syndicate-pulse-anim 2s ease-in-out infinite;
  }

  @keyframes syndicate-pulse-anim {
    0%, 100% {
      opacity: 1;
      text-shadow: 0 0 20px currentColor;
    }
    50% {
      opacity: 0.8;
      text-shadow: 0 0 40px currentColor;
    }
  }

  /* Grid glitch burst on click */
  .grid-glitch-burst {
    position: absolute;
    transform: translate(-50%, -50%);
    width: 200px;
    height: 200px;
    animation: glitch-burst-fade 0.8s ease-out forwards;
  }

  .glitch-pulse {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 20px;
    height: 20px;
    background: radial-gradient(circle, #00fff2 0%, transparent 70%);
    border-radius: 50%;
    animation: glitch-pulse-expand 0.4s ease-out forwards;
  }

  .glitch-lightning {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    animation: glitch-lightning-flash 0.3s ease-out forwards;
  }

  @keyframes glitch-burst-fade {
    0% {
      opacity: 1;
    }
    100% {
      opacity: 0;
    }
  }

  @keyframes glitch-pulse-expand {
    0% {
      transform: translate(-50%, -50%) scale(1);
      opacity: 1;
      box-shadow: 0 0 30px #00fff2, 0 0 60px #39ff14;
    }
    100% {
      transform: translate(-50%, -50%) scale(8);
      opacity: 0;
      box-shadow: 0 0 0 transparent;
    }
  }

  @keyframes glitch-lightning-flash {
    0% {
      opacity: 1;
      filter: brightness(2) hue-rotate(0deg);
    }
    25% {
      filter: brightness(3) hue-rotate(20deg);
    }
    50% {
      filter: brightness(1.5) hue-rotate(-20deg);
    }
    100% {
      opacity: 0;
      filter: brightness(1) hue-rotate(0deg);
    }
  }

  /* Card text containment for long phrases */
  .syndicate-card-text {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    max-width: min(200px, 55vw);
    padding: 0.5rem 0.75rem;
    background: rgba(0, 255, 242, 0.08);
    border: 1px solid rgba(0, 255, 242, 0.25);
    border-radius: 6px;

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

  .syndicate-card-text:hover {
    background: rgba(0, 255, 242, 0.15);
    border-color: rgba(0, 255, 242, 0.5);
  }

  @media (max-width: 768px) {
    .syndicate-card-text {
      max-width: min(160px, 30vw);
      font-size: 0.85rem;
      padding: 0.4rem 0.6rem;
      line-height: 1.2;
      min-height: 40px;
      letter-spacing: 0.01em;
    }
  }

  /* Very small screens */
  @media (max-width: 400px) {
    .syndicate-card-text {
      max-width: min(140px, 28vw);
      font-size: 0.8rem;
      padding: 0.35rem 0.5rem;
    }
  }
</style>
