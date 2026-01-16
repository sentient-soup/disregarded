import { Database } from "bun:sqlite";

// Database path - configurable via environment variable
const DATABASE_PATH = process.env.DATABASE_PATH || "disregarded.db";
const db = new Database(DATABASE_PATH);

console.log(`[db] Using database: ${DATABASE_PATH}`);

// Short ID generation (5 chars, alphanumeric)
const ALPHABET = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const ID_LENGTH = 3;

export function generateShortId(): string {
  let id = "";
  for (let i = 0; i < ID_LENGTH; i++) {
    id += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return id;
}

export function generateUniqueShortId(): string {
  const checkExists = db.prepare<{ count: number }, [string]>(
    "SELECT COUNT(*) as count FROM essays WHERE short_id = ?"
  );

  let id = generateShortId();
  let attempts = 0;
  const maxAttempts = 100;

  while (checkExists.get(id)?.count ?? 0 > 0) {
    id = generateShortId();
    attempts++;
    if (attempts >= maxAttempts) {
      throw new Error("Failed to generate unique short ID after maximum attempts");
    }
  }

  return id;
}

// Initialize schema
db.run(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )
`);

db.run(`
  CREATE TABLE IF NOT EXISTS essays (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    short_id TEXT UNIQUE,
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    status TEXT DEFAULT 'draft',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  )
`);

// Create indexes for better query performance
db.run(`CREATE INDEX IF NOT EXISTS idx_essays_user_id ON essays(user_id)`);
db.run(`CREATE INDEX IF NOT EXISTS idx_essays_status ON essays(status)`);
db.run(`CREATE INDEX IF NOT EXISTS idx_essays_short_id ON essays(short_id)`);

export { db };

// Type definitions
export interface User {
  id: number;
  username: string;
  password_hash: string;
  created_at: string;
}

export interface Essay {
  id: number;
  short_id: string;
  user_id: number;
  title: string;
  content: string;
  status: "draft" | "published";
  created_at: string;
  updated_at: string;
}

// User queries
export const userQueries = {
  create: db.prepare<User, [string, string]>(
    "INSERT INTO users (username, password_hash) VALUES (?, ?) RETURNING *"
  ),
  findByUsername: db.prepare<User, [string]>(
    "SELECT * FROM users WHERE username = ?"
  ),
  findById: db.prepare<User, [number]>(
    "SELECT * FROM users WHERE id = ?"
  ),
};

// Essay queries
export const essayQueries = {
  create: db.prepare<Essay, [string, number, string, string]>(
    "INSERT INTO essays (short_id, user_id, title, content) VALUES (?, ?, ?, ?) RETURNING *"
  ),
  findById: db.prepare<Essay, [number]>(
    "SELECT * FROM essays WHERE id = ?"
  ),
  findByShortId: db.prepare<Essay, [string]>(
    "SELECT * FROM essays WHERE short_id = ?"
  ),
  findByUserId: db.prepare<Essay, [number]>(
    "SELECT * FROM essays WHERE user_id = ? ORDER BY updated_at DESC"
  ),
  findPublished: db.prepare<Essay, []>(
    "SELECT * FROM essays WHERE status = 'published' ORDER BY updated_at DESC"
  ),
  update: db.prepare<Essay, [string, string, string, number]>(
    "UPDATE essays SET title = ?, content = ?, updated_at = CURRENT_TIMESTAMP WHERE short_id = ? AND user_id = ? RETURNING *"
  ),
  updateStatus: db.prepare<Essay, [string, string, number]>(
    "UPDATE essays SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE short_id = ? AND user_id = ? RETURNING *"
  ),
  delete: db.prepare<null, [string, number]>(
    "DELETE FROM essays WHERE short_id = ? AND user_id = ?"
  ),
};
