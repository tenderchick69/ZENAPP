// src/lib/export.ts - Export decks to CSV

import { supabase } from './supabase';

interface Card {
  headword: string;
  definition: string;
  pos?: string;
  ipa?: string;
  example?: string;
  example_gloss?: string;
  synonyms?: string;
  etymology?: string;
  mnemonic?: string;
  tags?: string;
}

/**
 * Export a deck to CSV and trigger download
 * @param deckId - The ID of the deck to export
 * @param deckName - The name of the deck (used for filename)
 */
export async function exportDeckToCSV(deckId: number, deckName: string): Promise<void> {
  // Fetch the deck to get the language
  const { data: deck, error: deckError } = await supabase
    .from('decks')
    .select('language')
    .eq('id', deckId)
    .single();

  if (deckError) {
    console.error('Export error (deck):', deckError);
    throw new Error('Failed to fetch deck info');
  }

  const language = deck?.language || 'Unknown';

  // Fetch all cards for this deck
  const { data: cards, error } = await supabase
    .from('cards')
    .select('headword, definition, pos, ipa, example, example_gloss, synonyms, etymology, mnemonic, tags')
    .eq('deck_id', deckId)
    .order('id', { ascending: true });

  if (error) {
    console.error('Export error:', error);
    throw new Error('Failed to export deck');
  }

  if (!cards || cards.length === 0) {
    throw new Error('No cards to export');
  }

  // CSV headers with renamed columns
  // word = headword, translation = definition, language = from deck
  const headers = [
    'word',
    'translation',
    'language',
    'pos',
    'ipa',
    'example',
    'example_gloss',
    'synonyms',
    'etymology',
    'mnemonic',
    'tags'
  ];

  // Helper to escape CSV values
  function escapeCSV(value: string): string {
    const escaped = String(value).replace(/"/g, '""');
    if (escaped.includes(',') || escaped.includes('"') || escaped.includes('\n')) {
      return `"${escaped}"`;
    }
    return escaped;
  }

  // Build CSV content
  const csvRows = [headers.join(',')];

  for (const card of cards) {
    const row = [
      escapeCSV(card.headword || ''),      // word
      escapeCSV(card.definition || ''),    // translation
      escapeCSV(language),                  // language (from deck)
      escapeCSV(card.pos || ''),
      escapeCSV(card.ipa || ''),
      escapeCSV(card.example || ''),
      escapeCSV(card.example_gloss || ''),
      escapeCSV(card.synonyms || ''),
      escapeCSV(card.etymology || ''),
      escapeCSV(card.mnemonic || ''),
      escapeCSV(card.tags || '')
    ];
    csvRows.push(row.join(','));
  }

  const csvContent = csvRows.join('\n');

  // Create and trigger download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${deckName.replace(/[^a-z0-9]/gi, '_')}_export.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
