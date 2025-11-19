<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import CardLevel from '$lib/components/CardLevel.svelte';
  import MasteryCelebration from '$lib/components/MasteryCelebration.svelte';
  import { getDb } from '$lib/db';
  import { currentDeckId } from '$lib/stores/deck';
  import { nextDue } from '$lib/scheduler';

  let cards: any[] = [];
  let idx = 0;
  let showBack = false;
  let celebrating = false;

  $: card = cards[idx];

  onMount(async () => {
    try {
      const db = await getDb();
      const words = await db.select(`
        SELECT w.*, s.times_correct, s.is_mastered
        FROM words w
        LEFT JOIN scheduling s ON s.word_id = w.id
        WHERE w.deck_id = ?
        ORDER BY s.due_ts ASC, RANDOM()
      `, [$currentDeckId]);

      cards = words.map((w: any) => ({
        ...w,
        times_correct: w.times_correct ?? 0,
        is_mastered: w.is_mastered ?? 0
      }));

      if (cards.length === 0) goto('/');
    } catch (e) {
      console.error('ZEN FATAL ERROR', e);
    }
  });

  async function grade(gotIt: boolean) {
    if (!card) return;

    const old = card.times_correct;
    card.times_correct += gotIt ? 1 : -Math.floor(card.times_correct / 2);
    card.times_correct = Math.max(0, card.times_correct);
    card.is_mastered = card.times_correct >= 5 ? 1 : 0;

    if (gotIt && old === 4) {
      celebrating = true;
      setTimeout(() => celebrating = false, 3000);
    }

    const db = await getDb();
    await db.execute(`
      INSERT INTO scheduling (word_id, deck_id, times_correct, is_mastered, due_ts)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(word_id) DO UPDATE SET
        times_correct = excluded.times_correct,
        is_mastered = excluded.is_mastered,
        due_ts = excluded.due_ts
    `, [card.id, $currentDeckId, card.times_correct, card.is_mastered, nextDue(card.times_correct)]);

    showBack = false;
    idx += 1;
    if (idx >= cards.length) setTimeout(() => goto('/'), 1500);
  }
</script>

{#if card}
  <div class="min-h-screen grid place-items-center bg-bg">
    <MasteryCelebration active={celebrating} />

    <CardLevel level={Math.min(card.times_correct, 4)}>
      <div class="text-center space-y-8 p-8">
        <h1 class="text-6xl font-display">{card.headword}</h1>
        {#if card.ipa}<p class="text-2xl opacity-70">{card.ipa}</p>{/if}

        {#if showBack}
          <div class="space-y-6 text-2xl">
            <p>{card.definition}</p>
            {#if card.example}<p class="italic opacity-80">{card.example}</p>{/if}
            {#if card.gloss_de}<p class="text-good">{card.gloss_de}</p>{/if}
          </div>
        {/if}
      </div>
    </CardLevel>

    {#if !showBack}
      <button class="btn reveal" on:click={() => showBack = true}>Reveal (Space)</button>
    {:else}
      <div class="flex gap-12">
        <button class="btn bad flex-1" on:click={() => grade(false)}>Didn't Get It</button>
        <button class="btn good flex-1" on:click={() => grade(true)}>Got It</button>
      </div>
    {/if}
  </div>
{:else}
  <div class="min-h-screen grid place-items-center bg-bg text-4xl">
    Session complete · <button on:click={() => goto('/')}>Home</button>
  </div>
{/if}

<style>
  .btn { @apply py-8 px-16 text-3xl rounded-full font-bold; }
  .reveal { @apply bg-[#a0c4ff] text-black; }
  .bad { @apply bg-bad text-white; }
  .good { @apply bg-good text-white; }
</style>
