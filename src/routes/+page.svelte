<script lang="ts">
  import { onMount } from 'svelte';
  import { supabase } from '$lib/supabase';
  import { t, theme } from '$lib/theme';

  let decks: any[] = [];
  let loading = true;
  let totalMastered = 0;

  // Dynamic font sizing for deck names based on length
  function getDeckNameSize(name: string, isEmber: boolean): string {
    const len = name.length;
    if (isEmber) {
      // Ember theme sizes
      if (len <= 12) return 'text-4xl md:text-5xl';
      if (len <= 20) return 'text-3xl md:text-4xl';
      if (len <= 30) return 'text-2xl md:text-3xl';
      return 'text-xl md:text-2xl';
    } else {
      // Other themes sizes
      if (len <= 12) return 'text-3xl md:text-4xl';
      if (len <= 20) return 'text-2xl md:text-3xl';
      if (len <= 30) return 'text-xl md:text-2xl';
      return 'text-lg md:text-xl';
    }
  }

  async function loadDecks() {
    const { data } = await supabase.from('decks').select('*').order('created_at', { ascending: false });

    if (data) {
      // Fetch due counts for each deck
      const now = new Date().toISOString();
      const decksWithCounts = await Promise.all(
        data.map(async (deck) => {
          const { count } = await supabase
            .from('cards')
            .select('*', { count: 'exact', head: true })
            .eq('deck_id', deck.id)
            .lt('state', 5)
            .or(`state.eq.0,due.lte.${now}`);

          return { ...deck, dueCount: count || 0 };
        })
      );
      decks = decksWithCounts;
    }

    loading = false;
  }

  async function loadMasteryCount() {
    const { count } = await supabase
      .from('cards')
      .select('*', { count: 'exact', head: true })
      .eq('state', 5);
    totalMastered = count || 0;
  }

  onMount(() => {
    loadDecks();
    loadMasteryCount();
  });
</script>

