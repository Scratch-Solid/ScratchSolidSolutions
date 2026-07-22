-- Digital project pricing + deposit/final payment tracking.
--
-- Deliberately additive-only, no CHECK constraint changes: `status` on
-- project_intake_requests keeps its existing meaning (confirmation/
-- conversion lifecycle) untouched. Payment state is a separate concern,
-- tracked via nullable timestamp columns - the /convert gate becomes
-- "status = 'confirmed' AND deposit_paid_at IS NOT NULL" rather than
-- widening the status enum (which SQLite can't ALTER without a full
-- table rebuild).

ALTER TABLE project_intake_requests ADD COLUMN page_list TEXT DEFAULT '[]';
ALTER TABLE project_intake_requests ADD COLUMN base_fee REAL DEFAULT 0;
ALTER TABLE project_intake_requests ADD COLUMN pages_subtotal REAL DEFAULT 0;
ALTER TABLE project_intake_requests ADD COLUMN promo_code TEXT;
ALTER TABLE project_intake_requests ADD COLUMN discount_amount REAL DEFAULT 0;
ALTER TABLE project_intake_requests ADD COLUMN total_price REAL DEFAULT 0;
ALTER TABLE project_intake_requests ADD COLUMN has_custom_items INTEGER DEFAULT 0;
ALTER TABLE project_intake_requests ADD COLUMN deposit_amount REAL DEFAULT 0;
ALTER TABLE project_intake_requests ADD COLUMN deposit_paid_at TEXT;
ALTER TABLE project_intake_requests ADD COLUMN deposit_payment_ref TEXT;
ALTER TABLE project_intake_requests ADD COLUMN final_amount REAL DEFAULT 0;
ALTER TABLE project_intake_requests ADD COLUMN final_paid_at TEXT;
ALTER TABLE project_intake_requests ADD COLUMN final_payment_ref TEXT;
ALTER TABLE project_intake_requests ADD COLUMN delivered_at TEXT;

-- Lets one promo code be restricted to a service line, so a digital-launch
-- code can't be redeemed against a cleaning booking (or vice versa) unless
-- deliberately created as 'both'. Existing codes default to 'both' so
-- nothing already live changes behavior.
ALTER TABLE promo_codes ADD COLUMN applies_to TEXT DEFAULT 'both' CHECK (applies_to IN ('cleaning', 'digital', 'both'));

-- payments.booking_id is the only FK today - project_intake_id is the
-- digital-side equivalent, and payment_purpose disambiguates which of the
-- (up to) three payment kinds a row represents, since a single intake now
-- has two real charges (deposit, then final) instead of bookings' one.
ALTER TABLE payments ADD COLUMN project_intake_id INTEGER REFERENCES project_intake_requests(id);
ALTER TABLE payments ADD COLUMN payment_purpose TEXT DEFAULT 'booking' CHECK (payment_purpose IN ('booking', 'digital_deposit', 'digital_final'));

CREATE INDEX IF NOT EXISTS idx_project_intake_requests_deposit_paid_at ON project_intake_requests(deposit_paid_at);
CREATE INDEX IF NOT EXISTS idx_payments_project_intake_id ON payments(project_intake_id);
CREATE INDEX IF NOT EXISTS idx_promo_codes_applies_to ON promo_codes(applies_to);
