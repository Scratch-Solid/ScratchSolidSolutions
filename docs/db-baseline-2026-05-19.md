# Database Baseline Documentation
**Captured: 2026-05-19**
**Purpose: Pre-migration snapshot of all 6 production and staging databases**

---

## Database IDs

| Database | Environment | ID |
|---|---|---|
| scratchsolid-backend-db | Production | `2a0b1e08-443e-46c4-8184-86ea180d4024` |
| scratchsolid-db-backend-staging | Staging | `67e66542-486a-442b-bbf6-9c3d4a503f4c` |
| scratchsolid-marketing-db | Production | `4c282c8f-8991-49bd-9dc6-e3eab31a4869` |
| scratchsolid-db-staging | Staging | `6b6f139b-7a19-4d44-9e21-b85c0c0da42b` |
| scratchsolid-portal-db | Production | `a08f16f5-9d75-47f9-973c-35bade106b47` |
| scratchsolid-db-portal-staging | Staging | `cc0bb727-585b-40c9-8afa-77947e725813` |

---

## 1. Backend Production DB (`scratchsolid-backend-db`)

### Table Count: 38 tables

### Tables Present:
`_cf_KV`, `ai_responses`, `api_keys`, `api_rate_limits`, `audit_logs`, `background_images`, `booking_services`, `booking_status_history`, `bookings`, `business_events`, `cleaner_profiles`, `d1_migrations`, `feature_flags`, `health_checks`, `integration_logs`, `invoice_items`, `invoices`, `migrations`, `notifications`, `password_reset_tokens`, `payment_methods`, `payments`, `pricing_config`, `refresh_tokens`, `reviews`, `sessions`, `sqlite_sequence`, `stripe_customers`, `stripe_events`, `system_config`, `templates`, `transactions`, `users`, `webhook_events`, `weekend_requests`

### Critical Table Schemas:

#### `users` (8 columns) — **MISSING 7 COLUMNS**
- `id` (INTEGER, PK)
- `email` (TEXT, NOT NULL)
- `password_hash` (TEXT, NOT NULL)
- `role` (TEXT, NOT NULL, default: 'system')
- `name` (TEXT, NOT NULL)
- `api_key_hash` (TEXT)
- `created_at` (TEXT, default: CURRENT_TIMESTAMP)
- `updated_at` (TEXT, default: CURRENT_TIMESTAMP)

**Missing columns (used in code but not in DB):**
- `phone`
- `address`
- `business_name`
- `business_info`
- `two_factor_enabled`
- `deleted`
- `soft_delete_at`

#### `bookings` (13 columns) — **SCHEMA MISMATCH WITH CODE**
- `id` (INTEGER, PK)
- `booking_id` (TEXT, NOT NULL)
- `client_id` (INTEGER)
- `service_type` (TEXT, NOT NULL)
- `booking_date` (TEXT, NOT NULL)
- `booking_time` (TEXT, NOT NULL)
- `total_amount` (REAL, NOT NULL)
- `status` (TEXT, default: 'pending')
- `external_reference` (TEXT)
- `created_at` (TEXT, default: CURRENT_TIMESTAMP)
- `updated_at` (TEXT, default: CURRENT_TIMESTAMP)
- `archived` (INTEGER, default: 0)
- `archived_at` (TEXT)

**Code inserts:** `user_id, booking_type, cleaning_type, payment_method, start_time, end_time` — none exist in DB
**Code also expects:** `zoho_invoice_id, pop_status` — not present

#### `payments` (12 columns) — **COLUMN NAME MISMATCH**
- `id` (INTEGER, PK)
- `booking_id` (INTEGER, NOT NULL)
- `payment_method_id` (INTEGER)
- `amount` (REAL, NOT NULL)
- `currency` (TEXT, default: 'ZAR')
- `status` (TEXT, default: 'pending')
- `payment_date` (TEXT)
- `external_payment_id` (TEXT)
- `gateway` (TEXT)
- `metadata` (TEXT)
- `created_at` (TEXT, default: CURRENT_TIMESTAMP)
- `updated_at` (TEXT, default: CURRENT_TIMESTAMP)

