<script lang="ts">
  import { goto } from '$app/navigation';
  import { currentDeckId, createDeck } from '$lib/stores/deck';
  import { getDb } from '$lib/db';
  import Papa from 'papaparse';

  let fileInput: HTMLInputElement;
  let status = '';

  async function handleFile(e: Event) {
    try {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      status = 'Parsing...';
      const text = await file.text();
      const parsed = Papa.parse(text, { header: true });

      const db = await getDb();
      const deckId = $currentDeckId || (await createDeck('Imported ' + new Date().toISOString().slice(0,10)));

      for (const row of parsed.data as any[]) {
        if (!row.headword) continue;
        const wordId = crypto.randomUUID();
        await db.execute(
          `INSERT INTO words (id, deck_id, headword, pos, ipa, definition, example, gloss_de, etymology, mnemonic, tags, freq) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [wordId, deckId, row.headword, row.pos || null, row.ipa || null, row.definition || null, row.example || null, row.gloss_de || null, row.etymology || null, row.mnemonic || null, row.tags || null, row.freq || null]
        );
        await db.execute(
          `INSERT INTO scheduling (word_id, deck_id, times_correct, is_mastered, due_ts) VALUES (?, ?, 0, 0, ?)`,
          [wordId, deckId, Date.now()]
        );
      }

      status = 'Imported! Redirecting...';
      setTimeout(() => goto('/'), 1500);
    } catch (e) {
      console.error('ZEN FATAL ERROR', e);
      status = 'Error: ' + (e as Error).message;
    }
  }
</script>

<main class="min-h-screen grid place-items-center bg-bg text-fg">
  <div class="text-center space-y-12">
    <h1 class="text-5xl font-display">Import CSV</h1>
    <input type="file" accept=".csv" bind:this={fileInput} on:change={handleFile} class="hidden" />
    <button class="py-8 px-16 bg-accent text-bg text-3xl rounded-full" on:click={() => fileInput.click()}>
      Choose CSV File
    </button>
    <p>{status}</p>
    <button on:click={() => goto('/')} class="text-xl underline">← Back</button>
  </div>
</main>
