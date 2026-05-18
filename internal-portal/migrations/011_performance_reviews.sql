-- Portal Database Performance Reviews Tables
-- Migration for scratchsolid-portal-db (production)

-- Performance reviews table
CREATE TABLE IF NOT EXISTS performance_reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  reviewer_id INTEGER NOT NULL,
  review_period_start TEXT NOT NULL,
  review_period_end TEXT NOT NULL,
  overall_score REAL,
  comments TEXT,
  strengths TEXT,
  areas_for_improvement TEXT,
  goals TEXT,
  status TEXT DEFAULT 'draft', -- 'draft', 'submitted', 'reviewed'
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (reviewer_id) REFERENCES users(id)
);

-- Staff monthly reviews
CREATE TABLE IF NOT EXISTS staff_monthly_reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  staff_id INTEGER NOT NULL,
  month TEXT NOT NULL, -- YYYY-MM format
  year INTEGER NOT NULL,
  attendance_score REAL DEFAULT 0,
  performance_score REAL DEFAULT 0,
  company_values_score REAL DEFAULT 0,
  overall_score REAL DEFAULT 0,
  reviewer_id INTEGER,
  notes TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (staff_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (reviewer_id) REFERENCES users(id),
  UNIQUE(staff_id, month, year)
);

-- Job performance metrics
CREATE TABLE IF NOT EXISTS job_performance_metrics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  staff_id INTEGER NOT NULL,
  metric_type TEXT NOT NULL,
  metric_value REAL NOT NULL,
  period TEXT NOT NULL, -- YYYY-MM format
  notes TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (staff_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_performance_reviews_user_id ON performance_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_performance_reviews_reviewer_id ON performance_reviews(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_performance_reviews_period ON performance_reviews(review_period_start, review_period_end);
CREATE INDEX IF NOT EXISTS idx_staff_monthly_reviews_staff_id ON staff_monthly_reviews(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_monthly_reviews_period ON staff_monthly_reviews(month, year);
CREATE INDEX IF NOT EXISTS idx_job_performance_metrics_staff_id ON job_performance_metrics(staff_id);
CREATE INDEX IF NOT EXISTS idx_job_performance_metrics_period ON job_performance_metrics(period);
