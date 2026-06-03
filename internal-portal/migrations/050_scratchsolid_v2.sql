-- ═══════════════════════════════════════════════════════════════════
-- ScratchSolid 2.0 — Phase 2: Booking Ingestion & Job Tracking Schema
-- Tables: jobs, job_checklists, job_tracking, whatsapp_sessions,
--         property_templates, job_photos
-- ═══════════════════════════════════════════════════════════════════

-- ─── JOBS: Operational jobs derived from Cal.com bookings ───
CREATE TABLE IF NOT EXISTS jobs (
  id TEXT PRIMARY KEY,
  calcom_uid TEXT,
  client_email TEXT NOT NULL,
  client_name TEXT NOT NULL,
  client_phone TEXT NOT NULL,
  property_type TEXT NOT NULL,
  property_address TEXT NOT NULL,
  property_access_code TEXT,
  property_unit_name TEXT,
  special_requests TEXT,
  service_type TEXT NOT NULL DEFAULT 'turnover_clean',
  scheduled_at TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 120,
  status TEXT NOT NULL DEFAULT 'scheduled',
  supervisor_id INTEGER,
  team_members TEXT,
  zoho_invoice_id TEXT,
  zoho_customer_id TEXT,
  erpnext_shift_id TEXT,
  total_amount_cents INTEGER,
  payment_status TEXT DEFAULT 'pending',
  created_at TEXT DEFAULT datetime('now'),
  updated_at TEXT DEFAULT datetime('now')
);

-- ─── JOB CHECKLISTS: Room-by-room task tracking ───
CREATE TABLE IF NOT EXISTS job_checklists (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id TEXT NOT NULL REFERENCES jobs(id),
  room_name TEXT NOT NULL,
  task_name TEXT NOT NULL,
  task_order INTEGER NOT NULL,
  is_completed INTEGER DEFAULT 0,
  completed_at TEXT,
  completed_by INTEGER,
  qa_photo_url TEXT,
  notes TEXT,
  created_at TEXT DEFAULT datetime('now')
);

-- ─── JOB TRACKING: GPS breadcrumbs (15s interval while en_route) ───
CREATE TABLE IF NOT EXISTS job_tracking (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id TEXT NOT NULL REFERENCES jobs(id),
  latitude REAL NOT NULL,
  longitude REAL NOT NULL,
  accuracy_meters REAL,
  speed_kmh REAL,
  recorded_at TEXT DEFAULT datetime('now'),
  source TEXT DEFAULT 'supervisor_app'
);

-- ─── WHATSAPP SESSIONS: 24h conversation window management ───
CREATE TABLE IF NOT EXISTS whatsapp_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  phone_number TEXT NOT NULL,
  waba_id TEXT,
  job_id TEXT REFERENCES jobs(id),
  conversation_started_at TEXT,
  conversation_expires_at TEXT,
  last_message_at TEXT,
  message_count_inbound INTEGER DEFAULT 0,
  message_count_outbound INTEGER DEFAULT 0,
  window_status TEXT DEFAULT 'closed',
  fallback_email_sent INTEGER DEFAULT 0,
  created_at TEXT DEFAULT datetime('now')
);

-- ─── PROPERTY TEMPLATES: Seed data for checklist generation ───
CREATE TABLE IF NOT EXISTS property_templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  property_type TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  estimated_duration_minutes INTEGER,
  rooms_json TEXT NOT NULL,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT datetime('now')
);

-- ─── JOB PHOTOS: Completion/QA evidence (R2/S3, 90-day TTL) ───
CREATE TABLE IF NOT EXISTS job_photos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id TEXT NOT NULL REFERENCES jobs(id),
  room_name TEXT,
  photo_type TEXT DEFAULT 'qa',
  storage_provider TEXT DEFAULT 'r2',
  storage_path TEXT NOT NULL,
  public_url TEXT,
  uploaded_by INTEGER NOT NULL,
  uploaded_at TEXT DEFAULT datetime('now'),
  expires_at TEXT
);

