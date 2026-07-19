-- Digital project intake: public "Start a project" wizard on the Digital dashboard.
-- Guests describe their idea (5W1H + branding + backend behavior + support/pricing
-- selection), get an AI-generated visual mockup they can confirm or iterate on
-- (storytelling aid only — staff always build the real project by hand), and the
-- confirmed request lands in a staff review queue to be converted into a real
-- `projects` row (see migration 024).

CREATE TABLE IF NOT EXISTS project_intake_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id INTEGER,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  company_name TEXT DEFAULT '',
  who_target_users TEXT DEFAULT '',
  what_description TEXT DEFAULT '',
  why_description TEXT DEFAULT '',
  when_timeline TEXT DEFAULT '',
  where_context TEXT DEFAULT '',
  how_description TEXT DEFAULT '',
  backend_interaction_description TEXT DEFAULT '',
  logo_file_url TEXT DEFAULT '',
  color_theme TEXT DEFAULT '',
  support_tier TEXT DEFAULT 'warranty' CHECK (support_tier IN ('warranty', 'standard', 'growth', 'partner')),
  support_monthly_rate REAL DEFAULT 0,
  support_min_term_months INTEGER DEFAULT 0,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'generating', 'awaiting_confirmation', 'confirmed', 'converted', 'abandoned')),
  converted_project_id INTEGER,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (converted_project_id) REFERENCES projects(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS intake_mockup_iterations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  intake_id INTEGER NOT NULL,
  iteration_number INTEGER NOT NULL,
  prompt_text TEXT DEFAULT '',
  generated_html TEXT NOT NULL,
  input_tokens INTEGER DEFAULT 0,
  output_tokens INTEGER DEFAULT 0,
  estimated_cost_cents REAL DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (intake_id) REFERENCES project_intake_requests(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_intake_requests_client_id ON project_intake_requests(client_id);
CREATE INDEX IF NOT EXISTS idx_intake_requests_status ON project_intake_requests(status);
CREATE INDEX IF NOT EXISTS idx_intake_requests_converted_project_id ON project_intake_requests(converted_project_id);
CREATE INDEX IF NOT EXISTS idx_intake_mockup_iterations_intake_id ON intake_mockup_iterations(intake_id);
