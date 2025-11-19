<script lang="ts">
  import { onMount } from 'svelte';
  import { supabase } from '$lib/supabase';
  import { t, theme } from '$lib/theme';

  let masteredCards: any[] = [];
  let loading = true;

  onMount(async () => {
    await loadGraveyard();
  });

  async function loadGraveyard() {
    const { data } = await supabase
      .from('cards')
      .select('*, decks(name)')
      .eq('state', 5)
      .order('due', { ascending: false });

    masteredCards = data || [];
    loading = false;
  }

  async function resurrect(cardId: number) {
    await supabase
      .from('cards')
      .update({ state: 1, interval: 0, due: new Date().toISOString() })
      .eq('id', cardId);

    masteredCards = masteredCards.filter(c => c.id !== cardId);
  }
</script>

<div class="min-h-[80vh] flex flex-col max-w-3xl mx-auto px-6 py-8">
  <!-- Header -->
  <div class="flex justify-between items-center mb-8 pb-4 border-b border-dim">
    <div>
      <h1 class="font-heading text-4xl text-main mb-1">{$t.grave_title}</h1>
      <span class="text-xs font-body text-accent">{masteredCards.length} {$t.stat_master}</span>
    </div>
    <a href="/" class="text-xs font-body text-dim hover:text-accent transition-colors">
      [ {$t.grave_back} ]
    </a>
  </div>

  {#if loading}
    <div class="text-center text-accent animate-pulse font-body py-20">
      {$theme === 'syndicate' ? 'SCANNING ARCHIVE...' : 'Loading...'}
    </div>
  {:else if masteredCards.length === 0}
    <div class="text-center py-20">
      <div class="text-6xl mb-4 opacity-20">{$theme === 'syndicate' ? '⌀' : '○'}</div>
      <p class="text-dim font-body">{$t.grave_empty}</p>
    </div>
  {:else}
    <div class="space-y-3">
      {#each masteredCards as card}
        <div class="group border border-dim bg-panel p-4 hover:border-accent transition-all relative overflow-hidden">
          {#if $theme === 'syndicate'}
            <div class="absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(0,255,242,0.02)_50%)] bg-[length:100%_4px] pointer-events-none"></div>
          {/if}

          <div class="flex justify-between items-start gap-4">
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-3 mb-2">
                <h3 class="font-heading text-xl text-main truncate">{card.headword}</h3>
                <span class="text-[10px] font-body text-dim bg-bg px-2 py-0.5 shrink-0">
                  {card.decks?.name || 'Unknown'}
                </span>
              </div>
              <p class="text-sm font-body text-accent truncate">{card.definition}</p>
            </div>

            <button
              onclick={() => resurrect(card.id)}
              class="shrink-0 px-4 py-2 border border-danger text-danger text-xs font-body hover:bg-danger hover:text-bg transition-all">
              {$t.grave_resurrect}
            </button>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>
