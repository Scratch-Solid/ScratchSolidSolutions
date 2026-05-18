-- Portal Database Departments & Teams Tables
-- Migration for scratchsolid-portal-db (production)

-- Departments table
CREATE TABLE IF NOT EXISTS departments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  manager_id INTEGER,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (manager_id) REFERENCES users(id)
);

-- Teams table
CREATE TABLE IF NOT EXISTS teams (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  department_id INTEGER,
  description TEXT,
  team_lead_id INTEGER,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (department_id) REFERENCES departments(id),
  FOREIGN KEY (team_lead_id) REFERENCES users(id)
);

-- Team members junction table
CREATE TABLE IF NOT EXISTS team_members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  team_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  role TEXT DEFAULT 'member', -- 'lead', 'member'
  joined_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(team_id, user_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_departments_manager_id ON departments(manager_id);
CREATE INDEX IF NOT EXISTS idx_teams_department_id ON teams(department_id);
CREATE INDEX IF NOT EXISTS idx_teams_team_lead_id ON teams(team_lead_id);
CREATE INDEX IF NOT EXISTS idx_team_members_team_id ON team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON team_members(user_id);