**Code inserts:** `method, confirmed, zoho_invoice_id` — not present
**Code uses:** `payment_method_id` vs `method` mismatch

#### `audit_logs` (11 columns) — **COLUMN NAME MISMATCH**
- `id` (INTEGER, PK)
- `user_id` (INTEGER)
- `action` (TEXT, NOT NULL)
- `resource_type` (TEXT, NOT NULL)
- `resource_id` (TEXT)
- `ip_address` (TEXT)
- `user_agent` (TEXT)
- `details` (TEXT)
- `created_at` (TEXT, default: CURRENT_TIMESTAMP)
- `archived` (INTEGER, default: 0)
- `archived_at` (TEXT)

**Code inserts:** `admin_id` — column is actually `user_id`

### Tables Present But No Migration Created Them:
- `business_events` — used in code, no backend migration
- `templates` — used in code, no backend migration
- `weekend_requests` — used in code, no backend migration
- `contracts` — **NOT PRESENT** (code expects it)
- `pricing` — **NOT PRESENT** (code expects it, only `pricing_config` exists)

---

## 2. Backend Staging DB (`scratchsolid-db-backend-staging`)

### Table Count: 49 tables

### Critical Finding: Schema Contamination
Staging DB includes portal tables that should NOT be in backend DB:
- `staff`, `booking_assignments`, `contracts`, `pricing`, `employees`, `task_completions`, `ai_responses`, `content`, `pending_contracts`, `roles`, `permissions`, `role_permissions`, `data_access_audit`, `proxy_access_audit`

### Critical Table Schemas:

#### `users` (20 columns) — **ALREADY HAS MISSING COLUMNS**
Includes all columns present in production PLUS:
- `phone` (TEXT, default: '')
- `address` (TEXT, default: '')
- `business_name` (TEXT, default: '')
- `business_registration` (TEXT, default: '')
- `business_info` (TEXT, default: '')
- `failed_attempts` (INTEGER, default: 0)
- `locked_until` (TEXT, default: NULL)
- `soft_delete_at` (TEXT, default: NULL)
- `deleted` (INTEGER, default: 0)
- `email_verified` (INTEGER, default: 1)
- `email_verification_token` (TEXT)
- `email_verification_expires` (TEXT)
- `email_verification_sent_at` (TEXT)

**Conclusion:** Staging was seeded with a different schema than production.

---

## 3. Portal Production DB (`scratchsolid-portal-db`)

### Table Count: ~69 tables

### Critical Table Schemas:

#### `booking_assignments` (9 columns) — **MISSING 11 COLUMNS**
- `id` (INTEGER, PK)
- `booking_id` (INTEGER, NOT NULL)
- `cleaner_id` (INTEGER, NOT NULL)
- `assigned_at` (TEXT, default: CURRENT_TIMESTAMP)
- `assigned_by` (INTEGER)
- `status` (TEXT, default: 'assigned')
- `notes` (TEXT)
- `created_at` (TEXT, default: CURRENT_TIMESTAMP)
- `updated_at` (TEXT, default: CURRENT_TIMESTAMP)

**Code requires:** `staff_id, assignment_date, time_slot, pool_type, service_type, reason, assignment_status, completed_at, arrived_at, started_at`
**Column name mismatch:** Code uses `staff_id`, DB has `cleaner_id`

