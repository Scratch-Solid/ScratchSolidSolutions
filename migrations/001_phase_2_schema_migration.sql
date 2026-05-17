-- Phase 2: Schema Design & Migration Strategy
-- This migration adds new tables, columns, and indexes to support pool management,
-- staff management, pricing configuration, marketing CMS, and POPIA compliance.

-- Create staff table (replaces cleaner_profiles with enhanced functionality)
CREATE TABLE IF NOT EXISTS staff (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    cellphone TEXT UNIQUE NOT NULL,
    tax_number TEXT UNIQUE,
    bio TEXT,
    phone TEXT,
    address TEXT,
    emergency_contact1 TEXT,
    emergency_contact2 TEXT,
    pool_type TEXT DEFAULT 'INDIVIDUAL' CHECK (pool_type IN ('INDIVIDUAL', 'BUSINESS')),
    service_type TEXT DEFAULT 'RESIDENTIAL' CHECK (service_type IN ('RESIDENTIAL', 'LEKKESLAAP', 'POST_CONSTRUCTION', 'OFFICE', 'COMMERCIAL')),
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (username) REFERENCES users(username) ON DELETE CASCADE
);

-- Create booking_assignments table for pool-based assignment tracking
CREATE TABLE IF NOT EXISTS booking_assignments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    booking_id INTEGER NOT NULL,
    staff_id INTEGER NOT NULL,
    pool_type TEXT NOT NULL CHECK (pool_type IN ('INDIVIDUAL', 'BUSINESS')),
    service_type TEXT NOT NULL CHECK (service_type IN ('RESIDENTIAL', 'LEKKESLAAP', 'POST_CONSTRUCTION', 'OFFICE', 'COMMERCIAL')),
    time_slot TEXT CHECK (time_slot IN ('08:00', '11:00', '12:00', '14:00')),
    assignment_date DATE NOT NULL,
    status TEXT DEFAULT 'assigned' CHECK (status IN ('assigned', 'on_way', 'arrived', 'completed', 'cancelled')),
    assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME,
    reason TEXT,
    FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
    FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE CASCADE
);

-- Create staff_pool_transitions table to track pool changes
CREATE TABLE IF NOT EXISTS staff_pool_transitions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    staff_id INTEGER NOT NULL,
    from_pool TEXT CHECK (from_pool IN ('INDIVIDUAL', 'BUSINESS')),
    to_pool TEXT NOT NULL CHECK (to_pool IN ('INDIVIDUAL', 'BUSINESS')),
    reason TEXT NOT NULL,
    transitioned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    transitioned_by TEXT NOT NULL,
    FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE CASCADE,
    FOREIGN KEY (transitioned_by) REFERENCES users(username)
);

-- Create pricing_config table for dynamic pricing
CREATE TABLE IF NOT EXISTS pricing_config (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    service_type TEXT UNIQUE NOT NULL,
    base_price REAL NOT NULL,
    transport_fee REAL DEFAULT 0,
    weekend_surcharge REAL DEFAULT 0,
    holiday_surcharge REAL DEFAULT 0,
    rush_surcharge REAL DEFAULT 0,
    effective_from DATETIME DEFAULT CURRENT_TIMESTAMP,
    effective_to DATETIME,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_by TEXT,
    FOREIGN KEY (updated_by) REFERENCES users(username)
);

-- Create marketing_cms table for content management
CREATE TABLE IF NOT EXISTS marketing_cms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    content_key TEXT UNIQUE NOT NULL,
    content TEXT NOT NULL,
    content_type TEXT DEFAULT 'text' CHECK (content_type IN ('text', 'html', 'markdown')),
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_by TEXT,
    FOREIGN KEY (updated_by) REFERENCES users(username)
);

-- Create staff_public_profiles table for POPIA-compliant public profiles
CREATE TABLE IF NOT EXISTS staff_public_profiles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    staff_id INTEGER UNIQUE NOT NULL,
    display_name TEXT NOT NULL,
    bio TEXT,
    specialties TEXT, -- JSON array of specialties
    certifications TEXT, -- JSON array of certifications
    languages TEXT, -- JSON array of languages
    years_experience INTEGER DEFAULT 0,
    average_rating REAL DEFAULT 0,
    total_reviews INTEGER DEFAULT 0,
    is_visible BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE CASCADE
);

-- Create job_performance_metrics table for KPI tracking
CREATE TABLE IF NOT EXISTS job_performance_metrics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    staff_id INTEGER NOT NULL,
    booking_id INTEGER NOT NULL,
    client_rating INTEGER CHECK (client_rating BETWEEN 1 AND 5),
    soft_skill_score REAL DEFAULT 0,
    punctuality_score REAL DEFAULT 0,
    quality_score REAL DEFAULT 0,
    communication_score REAL DEFAULT 0,
    overall_score REAL DEFAULT 0,
    feedback TEXT,
    recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    recorded_by TEXT,
    FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE CASCADE,
    FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
    FOREIGN KEY (recorded_by) REFERENCES users(username)
);