<section class="space-y-12 w-full">
  <div class="hero-container text-center space-y-2 mb-16 w-full">
    {#if $theme === 'syndicate'}
      <p class="text-danger text-xs tracking-[0.3em] animate-pulse">UNAUTHORIZED MODIFICATION DETECTED</p>
    {/if}

    <h1 class="hero-title font-heading uppercase">
      <span class="text-transparent bg-clip-text bg-gradient-to-r from-accent
        {$theme === 'ember' ? 'to-warmth' : 'to-blue-600'}">
        {$t.subtitle}
      </span>
    </h1>
  </div>

  <div class="max-w-4xl mx-auto w-full">
  {#if loading}
    <div class="text-center text-accent animate-flicker font-body">LOADING...</div>
  {:else if decks.length === 0}
    <!-- Empty State: AI Generation Primary -->
    <div class="max-w-2xl mx-auto space-y-6">
      <!-- Primary: AI Generation (Large, Prominent) -->
      <a href="/generate"
         class="group block relative transition-all duration-500 min-h-[240px] flex flex-col justify-center items-center cursor-pointer
         {$theme === 'ember'
           ? 'border-2 border-orange-500/60 bg-gradient-to-b from-[#1a0b05] to-black hover:border-golden hover:shadow-[0_0_60px_rgba(255,69,0,0.25)] rounded-xl overflow-hidden'
           : 'border-2 border-accent bg-panel hover:border-success hover:shadow-[0_0_40px_var(--color-accent)] p-8'}">

        {#if $theme === 'ember'}
          <!-- Ember: Glowing Fire Icon -->
          <div class="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,69,0,0.08),transparent_70%)] opacity-70 group-hover:opacity-100 transition-opacity duration-700"></div>
          <div class="text-center space-y-6 relative z-10">
            <div class="text-7xl group-hover:scale-110 transition-transform duration-500">✨</div>
            <p class="font-ember text-2xl text-golden group-hover:text-orange-100 transition-colors drop-shadow-[0_0_20px_rgba(255,215,0,0.5)]">
              {$t.btn_ai}
            </p>
            <p class="text-sm text-orange-100/50 font-ember">Create with AI</p>
          </div>
        {:else}
          <!-- Syndicate/Zen/Frost: Glowing Icon -->
          <div class="text-center space-y-6">
            <div class="text-7xl text-accent group-hover:text-success transition-colors group-hover:scale-110 transition-transform duration-300">✨</div>
            <p class="font-heading text-2xl text-accent group-hover:text-success transition-colors uppercase tracking-wide">
              {$t.btn_ai}
            </p>
            <p class="text-sm text-dim font-body">Create decks with AI</p>
          </div>
        {/if}
      </a>

      <!-- Secondary: CSV Import (Smaller, Subtle) -->
      <a href="/import"
         class="group block relative transition-all duration-300 min-h-[120px] flex flex-col justify-center items-center cursor-pointer
         {$theme === 'ember'
           ? 'border border-dashed border-orange-900/30 bg-gradient-to-b from-[#1a0b05]/20 to-black/20 hover:border-orange-500/40 hover:shadow-[0_0_30px_rgba(255,69,0,0.08)] rounded-lg'
           : 'border border-dashed border-dim/40 bg-panel/30 hover:border-accent/60 hover:shadow-[0_0_20px_rgba(0,0,0,0.1)]'}">

        {#if $theme === 'ember'}
          <div class="text-center space-y-3 relative z-10">
            <div class="text-3xl text-orange-800/50 group-hover:text-orange-500/70 transition-colors">+</div>
            <p class="font-ember text-sm text-orange-100/40 group-hover:text-orange-100/60 transition-colors">
              {$t.btn_import}
            </p>
          </div>
        {:else}
          <div class="text-center space-y-3">
            <div class="text-3xl text-dim/40 group-hover:text-dim transition-colors">+</div>
            <p class="font-body text-xs text-dim/60 group-hover:text-dim transition-colors uppercase tracking-wider">
              {$t.btn_import}
            </p>
          </div>
        {/if}
      </a>
    </div>

  {:else}
    <!-- Decks Exist: Show Grid + Add Options -->
    <h2 class="text-2xl font-heading text-main mb-8 tracking-tight uppercase opacity-80 text-center">
      {$theme === 'ember' ? 'Your Gardens' : 'Your Decks'}
    </h2>

    <!-- Deck Grid -->
    <div class="flex flex-wrap justify-center gap-8">
      {#each decks as deck}
        <a href="/study?id={deck.id}"
           class="group block relative transition-all duration-500 min-h-[200px] flex flex-col justify-center items-center w-full md:w-[calc(50%-1rem)] max-w-[400px]
           {$theme === 'ember'
             ? 'border border-orange-900/40 bg-gradient-to-b from-[#1a0b05] to-black hover:border-orange-500/60 hover:shadow-[0_0_50px_rgba(255,69,0,0.15)] rounded-xl overflow-hidden'
             : 'border border-dim bg-panel hover:border-accent hover:shadow-[0_0_30px_rgba(0,0,0,0.2)] p-8'}">

          <!-- EMBER MODE STYLING -->
          {#if $theme === 'ember'}
            <!-- Internal Ambient Glow -->
            <div class="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,69,0,0.05),transparent_70%)] opacity-50 group-hover:opacity-100 transition-opacity duration-700"></div>

            <!-- Title -->
            <h3 class="{getDeckNameSize(deck.name, true)} font-ember text-orange-100/90 group-hover:text-golden transition-colors duration-500 drop-shadow-lg relative z-10 tracking-wide text-center px-4">
               {deck.name}
            </h3>

            <!-- Due Count (Bottom Center) -->
            {#if deck.dueCount > 0}
              <div class="absolute bottom-4 left-1/2 -translate-x-1/2 z-10">
                <span class="text-orange-400 font-ember text-xl font-bold drop-shadow-[0_0_12px_rgba(255,69,0,0.8)]">
                  {deck.dueCount}
                </span>
              </div>
            {/if}

          <!-- SYNDICATE / ZEN / FROST MODE STYLING -->
          {:else}
            <!-- Deck Name (Centered, Prominent) -->
            <h3 class="{getDeckNameSize(deck.name, false)} font-heading text-main group-hover:text-accent transition-colors duration-300 text-center relative z-10 px-4">
              {deck.name}
            </h3>

            <!-- Due Count (Bottom Center) -->
            {#if deck.dueCount > 0}
              <div class="absolute bottom-4 left-1/2 -translate-x-1/2 z-10">
                <span class="text-accent font-heading text-xl font-bold drop-shadow-[0_0_8px_currentColor]">
                  {deck.dueCount}
                </span>
              </div>
            {/if}
          {/if}
        </a>
      {/each}
    </div>

    <!-- Add New Deck Section -->
    <div class="mt-16 max-w-xl mx-auto space-y-4">
      <h3 class="text-center text-sm font-body text-dim uppercase tracking-widest mb-6">Add New Deck</h3>

      <!-- Primary: AI Generation -->
      <a href="/generate"
         class="group block relative transition-all duration-300 min-h-[140px] flex flex-col justify-center items-center cursor-pointer
         {$theme === 'ember'
           ? 'border-2 border-orange-500/50 bg-gradient-to-b from-[#1a0b05]/80 to-black/80 hover:border-golden hover:shadow-[0_0_50px_rgba(255,69,0,0.2)] rounded-lg overflow-hidden'
           : 'border-2 border-accent/70 bg-panel hover:border-success hover:shadow-[0_0_30px_var(--color-accent)]'}">

        {#if $theme === 'ember'}
          <div class="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,69,0,0.06),transparent_70%)] opacity-60 group-hover:opacity-100 transition-opacity duration-500"></div>
          <div class="text-center space-y-4 relative z-10">
            <div class="text-5xl group-hover:scale-110 transition-transform duration-500">✨</div>
            <p class="font-ember text-xl text-golden group-hover:text-orange-100 transition-colors drop-shadow-[0_0_15px_rgba(255,215,0,0.4)]">
              {$t.btn_ai}
            </p>
          </div>
        {:else}
          <div class="text-center space-y-4">
            <div class="text-5xl text-accent group-hover:text-success transition-colors group-hover:scale-110 transition-transform duration-300">✨</div>
            <p class="font-heading text-lg text-accent group-hover:text-success transition-colors uppercase tracking-wide">
              {$t.btn_ai}
            </p>
          </div>
        {/if}
      </a>

      <!-- Secondary: CSV Import -->
      <a href="/import"
         class="group block relative transition-all duration-300 min-h-[80px] flex flex-col justify-center items-center cursor-pointer
         {$theme === 'ember'
           ? 'border border-dashed border-orange-900/30 bg-gradient-to-b from-[#1a0b05]/10 to-black/10 hover:border-orange-500/30 rounded-md'
           : 'border border-dashed border-dim/40 bg-panel/20 hover:border-accent/50'}">

        {#if $theme === 'ember'}
          <div class="text-center space-y-2 relative z-10">
            <p class="font-ember text-sm text-orange-100/40 group-hover:text-orange-100/60 transition-colors">
              + {$t.btn_import}
            </p>
          </div>
        {:else}
          <div class="text-center space-y-2">
            <p class="font-body text-xs text-dim/60 group-hover:text-dim transition-colors uppercase tracking-wider">
              + {$t.btn_import}
            </p>
          </div>
        {/if}
      </a>
    </div>

    {#if totalMastered > 0}
      <div class="text-center mt-12">
        <a href="/graveyard" class="inline-block text-xs font-body text-accent hover:text-success transition-colors border border-accent/30 hover:border-success px-4 py-2">
          {$t.grave_link} · {totalMastered}
        </a>
      </div>
    {/if}
  {/if}
  </div>
</section>
