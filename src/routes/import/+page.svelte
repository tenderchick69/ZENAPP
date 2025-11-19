<script lang="ts">
  import Papa from 'papaparse';
  import { supabase } from '$lib/supabase';
  import { goto } from '$app/navigation';

  let dragging = false;
  let uploading = false;
  let log: string[] = [];

  function addLog(msg: string) { log = [...log, `> ${msg}`]; }

  async function handleFile(file: File) {
    uploading = true;
    addLog(`SCANNING ARTIFACT: ${file.name}...`);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        addLog(`PARSED ${results.data.length} SHARDS.`);
        await uploadToSupabase(file.name, results.data);
      },
      error: (err: any) => {
        addLog(`CORRUPTION DETECTED: ${err.message}`);
        uploading = false;
      }
    });
  }

  async function uploadToSupabase(filename: string, rows: any[]) {
    try {
      addLog('ESTABLISHING NEURAL UPLINK...');
      const deckName = filename.replace('.csv', '');

      // 1. Create Deck
      const { data: deck, error: deckError } = await supabase
        .from('decks')
        .insert({ name: deckName })
        .select()
        .single();

      if (deckError) throw deckError;
      addLog(`DECK INSTALLED: ID [${deck.id}]`);

      // 2. Insert Cards
      const cards = rows.map((row: any) => ({
        deck_id: deck.id,
        headword: row.headword || row.Front || 'Unknown',
        definition: row.definition || row.Back || '',
        pos: row.pos || '',
        ipa: row.ipa || '',
        example: row.example || ''
      }));

      const { error: cardError } = await supabase.from('cards').insert(cards);
      if (cardError) throw cardError;

      addLog('UPLOAD COMPLETE. JACKING OUT...');
      setTimeout(() => goto('/'), 1500);

    } catch (e: any) {
      addLog(`CRITICAL FAILURE: ${e.message}`);
      uploading = false;
    }
  }
</script>

<div class="min-h-[60vh] flex flex-col items-center justify-center max-w-2xl mx-auto space-y-8">
  <h1 class="font-cyber text-4xl text-neon-cyan glitch-text">DATA INGESTION</h1>

  <!-- Drop Zone -->
  <div
    class="w-full border-2 border-dashed transition-all duration-300 p-20 text-center cursor-pointer relative overflow-hidden bg-black/50
    {dragging ? 'border-neon-red bg-neon-red/10 scale-[1.02]' : 'border-gray-700 hover:border-neon-cyan hover:bg-black/80'}"
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
      <div class="text-neon-red animate-pulse font-mono">[ UPLOADING WETWARE... ]</div>
    {:else}
      <div class="space-y-4 pointer-events-none">
        <div class="text-6xl text-gray-600">⬇</div>
        <p class="font-mono text-gray-400">DROP CSV ARTIFACT HERE</p>
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

  <!-- Log Console -->
  {#if log.length > 0}
    <div class="w-full bg-black border border-gray-800 p-4 font-mono text-xs text-bio-green h-32 overflow-y-auto">
      {#each log as line} <div>{line}</div> {/each}
    </div>
  {/if}

  <a href="/" class="text-gray-500 hover:text-white font-mono text-xs">[ ABORT ]</a>
</div>