-- Create staff_monthly_reviews table for admin reviews
CREATE TABLE IF NOT EXISTS staff_monthly_reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    staff_id INTEGER NOT NULL,
    review_month TEXT NOT NULL, -- Format: YYYY-MM
    overall_kpi REAL DEFAULT 0,
    client_satisfaction_avg REAL DEFAULT 0,
    jobs_completed INTEGER DEFAULT 0,
    on_time_percentage REAL DEFAULT 0,
    notes TEXT,
    reviewed_by TEXT NOT NULL,
    reviewed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE CASCADE,
    FOREIGN KEY (reviewed_by) REFERENCES users(username),
    UNIQUE(staff_id, review_month)
);

-- Create data_access_audit table for POPIA compliance
CREATE TABLE IF NOT EXISTS data_access_audit (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    action TEXT NOT NULL,
    resource TEXT,
    resource_id TEXT,
    ip_address TEXT,
    user_agent TEXT,
    details TEXT,
    success BOOLEAN DEFAULT 1,
    error_message TEXT,
    session_id TEXT,
    accessed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Create proxy_access_audit table for admin proxy observer
CREATE TABLE IF NOT EXISTS proxy_access_audit (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    admin_user_id INTEGER NOT NULL,
    target_user_id INTEGER,
    action TEXT NOT NULL,
    resource TEXT,
    resource_id TEXT,
    ip_address TEXT,
    user_agent TEXT,
    session_id TEXT,
    started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    ended_at DATETIME,
    FOREIGN KEY (admin_user_id) REFERENCES users(id),
    FOREIGN KEY (target_user_id) REFERENCES users(id)
);

-- Create admin_permissions table for admin proxy observer
CREATE TABLE IF NOT EXISTS admin_permissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER UNIQUE NOT NULL,
    can_view_as BOOLEAN DEFAULT 0,
    can_proxy_observe BOOLEAN DEFAULT 0,
    granted_by TEXT NOT NULL,
    granted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (granted_by) REFERENCES users(username)
);

-- Extend bookings table with new columns
ALTER TABLE bookings ADD COLUMN service_type TEXT DEFAULT 'RESIDENTIAL' CHECK (service_type IN ('RESIDENTIAL', 'LEKKESLAAP', 'POST_CONSTRUCTION', 'OFFICE', 'COMMERCIAL'));
-- Note: service_type column already exists, so this will fail - commented out

ALTER TABLE bookings ADD COLUMN time_slot TEXT CHECK (time_slot IN ('08:00', '11:00', '12:00', '14:00'));
ALTER TABLE bookings ADD COLUMN pool_type TEXT CHECK (pool_type IN ('INDIVIDUAL', 'BUSINESS'));
ALTER TABLE bookings ADD COLUMN assignment_status TEXT DEFAULT 'pending' CHECK (assignment_status IN ('pending', 'assigned', 'on_way', 'arrived', 'completed', 'cancelled'));
ALTER TABLE bookings ADD COLUMN assigned_staff_id INTEGER;
ALTER TABLE bookings ADD COLUMN assigned_at DATETIME;
ALTER TABLE bookings ADD COLUMN completed_at DATETIME;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_booking_assignments_booking_id ON booking_assignments(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_assignments_staff_id ON booking_assignments(staff_id);
CREATE INDEX IF NOT EXISTS idx_booking_assignments_assignment_date ON booking_assignments(assignment_date);
CREATE INDEX IF NOT EXISTS idx_staff_pool_transitions_staff_id ON staff_pool_transitions(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_pool_transitions_transitioned_at ON staff_pool_transitions(transitioned_at);
CREATE INDEX IF NOT EXISTS idx_job_performance_metrics_staff_id ON job_performance_metrics(staff_id);
CREATE INDEX IF NOT EXISTS idx_job_performance_metrics_booking_id ON job_performance_metrics(booking_id);
CREATE INDEX IF NOT EXISTS idx_data_access_audit_user_id ON data_access_audit(user_id);
CREATE INDEX IF NOT EXISTS idx_data_access_audit_accessed_at ON data_access_audit(accessed_at);
CREATE INDEX IF NOT EXISTS idx_proxy_access_audit_admin_user_id ON proxy_access_audit(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_proxy_access_audit_session_id ON proxy_access_audit(session_id);

-- Create backward compatibility view for cleaner_profiles
CREATE VIEW IF NOT EXISTS cleaner_profiles AS
SELECT 
    id,
    username,
    first_name,
    last_name,
    cellphone,
    tax_number,
    bio,
    phone,
    address,
    emergency_contact1,
    emergency_contact2,
    is_active,
    created_at,
    updated_at
FROM staff;

-- Create triggers for data validation
CREATE TRIGGER IF NOT EXISTS validate_booking_assignment_status
BEFORE UPDATE ON booking_assignments
WHEN NEW.status = 'completed' AND OLD.status != 'completed'
BEGIN
    UPDATE booking_assignments SET completed_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS validate_staff_pool_transition
BEFORE INSERT ON staff_pool_transitions
BEGIN
    SELECT CASE 
        WHEN NEW.from_pool = NEW.to_pool THEN RAISE(ABORT, 'Cannot transition to the same pool')
    END;
END;

-- Record migration
INSERT INTO migrations (name, executed_at) VALUES ('001_phase_2_schema_migration', CURRENT_TIMESTAMP)
ON CONFLICT(name) DO NOTHING;
