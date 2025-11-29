<script lang="ts">
  import { theme } from '$lib/theme';
  import { supabase } from '$lib/supabase';
  import { goto } from '$app/navigation';
  import type { CardData } from '$lib/openrouter';
  import { prepareCardsForDb } from '$lib/openrouter';

  export let cards: CardData[];
  export let deckName: string;
  export let onRegenerate: () => void;
  export let onRename: (name: string) => void;

  let isImporting = false;
  let isEditing = false;
  let editName = deckName;
  let error: string | null = null;

  // Show first 10 cards in preview
  $: previewCards = cards.slice(0, 10);
  $: remainingCount = cards.length - 10;

  async function handleImport() {
    isImporting = true;
    error = null;

    try {
      // 1. Create deck in Supabase
      const { data: deck, error: deckError } = await supabase
        .from('decks')
        .insert({ name: deckName })
        .select()
        .single();

      if (deckError) throw deckError;

      // 2. Prepare and insert cards
      const cardsToInsert = prepareCardsForDb(cards, deck.id);

      const { error: cardsError } = await supabase
        .from('cards')
        .insert(cardsToInsert);

      if (cardsError) throw cardsError;

      // 3. Clear saved deck from sessionStorage
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.removeItem('unsavedDeck');
      }

      // 4. Success! Redirect to home
      goto('/');
    } catch (e: any) {
      console.error('Import failed:', e);
      error = e.message || 'Failed to import deck';
      isImporting = false;
    }
  }

  function saveName() {
    onRename(editName);
    isEditing = false;
  }
</script>

<div class="deck-preview" data-theme={$theme}>
  <div class="preview-header">
    {#if isEditing}
      <input
        type="text"
        bind:value={editName}
        onkeydown={(e) => e.key === 'Enter' && saveName()}
        class="name-input"
        autofocus
      />
      <button onclick={saveName} class="save-name-btn">Save</button>
    {:else}
      <h2>{deckName}</h2>
      <button onclick={() => { isEditing = true; editName = deckName; }} class="edit-btn" title="Rename deck">
        ✏️
      </button>
    {/if}
    <span class="card-count">{cards.length} cards</span>
  </div>

  {#if error}
    <div class="error-banner">{error}</div>
  {/if}

  <div class="preview-table-container">
    <table class="preview-table">
      <thead>
        <tr>
          <th>Word</th>
          <th>Meaning</th>
          <th>Synonyms</th>
          <th>Example</th>
          <th>Translation</th>
          <th>Mnemonic</th>
        </tr>
      </thead>
      <tbody>
        {#each previewCards as card}
          <tr>
            <td class="headword">{card.headword}</td>
            <td>{card.definition}</td>
            <td class="synonyms">{card.synonyms || '-'}</td>
            <td class="example">{card.example}</td>
            <td class="example-gloss">{card.exampleGloss || '-'}</td>
            <td class="mnemonic">{card.mnemonic}</td>
          </tr>
        {/each}
      </tbody>
    </table>

    {#if remainingCount > 0}
      <p class="remaining-note">...and {remainingCount} more cards</p>
    {/if}
  </div>

  <div class="preview-actions">
    <button onclick={onRegenerate} class="regenerate-btn">
      🔄 Regenerate
    </button>
    <button
      onclick={handleImport}
      class="import-btn"
      disabled={isImporting}>
      {#if isImporting}
        Importing...
      {:else}
        ✅ Import Deck
      {/if}
    </button>
  </div>
</div>

<style>
  .deck-preview {
    max-width: 900px;
    margin: 0 auto;
    padding: 1rem;
  }

  .preview-header {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 1.5rem;
  }

  .preview-header h2 {
    margin: 0;
    font-size: 1.5rem;
    color: var(--color-main);
  }

  .name-input {
    font-size: 1.5rem;
    padding: 0.5rem;
    border: 1px solid var(--color-accent);
    background: var(--color-bg);
    color: var(--color-main);
    border-radius: 4px;
    flex: 1;
  }

  .edit-btn,
  .save-name-btn {
    padding: 0.5rem 1rem;
    background: transparent;
    border: 1px solid var(--color-accent);
    color: var(--color-accent);
    cursor: pointer;
    border-radius: 4px;
    transition: all 0.2s;
  }

  .edit-btn:hover,
  .save-name-btn:hover {
    background: var(--color-accent);
    color: var(--color-bg);
  }

  .card-count {
    color: var(--color-accent);
    font-size: 0.9rem;
    margin-left: auto;
  }

  .error-banner {
    padding: 1rem;
    margin-bottom: 1rem;
    background: var(--color-danger);
    color: white;
    border-radius: 4px;
  }

  .preview-table-container {
    overflow-x: auto;
    margin-bottom: 1.5rem;
    border: 1px solid var(--color-panel);
    border-radius: 8px;
  }

  .preview-table {
    width: 100%;
    border-collapse: collapse;
  }

  .preview-table th,
  .preview-table td {
    padding: 0.75rem;
    text-align: left;
    border-bottom: 1px solid var(--color-panel);
  }

  .preview-table th {
    background: var(--color-panel);
    color: var(--color-accent);
    font-weight: 600;
    font-size: 0.85rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .preview-table .headword {
    font-weight: 600;
    color: var(--color-success);
    font-size: 1.1rem;
  }

  .preview-table .pos {
    color: var(--color-accent);
    font-size: 0.75rem;
    text-transform: uppercase;
  }

  .preview-table .example {
    font-style: italic;
    font-size: 0.9rem;
    opacity: 0.9;
  }

  .preview-table .mnemonic {
    font-size: 0.85rem;
    color: var(--color-main);
    opacity: 0.7;
  }

  .remaining-note {
    text-align: center;
    color: var(--color-accent);
    font-style: italic;
    margin-top: 1rem;
    padding: 1rem;
  }

  .preview-actions {
    display: flex;
    gap: 1rem;
    justify-content: center;
  }

  .regenerate-btn,
  .import-btn {
    padding: 1rem 2rem;
    border: none;
    border-radius: 8px;
    font-size: 1rem;
    cursor: pointer;
    transition: transform 0.2s;
  }

  .regenerate-btn {
    background: var(--color-panel);
    color: var(--color-main);
    border: 1px solid var(--color-accent);
  }

  .regenerate-btn:hover {
    background: var(--color-accent);
    color: var(--color-bg);
  }

  .import-btn {
    background: var(--color-success);
    color: var(--color-bg);
  }

  .import-btn:hover:not(:disabled) {
    transform: scale(1.05);
  }

  .import-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  @media (max-width: 640px) {
    .preview-actions {
      flex-direction: column;
    }

    .regenerate-btn,
    .import-btn {
      width: 100%;
    }

    .preview-table {
      font-size: 0.85rem;
    }

    .preview-table th,
    .preview-table td {
      padding: 0.5rem;
    }
  }
</style>
