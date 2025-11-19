<script lang="ts">
  import { page } from '$app/state';
  import { onMount } from 'svelte';
  import { supabase } from '$lib/supabase';
  import { calculateNextReview, type Card } from '$lib/srs';
  import { goto } from '$app/navigation';

  let deckId = page.url.searchParams.get('id');
  let view: 'lobby' | 'study' | 'summary' = 'lobby';

  // Lobby Controls
  let cramAmount = 20;

  // Session Data
  let queue: Card[] = [];
  let currentCard: Card | null = null;
  let isRevealed = false;
  let sessionStats = { correct: 0, wrong: 0 };

  // Deck Stats
  let stats = { due: 0, learning: 0, mastered: 0, total: 0 };

  onMount(async () => {
    if (!deckId) return goto('/');
    await loadStats();
  });

  async function loadStats() {
    const { data } = await supabase.from('cards').select('state, due').eq('deck_id', deckId);
    if (data) {
      stats.total = data.length;
      stats.mastered = data.filter(c => c.state === 5).length;
      stats.learning = data.filter(c => c.state > 0 && c.state < 5).length;
      // Due = (New) OR (Due Date Passed AND Not Mastered)
      stats.due = data.filter(c => c.state < 5 && (c.state === 0 || new Date(c.due) <= new Date())).length;
    }
  }

  async function startSession(mode: 'standard' | 'weakness' | 'overclock') {
    const now = new Date().toISOString();
    let query = supabase.from('cards').select('*').eq('deck_id', deckId);

    if (mode === 'standard') {
      // SRS: Due items only
      query = query.lt('state', 5).or(`state.eq.0,due.lte.${now}`).order('due', { ascending: true }).limit(50);
    } else if (mode === 'weakness') {
      // Learning items (State 1-4) regardless of due date
      query = query.gt('state', 0).lt('state', 5).limit(50);
    } else if (mode === 'overclock') {
      // Random Selection
      query = query.limit(cramAmount);
    }

    const { data } = await query;

    if (data && data.length > 0) {
      // Shuffle for overclock, sort by due for others
      queue = mode === 'overclock' ? data.sort(() => Math.random() - 0.5) : data;
      view = 'study';
      nextCard();
    } else {
      alert("No matching neural patterns found.");
    }
  }

  function nextCard() {
    if (queue.length === 0) {
      view = 'summary';
      return;
    }
    currentCard = queue[0];
    isRevealed = false;
  }

  async function handleGrade(rating: 'pass' | 'fail') {
    if (!currentCard) return;

    if (rating === 'fail') {
      // Failed: Keep in queue (immediate re-encoding), but demote level logic internally
      sessionStats.wrong++;

      // We visually demote it immediately in the DB so next time it counts as lower
      const updates = calculateNextReview(currentCard, 'fail');
      // Don't change Due Date yet (must pass first), just lower state
      await supabase.from('cards').update({ state: updates.state }).eq('id', currentCard.id);

      // Move to end of queue
      const c = queue.shift();
      if (c) {
        c.state = updates.state; // Update local state
        queue.push(c);
      }
      nextCard(); // Actually, usually we show next card, or same? Let's show next.
    } else {
      // Passed
      sessionStats.correct++;
      const updates = calculateNextReview(currentCard, 'pass');
      await supabase.from('cards').update(updates).eq('id', currentCard.id);
      queue.shift();
      nextCard();
    }
  }
</script>

