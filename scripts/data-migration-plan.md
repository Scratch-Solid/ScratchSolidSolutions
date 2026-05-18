# Data Migration Plan

## Current State
- Old database: `scratchsolid-db` (contains all data)
- New databases: `scratchsolid-portal-db`, `scratchsolid-marketing-db`, `scratchsolid-backend-db` (schemas only, no data)

## Migration Approach

Since D1 doesn't support direct export/import like traditional SQLite, we'll use a Node.js script to:
1. Query data from old database using D1 API
2. Transform and distribute data to the three new databases
3. Insert data into new databases using D1 API

## Data Distribution

### Shared Tables (go to all three databases)
- users
- sessions
- bookings

### Portal-Only Tables
- cleaner_profiles
- staff
- booking_assignments
- payroll, payroll_adjustments, payroll_periods
- leave_requests, leave_balances
- notifications, notification_settings
- audit_logs, activity_logs
- departments, teams, team_members
- schedules, schedule_assignments
- time_tracking, time_off_requests
- performance_reviews, staff_monthly_reviews, job_performance_metrics
- documents, document_versions
- incident_reports
- compliance_checks, training_records, certifications
- roles, permissions, role_permissions, admin_permissions
- consent_form_content, contract_content
- loyalty_points, loyalty_transactions, referrals
- voice_notes, sms_fallback_logs
- cleaning_checklists, checklist_items
- client_preferences_extended
- battery_alerts, gps_tracking_history, travel_time_history
- cleaning_feedback, cleaning_photos, push_subscriptions
- data_deletion_requests, gps_consent
- staff_pool_transitions
- data_access_audit, proxy_access_audit

### Marketing-Only Tables
- services, service_categories, service_pricing, service_areas
- promo_codes, promotions, referral_rewards
- promo_distribution_tracking, short_urls, promo_scans
- quote_requests, quotes, quote_logs
- leaders, about_us_content, testimonials, reviews, faq
- blog_posts, blog_categories
- contact_submissions
- newsletters, campaigns, campaign_recipients, email_templates
- locations, cleaner_photos, client_feedback
- cleaning_checklist, geofences, client_preferences
- analytics_events, page_views
- loyalty_points, loyalty_transactions, referrals (shared with portal)

### Backend-Only Tables
- booking_services, booking_status_history
- payments, payment_methods
- invoices, invoice_items, transactions
- stripe_customers, stripe_events
- webhook_events, api_keys, api_rate_limits
- integration_logs
- system_config, feature_flags
- migrations, health_checks

## Migration Steps

1. Create Node.js migration script that uses D1 API
2. Export data from old database
3. Transform and distribute data
4. Import into new databases
5. Verify data integrity
6. Test applications

## Alternative Approach: Manual SQL Export/Import

If Node.js script is complex, we can:
1. Use wrangler to export data as JSON
2. Transform JSON to INSERT statements
3. Execute INSERT statements on new databases

## Priority

The data migration is a manual step that requires:
- Maintenance window when applications are not in use
- Verification of data integrity after migration
- Testing of login functionality
- Backup of old database before deletion
