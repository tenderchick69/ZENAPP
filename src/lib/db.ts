// src/lib/db.ts — sql.js WASM for browser
import { browser } from '$app/environment';
import initSqlJs, { type Database } from 'sql.js';

interface DbResult {
  exec: (sql: string) => void;
  execute: (sql: string, params?: any[]) => Promise<void>;
  select: (sql: string, params?: any[]) => Promise<any[]>;
}

let db: DbResult | null = null;
let sqlDb: Database | null = null;

export async function getDb(): Promise<DbResult> {
  if (db) return db;

  if (!browser) {
    throw new Error('Database can only be initialized in browser');
  }

  // Initialize sql.js with WASM
  const SQL = await initSqlJs({
    locateFile: (file: string) => `/${file}`
  });

  // Load existing database from localStorage or create new
  const savedDb = localStorage.getItem('vocapp_db_data');
  if (savedDb) {
    const data = new Uint8Array(JSON.parse(savedDb));
    sqlDb = new SQL.Database(data);
  } else {
    sqlDb = new SQL.Database();
  }

  // Create tables if not exist
  sqlDb.run(`
    CREATE TABLE IF NOT EXISTS decks (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000)
    );
    CREATE TABLE IF NOT EXISTS words (
      id TEXT PRIMARY KEY,
      deck_id TEXT,
      headword TEXT NOT NULL,
      pos TEXT,
      ipa TEXT,
      definition TEXT,
      example TEXT,
      gloss_de TEXT,
      etymology TEXT,
      mnemonic TEXT,
      tags TEXT,
      freq REAL
    );
    CREATE TABLE IF NOT EXISTS scheduling (
      word_id TEXT PRIMARY KEY,
      deck_id TEXT,
      times_correct INTEGER DEFAULT 0,
      is_mastered INTEGER DEFAULT 0,
      due_ts INTEGER DEFAULT 0,
      FOREIGN KEY(word_id) REFERENCES words(id)
    );
  `);

  // Save to localStorage after each change
  function saveToStorage() {
    if (sqlDb) {
      const data = sqlDb.export();
      localStorage.setItem('vocapp_db_data', JSON.stringify(Array.from(data)));
    }
  }

  db = {
    exec: (sql: string) => {
      sqlDb!.run(sql);
      saveToStorage();
    },

    execute: async (sql: string, params: any[] = []) => {
      sqlDb!.run(sql, params);
      saveToStorage();
    },

    select: async (sql: string, params: any[] = []) => {
      const stmt = sqlDb!.prepare(sql);
      stmt.bind(params);

      const results: any[] = [];
      while (stmt.step()) {
        const row = stmt.getAsObject();
        results.push(row);
      }
      stmt.free();

      return results;
    }
  };

  return db;
}
