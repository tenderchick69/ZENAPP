// We use a wildcard import to handle the UMD module structure
import * as SQL from 'sql.js';

let db: any = null;

export async function getDB() {
  if (db) return db;

  // Handle the import: if Vite mocks a default, use it; otherwise use the namespace
  // @ts-ignore
  const initSqlJs = SQL.default || SQL;

  const SQL_INSTANCE = await initSqlJs({
    // This points to the file we copied to /static/sql-wasm.wasm
    locateFile: (file: string) => `/${file}`
  });

  // Try loading existing DB from localStorage
  const saved = localStorage.getItem('vocapp_zen_db');
  if (saved) {
    const uInt8Array = new Uint8Array(JSON.parse(saved));
    db = new SQL_INSTANCE.Database(uInt8Array);
  } else {
    db = new SQL_INSTANCE.Database();
    initSchema();
  }

  return db;
}

function initSchema() {
  if (!db) return;

  // 1. Decks
  db.run(`CREATE TABLE IF NOT EXISTS decks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    created_at INTEGER DEFAULT (strftime('%s', 'now'))
  );`);

  // 2. Cards (Rich 10-col spec + Scheduling)
  db.run(`CREATE TABLE IF NOT EXISTS cards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    deck_id INTEGER,
    headword TEXT NOT NULL,
    definition TEXT,
    pos TEXT,
    ipa TEXT,
    example TEXT,
    tags TEXT,
    state INTEGER DEFAULT 0, -- 0:New, 1:Learning, 2:Review, 3:Mastered
    due INTEGER DEFAULT 0,
    interval INTEGER DEFAULT 0,
    ease_factor REAL DEFAULT 2.5,
    FOREIGN KEY(deck_id) REFERENCES decks(id)
  );`);

  saveDB();
}

export function saveDB() {
  if (!db) return;
  const data = db.export();
  // Convert to regular array for JSON storage
  const arr = Array.from(data);
  localStorage.setItem('vocapp_zen_db', JSON.stringify(arr));
}

// Helper to create a dummy deck for testing
export async function seedTestDeck() {
  const d = await getDB();
  d.run("INSERT INTO decks (name) VALUES ('Japanese Basics')");
  const deckId = d.exec("SELECT last_insert_rowid()")[0].values[0][0];

  d.run(`INSERT INTO cards (deck_id, headword, definition) VALUES
    (?, 'Neko', 'Cat'),
    (?, 'Inu', 'Dog'),
    (?, 'Sakura', 'Cherry Blossom')`, [deckId, deckId, deckId]);
  saveDB();
}
