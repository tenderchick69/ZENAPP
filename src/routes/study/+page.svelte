<script lang="ts">
  import { page } from '$app/state';
  import { onMount } from 'svelte';
  import { supabase } from '$lib/supabase';
  import { calculateNextReview, type Card } from '$lib/srs';
  import { goto } from '$app/navigation';
  import { t, theme } from '$lib/theme';
  import { helpMode } from '$lib/tooltip';
  import { speak as ttsSpeak } from '$lib/tts';
  import { exportDeckToCSV } from '$lib/export';
  import { user } from '$lib/auth';
  import { getSignedImageUrl } from '$lib/storage';
  import EmberGarden from '../../components/EmberGarden.svelte';
  import FrostGlass from '../../components/FrostGlass.svelte';
  import ZenVoid from '../../components/ZenVoid.svelte';
  import SyndicateGrid from '../../components/SyndicateGrid.svelte';
  import Tooltip from '../../components/Tooltip.svelte';
  import ImageGenerator from '../../components/ImageGenerator.svelte';

  // Make deckId reactive to URL changes
  let deckId = $derived(page.url.searchParams.get('id'));

  let view = $state<'lobby' | 'study' | 'summary' | 'inspect'>('lobby');
  let cramAmount = $state(20);
  let sessionMode = $state<'standard' | 'all' | 'souls' | 'overclock'>('standard');

  // Data
  let queue = $state<Card[]>([]);
  let allCards = $state<any[]>([]);
  let currentCard = $state<Card | null>(null);

  // State
  let isRevealed = $state(false);
  let isEditing = $state(false);
  let editForm = $state({ headword: '', definition: '' });
  let sessionStats = $state({ correct: 0, wrong: 0 });
  let stats = $state({ due: 0, learning: 0, mastered: 0, total: 0 });
  let levelDist = $state([0, 0, 0, 0, 0, 0]);

  // Deck renaming
  let showRenameModal = $state(false);
  let deckName = $state('');
  let renameInputValue = $state('');

  // Gardener (Edit Card) Modal
  let editingCard = $state<Card | null>(null);
  let isSaving = $state(false);
  let saveButtonText = $state('Save Changes');
  let gardenerForm = $state({
    headword: '',
    definition: '',
    mnemonic: '',
    etymology: '',
    gloss_de: '',
    image_urls: [] as string[],
    selected_image_index: 0
  });

  // Toast Notifications
  let toastMessage = $state('');
  let showToast = $state(false);

  // Image Mode Toggle
  let showImages = $state(false);

  // Track previous deckId to detect changes
  let prevDeckId = $state<string | null>(null);

  onMount(async () => {
    if (!deckId) return goto('/');
    // Load image preference from localStorage
    showImages = localStorage.getItem('study_show_images') === 'true';
    prevDeckId = deckId;
    await loadStats();
  });

  // React to deckId changes (when switching decks without full page reload)
  $effect(() => {
    if (deckId && deckId !== prevDeckId && prevDeckId !== null) {
      console.log('Deck ID changed from', prevDeckId, 'to', deckId);
      prevDeckId = deckId;
      // Reset view and reload data
      view = 'lobby';
      queue = [];
      currentCard = null;
      sessionStats = { correct: 0, wrong: 0 };
      loadStats();
    }
  });

  // Track previous theme - no longer restarts session, just logs
  // Theme components will re-mount but queue persists with mastered state
  let prevTheme = $state<string | null>(null);

  $effect(() => {
    const currentTheme = $theme;
    if (prevTheme !== null && currentTheme !== prevTheme && view === 'study') {
      console.log('Theme changed during study:', prevTheme, '->', currentTheme);
      // Queue and mastered state persist - new theme component will initialize from it
    }
    prevTheme = currentTheme;
  });

  // Handler for exiting study mode back to lobby
  async function exitToLobby() {
    console.log('exitToLobby called');
    view = 'lobby';
    queue = [];
    currentCard = null;
    sessionStats = { correct: 0, wrong: 0 };
    // Reload stats to reflect any changes made during study
    try {
      await loadStats();
    } catch (e) {
      console.error('Failed to load stats on exit:', e);
    }
  }

  function toggleImageMode() {
    showImages = !showImages;
    localStorage.setItem('study_show_images', showImages.toString());
  }

  // Get the selected image URL for a card (handles both old and new formats)
  function getCardImageUrl(card: Card | null): string | null {
    if (!card) return null;
    const cardAny = card as any;
    // New format: image_urls array with selected_image_index
    if (cardAny.image_urls && Array.isArray(cardAny.image_urls) && cardAny.image_urls.length > 0) {
      const idx = cardAny.selected_image_index || 0;
      return cardAny.image_urls[idx] || cardAny.image_urls[0];
    }
    // Legacy format: single image_url
    if (cardAny.image_url) {
      return cardAny.image_url;
    }
    return null;
  }

  async function loadStats() {
    if (!deckId) {
      console.error('loadStats: No deckId');
      return;
    }

    try {
      // Add timeout to prevent infinite hanging
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Load stats timed out')), 10000)
      );

      // Fetch deck name
      const deckPromise = supabase.from('decks').select('name').eq('id', deckId).single();
      const { data: deck } = await Promise.race([deckPromise, timeoutPromise]) as any;
      if (deck) deckName = deck.name;

      // Fetch cards
      const cardsPromise = supabase.from('cards').select('*').eq('deck_id', deckId);
      const { data } = await Promise.race([cardsPromise, timeoutPromise]) as any;

      if (data) {
        allCards = data;
        stats.total = data.length;
        stats.mastered = data.filter((c: any) => c.state === 5).length;
        stats.learning = data.filter((c: any) => c.state > 0 && c.state < 5).length;
        stats.due = data.filter((c: any) => c.state < 5 && (c.state === 0 || new Date(c.due) <= new Date())).length;

        levelDist = [0, 0, 0, 0, 0, 0];
        data.forEach((c: any) => {
          const lvl = Math.min(Math.max(c.state, 0), 5);
          levelDist[lvl]++;
        });
      }
    } catch (e) {
      console.error('loadStats error:', e);
      // Still set some default values so the UI doesn't break
      if (!deckName) deckName = 'Unknown Deck';
    }
  }

  function openRenameModal() {
    renameInputValue = deckName;
    showRenameModal = true;
  }

  async function saveRename() {
    if (!renameInputValue.trim()) return;
    const { error } = await supabase.from('decks').update({ name: renameInputValue.trim() }).eq('id', deckId);
    if (!error) {
      deckName = renameInputValue.trim();
      showRenameModal = false;
    }
  }

  function cancelRename() {
    showRenameModal = false;
    renameInputValue = deckName;
  }

  async function deleteDeck() {
    if (!confirm('Delete this deck? All cards will be permanently lost.')) return;

    // Delete all cards first
    await supabase.from('cards').delete().eq('deck_id', deckId);
    // Delete the deck
    await supabase.from('decks').delete().eq('id', deckId);
    // Redirect to home
    goto('/');
  }

  // Export deck
  let isExporting = $state(false);

  async function handleExportDeck() {
    if (!deckId || isExporting) return;
    isExporting = true;
    try {
      await exportDeckToCSV(parseInt(deckId), deckName);
      showToastMessage($theme === 'ember' ? 'Seeds exported.' : 'Deck exported.');
    } catch (err) {
      console.error('Export failed:', err);
      showToastMessage('Export failed.');
    } finally {
      isExporting = false;
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
    console.log('openGardenerModal called with card:', card);
    editingCard = card;
    isSaving = false;
    saveButtonText = 'Save Changes';
    // Handle both old (image_url) and new (image_urls) formats
    const cardAny = card as any;
    let urls: string[] = [];
    if (cardAny.image_urls && Array.isArray(cardAny.image_urls)) {
      urls = [...cardAny.image_urls]; // Create a copy to avoid mutation issues
    } else if (cardAny.image_url) {
      urls = [cardAny.image_url];
    }

    console.log('Image URLs found:', urls);
    console.log('Selected index:', cardAny.selected_image_index || 0);

    gardenerForm = {
      headword: card.headword,
      definition: card.definition,
      mnemonic: card.mnemonic || '',
      etymology: card.etymology || '',
      gloss_de: card.gloss_de || '',
      image_urls: urls,
      selected_image_index: cardAny.selected_image_index || 0
    };

    console.log('gardenerForm after set:', gardenerForm);
  }

  function closeGardenerModal() {
    editingCard = null;
  }

  async function saveCardEdits() {
    console.log('=== SAVE STARTED ===');

    // Prevent double-clicks
    if (isSaving) {
      console.log('Already saving, ignoring click');
      return;
    }

    if (!editingCard) {
      console.error('No editingCard!');
      alert('Save failed: No card selected');
      return;
    }

    isSaving = true;
    saveButtonText = 'Saving...';

    try {
      // Get the selected image for backward compatibility
      const selectedUrl = gardenerForm.image_urls[gardenerForm.selected_image_index] || null;

      const updateData = {
        headword: gardenerForm.headword,
        definition: gardenerForm.definition,
        mnemonic: gardenerForm.mnemonic || null,
        etymology: gardenerForm.etymology || null,
        gloss_de: gardenerForm.gloss_de || null,
        image_urls: gardenerForm.image_urls,
        selected_image_index: gardenerForm.selected_image_index,
        image_url: selectedUrl // backward compatibility
      };
      console.log('Saving card:', editingCard.id, updateData);

      // Add timeout to prevent infinite hanging
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Save timed out after 10 seconds')), 10000)
      );

      const savePromise = supabase
        .from('cards')
        .update(updateData)
        .eq('id', editingCard.id)
        .select()
        .single();

      const { data, error: updateError } = await Promise.race([savePromise, timeoutPromise]) as any;

      if (updateError) {
        console.error('=== SAVE FAILED ===', updateError);
        saveButtonText = 'Save Failed!';
        showToastMessage('Save failed: ' + updateError.message);
        return;
      }

      console.log('=== SAVE SUCCESS ===', data);
      saveButtonText = 'Saved ✓';

      await loadStats(); // Reload all cards
      closeGardenerModal();
      showToastMessage($theme === 'ember' ? 'Changes burned in.' : 'Changes saved.');
    } catch (error: any) {
      console.error('=== SAVE EXCEPTION ===', error);
      saveButtonText = 'Error!';
      showToastMessage('Save error: ' + (error.message || 'Unknown error'));
    } finally {
      isSaving = false;
      // Reset button text after a delay so user sees the result
      setTimeout(() => {
        saveButtonText = 'Save Changes';
      }, 1500);
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
        queue = (mode === 'overclock' || mode === 'all') ? [...data].sort(() => Math.random() - 0.5) : data;
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

  // Use TTS utility - alias for backward compatibility
  function speak(text: string, lang?: string) {
    ttsSpeak(text, lang || 'English');
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

  // Unified grade handler - updates queue mastered state for theme persistence
  async function handleGrade(event: CustomEvent<{ id: number; rating: 'pass' | 'fail' }>) {
    const { id, rating } = event.detail;
    const card = queue.find(c => c.id === id);
    if (!card) return;

    if (rating === 'fail') {
      sessionStats.wrong++;
      const updates = calculateNextReview(card, 'fail');
      await supabase.from('cards').update({ state: updates.state }).eq('id', card.id);
    } else {
      sessionStats.correct++;
      // Mark as mastered in queue so theme switch preserves state
      queue = queue.map(c => c.id === id ? { ...c, mastered: true } : c);
      if (sessionMode === 'standard') {
        const updates = calculateNextReview(card, 'pass');
        await supabase.from('cards').update(updates).eq('id', card.id);
      }
    }
  }

  // Theme-specific handlers (all delegate to unified handler)
  const handleEmberGrade = handleGrade;
  const handleFrostGrade = handleGrade;
  const handleZenGrade = handleGrade;
  const handleSyndicateGrade = handleGrade;
</script>

<div class="min-h-[80vh] flex flex-col items-center justify-center max-w-3xl mx-auto px-6">

  <!-- LOBBY -->
  {#if view === 'lobby'}
    <div class="w-full border border-dim bg-panel p-6 md:p-14 shadow-lg relative overflow-hidden transition-colors h-auto md:h-[780px] flex flex-col justify-center rounded-3xl">
      {#if $theme === 'syndicate'}
        <div class="absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(0,255,242,0.02)_50%)] bg-[length:100%_4px] pointer-events-none"></div>
      {/if}

      <!-- Header -->
      <div class="mb-6 md:mb-12 text-center">
        <h1 class="text-3xl md:text-7xl font-heading text-main tracking-tight">
          {deckName || 'Loading...'}
        </h1>

        <!-- Action Buttons (Below Title) -->
        <div class="flex items-center justify-center gap-1 md:gap-2 mt-4">
          <!-- Download Button -->
          <Tooltip text="Download Deck">
            <button
              onclick={handleExportDeck}
              disabled={isExporting}
              class="text-dim hover:text-accent transition-colors p-2 cursor-pointer disabled:opacity-50"
              title="Download deck">
              {#if isExporting}
                <span class="animate-spin text-sm">⏳</span>
              {:else}
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="7 10 12 15 17 10"></polyline>
                  <line x1="12" y1="15" x2="12" y2="3"></line>
                </svg>
              {/if}
            </button>
          </Tooltip>

          <!-- Rename Button -->
          <Tooltip text="Rename Deck">
            <button
              onclick={openRenameModal}
              class="text-dim hover:text-accent transition-colors p-2 cursor-pointer"
              title="Rename deck">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
            </button>
          </Tooltip>

          <!-- Delete Button -->
          <Tooltip text="Delete Deck">
            <button
              onclick={deleteDeck}
              class="text-dim hover:text-danger transition-colors p-2 cursor-pointer"
              title="Delete deck">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
            </button>
          </Tooltip>
        </div>
      </div>

      <!-- Stats Grid with Cubic Buttons -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-10 mb-8 md:mb-14 w-full max-w-3xl mx-auto">
        <!-- Column 1: Wilting / Due -->
        <div class="flex flex-row md:flex-col items-center gap-3 md:gap-6">
          <div class="bg-bg/50 border border-dim h-[100px] md:h-[160px] text-center group hover:border-danger transition-colors rounded-2xl cursor-default select-none flex-1 md:w-full flex flex-col items-center justify-center">
            <div class="text-3xl md:text-7xl font-heading text-danger leading-none">{stats.due}</div>
            <div class="text-[10px] md:text-sm tracking-[0.1em] md:tracking-[0.2em] uppercase text-main/70 group-hover:text-danger mt-2 md:mt-4">{$t.stat_due}</div>
          </div>
          <Tooltip text="Study cards that are due for review.">
            <button
              onclick={() => startSession('standard')}
              disabled={stats.due === 0}
              class="w-18 h-18 md:w-28 md:h-28 aspect-square rounded-xl border-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none flex items-center justify-center font-ember text-base md:text-xl cursor-pointer flex-shrink-0
                {$theme === 'ember' ? 'border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-black' :
                 $theme === 'frost' ? 'border-slate-400 text-slate-300 hover:bg-slate-400 hover:text-[#1a2a3a]' :
                 $theme === 'syndicate' ? 'border-rose-500 text-rose-500 hover:bg-rose-500 hover:text-black' :
                 'border-[#c9a89a] text-[#c9a89a] hover:bg-[#c9a89a] hover:text-[#1c1917]'}">
              Study
            </button>
          </Tooltip>
        </div>

        <!-- Column 2: Garden Size / Total -->
        <div class="flex flex-row md:flex-col items-center gap-3 md:gap-6">
          <div class="bg-bg/50 border border-dim h-[100px] md:h-[160px] text-center group hover:border-success transition-colors rounded-2xl cursor-default select-none flex-1 md:w-full flex flex-col items-center justify-center">
            <div class="text-3xl md:text-7xl font-heading text-success leading-none">{stats.total}</div>
            <div class="text-[10px] md:text-sm tracking-[0.1em] md:tracking-[0.2em] uppercase text-main/70 group-hover:text-success mt-2 md:mt-4">{$t.stat_learn}</div>
          </div>
          <Tooltip text="Review all cards in random order.">
            <button
              onclick={() => startSession('all')}
              disabled={stats.total - stats.mastered === 0}
              class="w-18 h-18 md:w-28 md:h-28 aspect-square rounded-xl border-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none flex items-center justify-center font-ember text-base md:text-xl cursor-pointer flex-shrink-0
                {$theme === 'ember' ? 'border-yellow-500 text-yellow-500 hover:bg-yellow-500 hover:text-black' :
                 $theme === 'frost' ? 'border-cyan-400 text-cyan-300 hover:bg-cyan-400 hover:text-[#1a2a3a]' :
                 $theme === 'syndicate' ? 'border-lime-400 text-lime-400 hover:bg-lime-400 hover:text-black' :
                 'border-[#8a9a5b] text-[#8a9a5b] hover:bg-[#8a9a5b] hover:text-[#1c1917]'}">
              All
            </button>
          </Tooltip>
        </div>

        <!-- Column 3: Eternal / Mastered -->
        <div class="flex flex-row md:flex-col items-center gap-3 md:gap-6">
          <div class="bg-bg/50 border border-dim h-[100px] md:h-[160px] text-center group hover:border-accent transition-colors rounded-2xl cursor-default select-none flex-1 md:w-full flex flex-col items-center justify-center">
            <div class="text-3xl md:text-7xl font-heading text-accent leading-none">{stats.mastered}</div>
            <div class="text-[10px] md:text-sm tracking-[0.1em] md:tracking-[0.2em] uppercase text-main/70 group-hover:text-accent mt-2 md:mt-4">{$t.stat_master}</div>
          </div>
          <Tooltip text="Test your knowledge of mastered cards.">
            <button
              onclick={() => startSession('souls')}
              disabled={stats.mastered === 0}
              class="w-18 h-18 md:w-28 md:h-28 aspect-square rounded-xl border-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none flex items-center justify-center font-ember text-base md:text-xl cursor-pointer flex-shrink-0
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
      <div class="flex flex-row items-center justify-center gap-4 md:gap-6 mb-6 md:mb-12">
        <Tooltip text="Number of cards for the Wildfire session.">
          <input
            type="number"
            bind:value={cramAmount}
            class="w-14 md:w-16 h-10 md:h-12 text-center bg-transparent border border-white/20 rounded-lg focus:outline-none focus:ring-0 focus:border-accent font-ember text-lg md:text-xl [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
        </Tooltip>
        <Tooltip text="Study a random set of cards, even if not due.">
          <button
            onclick={() => startSession('overclock')}
            class="rounded-xl h-10 md:h-12 px-4 md:px-6 border border-accent text-accent hover:bg-accent hover:text-bg transition-all cursor-pointer font-ember text-sm md:text-base">
            {$t.mode_cram}
          </button>
        </Tooltip>
      </div>

      <!-- Footer -->
      <div class="flex justify-center gap-4 md:gap-8">
         <button type="button" onclick={() => view = 'inspect'} class="text-xs md:text-sm font-ember opacity-50 hover:opacity-100 transition-opacity cursor-pointer uppercase tracking-wider md:tracking-widest">[ {$t.btn_inspect} ]</button>
         <a href="/" class="text-xs md:text-sm font-ember opacity-50 hover:opacity-100 transition-opacity cursor-pointer uppercase tracking-wider md:tracking-widest">[ {$t.btn_exit} ]</a>
      </div>
    </div>

  <!-- INSPECT VIEW -->
  {:else if view === 'inspect'}
    <div class="w-full h-[80vh] border border-dim bg-panel p-8 flex flex-col relative overflow-hidden">
      <div class="flex justify-between items-center mb-6">
        <h2 class="font-heading text-2xl text-main">{$t.inspect_title}</h2>
        <button type="button" onclick={exitToLobby} class="text-dim hover:text-accent font-body text-xs cursor-pointer">[ {$t.btn_back} ]</button>
      </div>

      <!-- Scrollable List -->
      <div class="flex-1 overflow-y-auto pr-2 space-y-1">
        {#each [...allCards].sort((a, b) => a.state - b.state || new Date(a.due).getTime() - new Date(b.due).getTime()) as card}
          <button
            onclick={() => openGardenerModal(card)}
            class="w-full flex items-center gap-3 p-3 border-b border-dim/30 hover:bg-accent/10 hover:border-accent/50 text-xs font-body group cursor-pointer transition-all hover:shadow-[0_0_15px_rgba(var(--color-accent-rgb),0.2)] rounded-lg">
             <!-- Image thumbnail -->
             <div class="w-10 h-10 flex-shrink-0 rounded overflow-hidden bg-dim/20">
               {#if getCardImageUrl(card)}
                 <img src={getCardImageUrl(card)} alt="" class="w-full h-full object-cover" />
               {:else}
                 <div class="w-full h-full flex items-center justify-center text-dim/50 text-lg">📷</div>
               {/if}
             </div>
             <!-- Level pips -->
             <div class="flex gap-0.5 flex-shrink-0">
               {#each [1,2,3,4,5] as l}
                 <div class="w-1 h-3 {card.state >= l ? 'bg-accent' : 'bg-dim/30'}"></div>
               {/each}
             </div>
             <!-- Headword -->
             <div class="flex-1 font-bold text-main group-hover:text-accent transition-colors truncate text-left">{card.headword}</div>
             <!-- Definition -->
             <div class="flex-1 text-dim truncate text-left">{card.definition}</div>
             <!-- Due date -->
             <div class="flex-shrink-0 text-right {new Date(card.due) <= new Date() ? 'text-danger' : 'text-success'}">
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
      <EmberGarden {queue} {showImages} on:grade={handleEmberGrade} on:exit={exitToLobby} on:complete={() => goto('/')} on:toggleImages={toggleImageMode} />
    {:else if $theme === 'frost'}
      <!-- FROST GLASS VIEW -->
      <FrostGlass {queue} {showImages} on:grade={handleFrostGrade} on:exit={exitToLobby} on:complete={() => goto('/')} on:toggleImages={toggleImageMode} />
    {:else if $theme === 'zen'}
      <!-- ZEN VOID VIEW -->
      <ZenVoid {queue} {showImages} on:grade={handleZenGrade} on:exit={exitToLobby} on:complete={() => goto('/')} on:toggleImages={toggleImageMode} />
    {:else if $theme === 'syndicate'}
      <!-- SYNDICATE GRID VIEW -->
      <SyndicateGrid {queue} {showImages} on:grade={handleSyndicateGrade} on:exit={exitToLobby} on:complete={() => goto('/')} on:toggleImages={toggleImageMode} />
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

           <!-- Audio/Edit/Image Toggle Buttons -->
           <div class="absolute top-0 right-0 z-10 flex gap-2">
             <!-- Image Toggle -->
             <button
               type="button"
               onclick={(e) => { e.stopPropagation(); toggleImageMode(); }}
               aria-label="Toggle image mode"
               title={showImages ? 'Hide images' : 'Show images'}
               class="p-3 transition-all hover:scale-110 bg-panel/50 hover:bg-panel rounded-lg border border-transparent hover:border-accent/30 cursor-pointer
                      {showImages ? 'text-success' : 'text-dim hover:text-accent'}">
               <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                 <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                 <circle cx="8.5" cy="8.5" r="1.5"></circle>
                 <polyline points="21 15 16 10 5 21"></polyline>
               </svg>
             </button>
             <!-- TTS Speaker -->
             <button
               type="button"
               onclick={(e) => { e.stopPropagation(); if (currentCard) speak(currentCard.headword); }}
               aria-label="Play pronunciation"
               title="Listen to pronunciation"
               class="p-3 text-accent hover:text-success transition-all hover:scale-110 bg-panel/50 hover:bg-panel rounded-lg border border-transparent hover:border-accent/30 cursor-pointer">
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
             <!-- Image Mode: Show image if available and enabled -->
             {#if showImages && getCardImageUrl(currentCard)}
               <!-- svelte-ignore a11y_click_events_have_key_events -->
               <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
               <img
                 src={getCardImageUrl(currentCard)}
                 alt={currentCard.headword}
                 onclick={() => { if (currentCard) openGardenerModal(currentCard); }}
                 class="w-64 h-64 object-cover rounded-2xl mb-6 cursor-pointer border-2 border-accent/30 hover:border-accent hover:shadow-[0_0_30px_rgba(var(--color-accent-rgb),0.3)] transition-all"
               />
               <p class="text-lg text-dim font-body mb-2">{currentCard.headword}</p>
             {:else}
               <!-- Text Mode: Show headword -->
               <button type="button"
                   class="font-heading text-main mb-6 tracking-tight cursor-pointer hover:text-accent transition-colors bg-transparent border-none max-w-full break-words overflow-wrap-anywhere"
                   style="text-shadow: 0 2px 8px rgba(0,0,0,0.15); font-size: clamp(1.5rem, 8vw, 4.5rem);"
                   onclick={() => { if (currentCard) speak(currentCard.headword); }}>
                   {currentCard.headword}
               </button>
             {/if}

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
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div
        class="relative bg-panel border-2 border-accent/50 p-8 rounded-2xl max-w-2xl w-full shadow-[0_0_60px_rgba(var(--color-accent-rgb),0.3)] max-h-[90vh] overflow-y-auto"
        onclick={(e) => e.stopPropagation()}>

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

          <!-- Image Generation -->
          <div>
            <!-- svelte-ignore a11y_label_has_associated_control -->
            <label class="block text-xs font-body uppercase tracking-widest text-dim mb-2">
              {$theme === 'ember' ? 'Seed Vision' : $theme === 'frost' ? 'Crystal Image' : $theme === 'syndicate' ? 'VISUAL RENDER' : 'Card Image'}
            </label>
            <ImageGenerator
              card={{
                id: editingCard?.id,
                headword: gardenerForm.headword,
                definition: gardenerForm.definition,
                mnemonic: gardenerForm.mnemonic,
                etymology: gardenerForm.etymology
              }}
              imageUrls={gardenerForm.image_urls}
              selectedImageIndex={gardenerForm.selected_image_index}
              userId={$user?.id}
              onImagesChanged={(urls, selectedIndex) => {
                console.log('onImagesChanged called:', { urls, selectedIndex });
                // Use object spread to ensure Svelte 5 reactivity triggers
                gardenerForm = {
                  ...gardenerForm,
                  image_urls: [...urls],
                  selected_image_index: selectedIndex
                };
                console.log('gardenerForm updated:', gardenerForm.image_urls);
              }}
            />
          </div>
        </div>

        <!-- Actions -->
        <div class="flex justify-center items-center gap-4 mt-8">
          <button
            type="button"
            onclick={(e) => {
              e.preventDefault();
              console.log('Save button clicked!');
              saveCardEdits();
            }}
            disabled={isSaving}
            class="px-8 py-3 bg-accent text-bg font-heading text-base font-bold hover:shadow-[0_0_20px_var(--color-accent)] hover:scale-105 transition-all rounded-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            class:cursor-pointer={!isSaving}>
            {saveButtonText}
          </button>
          <button
            onclick={() => deleteCard(editingCard!.id)}
            class="px-4 py-3 border-2 border-danger text-danger hover:bg-danger hover:text-bg font-heading text-base transition-all rounded-xl cursor-pointer"
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

  <!-- Rename Deck Modal -->
  {#if showRenameModal}
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onclick={cancelRename}>
      <div
        class="bg-panel border border-dim rounded-2xl shadow-2xl w-full max-w-md p-6 md:p-8"
        onclick={(e) => e.stopPropagation()}>
        <!-- Header -->
        <div class="flex justify-between items-center mb-6">
          <h2 class="text-xl font-heading text-main">
            {$theme === 'ember' ? 'Rename Garden' :
             $theme === 'frost' ? 'Rename Window' :
             $theme === 'syndicate' ? 'RENAME DECK' :
             'Rename Deck'}
          </h2>
          <button
            onclick={cancelRename}
            class="text-dim hover:text-main text-2xl leading-none cursor-pointer transition-colors">
            ✕
          </button>
        </div>

        <!-- Input -->
        <div class="mb-6">
          <!-- svelte-ignore a11y_autofocus -->
          <input
            type="text"
            bind:value={renameInputValue}
            onkeydown={(e) => e.key === 'Enter' && saveRename()}
            autofocus
            class="w-full bg-bg border-2 border-dim p-4 text-main font-heading text-xl md:text-2xl focus:border-accent outline-none transition-colors rounded-xl text-center"
            placeholder="Enter deck name..."
          />
        </div>

        <!-- Actions -->
        <div class="flex gap-3 justify-end">
          <button
            onclick={cancelRename}
            class="px-6 py-3 border border-dim text-dim hover:text-main hover:border-main transition-colors rounded-xl cursor-pointer font-body">
            Cancel
          </button>
          <button
            onclick={saveRename}
            class="px-6 py-3 bg-accent text-bg font-heading font-bold hover:shadow-[0_0_20px_var(--color-accent)] transition-all rounded-xl cursor-pointer">
            Save
          </button>
        </div>
      </div>
    </div>
  {/if}
</div>
