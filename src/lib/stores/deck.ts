// src/lib/stores/deck.ts
import { writable } from 'svelte/store';
import { getDb } from '../db';
import { v4 as uuidv4 } from 'uuid';

export const currentDeckId = writable<string | null>(null);
export const decks = writable<any[]>([]);

export async function loadDecks() {
  const db = await getDb();
  const rows = await db.select('SELECT * FROM decks ORDER BY created_at DESC');
  decks.set(rows);
  if (rows.length > 0 && !currentDeckId) {
    currentDeckId.set(rows[0].id);
  }
}

export async function createDeck(name: string) {
  const db = await getDb();
  const id = uuidv4();
  await db.execute('INSERT INTO decks (id, name) VALUES (?, ?)', [id, name]);
  await loadDecks();
  currentDeckId.set(id);
}
