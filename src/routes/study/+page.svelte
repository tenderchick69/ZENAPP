<script lang="ts">
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  import { supabase } from '$lib/supabase';
  import { calculateNextReview, type Card } from '$lib/srs';
  import { goto } from '$app/navigation';

  let deckId = $page.url.searchParams.get('id');
  let queue: Card[] = [];
  let currentCard: Card | null = null;
  let isRevealed = false;
  let loading = true;
  let sessionStats = { correct: 0, wrong: 0 };

  onMount(async () => {
    if (!deckId) return goto('/');
    await loadQueue();
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  });

  async function loadQueue() {
    // Fetch cards that are New OR Due is in the past
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from('cards')
      .select('*')
      .eq('deck_id', deckId)
      .or(`state.eq.0,due.lte.${now}`)
      .order('due', { ascending: true })
      .limit(20);

    if (data) queue = data;
    nextCard();
    loading = false;
  }

  function nextCard() {
    if (queue.length === 0) {
      currentCard = null;
      return; // Session complete
    }
    currentCard = queue[0];
    isRevealed = false;
  }

  function handleKey(e: KeyboardEvent) {
    if (!currentCard) return;
    if (e.code === 'Space') {
      if (!isRevealed) {
        isRevealed = true;
      }
    }
    if (isRevealed) {
      if (e.code === 'ArrowLeft' || e.code === 'Digit1') handleGrade('fail');
      if (e.code === 'ArrowRight' || e.code === 'Digit2') handleGrade('pass');
    }
  }

  async function handleGrade(grade: 'fail' | 'pass') {
    if (!currentCard) return;

    // 1. Calculate new physics
    const updates = calculateNextReview(currentCard, grade);

    // 2. Optimistic UI Update
    if (grade === 'pass') {
      sessionStats.correct++;
      queue.shift(); // Remove from queue
    } else {
      sessionStats.wrong++;
      // Move to end of queue for re-testing this session
      const failedCard = queue.shift();
      if (failedCard) queue.push(failedCard);
    }

    // 3. Persist to Cloud
    await supabase.from('cards').update(updates).eq('id', currentCard.id);

    // 4. Next
    nextCard();
  }
</script>

<div class="h-[80vh] flex flex-col justify-center items-center max-w-2xl mx-auto relative">

  {#if loading}
    <div class="text-neon-cyan animate-flicker font-mono">DECRYPTING SHARDS...</div>
  {:else if !currentCard}
    <!-- Session Complete -->
    <div class="text-center space-y-6 border border-neon-cyan/50 p-12 bg-black/80 backdrop-blur relative overflow-hidden">
      <div class="absolute inset-0 bg-neon-cyan/5 animate-pulse"></div>
      <h2 class="font-cyber text-3xl text-white">SYNC COMPLETE</h2>
      <div class="font-mono text-gray-400">
        <p>RETENTION: {Math.round((sessionStats.correct / (sessionStats.correct + sessionStats.wrong || 1)) * 100)}%</p>
        <p>SHARDS PROCESSED: {sessionStats.correct + sessionStats.wrong}</p>
      </div>
      <button onclick={() => goto('/')} class="bg-neon-cyan text-black font-bold px-8 py-3 font-cyber hover:shadow-[0_0_20px_#00fff2]">
        JACK OUT
      </button>
    </div>
  {:else}
    <!-- Flashcard -->
    <div class="w-full relative group perspective-1000">

      <!-- Card Body -->
      <div class="relative min-h-[400px] border border-gray-700 bg-black/80 p-8 flex flex-col items-center justify-center text-center transition-all duration-300 shadow-[0_0_30px_rgba(0,0,0,0.5)]
        {isRevealed ? 'border-neon-cyan/50 shadow-[0_0_30px_rgba(0,255,242,0.1)]' : 'hover:border-gray-500'}">

        <!-- HUD Elements -->
        <div class="absolute top-4 left-4 font-mono text-xs text-gray-600">
          ID: {currentCard.id.toString().padStart(4, '0')}
        </div>
        <div class="absolute top-4 right-4 font-mono text-xs text-neon-red animate-pulse">
          REC // {queue.length} REMAINING
        </div>

        <!-- FRONT -->
        <div class="mb-8">
          <h1 class="font-cyber text-4xl md:text-6xl text-white tracking-tight drop-shadow-lg">
            {currentCard.headword}
          </h1>
          {#if currentCard.pos}
            <span class="font-mono text-neon-cyan text-sm">[{currentCard.pos}]</span>
          {/if}
        </div>

        <!-- BACK (Hidden/Revealed) -->
        {#if isRevealed}
          <div class="space-y-4 animate-glitch">
            {#if currentCard.ipa}
              <p class="font-mono text-gray-500">/{currentCard.ipa}/</p>
            {/if}
            <p class="font-mono text-xl text-gray-300 max-w-md leading-relaxed">
              {currentCard.definition}
            </p>
            {#if currentCard.example}
              <div class="mt-6 p-4 border-l-2 border-neon-red bg-neon-red/5 text-left w-full">
                <p class="font-mono text-sm text-gray-400 italic">"{currentCard.example}"</p>
              </div>
            {/if}
          </div>
        {:else}
          <div class="text-gray-700 font-mono text-xs mt-12 animate-pulse">
            [ PRESS SPACE TO DECRYPT ]
          </div>
        {/if}
      </div>

      <!-- Controls -->
      {#if isRevealed}
        <div class="flex gap-4 mt-8 w-full">
          <button
            onclick={() => handleGrade('fail')}
            class="flex-1 border border-neon-red text-neon-red py-4 font-cyber hover:bg-neon-red hover:text-black transition-all uppercase tracking-widest">
            [1] REJECT
          </button>
          <button
            onclick={() => handleGrade('pass')}
            class="flex-1 bg-bio-green/20 border border-bio-green text-bio-green py-4 font-cyber hover:bg-bio-green hover:text-black transition-all uppercase tracking-widest">
            [2] INTEGRATE
          </button>
        </div>
      {/if}

    </div>
  {/if}
</div>
