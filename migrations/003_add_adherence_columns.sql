-- Migration 003: Add adherence tracking columns to job_performance_metrics
-- Required by the KPI engine spec: scheduled vs actual arrival time + adherence score

ALTER TABLE job_performance_metrics ADD COLUMN scheduled_time TEXT;
ALTER TABLE job_performance_metrics ADD COLUMN actual_arrival_time TEXT;
ALTER TABLE job_performance_metrics ADD COLUMN adherence_score REAL DEFAULT 0;
ALTER TABLE job_performance_metrics ADD COLUMN attendance_score REAL DEFAULT 0;
ALTER TABLE job_performance_metrics ADD COLUMN company_values_score REAL DEFAULT 0;

-- Backfill: default existing rows to neutral scores
UPDATE job_performance_metrics SET adherence_score = 5, attendance_score = 5, company_values_score = 5
WHERE adherence_score IS NULL OR adherence_score = 0;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_job_performance_metrics_recorded_at ON job_performance_metrics(recorded_at);

-- Record migration
INSERT INTO migrations (name, executed_at) VALUES ('003_add_adherence_columns', CURRENT_TIMESTAMP)
ON CONFLICT(name) DO NOTHING;
