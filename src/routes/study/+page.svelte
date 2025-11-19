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
  let sessionMode: 'standard' | 'weakness' | 'overclock' = 'standard';

  // Session Data
  let queue: Card[] = [];
  let currentCard: Card | null = null;
  let isRevealed = false;
  let sessionStats = { correct: 0, wrong: 0 };

  // Deck Stats
  let stats = { due: 0, learning: 0, mastered: 0, total: 0 };
  let levelDist = [0, 0, 0, 0, 0, 0]; // Counts for Lv 0 to 5

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
      stats.due = data.filter(c => c.state < 5 && (c.state === 0 || new Date(c.due) <= new Date())).length;

      // Calculate Distribution
      levelDist = [0, 0, 0, 0, 0, 0];
      data.forEach(c => {
        const lvl = Math.min(Math.max(c.state, 0), 5);
        levelDist[lvl]++;
      });
    }
  }

  async function startSession(mode: 'standard' | 'weakness' | 'overclock') {
    sessionMode = mode;
    const now = new Date().toISOString();
    let query = supabase.from('cards').select('*').eq('deck_id', deckId);

    if (mode === 'standard') {
      query = query.lt('state', 5).or(`state.eq.0,due.lte.${now}`).order('due', { ascending: true }).limit(50);
    } else if (mode === 'weakness') {
      query = query.gt('state', 0).lt('state', 5).limit(50);
    } else if (mode === 'overclock') {
      query = query.limit(cramAmount);
    }

    const { data } = await query;

    if (data && data.length > 0) {
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
      sessionStats.wrong++;
      // FAIL: Always demote, regardless of mode.
      const updates = calculateNextReview(currentCard, 'fail');

      // Update DB
      await supabase.from('cards').update({ state: updates.state }).eq('id', currentCard.id);

      // Visual Update locally
      currentCard.state = updates.state;

      // Re-queue
      const c = queue.shift();
      if (c) queue.push(c);
      nextCard();

    } else {
      // PASS
      sessionStats.correct++;

      // CRITICAL LOGIC FIX: Only promote if in Standard Mode
      if (sessionMode === 'standard') {
        const updates = calculateNextReview(currentCard, 'pass');
        await supabase.from('cards').update(updates).eq('id', currentCard.id);
      } else {
        // In Cram/Weakness, passing just means "Good job", no database change.
        // We do NOT update 'due' or 'state'.
      }

      queue.shift();
      nextCard();
    }
  }
</script>

<div class="min-h-[80vh] flex flex-col items-center justify-center max-w-2xl mx-auto px-6">

  <!-- LOBBY -->
  {#if view === 'lobby'}
    <div class="w-full border border-neon-cyan/30 bg-black/90 p-8 shadow-[0_0_50px_rgba(0,255,242,0.05)] relative overflow-hidden">
      <div class="absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(0,255,242,0.02)_50%)] bg-[length:100%_4px] pointer-events-none"></div>

      <h1 class="font-cyber text-4xl text-white mb-1">NEURAL LOBBY</h1>
      <div class="flex gap-4 text-xs font-mono text-gray-500 mb-6">
         <span>ID: {deckId}</span>
         <span class="text-neon-cyan">NET_STATUS: ONLINE</span>
      </div>

      <!-- NEW: Level Distribution Chart -->
      <div class="flex items-end h-16 gap-1 mb-8 px-4 border-b border-gray-800 pb-4">
        {#each levelDist as count, i}
          <div class="flex-1 flex flex-col justify-end group cursor-default">
             <div class="w-full bg-gray-800 group-hover:bg-neon-cyan transition-colors relative"
                  style="height: {count > 0 ? Math.max(10, (count / (stats.total || 1)) * 100) : 2}%">
                  <div class="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] text-neon-cyan opacity-0 group-hover:opacity-100 transition-opacity">{count}</div>
             </div>
             <div class="text-[8px] text-center text-gray-600 mt-1">L{i}</div>
          </div>
        {/each}
      </div>

      <!-- Tactical Menu -->
      <div class="space-y-3">
        <button onclick={() => startSession('standard')} disabled={stats.due === 0}
          class="w-full py-4 bg-neon-cyan disabled:opacity-50 disabled:bg-gray-800 disabled:text-gray-500 disabled:cursor-not-allowed text-black font-cyber font-bold hover:bg-white transition-all text-left px-6 relative group">
          [1] STANDARD EXECUTION
          {#if stats.due > 0}<span class="absolute right-6 opacity-0 group-hover:opacity-100 transition-opacity"> >>></span>{/if}
        </button>

        <button onclick={() => startSession('weakness')} disabled={stats.learning === 0}
          class="w-full py-3 border border-gray-700 text-gray-300 font-mono text-sm hover:border-neon-red hover:text-neon-red transition-all text-left px-6 disabled:opacity-30 disabled:cursor-not-allowed">
          [2] REINFORCE WEAKNESS
        </button>

        <div class="flex gap-2">
          <div class="relative flex-1 group">
            <!-- FIXED: Added pr-16 to prevent text overlap and group-hover focus styles -->
            <input type="number" bind:value={cramAmount}
              class="w-full bg-black border border-gray-700 text-neon-cyan font-mono p-3 pr-16 focus:border-neon-cyan outline-none transition-colors" />
            <span class="absolute right-3 top-3 text-gray-600 text-xs group-focus-within:text-neon-cyan">SHARDS</span>
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

        <!-- Header -->
        <div class="flex justify-between items-center mb-6">
           <!-- Pips -->
           <div class="flex gap-1">
             {#each [1, 2, 3, 4, 5] as level}
               <div class="w-2 h-2 rounded-full transition-all duration-500
                 {currentCard.state >= level ? 'bg-neon-cyan shadow-[0_0_5px_#00fff2]' : 'bg-gray-800'}">
               </div>
             {/each}
           </div>
           <div class="text-[10px] font-mono text-neon-red animate-pulse">
              MODE: {sessionMode.toUpperCase()}
           </div>
        </div>

        <!-- Content -->
        <div class="text-center">
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
               <button onclick={() => handleGrade('fail')} class="py-4 border border-neon-red text-neon-red hover:bg-neon-red hover:text-black font-cyber font-bold transition-all">
                 REJECT
               </button>
               <button onclick={() => handleGrade('pass')} class="py-4 border border-bio-green text-bio-green hover:bg-bio-green hover:text-black font-cyber font-bold transition-all">
                 INTEGRATE
               </button>
             </div>
             <!-- Hint for Cram Mode -->
             {#if sessionMode !== 'standard'}
               <div class="text-center mt-2 text-[10px] text-gray-600 font-mono">
                 TRAINING MODE: PROGRESS LOCKED
               </div>
             {/if}
          {/if}
        </div>
      </div>
    </div>

  <!-- SUMMARY -->
  {:else if view === 'summary'}
    <div class="text-center bg-black/80 border border-neon-cyan p-12 w-full max-w-lg relative">
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
