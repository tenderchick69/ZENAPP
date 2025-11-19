// src/lib/db.ts — browser-compatible with localStorage persistence
import { browser } from '$app/environment';

interface DbResult {
  exec: (sql: string) => void;
  execute: (sql: string, params?: any[]) => Promise<void>;
  select: (sql: string, params?: any[]) => Promise<any[]>;
}

let db: DbResult | null = null;

// Simple localStorage-backed store for dev
const store: Record<string, any[]> = {
  decks: [],
  words: [],
  scheduling: []
};

function loadStore() {
  if (!browser) return;
  try {
    const saved = localStorage.getItem('vocapp_db');
    if (saved) {
      const parsed = JSON.parse(saved);
      Object.assign(store, parsed);
    }
  } catch (e) {
    console.error('Failed to load store', e);
  }
}

function saveStore() {
  if (!browser) return;
  try {
    localStorage.setItem('vocapp_db', JSON.stringify(store));
  } catch (e) {
    console.error('Failed to save store', e);
  }
}

export async function getDb(): Promise<DbResult> {
  if (db) return db;

  loadStore();

  db = {
    exec: () => {}, // Tables are implicit in our store

    execute: async (sql: string, params: any[] = []) => {
      const sqlLower = sql.toLowerCase().trim();

      if (sqlLower.startsWith('insert into decks')) {
        store.decks.push({ id: params[0], name: params[1], created_at: Date.now() });
      } else if (sqlLower.startsWith('insert into words')) {
        store.words.push({
          id: params[0], deck_id: params[1], headword: params[2], pos: params[3],
          ipa: params[4], definition: params[5], example: params[6], gloss_de: params[7],
          etymology: params[8], mnemonic: params[9], tags: params[10], freq: params[11]
        });
      } else if (sqlLower.startsWith('insert into scheduling')) {
        const existing = store.scheduling.findIndex(s => s.word_id === params[0]);
        const record = {
          word_id: params[0], deck_id: params[1], times_correct: params[2],
          is_mastered: params[3], due_ts: params[4]
        };
        if (existing >= 0) {
          store.scheduling[existing] = record;
        } else {
          store.scheduling.push(record);
        }
      }

      saveStore();
    },

    select: async (sql: string, params: any[] = []) => {
      const sqlLower = sql.toLowerCase();

      if (sqlLower.includes('from decks')) {
        return [...store.decks].sort((a, b) => b.created_at - a.created_at);
      }

      if (sqlLower.includes('from words')) {
        const deckId = params[0];
        return store.words
          .filter(w => w.deck_id === deckId)
          .map(w => {
            const sched = store.scheduling.find(s => s.word_id === w.id);
            return {
              ...w,
              times_correct: sched?.times_correct ?? 0,
              is_mastered: sched?.is_mastered ?? 0,
              due_ts: sched?.due_ts ?? 0
            };
          })
          .sort((a, b) => a.due_ts - b.due_ts);
      }

      return [];
    }
  };

  return db;
}
