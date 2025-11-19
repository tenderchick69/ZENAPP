<script lang="ts">
  import { onMount } from 'svelte';
  import { supabase } from '$lib/supabase';
  import { t, theme } from '$lib/theme';

  let decks: any[] = [];
  let loading = true;

  async function loadDecks() {
    const { data } = await supabase.from('decks').select('*').order('created_at', { ascending: false });
    decks = data || [];
    loading = false;
  }

  onMount(loadDecks);
</script>

<section class="space-y-8">
  <div class="text-center space-y-2 mb-12">
    {#if $theme === 'syndicate'}
      <p class="text-danger text-xs tracking-[0.3em] animate-pulse">UNAUTHORIZED MODIFICATION DETECTED</p>
    {/if}
    <h1 class="font-heading text-5xl md:text-7xl font-black uppercase italic">
      <span class="text-transparent bg-clip-text bg-gradient-to-r from-accent to-blue-500">{$t.subtitle}</span>
    </h1>
  </div>

  {#if loading}
    <div class="text-center text-accent animate-flicker font-body">LOADING...</div>
  {:else}
    <div class="grid md:grid-cols-2 gap-6">
      {#each decks as deck}
        <a href="/study?id={deck.id}" class="group block relative border border-dim bg-panel p-6 hover:border-accent transition-all duration-300 hover:shadow-[0_0_30px_rgba(0,0,0,0.2)]">
          <div class="absolute top-0 right-0 p-2">
            <div class="w-2 h-2 bg-success rounded-full shadow-[0_0_10px_currentColor]"></div>
          </div>
          <div class="flex justify-between items-start mb-4">
            <span class="font-body text-xs text-accent">{$t.deck_sub}</span>
            <span class="font-body text-xs text-danger">{$t.deck_ready}</span>
          </div>
          <h3 class="font-heading text-2xl text-main group-hover:text-accent transition-colors mb-2">{deck.name}</h3>
          <div class="flex justify-between items-center pt-4 border-t border-dim group-hover:border-accent/30 transition-colors">
            <span class="font-body text-xs text-accent group-hover:translate-x-2 transition-transform">{$t.action_open}</span>
          </div>
        </a>
      {/each}
    </div>

    <div class="flex justify-center gap-6 mt-12 font-body text-sm">
       <a href="/import" class="text-dim hover:text-danger transition-colors">[ {$t.btn_import} ]</a>
       <span class="text-dim">|</span>
       <span class="text-dim cursor-not-allowed">[ {$t.btn_ai} ]</span>
    </div>
  {/if}
</section>
