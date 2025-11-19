<script lang="ts">
  import { onMount } from 'svelte';
  import { getDB, seedTestDeck } from '$lib/db';

  let decks: any[] = [];
  let loading = true;

  async function loadDecks() {
    const db = await getDB();
    const res = db.exec("SELECT * FROM decks");
    if (res.length > 0) {
      decks = res[0].values; // [id, name, created_at]
    } else {
      decks = [];
    }
    loading = false;
  }

  async function handleSeed() {
    await seedTestDeck();
    await loadDecks();
  }

  onMount(loadDecks);
</script>

<header class="text-center space-y-2">
  <h1 class="text-4xl font-serif tracking-tighter text-zen-tatami">VOCAPP ZEN</h1>
  <p class="text-zen-dim text-sm uppercase tracking-widest">One Path. No Noise.</p>
</header>

{#if loading}
  <div class="text-center text-zen-dim animate-pulse">Waking up...</div>
{:else}
  <div class="flex flex-col gap-4">
    {#if decks.length === 0}
      <div class="text-center py-12 border border-dashed border-zen-dim rounded-lg">
        <p class="mb-4 text-zen-dim">The garden is empty.</p>
        <button
          onclick={handleSeed}
          class="px-6 py-2 bg-zen-dim/20 hover:bg-zen-dim/40 text-zen-text rounded transition-all cursor-pointer">
          Plant First Seed (Demo Deck)
        </button>
      </div>
    {:else}
      <div class="grid gap-3">
        {#each decks as deck}
          <button class="w-full text-left p-4 bg-zen-dim/10 border border-zen-dim/20 hover:border-zen-tatami hover:bg-zen-dim/20 transition-all rounded group">
            <span class="font-medium group-hover:text-zen-tatami transition-colors">{deck[1]}</span>
          </button>
        {/each}
      </div>
    {/if}

    <div class="mt-8 flex justify-center gap-4">
       <a href="/import" class="text-sm text-zen-dim hover:text-zen-text underline decoration-zen-dim/50">Import CSV</a>
       <span class="text-zen-dim">·</span>
       <span class="text-sm text-zen-dim cursor-not-allowed">AI Generate (Locked)</span>
    </div>
  </div>
{/if}
