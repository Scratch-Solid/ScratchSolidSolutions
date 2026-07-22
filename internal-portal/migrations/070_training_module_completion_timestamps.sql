-- Tracks when each training module was completed (JSON object mapping
-- module id -> ISO timestamp), so the complete endpoint can enforce a
-- max-2-modules-per-rolling-24h-window cap.
ALTER TABLE training_progress ADD COLUMN modules_completed_at TEXT DEFAULT NULL;
