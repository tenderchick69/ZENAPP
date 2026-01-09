<script lang="ts">
  import Papa from 'papaparse';
  import { supabase } from '$lib/supabase';
  import { goto } from '$app/navigation';
  import { t } from '$lib/theme';
  import { user } from '$lib/auth';

  let dragging = false;
  let uploading = false;
  let log: string[] = [];

  function addLog(msg: string) { log = [...log, `> ${msg}`]; }

  async function handleFile(file: File) {
    uploading = true;
    addLog(`READING: ${file.name}...`);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        addLog(`PARSED ${results.data.length} ITEMS.`);
        await uploadToSupabase(file.name, results.data);
      },
      error: (err: any) => {
        addLog(`ERROR: ${err.message}`);
        uploading = false;
      }
    });
  }

  async function uploadToSupabase(filename: string, rows: any[]) {
    try {
      addLog('CONNECTING...');
      const deckName = filename.replace('.csv', '');

      // Get current user for deck ownership
      const { data: { user: currentUser } } = await supabase.auth.getUser();

      const { data: deck, error: deckError } = await supabase.from('decks').insert({
        name: deckName,
        user_id: currentUser?.id
      }).select().single();
      if (deckError) throw deckError;
      addLog(`DECK CREATED: [${deck.id}]`);

      const cards = rows.map((row: any) => ({
        deck_id: deck.id,
        headword: row.headword || row.Front || 'Unknown',
        definition: row.definition || row.Back || '',
        pos: row.pos || '',
        ipa: row.ipa || '',
        example: row.example || '',
        // Rich data
        gloss_de: row.gloss_de || '',
        etymology: row.etymology || '',
        mnemonic: row.mnemonic || '',
        tags: row.tags || '',
        freq: parseInt(row.freq) || 0
      }));

      const { error: cardError } = await supabase.from('cards').insert(cards);
      if (cardError) {
        // Rollback: delete the empty deck if card insertion fails
        await supabase.from('decks').delete().eq('id', deck.id);
        throw cardError;
      }

      addLog('SUCCESS. REDIRECTING...');
      setTimeout(() => goto('/'), 1500);

    } catch (e: any) {
      addLog(`FAILURE: ${e.message}`);
      uploading = false;
    }
  }
</script>

<div class="min-h-[60vh] flex flex-col items-center justify-center max-w-2xl mx-auto space-y-8">
  <h1 class="font-heading text-4xl text-accent glitch-text">{$t.import_title}</h1>

  <div
    class="w-full border-2 border-dashed transition-all duration-300 p-20 text-center cursor-pointer relative overflow-hidden bg-panel
    {dragging ? 'border-danger bg-danger/10 scale-[1.02]' : 'border-dim hover:border-accent hover:bg-panel/80'}"
    role="button"
    tabindex="0"
    ondragenter={(e) => { e.preventDefault(); dragging = true; }}
    ondragleave={(e) => { e.preventDefault(); dragging = false; }}
    ondragover={(e) => { e.preventDefault(); }}
    ondrop={(e) => {
      e.preventDefault();
      dragging = false;
      if (e.dataTransfer?.files?.[0]) handleFile(e.dataTransfer.files[0]);
    }}
  >
    {#if uploading}
      <div class="text-danger animate-pulse font-body">[ {$t.import_uploading} ]</div>
    {:else}
      <div class="space-y-4 pointer-events-none">
        <div class="text-6xl text-dim">⬇</div>
        <p class="font-body text-dim">{$t.import_drop}</p>
      </div>
      <input
        type="file"
        accept=".csv"
        class="absolute inset-0 opacity-0 cursor-pointer"
        onchange={(e) => {
            // @ts-ignore
            if (e.currentTarget.files?.[0]) handleFile(e.currentTarget.files[0]);
        }}
      />
    {/if}
  </div>

  {#if log.length > 0}
    <div class="w-full bg-bg border border-dim p-4 font-body text-xs text-success h-32 overflow-y-auto">
      {#each log as line} <div>{line}</div> {/each}
    </div>
  {/if}

  <a href="/" class="text-dim hover:text-main font-body text-xs">[ {$t.import_abort} ]</a>
</div>
