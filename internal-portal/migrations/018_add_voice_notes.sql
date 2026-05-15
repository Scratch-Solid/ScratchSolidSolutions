-- Migration: SMS Fallback & Voice Notes
-- Add table for voice notes and SMS fallback logs

CREATE TABLE IF NOT EXISTS voice_notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  booking_id INTEGER NOT NULL,
  sender_id INTEGER NOT NULL,
  audio_url TEXT NOT NULL,
  duration_seconds INTEGER,
  transcribed_text TEXT,
  created_at TEXT NOT NULL,
  listened INTEGER DEFAULT 0,
  FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
  FOREIGN KEY (sender_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS sms_fallback_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  notification_type TEXT NOT NULL, -- 'whatsapp_failed', 'push_failed'
  original_recipient TEXT NOT NULL,
  fallback_method TEXT NOT NULL, -- 'sms', 'email'
  sent_at TEXT NOT NULL,
  status TEXT NOT NULL, -- 'sent', 'failed'
  error_message TEXT,
  FOREIGN KEY (original_recipient) REFERENCES users(id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_voice_notes_booking_id ON voice_notes(booking_id);
CREATE INDEX IF NOT EXISTS idx_voice_notes_sender_id ON voice_notes(sender_id);
CREATE INDEX IF NOT EXISTS idx_sms_fallback_logs_recipient ON sms_fallback_logs(original_recipient);
