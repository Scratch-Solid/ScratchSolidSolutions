-- Add per-transition status timestamps to jobs, matching what the WhatsApp
-- status-update webhook (api/webhooks/whatsapp/meta) already tries to write
-- (started_at/arrived_at/completed_at) - these columns never existed, so
-- every real customer job's status update via WhatsApp has been silently
-- failing since the feature was built. This is also what the public
-- transparency tracker (api/public/job-tracking) reads to show customers
-- timestamped On the Way / Arrived / Completed status.

ALTER TABLE jobs ADD COLUMN started_at TEXT;
ALTER TABLE jobs ADD COLUMN arrived_at TEXT;
ALTER TABLE jobs ADD COLUMN completed_at TEXT;
