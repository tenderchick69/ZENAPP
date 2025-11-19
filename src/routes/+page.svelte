<script lang="ts">
  import { onMount } from 'svelte';
  import { getDB, seedTestDeck } from '$lib/db';
  import { currentSkin } from '$lib/theme';

  let decks: any[] = [];
  let loading = true;

  async function loadDecks() {
    const db = await getDB();
    const res = db.exec("SELECT * FROM decks");
    decks = res.length > 0 ? res[0].values : [];
    loading = false;
  }

  async function handleSeed() {
    await seedTestDeck();
    await loadDecks();
  }

  onMount(loadDecks);
</script>

{#if $currentSkin === 'syndicate'}
  <!-- ═══════════════════════════════════════════════════════════════
       SYNDICATE HOMEPAGE
       ═══════════════════════════════════════════════════════════════ -->
  <section class="space-y-8">
    <div class="text-center space-y-2 mb-12">
      <p class="text-neon-red text-xs tracking-[0.3em] animate-pulse">UNAUTHORIZED MODIFICATION DETECTED</p>
      <h1 class="font-cyber text-5xl md:text-7xl font-black uppercase italic">
        <span class="block text-white drop-shadow-lg">Upgrade Your</span>
        <span class="text-transparent bg-clip-text bg-gradient-to-r from-neon-cyan to-blue-500">Wetware</span>
      </h1>
    </div>

    {#if loading}
      <div class="text-center text-neon-cyan animate-flicker font-mono">INITIALIZING NEURAL BRIDGE...</div>
    {:else}
      <div class="grid md:grid-cols-2 gap-6">
        {#if decks.length === 0}
          <div class="col-span-full border border-dashed border-neon-cyan/30 bg-black/40 p-12 text-center rounded">
            <p class="text-gray-400 mb-6 font-mono">NO IMPLANTS DETECTED</p>
            <button
              onclick={handleSeed}
              class="bg-neon-cyan text-black font-cyber px-8 py-3 hover:bg-white hover:shadow-[0_0_20px_rgba(0,255,242,0.6)] transition-all cursor-pointer skew-x-[-10deg]">
              INSTALL DEMO SHARD
            </button>
          </div>
        {:else}
          {#each decks as deck}
            <a href="/study" class="group block relative border border-gray-800 bg-black/60 p-6 hover:border-neon-cyan transition-all duration-300 hover:shadow-[0_0_30px_rgba(0,255,242,0.1)]">
              <div class="absolute top-0 right-0 p-2">
                <div class="w-2 h-2 bg-bio-green rounded-full animate-pulse shadow-[0_0_10px_#39ff14]"></div>
              </div>
              <div class="flex justify-between items-start mb-4">
                <span class="font-mono text-xs text-neon-cyan">COGNITIVE SHARD</span>
                <span class="font-mono text-xs text-neon-red">SYNC: READY</span>
              </div>
              <h3 class="font-cyber text-2xl text-white group-hover:text-neon-cyan transition-colors mb-2">{deck[1]}</h3>
              <p class="font-mono text-sm text-gray-500 mb-6">Contains vocabulary patterns for instant assimilation.</p>
              <div class="flex justify-between items-center pt-4 border-t border-gray-800 group-hover:border-neon-cyan/30 transition-colors">
                <span class="font-mono text-xs text-gray-400">SIZE: UNKNOWN</span>
                <span class="font-mono text-xs text-neon-cyan group-hover:animate-glitch">INITIALIZE →</span>
              </div>
            </a>
          {/each}
        {/if}
      </div>

      <div class="flex justify-center gap-6 mt-12 font-mono text-sm">
         <a href="/import" class="text-gray-500 hover:text-neon-red transition-colors">[ UPLOAD CSV ]</a>
         <span class="text-gray-700">|</span>
         <span class="text-gray-700 cursor-not-allowed">[ AI GENERATION OFFLINE ]</span>
      </div>
    {/if}
  </section>

{:else}
  <!-- ═══════════════════════════════════════════════════════════════
       ZEN HOMEPAGE
       ═══════════════════════════════════════════════════════════════ -->
  <section class="space-y-16">
    <!-- Hero -->
    <div class="text-center space-y-8">
      <h1 class="font-zen-display text-6xl md:text-8xl font-normal tracking-tight ink-bleed">
        <span class="block text-paper">言葉</span>
        <span class="block text-stone/40 text-2xl mt-4 tracking-[0.5em]">KOTOBA</span>
      </h1>
      <p class="text-stone/50 text-sm tracking-widest max-w-md mx-auto leading-relaxed font-zen">
        Each word is a stone in the garden.<br/>Place them with intention.
      </p>
    </div>

    {#if loading}
      <div class="text-center text-stone/50 animate-breathe font-zen tracking-widest">
        awakening...
      </div>
    {:else}
      <div class="space-y-4">
        {#if decks.length === 0}
          <!-- Empty State -->
          <div class="border border-stone/10 p-16 text-center zen-sharp">
            <p class="text-stone/40 mb-8 font-zen text-sm tracking-widest">The garden awaits its first stone.</p>
            <button
              onclick={handleSeed}
              class="border border-stone/30 text-paper px-8 py-3 hover:border-paper hover:bg-paper hover:text-void transition-all duration-500 cursor-pointer font-zen tracking-widest text-sm breath-hover zen-sharp">
              PLANT SEED
            </button>
          </div>
        {:else}
          <!-- Deck List -->
          {#each decks as deck}
            <a
              href="/study"
              class="group block border border-stone/10 p-8 hover:border-stone/30 transition-all duration-500 breath-hover zen-sharp"
            >
              <div class="flex justify-between items-center">
                <div>
                  <h3 class="font-zen-display text-2xl text-paper group-hover:tracking-wider transition-all duration-500">{deck[1]}</h3>
                  <p class="text-stone/40 text-xs mt-2 font-zen tracking-widest">VOCABULARY COLLECTION</p>
                </div>
                <div class="text-stone/20 group-hover:text-blood transition-colors duration-500">
                  <span class="text-2xl">→</span>
                </div>
              </div>
            </a>
          {/each}
        {/if}
      </div>

      <!-- Actions -->
      <div class="flex justify-center gap-8 pt-8 border-t border-stone/5">
        <a href="/import" class="text-stone/30 hover:text-paper transition-colors duration-500 text-xs tracking-widest font-zen">
          IMPORT
        </a>
        <span class="text-stone/10">|</span>
        <span class="text-stone/20 text-xs tracking-widest font-zen cursor-not-allowed">
          GENERATE
        </span>
      </div>
    {/if}
  </section>
{/if}
