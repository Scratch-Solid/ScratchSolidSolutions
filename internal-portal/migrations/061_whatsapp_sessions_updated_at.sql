-- recordInboundMessage()'s ON CONFLICT DO UPDATE clause sets updated_at,
-- but this table never had that column - a second, independent bug from
-- the missing unique constraint fixed in 060. Both had to be fixed before
-- a single WhatsApp message could ever be recorded successfully.
ALTER TABLE whatsapp_sessions ADD COLUMN updated_at TEXT DEFAULT CURRENT_TIMESTAMP;
