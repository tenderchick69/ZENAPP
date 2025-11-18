<script lang="ts">
  import { onMount } from 'svelte';
  import { currentDeckId, decks, createDeck } from '$lib/stores/deck';
  import { loadDecks } from '$lib/stores/deck';
  import { goto } from '$app/navigation';

  let due = 0;
  let newCards = 0;
  let mastered = 0;

  onMount(loadDecks);
</script>

<main class="min-h-screen grid place-items-center bg-bg text-fg">
  {#if $decks.length === 0}
    <div class="text-center space-y-12">
      <h1 class="text-6xl font-display">VOCAPP ZEN</h1>
      <p class="text-xl opacity-70">Start Your Vocabulary Journey</p>
      <div class="flex flex-col gap-6 max-w-md mx-auto">
        <button class="btn gold" on:click={() => goto('/import')}>
          <svg class="w-6 h-6"><use href="/icons.svg#upload"/></svg>
          Import CSV
        </button>
        <button class="btn green" on:click={() => createDeck('My First Deck')}>
          + Create Empty Deck
        </button>
      </div>
    </div>
  {:else}
    <div class="text-center space-y-8">
      <h1 class="text-5xl font-display">{$decks.find(d => d.id === $currentDeckId)?.name || 'Select Deck'}</h1>

      <div class="text-3xl opacity-80 space-x-8">
        <span>{due} due</span> · <span>{newCards} new</span> · <span>{mastered} mastered</span>
      </div>

      <button class="btn accent text-3xl px-16 py-8" on:click={() => goto('/study')}>
        Study
      </button>
    </div>
  {/if}
</main>

<style>
  .btn { @apply rounded-3xl font-bold transition hover:scale-105; }
  .gold { @apply bg-accent text-bg; }
  .green { @apply bg-good text-bg; }
</style>
