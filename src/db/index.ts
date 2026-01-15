import { Database } from "bun:sqlite";

// Database path - configurable via environment variable
const DATABASE_PATH = process.env.DATABASE_PATH || "disregarded.db";
const db = new Database(DATABASE_PATH);

console.log(`[db] Using database: ${DATABASE_PATH}`);

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
  create: db.prepare<Essay, [number, string, string]>(
    "INSERT INTO essays (user_id, title, content) VALUES (?, ?, ?) RETURNING *"
  ),
  findById: db.prepare<Essay, [number]>(
    "SELECT * FROM essays WHERE id = ?"
  ),
  findByUserId: db.prepare<Essay, [number]>(
    "SELECT * FROM essays WHERE user_id = ? ORDER BY updated_at DESC"
  ),
  findPublished: db.prepare<Essay, []>(
    "SELECT * FROM essays WHERE status = 'published' ORDER BY updated_at DESC"
  ),
  update: db.prepare<Essay, [string, string, number, number]>(
    "UPDATE essays SET title = ?, content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ? RETURNING *"
  ),
  updateStatus: db.prepare<Essay, [string, number, number]>(
    "UPDATE essays SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ? RETURNING *"
  ),
  delete: db.prepare<null, [number, number]>(
    "DELETE FROM essays WHERE id = ? AND user_id = ?"
  ),
};
