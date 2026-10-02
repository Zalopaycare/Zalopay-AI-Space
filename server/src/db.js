import Database from 'better-sqlite3'
import fs from 'node:fs'
import path from 'node:path'

const DATA_DIR = process.env.DATA_DIR || '/data'
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })

export const db = new Database(path.join(DATA_DIR, 'app.db'))
db.pragma('journal_mode = WAL')

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  initials TEXT NOT NULL,
  team TEXT NOT NULL DEFAULT '',
  is_admin INTEGER NOT NULL DEFAULT 0,
  avatar_color TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS login_codes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL,
  code TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  consumed_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS questions (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT '[]',
  topics TEXT NOT NULL DEFAULT '[]',
  tools TEXT NOT NULL DEFAULT '[]',
  author_id INTEGER NOT NULL REFERENCES users(id),
  resolved INTEGER NOT NULL DEFAULT 0,
  accepted_answer_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS question_answers (
  id TEXT PRIMARY KEY,
  question_id TEXT NOT NULL REFERENCES questions(id),
  author_id INTEGER NOT NULL REFERENCES users(id),
  body TEXT NOT NULL,
  accepted INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS answer_comments (
  id TEXT PRIMARY KEY,
  answer_id TEXT NOT NULL REFERENCES question_answers(id),
  author_id INTEGER NOT NULL REFERENCES users(id),
  body TEXT NOT NULL,
  parent_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS question_reactions (
  question_id TEXT NOT NULL REFERENCES questions(id),
  user_id INTEGER NOT NULL REFERENCES users(id),
  PRIMARY KEY (question_id, user_id)
);

CREATE TABLE IF NOT EXISTS answer_reactions (
  answer_id TEXT NOT NULL REFERENCES question_answers(id),
  user_id INTEGER NOT NULL REFERENCES users(id),
  PRIMARY KEY (answer_id, user_id)
);

CREATE TABLE IF NOT EXISTS saved_questions (
  question_id TEXT NOT NULL REFERENCES questions(id),
  user_id INTEGER NOT NULL REFERENCES users(id),
  PRIMARY KEY (question_id, user_id)
);

CREATE TABLE IF NOT EXISTS use_case_submissions (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  audience TEXT NOT NULL DEFAULT '',
  team TEXT NOT NULL DEFAULT '',
  problem TEXT NOT NULL DEFAULT '',
  solution TEXT NOT NULL DEFAULT '',
  prep TEXT NOT NULL DEFAULT '',
  prompt_text TEXT NOT NULL DEFAULT '',
  result TEXT NOT NULL DEFAULT '',
  limits TEXT NOT NULL DEFAULT '',
  contact TEXT NOT NULL DEFAULT '',
  link TEXT NOT NULL DEFAULT '',
  kind TEXT NOT NULL DEFAULT '',
  status_field TEXT NOT NULL DEFAULT '',
  level TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT '[]',
  topics TEXT NOT NULL DEFAULT '[]',
  tools TEXT NOT NULL DEFAULT '[]',
  review_status TEXT NOT NULL DEFAULT 'pending',
  admin_note TEXT NOT NULL DEFAULT '',
  author_id INTEGER NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS use_case_reactions (
  use_case_id TEXT NOT NULL,
  user_id INTEGER NOT NULL REFERENCES users(id),
  PRIMARY KEY (use_case_id, user_id)
);

CREATE TABLE IF NOT EXISTS use_case_saves (
  use_case_id TEXT NOT NULL,
  user_id INTEGER NOT NULL REFERENCES users(id),
  PRIMARY KEY (use_case_id, user_id)
);

CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL,
  kind TEXT NOT NULL,
  text TEXT NOT NULL,
  href TEXT NOT NULL DEFAULT '',
  actor TEXT NOT NULL DEFAULT '',
  read INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS notifications_email ON notifications (email, created_at);

CREATE TABLE IF NOT EXISTS question_images (
  question_id TEXT NOT NULL,
  idx INTEGER NOT NULL,
  mime TEXT NOT NULL,
  data BLOB NOT NULL,
  PRIMARY KEY (question_id, idx)
);

CREATE TABLE IF NOT EXISTS use_case_comments (
  id TEXT PRIMARY KEY,
  use_case_id TEXT NOT NULL,
  author_id INTEGER NOT NULL REFERENCES users(id),
  body TEXT NOT NULL,
  parent_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`)

// Migration: existing DBs from before avatar_color existed need the column added —
// CREATE TABLE IF NOT EXISTS above only helps brand-new databases.
const userColumns = db.prepare("PRAGMA table_info(users)").all().map((c) => c.name)
if (!userColumns.includes('avatar_color')) {
  db.exec('ALTER TABLE users ADD COLUMN avatar_color TEXT')
}

const answerCommentColumns = db.prepare("PRAGMA table_info(answer_comments)").all().map((c) => c.name)
if (!answerCommentColumns.includes('parent_id')) {
  db.exec('ALTER TABLE answer_comments ADD COLUMN parent_id TEXT')
}

const useCaseCommentColumns = db.prepare("PRAGMA table_info(use_case_comments)").all().map((c) => c.name)
if (!useCaseCommentColumns.includes('parent_id')) {
  db.exec('ALTER TABLE use_case_comments ADD COLUMN parent_id TEXT')
}

// "(đã sửa)" markers for edited answers and comments.
for (const table of ['question_answers', 'answer_comments', 'use_case_comments', 'questions', 'use_case_submissions']) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all().map((c) => c.name)
  if (!cols.includes('edited_at')) db.exec(`ALTER TABLE ${table} ADD COLUMN edited_at TEXT`)
}

{
  const cols = db.prepare('PRAGMA table_info(use_case_submissions)').all().map((c) => c.name)
  if (!cols.includes('published_at')) db.exec('ALTER TABLE use_case_submissions ADD COLUMN published_at TEXT')
  if (!cols.includes('reviewed_at')) db.exec('ALTER TABLE use_case_submissions ADD COLUMN reviewed_at TEXT')
  // Which admin made the last review decision (approve / changes / reject). Older rows stay NULL.
  if (!cols.includes('reviewed_by')) db.exec('ALTER TABLE use_case_submissions ADD COLUMN reviewed_by INTEGER')
  // Extra 9-part template fields from the share form (JSON: type, oneLine, highlights, fit, pitfalls, tech). Additive only.
  if (!cols.includes('extra')) db.exec('ALTER TABLE use_case_submissions ADD COLUMN extra TEXT')
  db.exec("UPDATE use_case_submissions SET published_at = created_at WHERE review_status = 'approved' AND published_at IS NULL")
}

// Files attached to a question (Word, PDF, Excel…), downloaded by name. Additive only.
db.exec(`
CREATE TABLE IF NOT EXISTS question_files (
  question_id TEXT NOT NULL,
  idx INTEGER NOT NULL,
  name TEXT NOT NULL,
  mime TEXT NOT NULL,
  size INTEGER NOT NULL,
  data BLOB NOT NULL,
  PRIMARY KEY (question_id, idx)
);
`)

// Avatar photo (users) and anonymous posting (questions, answers, use cases). Additive only.
{
  const has = (t, c) => db.prepare(`PRAGMA table_info(${t})`).all().some((x) => x.name === c)
  if (!has('users', 'avatar_mime')) db.exec('ALTER TABLE users ADD COLUMN avatar_mime TEXT')
  if (!has('users', 'avatar_data')) db.exec('ALTER TABLE users ADD COLUMN avatar_data BLOB')
  // Default display name for anonymous posts, set once in the profile.
  if (!has('users', 'anon_alias')) db.exec('ALTER TABLE users ADD COLUMN anon_alias TEXT')
  for (const t of ['questions', 'question_answers', 'use_case_submissions']) {
    if (!has(t, 'anonymous')) db.exec(`ALTER TABLE ${t} ADD COLUMN anonymous INTEGER NOT NULL DEFAULT 0`)
    if (!has(t, 'alias')) db.exec(`ALTER TABLE ${t} ADD COLUMN alias TEXT`)
  }
}

db.exec(`
CREATE TABLE IF NOT EXISTS reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  path TEXT NOT NULL DEFAULT '',
  excerpt TEXT NOT NULL DEFAULT '',
  target_author_id INTEGER,
  reporter_id INTEGER NOT NULL REFERENCES users(id),
  reason TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'open',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`)

// One row per person per (Vietnam-time) day they used the site: daily / weekly active users.
db.exec(`
CREATE TABLE IF NOT EXISTS user_days (
  user_id INTEGER NOT NULL REFERENCES users(id),
  day TEXT NOT NULL,
  PRIMARY KEY (user_id, day)
);
`)

export function nextId(prefix) {
  return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
}

// 1–5 star ratings on use cases (one per person, changeable).
db.exec(`
-- "Tôi đã áp dụng": people who say they used a use case themselves (one per person).
CREATE TABLE IF NOT EXISTS use_case_applied (
  use_case_id TEXT NOT NULL,
  user_id INTEGER NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (use_case_id, user_id)
);

CREATE TABLE IF NOT EXISTS use_case_ratings (
  use_case_id TEXT NOT NULL,
  user_id INTEGER NOT NULL REFERENCES users(id),
  stars INTEGER NOT NULL CHECK (stars BETWEEN 1 AND 5),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (use_case_id, user_id)
);
`)

// Optional cover image for a use case (stored with the submission so every viewer sees it).
{
  const cols = db.prepare('PRAGMA table_info(use_case_submissions)').all().map((c) => c.name)
  if (!cols.includes('cover_mime')) db.exec('ALTER TABLE use_case_submissions ADD COLUMN cover_mime TEXT')
  if (!cols.includes('cover_data')) db.exec('ALTER TABLE use_case_submissions ADD COLUMN cover_data BLOB')
}