<!-- UI LAYOUT -->
<div class="min-h-[80vh] flex flex-col items-center justify-center max-w-2xl mx-auto px-6">

  <!-- LOBBY -->
  {#if view === 'lobby'}
    <div class="w-full border border-neon-cyan/30 bg-black/90 p-8 shadow-[0_0_50px_rgba(0,255,242,0.05)] relative overflow-hidden">
      <!-- Scanline decorative -->
      <div class="absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(0,255,242,0.02)_50%)] bg-[length:100%_4px] pointer-events-none"></div>

      <h1 class="font-cyber text-4xl text-white mb-1">NEURAL LOBBY</h1>
      <div class="flex gap-4 text-xs font-mono text-gray-500 mb-8">
         <span>ID: {deckId}</span>
         <span class="text-neon-cyan">NET_STATUS: ONLINE</span>
      </div>

      <!-- Stats Grid -->
      <div class="grid grid-cols-3 gap-4 mb-8">
        <div class="bg-gray-900/50 border border-gray-800 p-4 text-center">
          <div class="text-3xl font-cyber text-neon-red">{stats.due}</div>
          <div class="text-[10px] uppercase text-gray-500">Critical (Due)</div>
        </div>
        <div class="bg-gray-900/50 border border-gray-800 p-4 text-center">
          <div class="text-3xl font-cyber text-bio-green">{stats.learning}</div>
          <div class="text-[10px] uppercase text-gray-500">In Transit</div>
        </div>
        <div class="bg-gray-900/50 border border-gray-800 p-4 text-center">
          <div class="text-3xl font-cyber text-neon-cyan">{stats.mastered}</div>
          <div class="text-[10px] uppercase text-gray-500">Mastered</div>
        </div>
      </div>

      <!-- Tactical Menu -->
      <div class="space-y-3">
        <button onclick={() => startSession('standard')} disabled={stats.due === 0}
          class="w-full py-4 bg-neon-cyan disabled:opacity-50 disabled:cursor-not-allowed text-black font-cyber font-bold hover:bg-white transition-all text-left px-6 relative group">
          [1] STANDARD EXECUTION
          <span class="absolute right-6 opacity-0 group-hover:opacity-100 transition-opacity"> >>></span>
        </button>

        <button onclick={() => startSession('weakness')} disabled={stats.learning === 0}
          class="w-full py-3 border border-gray-700 text-gray-300 font-mono text-sm hover:border-neon-red hover:text-neon-red transition-all text-left px-6">
          [2] REINFORCE WEAKNESS
        </button>

        <div class="flex gap-2">
          <div class="relative flex-1">
            <input type="number" bind:value={cramAmount} class="w-full bg-black border border-gray-700 text-neon-cyan font-mono p-3 focus:border-neon-cyan outline-none" />
            <span class="absolute right-3 top-3 text-gray-600 text-xs">SHARDS</span>
          </div>
          <button onclick={() => startSession('overclock')} class="px-6 border border-gray-700 text-neon-cyan hover:bg-neon-cyan hover:text-black font-cyber transition-all">
            OVERCLOCK
          </button>
        </div>
      </div>

      <div class="mt-8 text-center">
        <a href="/" class="text-xs font-mono text-gray-600 hover:text-white">[ ABORT / JACK OUT ]</a>
      </div>
    </div>

  <!-- STUDY INTERFACE -->
  {:else if view === 'study' && currentCard}
    <div class="w-full relative perspective-1000">
      <div class="border border-gray-800 bg-black/90 p-10 min-h-[450px] flex flex-col justify-between shadow-2xl relative overflow-hidden">

        <!-- Level Indicators (The Pips) -->
        <div class="absolute top-0 left-0 w-full h-1 bg-gray-900 flex">
           {#each [1, 2, 3, 4, 5] as level}
             <div class="flex-1 border-r border-black h-full transition-all duration-500
               {currentCard.state >= level ? 'bg-neon-cyan shadow-[0_0_10px_#00fff2]' : 'bg-gray-800'}">
             </div>
           {/each}
        </div>

        <!-- Card Content -->
        <div class="mt-6 text-center">
           <h2 class="text-5xl font-cyber text-white mb-6 tracking-tight">{currentCard.headword}</h2>
           {#if isRevealed}
             <div class="animate-glitch space-y-6">
                {#if currentCard.ipa}<p class="text-gray-600 font-mono text-sm">/{currentCard.ipa}/</p>{/if}
                <p class="text-2xl text-neon-cyan font-mono">{currentCard.definition}</p>
                {#if currentCard.example}
                  <div class="text-sm text-gray-400 border-l-2 border-neon-red pl-4 text-left mx-auto max-w-md italic">
                    "{currentCard.example}"
                  </div>
                {/if}
             </div>
           {/if}
        </div>

        <!-- Actions -->
        <div class="mt-8">
          {#if !isRevealed}
             <button onclick={() => isRevealed = true} class="w-full py-6 border border-gray-700 text-gray-500 font-mono hover:text-neon-cyan hover:border-neon-cyan transition-all tracking-[0.5em]">
               [ DECRYPT ]
             </button>
          {:else}
             <div class="grid grid-cols-2 gap-4">
               <button onclick={() => handleGrade('fail')} class="group relative py-4 border border-neon-red text-neon-red hover:bg-neon-red hover:text-black font-cyber font-bold transition-all overflow-hidden">
                 <span class="relative z-10">REJECT</span>
                 <div class="absolute inset-0 bg-neon-red/20 translate-y-full group-hover:translate-y-0 transition-transform"></div>
               </button>
               <button onclick={() => handleGrade('pass')} class="group relative py-4 border border-bio-green text-bio-green hover:bg-bio-green hover:text-black font-cyber font-bold transition-all overflow-hidden">
                 <span class="relative z-10">INTEGRATE</span>
                 <div class="absolute inset-0 bg-bio-green/20 translate-y-full group-hover:translate-y-0 transition-transform"></div>
               </button>
             </div>
          {/if}
        </div>

        <!-- Footer Info -->
        <div class="absolute bottom-2 right-4 text-[10px] font-mono text-gray-700">
           LVL {currentCard.state} // INT {currentCard.interval}D
        </div>
      </div>
    </div>

  <!-- SUMMARY -->
  {:else if view === 'summary'}
    <div class="text-center bg-black/80 border border-neon-cyan p-12 w-full max-w-lg relative">
      <div class="absolute -top-3 -left-3 w-6 h-6 border-t-2 border-l-2 border-neon-cyan"></div>
      <div class="absolute -bottom-3 -right-3 w-6 h-6 border-b-2 border-r-2 border-neon-cyan"></div>

      <h2 class="font-cyber text-3xl text-white mb-4">SESSION HALTED</h2>
      <div class="grid grid-cols-2 gap-8 mb-8 font-mono">
        <div>
          <div class="text-4xl text-bio-green">{sessionStats.correct}</div>
          <div class="text-xs text-gray-500">INTEGRATED</div>
        </div>
        <div>
          <div class="text-4xl text-neon-red">{sessionStats.wrong}</div>
          <div class="text-xs text-gray-500">REJECTED</div>
        </div>
      </div>
      <a href="/" class="inline-block bg-neon-cyan text-black font-bold px-8 py-3 font-cyber hover:shadow-[0_0_20px_#00fff2]">
        JACK OUT
      </a>
    </div>
  {/if}
</div>
