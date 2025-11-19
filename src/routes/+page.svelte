<script lang="ts">
  import { goto } from '$app/navigation';
  import { createDeck } from '$lib/stores/deck';
</script>

<main class="min-h-screen bg-gradient-to-b from-black via-[#0a0a0a] to-black text-[#e8e4d8] flex items-center justify-center">
  <div class="text-center space-y-16 max-w-4xl px-8">
    <h1 class="text-9xl font-display tracking-tighter text-[#bfa76a] drop-shadow-2xl">
      VOCAPP ZEN
    </h1>
    <p class="text-3xl opacity-80 leading-relaxed">
      Start Your Vocabulary Journey
    </p>
    <p class="text-xl opacity-60 max-w-2xl mx-auto leading-relaxed">
      Import words from a CSV file or create an empty deck
    </p>

    <div class="flex flex-col sm:flex-row gap-12 justify-center items-center mt-20">
      <button
        class="group px-20 py-10 bg-[#bfa76a] text-black text-4xl rounded-full font-bold shadow-2xl hover:scale-105 hover:shadow-[#bfa76a]/50 transition-all duration-300"
        on:click={() => goto('/import')}
      >
        <span class="flex items-center gap-6">
          <svg class="w-12 h-12"><use href="/icons.svg#upload"/></svg>
          Import CSV
        </span>
      </button>

      <button
        class="group px-20 py-10 bg-[#5a9a6f]/80 text-white text-4xl rounded-full font-bold shadow-2xl hover:scale-105 hover:bg-[#5a9a6f] transition-all duration-300 border border-[#5a9a6f]/50"
        on:click={() => createDeck('My First Deck')}
      >
        <span class="flex items-center gap-6">
          <svg class="w-12 h-12"><use href="/icons.svg#plus"/></svg>
          Create Empty Deck
        </span>
      </button>
    </div>

    <div class="mt-32 opacity-30">
      <p class="text-lg">One path. Two buttons. No noise.</p>
    </div>
  </div>
</main>
