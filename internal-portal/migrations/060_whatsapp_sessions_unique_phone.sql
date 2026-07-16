-- lib/whatsapp/meta-cloud.ts's recordInboundMessage() does
-- INSERT ... ON CONFLICT(phone_number) DO UPDATE, but phone_number never had
-- a unique constraint - SQLite requires one for ON CONFLICT to target a
-- column, so every single call has been throwing (silently swallowed by the
-- webhook's outer try/catch). Confirmed zero rows exist in this table in
-- either environment, meaning the WhatsApp status-keyword handler
-- (START/HERE/DONE) has never successfully processed a single message.
CREATE UNIQUE INDEX IF NOT EXISTS idx_whatsapp_sessions_phone_unique ON whatsapp_sessions(phone_number);
