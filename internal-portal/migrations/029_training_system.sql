-- Migration 029: Training System Tables
-- E-Learning system for cleaner onboarding with 5-day curriculum

-- Table: employee_training_progress
-- Tracks user progression and system access lockouts
CREATE TABLE IF NOT EXISTS employee_training_progress (
    user_id INTEGER PRIMARY KEY,                   -- Changed from TEXT to INTEGER to match users.id
    training_status TEXT DEFAULT 'Trainee',         -- 'Trainee' or 'Completed'
    current_module_id INTEGER DEFAULT 1,            -- Range: 1 to 5
    last_completed_at TEXT NULL,                    -- ISO8601 String for D1 Compatibility
    next_unlock_at TEXT DEFAULT CURRENT_TIMESTAMP,  -- ISO8601 String time gate
    certificate_url TEXT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Table: training_quiz_attempts
-- Audit log for quiz scoring metrics
CREATE TABLE IF NOT EXISTS training_quiz_attempts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,                       -- Changed from TEXT to INTEGER
    module_id INTEGER NOT NULL,
    score_percentage REAL NOT NULL,
    passed INTEGER NOT NULL,                        -- 0 for False, 1 for True (D1 Boolean standard)
    attempted_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES employee_training_progress(user_id) ON DELETE CASCADE
);

-- Table: training_modules_manifest
-- Static module definitions for the 5-day curriculum
CREATE TABLE IF NOT EXISTS training_modules_manifest (
    module_id INTEGER PRIMARY KEY,
    module_title TEXT NOT NULL,
    estimated_duration_minutes INTEGER DEFAULT 15,
    required_passing_score REAL DEFAULT 100.00
);

-- Seed static validation data to assist front-end state calculations
INSERT OR IGNORE INTO training_modules_manifest (module_id, module_title, estimated_duration_minutes) VALUES 
(1, 'Brand Integrity, Culture, & The 5-Color System', 15),
(2, 'Residential Maintenance Cleaning Protocols', 15),
(3, 'Residential Deep Cleaning Execution', 15),
(4, 'Corporate & Commercial Workspace Standards', 15),
(5, 'The Final Walkthrough, Security, & Checklist Verification', 15);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_training_quiz_attempts_user_id ON training_quiz_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_training_quiz_attempts_module_id ON training_quiz_attempts(module_id);
CREATE INDEX IF NOT EXISTS idx_employee_training_progress_status ON employee_training_progress(training_status);
