import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Local dev uses the built-in node:sqlite file database (zero native deps).
// Deployed (Vercel) uses Turso/libSQL when TURSO_URL is set — synchronous
// client so the rest of the code keeps its simple prepare/get/all/run style.
const TURSO_URL = process.env.TURSO_URL || '';
const TURSO_AUTH_TOKEN = process.env.TURSO_AUTH_TOKEN || '';
const IS_REMOTE = Boolean(TURSO_URL);

let raw;
if (IS_REMOTE) {
  const { default: LibsqlDatabase } = await import('libsql');
  raw = new LibsqlDatabase(TURSO_URL, { authToken: TURSO_AUTH_TOKEN });
} else {
  raw = new DatabaseSync(path.join(__dirname, 'quizsphere.db'));
}

const cleanRow = (row) => {
  if (!row || typeof row !== 'object') return row;
  const copy = { ...row };
  delete copy._metadata;
  delete copy._replication_index;
  return copy;
};

const cleanRun = (info) => ({
  changes: Number(info.changes || 0),
  lastInsertRowid: Number(info.lastInsertRowid || 0),
});

export const db = {
  prepare(sql) {
    const stmt = raw.prepare(sql);
    return {
      get: (...args) => cleanRow(stmt.get(...args)),
      all: (...args) => (stmt.all(...args) || []).map(cleanRow),
      run: (...args) => cleanRun(stmt.run(...args)),
    };
  },
  exec(sql) {
    return raw.exec(sql);
  },
  transaction(fn) {
    return (...args) => {
      db.exec('BEGIN');
      try {
        const result = fn(...args);
        db.exec('COMMIT');
        return result;
      } catch (err) {
        try {
          db.exec('ROLLBACK');
        } catch {
          /* ignore rollback errors */
        }
        throw err;
      }
    };
  },
  get raw() {
    return raw;
  },
};

db.exec(`
  PRAGMA foreign_keys = ON;
  ${IS_REMOTE ? '' : 'PRAGMA journal_mode = WAL;'}

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    is_admin INTEGER NOT NULL DEFAULT 0,
    xp INTEGER NOT NULL DEFAULT 0,
    bio TEXT NOT NULL DEFAULT '',
    avatar TEXT NOT NULL DEFAULT '',
    current_streak INTEGER NOT NULL DEFAULT 0,
    max_streak INTEGER NOT NULL DEFAULT 0,
    last_played_date TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS subjects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    description TEXT NOT NULL DEFAULT '',
    icon TEXT NOT NULL DEFAULT '📘',
    color TEXT NOT NULL DEFAULT '#6366f1',
    is_visible INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    option_a TEXT NOT NULL,
    option_b TEXT NOT NULL,
    option_c TEXT NOT NULL,
    option_d TEXT NOT NULL,
    correct INTEGER NOT NULL,
    points INTEGER NOT NULL DEFAULT 1,
    time_limit INTEGER NOT NULL DEFAULT 20,
    difficulty TEXT NOT NULL DEFAULT 'medium',
    explanation TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS attempts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    mode TEXT NOT NULL DEFAULT 'quiz',
    negative INTEGER NOT NULL DEFAULT 0,
    score INTEGER NOT NULL DEFAULT 0,
    correct_answers INTEGER NOT NULL DEFAULT 0,
    total_questions INTEGER NOT NULL DEFAULT 0,
    earned_points INTEGER NOT NULL DEFAULT 0,
    total_points INTEGER NOT NULL DEFAULT 0,
    xp_earned INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS answers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    attempt_id INTEGER NOT NULL REFERENCES attempts(id) ON DELETE CASCADE,
    question_id INTEGER NOT NULL,
    selected INTEGER,
    is_correct INTEGER NOT NULL DEFAULT 0,
    points_earned INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS badges (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    badge_key TEXT NOT NULL,
    earned_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(user_id, badge_key)
  );

  CREATE TABLE IF NOT EXISTS announcements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    body TEXT NOT NULL DEFAULT '',
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS password_resets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    expires_at TEXT NOT NULL,
    used INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_questions_subject ON questions(subject_id);
  CREATE INDEX IF NOT EXISTS idx_attempts_user ON attempts(user_id);
  CREATE INDEX IF NOT EXISTS idx_attempts_subject ON attempts(subject_id);
  CREATE INDEX IF NOT EXISTS idx_attempts_mode ON attempts(mode);
  CREATE INDEX IF NOT EXISTS idx_badges_user ON badges(user_id);
  CREATE INDEX IF NOT EXISTS idx_announcements_active ON announcements(is_active);
`);

const columnExists = (table, column) => {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all();
  return cols.some((c) => c.name === column);
};

const migrate = () => {
  if (!columnExists('users', 'xp')) db.exec(`ALTER TABLE users ADD COLUMN xp INTEGER NOT NULL DEFAULT 0`);
  if (!columnExists('users', 'bio')) db.exec(`ALTER TABLE users ADD COLUMN bio TEXT NOT NULL DEFAULT ''`);
  if (!columnExists('users', 'avatar')) db.exec(`ALTER TABLE users ADD COLUMN avatar TEXT NOT NULL DEFAULT ''`);
  if (!columnExists('users', 'current_streak')) db.exec(`ALTER TABLE users ADD COLUMN current_streak INTEGER NOT NULL DEFAULT 0`);
  if (!columnExists('users', 'max_streak')) db.exec(`ALTER TABLE users ADD COLUMN max_streak INTEGER NOT NULL DEFAULT 0`);
  if (!columnExists('users', 'last_played_date')) db.exec(`ALTER TABLE users ADD COLUMN last_played_date TEXT`);

  if (!columnExists('subjects', 'is_visible')) db.exec(`ALTER TABLE subjects ADD COLUMN is_visible INTEGER NOT NULL DEFAULT 1`);

  if (!columnExists('questions', 'difficulty')) db.exec(`ALTER TABLE questions ADD COLUMN difficulty TEXT NOT NULL DEFAULT 'medium'`);
  if (!columnExists('questions', 'explanation')) db.exec(`ALTER TABLE questions ADD COLUMN explanation TEXT NOT NULL DEFAULT ''`);

  if (!columnExists('attempts', 'mode')) db.exec(`ALTER TABLE attempts ADD COLUMN mode TEXT NOT NULL DEFAULT 'quiz'`);
  if (!columnExists('attempts', 'negative')) db.exec(`ALTER TABLE attempts ADD COLUMN negative INTEGER NOT NULL DEFAULT 0`);
  if (!columnExists('attempts', 'xp_earned')) db.exec(`ALTER TABLE attempts ADD COLUMN xp_earned INTEGER NOT NULL DEFAULT 0`);
};

migrate();
