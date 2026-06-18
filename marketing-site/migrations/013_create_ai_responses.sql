-- Create ai_responses table if it doesn't exist (for new environments)
CREATE TABLE IF NOT EXISTS ai_responses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  question TEXT NOT NULL,
  response TEXT NOT NULL,
  keywords TEXT DEFAULT '',
  category TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_ai_responses_category ON ai_responses(category);
