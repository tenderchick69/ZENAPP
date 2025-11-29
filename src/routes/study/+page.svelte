<script lang="ts">
  import { page } from '$app/state';
  import { onMount } from 'svelte';
  import { supabase } from '$lib/supabase';
  import { calculateNextReview, type Card } from '$lib/srs';
  import { goto } from '$app/navigation';
  import { t, theme } from '$lib/theme';
  import { helpMode } from '$lib/tooltip';
  import EmberGarden from '../../components/EmberGarden.svelte';
  import FrostGlass from '../../components/FrostGlass.svelte';
  import Tooltip from '../../components/Tooltip.svelte';

  let deckId = page.url.searchParams.get('id');
  let view: 'lobby' | 'study' | 'summary' | 'inspect' = 'lobby';
  let cramAmount = 20;
  let sessionMode: 'standard' | 'all' | 'souls' | 'overclock' = 'standard';

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

  // Deck renaming
  let isRenaming = false;
  let deckName = '';

  // Gardener (Edit Card) Modal
  let editingCard: Card | null = null;
  let gardenerForm = { headword: '', definition: '', mnemonic: '', etymology: '', gloss_de: '' };

  // Toast Notifications
  let toastMessage = '';
  let showToast = false;

  onMount(async () => {
    if (!deckId) return goto('/');
    await loadStats();
  });

  async function loadStats() {
    // Fetch deck name
    const { data: deck } = await supabase.from('decks').select('name').eq('id', deckId).single();
    if (deck) deckName = deck.name;

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

  async function renameDeck() {
    if (!deckName.trim()) return;
    const { error } = await supabase.from('decks').update({ name: deckName }).eq('id', deckId);
    if (!error) {
      isRenaming = false;
    }
  }

  // Toast Notification System
  function showToastMessage(message: string) {
    toastMessage = message;
    showToast = true;
    setTimeout(() => {
      showToast = false;
    }, 2000);
  }

  // Gardener Modal Functions
  function openGardenerModal(card: Card) {
    editingCard = card;
    gardenerForm = {
      headword: card.headword,
      definition: card.definition,
      mnemonic: card.mnemonic || '',
      etymology: card.etymology || '',
      gloss_de: card.gloss_de || ''
    };
  }

  function closeGardenerModal() {
    editingCard = null;
  }

  async function saveCardEdits() {
    if (!editingCard) return;

    const { error } = await supabase.from('cards').update({
      headword: gardenerForm.headword,
      definition: gardenerForm.definition,
      mnemonic: gardenerForm.mnemonic || null,
      etymology: gardenerForm.etymology || null,
      gloss_de: gardenerForm.gloss_de || null
    }).eq('id', editingCard.id);

    if (!error) {
      await loadStats(); // Reload all cards
      closeGardenerModal();
      showToastMessage($theme === 'ember' ? 'Changes burned in.' : 'Changes saved.');
    }
  }

  async function deleteCard(cardId: number) {
    if (!confirm($theme === 'ember' ? 'Compost this seed?' : 'Delete this card permanently?')) return;

    const { error } = await supabase.from('cards').delete().eq('id', cardId);

    if (!error) {
      await loadStats(); // Reload all cards
      closeGardenerModal();
      showToastMessage($theme === 'ember' ? 'Seed composted.' : 'Card deleted.');
    }
  }

  async function startSession(mode: 'standard' | 'all' | 'overclock' | 'souls') {
    sessionMode = mode;
    const now = new Date().toISOString();
    let query = supabase.from('cards').select('*').eq('deck_id', deckId);

    if (mode === 'standard') query = query.lt('state', 5).or(`state.eq.0,due.lte.${now}`).order('due', { ascending: true }).limit(50);
    else if (mode === 'all') query = query.lt('state', 5).limit(50);
    else if (mode === 'overclock') query = query.limit(cramAmount);
    else if (mode === 'souls') query = query.eq('state', 5).limit(50);

    const { data } = await query;
    if (data && data.length > 0) {
      // For souls mode, map state 5 cards to state 4 so they're treated as active
      if (mode === 'souls') {
        queue = data.map(card => ({ ...card, state: 4 })).sort(() => Math.random() - 0.5);
      } else {
        queue = (mode === 'overclock' || mode === 'all') ? data.sort(() => Math.random() - 0.5) : data;
      }
      view = 'study';
      nextCard();
    } else {
      showToastMessage($theme === 'ember' ? 'No souls to revisit.' : 'No mastered cards.');
    }
  }

  function nextCard() {
    if (queue.length === 0) { view = 'summary'; return; }
    currentCard = queue[0];
    isRevealed = false;
    isEditing = false;
  }

  function speak(text: string, lang?: string) {
    if (!window.speechSynthesis) return;

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const u = new SpeechSynthesisUtterance(text);
    u.rate = 0.8; // Slightly slower for learning
    u.volume = 1.0;

    // Set language if provided (format: 'ko-KR', 'ja-JP', etc.)
    if (lang) {
      u.lang = lang;
    }

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

  // Handler for FrostGlass grade events
  async function handleFrostGrade(event: CustomEvent<{ id: number; rating: 'pass' | 'fail' }>) {
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
    <div class="w-full border border-dim bg-panel p-12 shadow-lg relative overflow-hidden transition-colors min-h-[600px] flex flex-col justify-center rounded-3xl">
      {#if $theme === 'syndicate'}
        <div class="absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(0,255,242,0.02)_50%)] bg-[length:100%_4px] pointer-events-none"></div>
      {/if}

      <!-- Header / Renamer -->
      <div class="mb-12 text-center relative group">
        {#if isRenaming}
          <!-- svelte-ignore a11y_autofocus -->
          <input
            bind:value={deckName}
            onkeydown={(e) => e.key === 'Enter' && renameDeck()}
            class="text-5xl md:text-7xl font-heading text-main bg-transparent border-b-2 border-accent text-center outline-none w-full"
            autofocus
          />
          <div class="text-xs text-dim mt-2">Press Enter to Save</div>
        {:else}
          <!-- svelte-ignore a11y_click_events_have_key_events -->
          <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
          <h1 class="text-5xl md:text-7xl font-heading text-main tracking-tight cursor-pointer hover:text-accent transition-colors flex items-center justify-center gap-4"
              onclick={() => isRenaming = true}>
            {deckName || 'Loading...'}
            <span class="opacity-0 group-hover:opacity-50 text-2xl">✎</span>
          </h1>
        {/if}
      </div>

      <!-- Stats Grid with Cubic Buttons -->
      <div class="grid grid-cols-3 gap-8 mb-12 w-full max-w-2xl mx-auto">
        <!-- Column 1: Wilting / Due -->
        <div class="flex flex-col items-center gap-6">
          <div class="bg-bg/50 border border-dim p-6 text-center group hover:border-danger transition-colors rounded-2xl cursor-default select-none w-full">
            <div class="text-5xl md:text-6xl font-heading text-danger mb-2">{stats.due}</div>
            <div class="text-xs tracking-[0.2em] uppercase text-dim group-hover:text-danger">{$t.stat_due}</div>
          </div>
          <Tooltip text="Study cards that are due for review.">
            <button
              onclick={() => startSession('standard')}
              disabled={stats.due === 0}
              class="w-24 h-24 aspect-square rounded-xl border-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none flex items-center justify-center font-ember text-lg cursor-pointer
                {$theme === 'ember' ? 'border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-black' :
                 $theme === 'frost' ? 'border-slate-400 text-slate-300 hover:bg-slate-400 hover:text-[#1a2a3a]' :
                 $theme === 'syndicate' ? 'border-rose-500 text-rose-500 hover:bg-rose-500 hover:text-black' :
                 'border-[#c9a89a] text-[#c9a89a] hover:bg-[#c9a89a] hover:text-[#1c1917]'}">
              Study
            </button>
          </Tooltip>
        </div>

        <!-- Column 2: Garden Size / Total -->
        <div class="flex flex-col items-center gap-6">
          <div class="bg-bg/50 border border-dim p-6 text-center group hover:border-success transition-colors rounded-2xl cursor-default select-none w-full">
            <div class="text-5xl md:text-6xl font-heading text-success mb-2">{stats.total}</div>
            <div class="text-xs tracking-[0.2em] uppercase text-dim group-hover:text-success">{$t.stat_learn}</div>
          </div>
          <Tooltip text="Review all cards in random order.">
            <button
              onclick={() => startSession('all')}
              disabled={stats.total - stats.mastered === 0}
              class="w-24 h-24 aspect-square rounded-xl border-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none flex items-center justify-center font-ember text-lg cursor-pointer
                {$theme === 'ember' ? 'border-yellow-500 text-yellow-500 hover:bg-yellow-500 hover:text-black' :
                 $theme === 'frost' ? 'border-cyan-400 text-cyan-300 hover:bg-cyan-400 hover:text-[#1a2a3a]' :
                 $theme === 'syndicate' ? 'border-lime-400 text-lime-400 hover:bg-lime-400 hover:text-black' :
                 'border-[#8a9a5b] text-[#8a9a5b] hover:bg-[#8a9a5b] hover:text-[#1c1917]'}">
              All
            </button>
          </Tooltip>
        </div>

        <!-- Column 3: Eternal / Mastered -->
        <div class="flex flex-col items-center gap-6">
          <div class="bg-bg/50 border border-dim p-6 text-center group hover:border-accent transition-colors rounded-2xl cursor-default select-none w-full">
            <div class="text-5xl md:text-6xl font-heading text-accent mb-2">{stats.mastered}</div>
            <div class="text-xs tracking-[0.2em] uppercase text-dim group-hover:text-accent">{$t.stat_master}</div>
          </div>
          <Tooltip text="Test your knowledge of mastered cards.">
            <button
              onclick={() => startSession('souls')}
              disabled={stats.mastered === 0}
              class="w-24 h-24 aspect-square rounded-xl border-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none flex items-center justify-center font-ember text-lg cursor-pointer
                {$theme === 'ember' ? 'border-rose-500 text-rose-500 hover:bg-rose-500 hover:text-black' :
                 $theme === 'frost' ? 'border-sky-400 text-sky-300 hover:bg-sky-400 hover:text-[#1a2a3a]' :
                 $theme === 'syndicate' ? 'border-cyan-400 text-cyan-400 hover:bg-cyan-400 hover:text-black' :
                 'border-[#a8c5c5] text-[#a8c5c5] hover:bg-[#a8c5c5] hover:text-[#1c1917]'}">
              {$theme === 'ember' ? 'Souls' : $theme === 'frost' ? 'Traces' : $theme === 'syndicate' ? 'Archive' : 'Essence'}
            </button>
          </Tooltip>
        </div>
      </div>

      <!-- Wildfire Row -->
      <div class="flex flex-row items-center justify-center gap-6 mb-12">
        <Tooltip text="Number of cards for the Wildfire session.">
          <input
            type="number"
            bind:value={cramAmount}
            class="w-16 h-12 text-center bg-transparent border border-white/20 rounded-lg focus:outline-none focus:ring-0 focus:border-accent font-ember text-xl [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
        </Tooltip>
        <Tooltip text="Study a random set of cards, even if not due.">
          <button
            onclick={() => startSession('overclock')}
            class="rounded-xl h-12 px-6 border border-accent text-accent hover:bg-accent hover:text-bg transition-all cursor-pointer font-ember">
            {$t.mode_cram}
          </button>
        </Tooltip>
      </div>

      <!-- Footer -->
      <div class="flex justify-center gap-8">
         <button onclick={() => view = 'inspect'} class="text-sm font-ember opacity-50 hover:opacity-100 transition-opacity cursor-pointer uppercase tracking-widest">[ {$t.btn_inspect} ]</button>
         <a href="/" class="text-sm font-ember opacity-50 hover:opacity-100 transition-opacity cursor-pointer uppercase tracking-widest">[ {$t.btn_exit} ]</a>
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
          <button
            onclick={() => openGardenerModal(card)}
            class="w-full grid grid-cols-12 gap-4 p-3 border-b border-dim/30 hover:bg-accent/10 hover:border-accent/50 text-xs font-body items-center group cursor-pointer transition-all hover:shadow-[0_0_15px_rgba(var(--color-accent-rgb),0.2)] rounded-lg">
             <div class="col-span-1 flex gap-0.5">
               {#each [1,2,3,4,5] as l}
                 <div class="w-1 h-3 {card.state >= l ? 'bg-accent' : 'bg-dim/30'}"></div>
               {/each}
             </div>
             <div class="col-span-5 font-bold text-main group-hover:text-accent transition-colors truncate text-left">{card.headword}</div>
             <div class="col-span-3 text-dim truncate text-left">{card.definition}</div>
             <div class="col-span-3 text-right {new Date(card.due) <= new Date() ? 'text-danger' : 'text-success'}">
               {formatDate(card.due)}
             </div>
          </button>
        {/each}
      </div>
    </div>

  <!-- STUDY VIEW -->
  {:else if view === 'study'}
    {#if $theme === 'ember'}
      <!-- EMBER GARDEN VIEW -->
      <EmberGarden {queue} on:grade={handleEmberGrade} on:exit={() => view = 'lobby'} />
    {:else if $theme === 'frost'}
      <!-- FROST GLASS VIEW -->
      <FrostGlass {queue} on:grade={handleFrostGrade} on:exit={() => view = 'lobby'} />
    {:else if currentCard}
      <!-- STANDARD CARD VIEW -->
      <div class="w-full max-w-3xl mx-auto relative perspective-1000">
        <div class="border border-dim bg-panel p-12 min-h-[700px] flex flex-col justify-between shadow-2xl relative overflow-hidden transition-colors rounded-2xl">

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
           <div class="absolute top-0 right-0 z-10 flex gap-2">
             <button onclick={(e) => { e.stopPropagation(); if (currentCard) speak(currentCard.headword); }}
               aria-label="Play pronunciation"
               title="Listen to pronunciation"
               class="p-3 text-accent hover:text-success transition-all hover:scale-110 bg-panel/50 hover:bg-panel rounded-lg border border-transparent hover:border-accent/30">
               <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>
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
                 class="text-6xl md:text-7xl font-heading text-main mb-6 tracking-tight cursor-pointer hover:text-accent transition-colors bg-transparent border-none"
                 style="text-shadow: 0 2px 8px rgba(0,0,0,0.15);"
                 onclick={() => { if (currentCard) speak(currentCard.headword); }}>
                 {currentCard.headword}
             </button>

             {#if isRevealed}
               <div class="space-y-6 w-full max-w-xl" class:animate-glitch={$theme === 'syndicate'}>
                  {#if currentCard.ipa}<p class="text-dim font-body text-base">/{currentCard.ipa}/</p>{/if}
                  <p class="text-3xl text-accent font-body leading-relaxed">{currentCard.definition}</p>

                  <!-- Synonyms Section -->
                  {#if currentCard.synonyms}
                    <div class="bg-success/5 p-3 rounded border border-success/20">
                      <span class="text-xs uppercase text-success/80 font-heading block mb-1">Related Words</span>
                      <p class="text-base font-body text-success leading-relaxed">{currentCard.synonyms}</p>
                    </div>
                  {/if}

                  <!-- Rich Data Block -->
                  {#if currentCard.mnemonic || currentCard.etymology}
                    <div class="grid gap-4 text-left border-t border-dim/30 pt-4 mt-4">
                      {#if currentCard.mnemonic}
                        <div class="bg-dim/10 p-4 rounded border border-dim/20 relative group/hint">
                          <span class="text-xs uppercase text-danger font-heading block mb-2">Mnemonic</span>
                          <p class="text-base font-body text-main blur-[2px] group-hover/hint:blur-0 transition-all cursor-help leading-relaxed">{currentCard.mnemonic}</p>
                        </div>
                      {/if}

                      {#if currentCard.etymology}
                        <div class="bg-dim/5 p-3 rounded">
                          <span class="text-xs uppercase text-accent/80 font-heading block mb-1">Etymology</span>
                          <p class="text-base font-body text-main/90 italic leading-relaxed">{currentCard.etymology}</p>
                        </div>
                      {/if}
                    </div>
                  {/if}

                  {#if currentCard.example}
                    <div class="border-l-2 border-danger pl-4 text-left space-y-2">
                      <p class="text-base text-main/90 italic leading-relaxed font-bold">
                        "{currentCard.example}"
                      </p>
                      {#if currentCard.example_gloss}
                        <p class="text-sm text-dim italic leading-relaxed">
                          "{currentCard.example_gloss}"
                        </p>
                      {/if}
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

  <!-- Gardener Edit Modal -->
  {#if editingCard}
    <div class="fixed inset-0 flex items-center justify-center z-50 px-4">
      <!-- Backdrop -->
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div
        class="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onclick={closeGardenerModal}>
      </div>

      <!-- Modal Content -->
      <div class="relative bg-panel border-2 border-accent/50 p-8 rounded-2xl max-w-2xl w-full shadow-[0_0_60px_rgba(var(--color-accent-rgb),0.3)] max-h-[90vh] overflow-y-auto">

        <!-- Header -->
        <div class="flex justify-between items-center mb-6">
          <h2 class="font-heading text-3xl text-accent">
            {$theme === 'ember' ? 'Tend This Seed' : 'Edit Card'}
          </h2>
          <button
            onclick={closeGardenerModal}
            class="text-dim hover:text-accent transition-colors text-2xl leading-none cursor-pointer">
            ✕
          </button>
        </div>

        <!-- Form -->
        <div class="space-y-6">
          <!-- Headword -->
          <div>
            <!-- svelte-ignore a11y_label_has_associated_control -->
            <label class="block text-xs font-body uppercase tracking-widest text-dim mb-2">Headword</label>
            <input
              bind:value={gardenerForm.headword}
              class="w-full bg-bg border border-dim p-4 text-main font-heading text-2xl focus:border-accent outline-none transition-colors rounded-lg"
              placeholder="Enter word..." />
          </div>

          <!-- Definition -->
          <div>
            <!-- svelte-ignore a11y_label_has_associated_control -->
            <label class="block text-xs font-body uppercase tracking-widest text-dim mb-2">Definition</label>
            <textarea
              bind:value={gardenerForm.definition}
              class="w-full bg-bg border border-dim p-4 text-accent font-body text-lg focus:border-accent outline-none transition-colors rounded-lg min-h-[100px] resize-y"
              placeholder="Enter definition..."></textarea>
          </div>

          <!-- German Gloss (Optional) -->
          <div>
            <!-- svelte-ignore a11y_label_has_associated_control -->
            <label class="block text-xs font-body uppercase tracking-widest text-dim mb-2">German Translation (Optional)</label>
            <input
              bind:value={gardenerForm.gloss_de}
              class="w-full bg-bg border border-dim p-3 text-main font-body focus:border-accent outline-none transition-colors rounded-lg"
              placeholder="Deutsch..." />
          </div>

          <!-- Mnemonic (Optional) -->
          <div>
            <!-- svelte-ignore a11y_label_has_associated_control -->
            <label class="block text-xs font-body uppercase tracking-widest text-dim mb-2">Mnemonic (Optional)</label>
            <textarea
              bind:value={gardenerForm.mnemonic}
              class="w-full bg-bg border border-dim p-3 text-main font-body focus:border-accent outline-none transition-colors rounded-lg min-h-[80px] resize-y"
              placeholder="Memory aid..."></textarea>
          </div>

          <!-- Etymology (Optional) -->
          <div>
            <!-- svelte-ignore a11y_label_has_associated_control -->
            <label class="block text-xs font-body uppercase tracking-widest text-dim mb-2">Etymology (Optional)</label>
            <input
              bind:value={gardenerForm.etymology}
              class="w-full bg-bg border border-dim p-3 text-main font-body focus:border-accent outline-none transition-colors rounded-lg"
              placeholder="Word origin..." />
          </div>
        </div>

        <!-- Actions -->
        <div class="flex gap-4 mt-8">
          <button
            onclick={saveCardEdits}
            class="flex-1 py-4 bg-accent text-bg font-heading text-lg font-bold hover:shadow-[0_0_30px_currentColor/40] transition-all rounded-full cursor-pointer">
            Save Changes
          </button>
          <button
            onclick={() => deleteCard(editingCard!.id)}
            class="px-6 py-4 border-2 border-danger text-danger hover:bg-danger hover:text-bg font-heading text-lg transition-all rounded-full cursor-pointer"
            title={$theme === 'ember' ? 'Compost' : 'Delete'}>
            {$theme === 'ember' ? '🍂' : '🗑️'}
          </button>
        </div>
      </div>
    </div>
  {/if}

  <!-- Toast Notification -->
  {#if showToast}
    <div class="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div class="bg-accent/95 text-bg px-8 py-4 rounded-full shadow-[0_0_40px_currentColor/50] backdrop-blur-sm">
        <p class="font-ember text-lg font-bold tracking-wide whitespace-nowrap">
          {toastMessage}
        </p>
      </div>
    </div>
  {/if}
</div>