-- ─── INDEXES ───
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_scheduled_at ON jobs(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_jobs_supervisor_id ON jobs(supervisor_id);
CREATE INDEX IF NOT EXISTS idx_jobs_client_email ON jobs(client_email);
CREATE INDEX IF NOT EXISTS idx_job_checklists_job_id ON job_checklists(job_id);
CREATE INDEX IF NOT EXISTS idx_job_tracking_job_id ON job_tracking(job_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_sessions_phone ON whatsapp_sessions(phone_number);
CREATE INDEX IF NOT EXISTS idx_whatsapp_sessions_job ON whatsapp_sessions(job_id);
CREATE INDEX IF NOT EXISTS idx_job_photos_job_id ON job_photos(job_id);
CREATE INDEX IF NOT EXISTS idx_job_photos_expires ON job_photos(expires_at);

-- ─── SEED: Property Templates ───
-- Only insert if table is empty (idempotent)
INSERT OR IGNORE INTO property_templates (property_type, display_name, estimated_duration_minutes, rooms_json) VALUES
('studio', 'Studio Apartment', 90, '[
  {"room_name": "Kitchenette", "tasks": ["Wipe all counters", "Clean sink and faucet", "Wipe appliance exteriors", "Empty and clean bin", "Sweep and mop floor"]},
  {"room_name": "Bathroom", "tasks": ["Clean toilet inside and out", "Scrub shower/bath", "Wipe sink and mirror", "Restock toiletries", "Mop floor"]},
  {"room_name": "Living/Sleeping Area", "tasks": ["Dust all surfaces", "Vacuum upholstery", "Make bed / arrange bedding", "Clean windows (interior)", "Vacuum and mop floor"]}
]'),

('1_bed', '1-Bedroom Apartment', 120, '[
  {"room_name": "Kitchen", "tasks": ["Deep clean counters", "Sanitize sink", "Clean appliances exterior", "Wipe cabinet fronts", "Sweep and mop floor", "Restock dish soap"]},
  {"room_name": "Bathroom", "tasks": ["Deep clean toilet", "Scrub shower/tub", "Clean sink and mirror", "Wipe tiles", "Mop floor", "Replace used towels"]},
  {"room_name": "Bedroom", "tasks": ["Change bed linen", "Dust surfaces", "Vacuum carpet", "Clean mirrors", "Empty bins"]},
  {"room_name": "Living Room", "tasks": ["Dust all surfaces", "Vacuum upholstery", "Clean windows (interior)", "Arrange cushions", "Vacuum and mop floor"]}
]'),

('2_bed', '2-Bedroom Apartment', 150, '[
  {"room_name": "Kitchen", "tasks": ["Deep clean counters", "Sanitize sink", "Clean appliances exterior", "Wipe cabinet fronts", "Sweep and mop floor", "Restock dish soap"]},
  {"room_name": "Bathroom", "tasks": ["Deep clean toilet", "Scrub shower/tub", "Clean sink and mirror", "Wipe tiles", "Mop floor", "Replace used towels"]},
  {"room_name": "Bedroom 1", "tasks": ["Change bed linen", "Dust surfaces", "Vacuum carpet", "Clean mirrors", "Empty bins"]},
  {"room_name": "Bedroom 2", "tasks": ["Change bed linen", "Dust surfaces", "Vacuum carpet", "Clean mirrors", "Empty bins"]},
  {"room_name": "Living Room", "tasks": ["Dust all surfaces", "Vacuum upholstery", "Clean windows (interior)", "Arrange cushions", "Vacuum and mop floor"]}
]'),

('3_bed', '3-Bedroom Apartment', 180, '[
  {"room_name": "Kitchen", "tasks": ["Deep clean counters", "Sanitize sink", "Clean appliances exterior", "Wipe cabinet fronts", "Sweep and mop floor", "Restock dish soap"]},
  {"room_name": "Main Bathroom", "tasks": ["Deep clean toilet", "Scrub shower/tub", "Clean sink and mirror", "Wipe tiles", "Mop floor", "Replace used towels"]},
  {"room_name": "En-suite", "tasks": ["Deep clean toilet", "Scrub shower", "Clean sink and mirror", "Mop floor", "Replace used towels"]},
  {"room_name": "Bedroom 1", "tasks": ["Change bed linen", "Dust surfaces", "Vacuum carpet", "Clean mirrors", "Empty bins"]},
  {"room_name": "Bedroom 2", "tasks": ["Change bed linen", "Dust surfaces", "Vacuum carpet", "Clean mirrors", "Empty bins"]},
  {"room_name": "Bedroom 3", "tasks": ["Change bed linen", "Dust surfaces", "Vacuum carpet", "Clean mirrors", "Empty bins"]},
  {"room_name": "Living Room", "tasks": ["Dust all surfaces", "Vacuum upholstery", "Clean windows (interior)", "Arrange cushions", "Vacuum and mop floor"]}
]'),

('4_plus_bed', '4+ Bedroom House', 240, '[
  {"room_name": "Kitchen", "tasks": ["Deep clean counters", "Sanitize sink", "Clean appliances exterior", "Wipe cabinet fronts", "Sweep and mop floor", "Restock dish soap"]},
  {"room_name": "Main Bathroom", "tasks": ["Deep clean toilet", "Scrub shower/tub", "Clean sink and mirror", "Wipe tiles", "Mop floor", "Replace used towels"]},
  {"room_name": "En-suite 1", "tasks": ["Deep clean toilet", "Scrub shower", "Clean sink and mirror", "Mop floor", "Replace used towels"]},
  {"room_name": "En-suite 2", "tasks": ["Deep clean toilet", "Scrub shower", "Clean sink and mirror", "Mop floor", "Replace used towels"]},
  {"room_name": "Bedrooms", "tasks": ["Change bed linen (all rooms)", "Dust surfaces", "Vacuum carpets", "Clean mirrors", "Empty bins"]},
  {"room_name": "Living Room", "tasks": ["Dust all surfaces", "Vacuum upholstery", "Clean windows (interior)", "Arrange cushions", "Vacuum and mop floor"]},
  {"room_name": "Dining Room", "tasks": ["Dust surfaces", "Clean dining table", "Vacuum and mop floor", "Wipe light switches"]}
]'),

('commercial', 'Commercial Space', 180, '[
  {"room_name": "Reception", "tasks": ["Dust reception desk", "Clean visitor seating", "Wipe glass doors", "Vacuum and mop floor", "Restock hand sanitizer"]},
  {"room_name": "Office Area", "tasks": ["Dust workstations", "Clean shared tables", "Empty bins", "Vacuum and mop floor", "Wipe light switches"]},
  {"room_name": "Kitchenette", "tasks": ["Clean counters", "Sanitize sink", "Wipe microwave", "Sweep and mop floor", "Restock supplies"]},
  {"room_name": "Bathrooms", "tasks": ["Deep clean toilets", "Scrub sinks", "Clean mirrors", "Mop floors", "Restock soap and towels"]},
  {"room_name": "Conference Room", "tasks": ["Clean whiteboard", "Dust table and chairs", "Wipe AV equipment", "Vacuum and mop floor", "Empty bins"]}
]');
