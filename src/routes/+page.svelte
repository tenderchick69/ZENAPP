<script lang="ts">
  import { onMount } from 'svelte';
  import { getDB, seedTestDeck } from '$lib/db';

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
        <!-- Empty State -->
        <div class="col-span-full border border-dashed border-neon-cyan/30 bg-black/40 p-12 text-center rounded">
          <p class="text-gray-400 mb-6 font-mono">NO IMPLANTS DETECTED</p>
          <button
            onclick={handleSeed}
            class="bg-neon-cyan text-black font-cyber px-8 py-3 hover:bg-white hover:shadow-[0_0_20px_rgba(0,255,242,0.6)] transition-all cursor-pointer skew-x-[-10deg]">
            INSTALL DEMO SHARD
          </button>
        </div>
      {:else}
        <!-- Deck Cards -->
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

    <!-- Actions -->
    <div class="flex justify-center gap-6 mt-12 font-mono text-sm">
       <a href="/import" class="text-gray-500 hover:text-neon-red transition-colors">[ UPLOAD CSV ]</a>
       <span class="text-gray-700">|</span>
       <span class="text-gray-700 cursor-not-allowed">[ AI GENERATION OFFLINE ]</span>
    </div>
  {/if}
</section>
