-- 027_job_performance_metrics_rebuild.sql
-- Rebuild job_performance_metrics table with all columns needed by code
-- Migration 011_performance_reviews.sql created the table with only 8 columns
-- Code in cleaner-status, sync-kpi, kpi-score routes requires additional columns

-- Add missing columns that code uses but migration 011 doesn't have
ALTER TABLE job_performance_metrics ADD COLUMN booking_id INTEGER REFERENCES bookings(id);
ALTER TABLE job_performance_metrics ADD COLUMN client_rating REAL DEFAULT 0;
ALTER TABLE job_performance_metrics ADD COLUMN punctuality_score REAL DEFAULT 0;
ALTER TABLE job_performance_metrics ADD COLUMN quality_score REAL DEFAULT 0;
ALTER TABLE job_performance_metrics ADD COLUMN communication_score REAL DEFAULT 0;
ALTER TABLE job_performance_metrics ADD COLUMN adherence_score REAL DEFAULT 0;
ALTER TABLE job_performance_metrics ADD COLUMN attendance_score REAL DEFAULT 0;
ALTER TABLE job_performance_metrics ADD COLUMN company_values_score REAL DEFAULT 0;
ALTER TABLE job_performance_metrics ADD COLUMN overall_score REAL DEFAULT 0;
ALTER TABLE job_performance_metrics ADD COLUMN scheduled_time TEXT DEFAULT NULL;
ALTER TABLE job_performance_metrics ADD COLUMN actual_arrival_time TEXT DEFAULT NULL;
ALTER TABLE job_performance_metrics ADD COLUMN recorded_by TEXT DEFAULT NULL;
ALTER TABLE job_performance_metrics ADD COLUMN recorded_at TEXT DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE job_performance_metrics ADD COLUMN client_star_rating REAL DEFAULT 0;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_job_performance_metrics_staff_id ON job_performance_metrics(staff_id);
CREATE INDEX IF NOT EXISTS idx_job_performance_metrics_booking_id ON job_performance_metrics(booking_id);
CREATE INDEX IF NOT EXISTS idx_job_performance_metrics_recorded_at ON job_performance_metrics(recorded_at);
CREATE INDEX IF NOT EXISTS idx_job_performance_metrics_client_rating ON job_performance_metrics(client_rating);
