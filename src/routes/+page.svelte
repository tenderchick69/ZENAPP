<script lang="ts">
  import { onMount } from 'svelte';
  import { supabase } from '$lib/supabase';
  import { t, theme } from '$lib/theme';

  let decks: any[] = [];
  let loading = true;
  let totalMastered = 0;

  async function loadDecks() {
    const { data } = await supabase.from('decks').select('*').order('created_at', { ascending: false });
    decks = data || [];
    loading = false;
  }

  async function loadMasteryCount() {
    const { count } = await supabase
      .from('cards')
      .select('*', { count: 'exact', head: true })
      .eq('state', 5);
    totalMastered = count || 0;
  }

  async function deleteDeck(id: number, e: Event) {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm('Delete this deck? All cards will be lost.')) return;

    await supabase.from('cards').delete().eq('deck_id', id);
    await supabase.from('decks').delete().eq('id', id);
    await loadDecks();
    await loadMasteryCount();
  }

  onMount(() => {
    loadDecks();
    loadMasteryCount();
  });
</script>

<section class="space-y-12 w-full">
  <div class="text-center space-y-2 mb-16">
    {#if $theme === 'syndicate'}
      <p class="text-danger text-xs tracking-[0.3em] animate-pulse">UNAUTHORIZED MODIFICATION DETECTED</p>
    {/if}

    <h1 class="font-heading text-5xl md:text-8xl font-black uppercase italic tracking-tighter">
      <span class="text-transparent bg-clip-text bg-gradient-to-r from-accent
        {$theme === 'ember' ? 'to-warmth' : 'to-blue-600'}">
        {$t.subtitle}
      </span>
    </h1>
  </div>

  {#if loading}
    <div class="text-center text-accent animate-flicker font-body">LOADING...</div>
  {:else}
    <!-- Grid Layout Logic: Center if 1, Grid if > 1 -->
    <div class="{decks.length === 1 ? 'max-w-xl mx-auto' : 'grid md:grid-cols-2 gap-8'}">

      {#each decks as deck}
        <a href="/study?id={deck.id}"
           class="group block relative transition-all duration-500 min-h-[200px] flex flex-col justify-center items-center
           {$theme === 'ember'
             ? 'border border-orange-900/40 bg-gradient-to-b from-[#1a0b05] to-black hover:border-orange-500/60 hover:shadow-[0_0_50px_rgba(255,69,0,0.15)] rounded-xl overflow-hidden'
             : 'border border-dim bg-panel hover:border-accent hover:shadow-[0_0_30px_rgba(0,0,0,0.2)] p-8'}">

          <!-- EMBER MODE STYLING -->
          {#if $theme === 'ember'}
            <!-- Internal Ambient Glow -->
            <div class="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,69,0,0.05),transparent_70%)] opacity-50 group-hover:opacity-100 transition-opacity duration-700"></div>

            <!-- Title -->
            <h3 class="text-5xl font-ember text-orange-100/90 group-hover:text-golden transition-colors duration-500 drop-shadow-lg relative z-10 tracking-wide">
               {deck.name}
            </h3>

            <!-- Delete Button (Bottom Right) -->
            <div class="absolute bottom-4 right-4 z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
               <button onclick={(e) => deleteDeck(deck.id, e)} class="text-orange-900 hover:text-red-500 p-2 transition-colors" title="Extinguish">
                 <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
               </button>
            </div>

          <!-- SYNDICATE / ZEN MODE STYLING (Legacy) -->
          {:else}
            <!-- Status & Delete (Top Right) -->
            <div class="absolute top-4 right-4 flex gap-3">
               <button onclick={(e) => deleteDeck(deck.id, e)} class="text-dim hover:text-danger p-1 transition-colors z-20">
                 <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
               </button>
               <div class="w-2 h-2 bg-success rounded-full shadow-[0_0_10px_currentColor]"></div>
            </div>

            <div class="w-full">
              <div class="flex justify-between items-start mb-6">
                <span class="font-body text-xs text-dim uppercase tracking-widest">{$t.deck_sub}</span>
              </div>
              <h3 class="text-3xl font-heading text-main group-hover:text-accent transition-colors mb-4">{deck.name}</h3>
              <div class="flex justify-between items-center pt-6 border-t border-dim group-hover:border-accent/30 transition-colors">
                <span class="font-body text-xs text-dim group-hover:text-accent group-hover:translate-x-2 transition-transform uppercase tracking-widest">
                  {$t.action_open}
                </span>
              </div>
            </div>
          {/if}
        </a>
      {/each}
    </div>

    <!-- Footer Links -->
    <div class="flex justify-center gap-8 mt-24 font-body text-xs uppercase tracking-widest opacity-60 hover:opacity-100 transition-opacity">
       <a href="/import" class="text-dim hover:text-accent transition-colors">[ {$t.btn_import} ]</a>
       <span class="text-dim opacity-20">|</span>
       <span class="text-dim cursor-not-allowed">[ {$t.btn_ai} ]</span>
    </div>

    {#if totalMastered > 0}
      <div class="text-center mt-8">
        <a href="/graveyard" class="inline-block text-xs font-body text-accent hover:text-success transition-colors border border-accent/30 hover:border-success px-4 py-2">
          {$t.grave_link} · {totalMastered}
        </a>
      </div>
    {/if}
  {/if}
</section>
