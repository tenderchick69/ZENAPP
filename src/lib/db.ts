// src/lib/db.ts
import { browser } from '$app/environment';

let dbPromise: Promise<any>;

export async function getDb() {
  if (dbPromise) return dbPromise;

  if (browser) {
    const { default: initSqlJs } = await import('sql.js');
    const SQL = await initSqlJs();
    const db = new SQL.Database();
    // create tables if not exist
    db.exec(`
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
    dbPromise = Promise.resolve(db);
  } else {
    // Tauri desktop — real SQLite
    const { Database } = await import('@tauri-apps/plugin-sql');
    const db = await Database.load('sqlite:vocapp.db');
    await db.execute(`
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
    dbPromise = Promise.resolve(db);
  }

  return dbPromise;
}