#### `bookings` (17 columns) — **MISSING 5 COLUMNS**
- `id` (INTEGER, PK)
- `client_id` (INTEGER, NOT NULL)
- `client_name` (TEXT, NOT NULL)
- `location` (TEXT, NOT NULL)
- `service_type` (TEXT, NOT NULL)
- `booking_date` (TEXT, NOT NULL)
- `booking_time` (TEXT, NOT NULL)
- `special_instructions` (TEXT)
- `booking_type` (TEXT, default: 'standard')
- `cleaning_type` (TEXT, default: 'standard')
- `payment_method` (TEXT, default: 'cash')
- `loyalty_discount` (REAL, default: 0)
- `cleaner_id` (INTEGER)
- `status` (TEXT, default: 'pending')
- `tracking_token` (TEXT, NOT NULL)
- `created_at` (TEXT, default: CURRENT_TIMESTAMP)
- `updated_at` (TEXT, default: CURRENT_TIMESTAMP)

**Code inserts:** `user_id, time_slot, pool_type, assignment_status, assigned_staff_id, assigned_at` — not present

#### `staff` (9 columns) — **MISSING 5 COLUMNS**
- `id` (INTEGER, PK)
- `user_id` (INTEGER, NOT NULL)
- `employee_id` (TEXT, NOT NULL)
- `department` (TEXT)
- `position` (TEXT)
- `hire_date` (TEXT)
- `status` (TEXT, default: 'active')
- `created_at` (TEXT, default: CURRENT_TIMESTAMP)
- `updated_at` (TEXT, default: CURRENT_TIMESTAMP)

**Code queries:** `pool_type, is_active, service_type, first_name, last_name` — not present

#### `job_performance_metrics` (8 columns) — **MISSING 11 COLUMNS**
- `id` (INTEGER, PK)
- `staff_id` (INTEGER, NOT NULL)
- `metric_type` (TEXT, NOT NULL)
- `metric_value` (REAL, NOT NULL)
- `period` (TEXT, NOT NULL)
- `notes` (TEXT)
- `created_at` (TEXT, default: CURRENT_TIMESTAMP)
- `updated_at` (TEXT, default: CURRENT_TIMESTAMP)

**Code inserts:** `booking_id, scheduled_time, actual_arrival_time, adherence_score, client_rating, attendance_score, company_values_score, punctuality_score, quality_score, communication_score, recorded_by, kpi_score` — not present

#### `staff_pool_transitions` — **COLUMN NAME MISMATCH**
Migration defines: `approved_by, transition_date`
Code inserts: `transitioned_by, transitioned_at`

---

## 4. Portal Staging DB (`scratchsolid-db-portal-staging`)

### Table Count: 36 tables

### Critical Finding: Staging is MORE UP-TO-DATE than production

#### `booking_assignments` (8 columns) — **HAS SOME REQUIRED COLUMNS**
- `id` (INTEGER, PK)
- `booking_id` (INTEGER, NOT NULL)
- `staff_id` (INTEGER, NOT NULL) ✅ (correct column name)
- `assignment_date` (TEXT, NOT NULL) ✅
- `time_slot` (TEXT) ✅
- `status` (TEXT, default: 'pending')
- `completed_at` (TEXT) ✅
- `created_at` (TEXT, default: CURRENT_TIMESTAMP)

**Still missing:** `pool_type, service_type, reason, assignment_status, arrived_at, started_at, updated_at`

#### `staff` (10 columns) — **HAS SOME REQUIRED COLUMNS**
- `id` (INTEGER, PK)
- `user_id` (INTEGER)
- `first_name` (TEXT, NOT NULL) ✅
- `last_name` (TEXT, NOT NULL) ✅
- `cellphone` (TEXT)
- `email` (TEXT)
- `pool_type` (TEXT, default: 'INDIVIDUAL') ✅
- `is_active` (INTEGER, default: 1) ✅
- `created_at` (TEXT, default: CURRENT_TIMESTAMP)
- `updated_at` (TEXT, default: CURRENT_TIMESTAMP)

**Still missing:** `service_type`

