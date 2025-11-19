<script lang="ts">
  import { page } from '$app/state';
  import { onMount } from 'svelte';
  import { supabase } from '$lib/supabase';
  import { calculateNextReview, type Card } from '$lib/srs';
  import { goto } from '$app/navigation';
  import { t, theme } from '$lib/theme';
  import EmberGarden from '../../components/EmberGarden.svelte';

  let deckId = page.url.searchParams.get('id');
  let view: 'lobby' | 'study' | 'summary' | 'inspect' = 'lobby';
  let cramAmount = 20;
  let sessionMode: 'standard' | 'weakness' | 'overclock' = 'standard';

  // Data
  let queue: Card[] = [];
  let allCards: any[] = [];
  let currentCard: Card | null = null;

  // State
  let isRevealed = false;
  let isEditing = false;
  let editForm = { headword: '', definition: '' };
  let sessionStats = { correct: 0, wrong: 0 };
  let stats = { due: 0, learning: 0, mastered: 0, total: 0 };
  let levelDist = [0, 0, 0, 0, 0, 0];

  onMount(async () => {
    if (!deckId) return goto('/');
    await loadStats();
  });

  async function loadStats() {
    const { data } = await supabase.from('cards').select('*').eq('deck_id', deckId);
    if (data) {
      allCards = data;
      stats.total = data.length;
      stats.mastered = data.filter(c => c.state === 5).length;
      stats.learning = data.filter(c => c.state > 0 && c.state < 5).length;
      stats.due = data.filter(c => c.state < 5 && (c.state === 0 || new Date(c.due) <= new Date())).length;

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

    if (mode === 'standard') query = query.lt('state', 5).or(`state.eq.0,due.lte.${now}`).order('due', { ascending: true }).limit(50);
    else if (mode === 'weakness') query = query.gt('state', 0).lt('state', 5).limit(50);
    else if (mode === 'overclock') query = query.limit(cramAmount);

    const { data } = await query;
    if (data && data.length > 0) {
      queue = mode === 'overclock' ? data.sort(() => Math.random() - 0.5) : data;
      view = 'study';
      nextCard();
    } else {
      alert("No cards available.");
    }
  }

  function nextCard() {
    if (queue.length === 0) { view = 'summary'; return; }
    currentCard = queue[0];
    isRevealed = false;
    isEditing = false;
  }

  function speak(text: string) {
    if (!window.speechSynthesis) return;
    const u = new SpeechSynthesisUtterance(text);
    window.speechSynthesis.speak(u);
  }

  function toggleEdit() {
    if (!currentCard) return;
    isEditing = !isEditing;
    if (isEditing) {
      editForm = { headword: currentCard.headword, definition: currentCard.definition };
    }
  }

  async function saveEdit() {
    if (!currentCard) return;
    const { error } = await supabase.from('cards').update({ headword: editForm.headword, definition: editForm.definition }).eq('id', currentCard.id);
    if (!error) {
      currentCard.headword = editForm.headword;
      currentCard.definition = editForm.definition;
      isEditing = false;
    }
  }

  async function handleGrade(rating: 'pass' | 'fail') {
    if (!currentCard) return;
    if (rating === 'fail') {
      sessionStats.wrong++;
      const updates = calculateNextReview(currentCard, 'fail');
      await supabase.from('cards').update({ state: updates.state }).eq('id', currentCard.id);
      currentCard.state = updates.state;
      const c = queue.shift();
      if (c) queue.push(c);
      nextCard();
    } else {
      sessionStats.correct++;
      if (sessionMode === 'standard') {
        const updates = calculateNextReview(currentCard, 'pass');
        await supabase.from('cards').update(updates).eq('id', currentCard.id);
      }
      queue.shift();
      nextCard();
    }
  }

  function formatDate(iso: string) {
    const d = new Date(iso);
    const now = new Date();
    if (d <= now) return 'NOW';
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }

  // Handler for EmberGarden grade events
  async function handleEmberGrade(event: CustomEvent<{ id: number; rating: 'pass' | 'fail' }>) {
    const { id, rating } = event.detail;
    const card = queue.find(c => c.id === id);
    if (!card) return;

    if (rating === 'fail') {
      sessionStats.wrong++;
      const updates = calculateNextReview(card, 'fail');
      await supabase.from('cards').update({ state: updates.state }).eq('id', card.id);
    } else {
      sessionStats.correct++;
      if (sessionMode === 'standard') {
        const updates = calculateNextReview(card, 'pass');
        await supabase.from('cards').update(updates).eq('id', card.id);
      }
    }
  }
</script>

<div class="min-h-[80vh] flex flex-col items-center justify-center max-w-2xl mx-auto px-6">

  <!-- LOBBY -->
  {#if view === 'lobby'}
    <div class="w-full border border-dim bg-panel p-8 shadow-lg relative overflow-hidden transition-colors">
      {#if $theme === 'syndicate'}
        <div class="absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(0,255,242,0.02)_50%)] bg-[length:100%_4px] pointer-events-none"></div>
      {/if}

      <h1 class="font-heading text-4xl text-main mb-1">{$t.lobby_title}</h1>
      <div class="flex gap-4 text-xs font-body text-dim mb-6">
         <span>{$t.lobby_id}: {deckId}</span>
         <span class="text-accent">{$t.lobby_status}</span>
      </div>

      <!-- Level Chart -->
      <div class="flex items-end h-16 gap-1 mb-8 px-4 border-b border-dim pb-4">
        {#each levelDist as count, i}
          <div class="flex-1 flex flex-col justify-end group cursor-default">
             <div class="w-full bg-dim group-hover:bg-accent transition-colors relative"
                  style="height: {count > 0 ? Math.max(10, (count / (stats.total || 1)) * 100) : 2}%">
                  <div class="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] text-accent opacity-0 group-hover:opacity-100 transition-opacity">{count}</div>
             </div>
             <div class="text-[8px] text-center text-dim mt-1">L{i}</div>
          </div>
        {/each}
      </div>

      <!-- Stats -->
      <div class="grid grid-cols-3 gap-4 mb-8">
        <div class="bg-bg border border-dim p-4 text-center">
          <div class="text-3xl font-heading text-danger">{stats.due}</div>
          <div class="text-[10px] uppercase text-dim">{$t.stat_due}</div>
        </div>
        <div class="bg-bg border border-dim p-4 text-center">
          <div class="text-3xl font-heading text-success">{stats.learning}</div>
          <div class="text-[10px] uppercase text-dim">{$t.stat_learn}</div>
        </div>
        <div class="bg-bg border border-dim p-4 text-center">
          <div class="text-3xl font-heading text-accent">{stats.mastered}</div>
          <div class="text-[10px] uppercase text-dim">{$t.stat_master}</div>
        </div>
      </div>

      <!-- Menu -->
      <div class="space-y-3">
        <button onclick={() => startSession('standard')} disabled={stats.due === 0}
          class="w-full py-4 bg-accent disabled:opacity-50 disabled:bg-dim disabled:text-dim disabled:cursor-not-allowed text-bg font-heading font-bold hover:bg-main transition-all text-left px-6 relative group">
          [1] {$t.mode_std}
          {#if stats.due > 0}<span class="absolute right-6 opacity-0 group-hover:opacity-100 transition-opacity"> >>></span>{/if}
        </button>

        <button onclick={() => startSession('weakness')} disabled={stats.learning === 0}
          class="w-full py-3 border border-dim text-dim font-body text-sm hover:border-danger hover:text-danger transition-all text-left px-6 disabled:opacity-30 disabled:cursor-not-allowed">
          [2] {$t.mode_weak}
        </button>

        <div class="flex gap-2">
          <div class="relative flex-1 group">
            <input type="number" bind:value={cramAmount}
              class="w-full bg-bg border border-dim text-accent font-body p-3 pr-16 focus:border-accent outline-none transition-colors" />
            <span class="absolute right-3 top-3 text-dim text-xs group-focus-within:text-accent">{$t.unit_cram}</span>
          </div>
          <button onclick={() => startSession('overclock')} class="px-6 border border-dim text-accent hover:bg-accent hover:text-bg font-heading transition-all">
            {$t.mode_cram}
          </button>
        </div>
      </div>

      <!-- Footer Actions -->
      <div class="mt-8 flex justify-between items-center text-xs font-body">
         <button onclick={() => view = 'inspect'} class="text-dim hover:text-accent">[ {$t.btn_inspect} ]</button>
         <a href="/" class="text-dim hover:text-main">[ {$t.btn_exit} ]</a>
      </div>
    </div>

  <!-- INSPECT VIEW -->
  {:else if view === 'inspect'}
    <div class="w-full h-[80vh] border border-dim bg-panel p-8 flex flex-col relative overflow-hidden">
      <div class="flex justify-between items-center mb-6">
        <h2 class="font-heading text-2xl text-main">{$t.inspect_title}</h2>
        <button onclick={() => view = 'lobby'} class="text-dim hover:text-accent font-body text-xs">[ {$t.btn_back} ]</button>
      </div>

      <!-- Scrollable List -->
      <div class="flex-1 overflow-y-auto pr-2 space-y-1">
        {#each allCards.sort((a, b) => a.state - b.state || new Date(a.due).getTime() - new Date(b.due).getTime()) as card}
          <div class="grid grid-cols-12 gap-4 p-3 border-b border-dim/30 hover:bg-dim/10 text-xs font-body items-center group">
             <div class="col-span-1 flex gap-0.5">
               {#each [1,2,3,4,5] as l}
                 <div class="w-1 h-3 {card.state >= l ? 'bg-accent' : 'bg-dim/30'}"></div>
               {/each}
             </div>
             <div class="col-span-5 font-bold text-main truncate">{card.headword}</div>
             <div class="col-span-3 text-dim truncate">{card.definition}</div>
             <div class="col-span-3 text-right {new Date(card.due) <= new Date() ? 'text-danger' : 'text-success'}">
               {formatDate(card.due)}
             </div>
          </div>
        {/each}
      </div>
    </div>

  <!-- STUDY VIEW -->
  {:else if view === 'study'}
    {#if $theme === 'ember'}
      <!-- EMBER GARDEN VIEW -->
      <EmberGarden {queue} on:grade={handleEmberGrade} on:exit={() => view = 'summary'} />
    {:else if currentCard}
      <!-- STANDARD CARD VIEW -->
      <div class="w-full relative perspective-1000">
        <div class="border border-dim bg-panel p-10 h-[600px] flex flex-col justify-between shadow-2xl relative overflow-hidden transition-colors">

          <!-- Pips -->
          <div class="flex justify-between items-center mb-2">
             <div class="flex gap-1">
               {#each [1, 2, 3, 4, 5] as level}
                 <div class="w-2 h-2 rounded-full transition-all duration-500
                   {currentCard.state >= level ? 'bg-accent shadow-[0_0_5px_currentColor]' : 'bg-dim'}">
                 </div>
               {/each}
             </div>
             <div class="text-[10px] font-body text-danger animate-pulse">
                {$t.lbl_mode}: {sessionMode.toUpperCase()}
             </div>
          </div>

        <!-- Card Content Container (Scrollable) -->
        <div class="flex-1 flex flex-col justify-center items-center overflow-y-auto text-center relative group py-4">

           <!-- Audio/Edit Buttons -->
           <div class="absolute top-0 right-0 z-10">
             <button onclick={(e) => { e.stopPropagation(); if (currentCard) speak(currentCard.headword); }}
               aria-label="Play audio"
               class="p-2 text-dim hover:text-accent transition-colors">
               <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>
             </button>
           </div>
           <div class="absolute top-0 left-0 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
             <button onclick={(e) => { e.stopPropagation(); toggleEdit(); }}
               aria-label="Edit card"
               class="p-2 text-dim hover:text-accent">
               <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
             </button>
           </div>

           {#if isEditing}
             <div class="w-full space-y-4 p-4 bg-bg/50 border border-dim rounded">
               <input bind:value={editForm.headword} class="w-full bg-bg border border-dim p-2 text-main font-heading text-center" />
               <textarea bind:value={editForm.definition} class="w-full bg-bg border border-dim p-2 text-accent font-body text-center min-h-[100px]"></textarea>
               <div class="flex gap-2 justify-center">
                 <button onclick={saveEdit} class="px-4 py-1 bg-accent text-bg font-bold text-xs hover:bg-white">{$t.btn_save}</button>
                 <button onclick={() => isEditing = false} class="px-4 py-1 border border-dim text-dim text-xs hover:text-main">X</button>
               </div>
             </div>
           {:else}
             <button type="button"
                 class="text-5xl font-heading text-main mb-6 tracking-tight cursor-pointer hover:text-accent transition-colors bg-transparent border-none"
                 onclick={() => { if (currentCard) speak(currentCard.headword); }}>
                 {currentCard.headword}
             </button>

             {#if isRevealed}
               <div class="space-y-6 w-full max-w-md" class:animate-glitch={$theme === 'syndicate'}>
                  {#if currentCard.ipa}<p class="text-dim font-body text-sm">/{currentCard.ipa}/</p>{/if}
                  <p class="text-2xl text-accent font-body leading-relaxed">{currentCard.definition}</p>

                  <!-- Rich Data Block -->
                  {#if currentCard.mnemonic || currentCard.etymology}
                    <div class="grid gap-4 text-left border-t border-dim/30 pt-4 mt-4">
                      {#if currentCard.mnemonic}
                        <div class="bg-dim/10 p-3 rounded border border-dim/20 relative group/hint">
                          <span class="text-[10px] uppercase text-danger font-heading block mb-1">Mnemonic</span>
                          <p class="text-sm font-body text-main blur-[2px] group-hover/hint:blur-0 transition-all cursor-help">{currentCard.mnemonic}</p>
                        </div>
                      {/if}

                      {#if currentCard.etymology}
                        <div>
                          <span class="text-[10px] uppercase text-dim font-heading">Etymology</span>
                          <p class="text-xs font-body text-dim italic">{currentCard.etymology}</p>
                        </div>
                      {/if}
                    </div>
                  {/if}

                  {#if currentCard.example}
                    <div class="text-sm text-dim border-l-2 border-danger pl-4 text-left italic">
                      "{currentCard.example}"
                    </div>
                  {/if}
               </div>
             {/if}
           {/if}
        </div>

        <!-- Controls (Bottom Fixed) -->
        <div class="mt-4 pt-4 border-t border-dim/20">
          {#if !isRevealed}
             <button onclick={() => isRevealed = true} class="w-full py-6 border border-dim text-dim font-body hover:text-accent hover:border-accent transition-all tracking-[0.5em]">
               [ {$t.btn_reveal} ]
             </button>
          {:else}
             <div class="grid grid-cols-2 gap-4">
               <button onclick={() => handleGrade('fail')} class="py-4 border border-danger text-danger hover:bg-danger hover:text-bg font-heading font-bold transition-all">
                 {$t.btn_fail}
               </button>
               <button onclick={() => handleGrade('pass')} class="py-4 border border-success text-success hover:bg-success hover:text-bg font-heading font-bold transition-all">
                 {$t.btn_pass}
               </button>
             </div>
             {#if sessionMode !== 'standard'}
               <div class="text-center mt-2 text-[10px] text-dim font-body">{$t.msg_locked}</div>
             {/if}
          {/if}
        </div>
      </div>
    </div>
    {/if}

  {:else if view === 'summary'}
    <div class="text-center bg-panel border border-accent p-12 w-full max-w-lg relative shadow-2xl">
      <h2 class="font-heading text-3xl text-main mb-4">{$t.sum_title}</h2>
      <div class="grid grid-cols-2 gap-8 mb-8 font-body">
        <div>
          <div class="text-4xl text-success">{sessionStats.correct}</div>
          <div class="text-xs text-dim">{$t.sum_good}</div>
        </div>
        <div>
          <div class="text-4xl text-danger">{sessionStats.wrong}</div>
          <div class="text-xs text-dim">{$t.sum_bad}</div>
        </div>
      </div>
      <a href="/" class="inline-block bg-accent text-bg font-bold px-8 py-3 font-heading hover:shadow-[0_0_20px_currentColor] transition-all">
        {$t.btn_exit}
      </a>
    </div>
  {/if}
</div>