#### `job_performance_metrics` (17 columns) — **HAS ALL SCORE COLUMNS**
- `id` (INTEGER, PK)
- `staff_id` (INTEGER, NOT NULL)
- `booking_id` (INTEGER) ✅
- `client_rating` (REAL, default: 0) ✅
- `punctuality_score` (REAL, default: 0) ✅
- `quality_score` (REAL, default: 0) ✅
- `communication_score` (REAL, default: 0) ✅
- `adherence_score` (REAL, default: 0) ✅
- `attendance_score` (REAL, default: 0) ✅
- `company_values_score` (REAL, default: 0) ✅
- `overall_score` (REAL, default: 0) ✅
- `scheduled_time` (TEXT) ✅
- `actual_arrival_time` (TEXT) ✅
- `notes` (TEXT)
- `recorded_by` (TEXT) ✅
- `recorded_at` (TEXT, default: CURRENT_TIMESTAMP)
- `client_star_rating` (REAL, default: 0)

**Conclusion:** Staging portal DB has most of the required columns that production is missing.

---

## 5. Marketing Production DB (`scratchsolid-marketing-db`)

### Table Count: 54 tables

### Critical Table Schemas:

#### `bookings` (16 columns) — **MISSING POP & ZOHO COLUMNS**
- `id` (INTEGER, PK)
- `client_id` (INTEGER, NOT NULL)
- `client_name` (TEXT, NOT NULL)
- `location` (TEXT, NOT NULL)
- `service_type` (TEXT, NOT NULL)
- `booking_date` (TEXT, NOT NULL)
- `booking_time` (TEXT, NOT NULL)
- `special_instructions` (TEXT)
- `booking_type` (TEXT, default: 'standard')
- `cleaning_type` (TEXT, default: 'standard')
- `payment_method` (TEXT, default: 'cash')
- `loyalty_discount` (REAL, default: 0)
- `status` (TEXT, default: 'pending')
- `tracking_token` (TEXT, NOT NULL)
- `created_at` (TEXT, default: CURRENT_TIMESTAMP)
- `updated_at` (TEXT, default: CURRENT_TIMESTAMP)

**Code uses:** `pop_status, pop_reference, pop_upload_url, pop_verified_at, pop_verified_by, zoho_invoice_id` — not present

#### `payments` — **NOT PRESENT**
The `payments` table does not exist in marketing production DB. Code in `app/api/payments/route.ts` expects it to exist and update `zoho_invoice_id` on it.

---

## 6. Marketing Staging DB (`scratchsolid-db-staging`)

### Table Count: 20 tables

### Critical Finding: SEVERE STAGING/PRODUCTION DIVERGENCE

Staging has only 20 tables vs 54 in production. Missing 34 tables including:
- All blog tables (`blog_categories`, `blog_posts`, `newsletters`)
- All promo tables (`promotions`, `promo_codes`, `promo_distribution`, `promo_scans`, `campaigns`, `campaign_recipients`)
- Content tables (`content`, `content_pages`, `about_us_content`, `email_templates`, `faq`, `testimonials`)
- Analytics tables (`analytics_events`, `page_views`)
- Quote tables (`quotes`, `quote_requests`, `quote_logs`)
- And many others

**Conclusion:** Staging was bootstrapped from numbered migrations only, missing all tables from `schema.sql`.

---

## SUMMARY OF CRITICAL FINDINGS

### Backend DB
- Production: Missing 7 columns on `users`, schema mismatch on `bookings` and `payments`, missing `contracts` and `pricing` tables
- Staging: Has the missing columns on `users`, but contaminated with portal tables

### Portal DB
- Production: Missing 11 columns on `booking_assignments`, 5 on `bookings`, 5 on `staff`, 11 on `job_performance_metrics`, column name mismatch on `staff_pool_transitions`
- Staging: More up-to-date than production — already has many of the missing columns

### Marketing DB
- Production: Missing 6 POP/Zoho columns on `bookings`, `payments` table doesn't exist
- Staging: Severely under-provisioned — missing 34 tables

### Schema Divergence Between Production and Staging
All three staging databases have different schemas than their production counterparts. This is a critical issue that must be resolved before proceeding with migrations.
