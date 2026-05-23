-- Export data from old scratchsolid-db to JSON files
-- This script exports all data from the shared database for migration to isolated databases
-- Run: npx wrangler d1 execute scratchsolid-db --remote --file=./scripts/export-data-from-old-db.sql

-- Export users table (shared across all three databases)
.mode json
.once ./scripts/export/users.json
SELECT * FROM users;

-- Export sessions table (shared across all three databases)
.once ./scripts/export/sessions.json
SELECT * FROM sessions;

-- Export bookings table (shared across all three databases)
.once ./scripts/export/bookings.json
SELECT * FROM bookings;

-- Export portal-specific tables
.once ./scripts/export/cleaner_profiles.json
SELECT * FROM cleaner_profiles;

.once ./scripts/export/staff.json
SELECT * FROM staff;

.once ./scripts/export/booking_assignments.json
SELECT * FROM booking_assignments;

.once ./scripts/export/payroll.json
SELECT * FROM payroll;

.once ./scripts/export/payroll_adjustments.json
SELECT * FROM payroll_adjustments;

.once ./scripts/export/payroll_periods.json
SELECT * FROM payroll_periods;

.once ./scripts/export/leave_requests.json
SELECT * FROM leave_requests;

.once ./scripts/export/leave_balances.json
SELECT * FROM leave_balances;

.once ./scripts/export/notifications.json
SELECT * FROM notifications;

.once ./scripts/export/notification_settings.json
SELECT * FROM notification_settings;

.once ./scripts/export/audit_logs.json
SELECT * FROM audit_logs;

.once ./scripts/export/activity_logs.json
SELECT * FROM activity_logs;

.once ./scripts/export/departments.json
SELECT * FROM departments;

.once ./scripts/export/teams.json
SELECT * FROM teams;

.once ./scripts/export/team_members.json
SELECT * FROM team_members;

.once ./scripts/export/schedules.json
SELECT * FROM schedules;

.once ./scripts/export/schedule_assignments.json
SELECT * FROM schedule_assignments;

.once ./scripts/export/time_tracking.json
SELECT * FROM time_tracking;

.once ./scripts/export/time_off_requests.json
SELECT * FROM time_off_requests;

.once ./scripts/export/performance_reviews.json
SELECT * FROM performance_reviews;

.once ./scripts/export/staff_monthly_reviews.json
SELECT * FROM staff_monthly_reviews;

.once ./scripts/export/job_performance_metrics.json
SELECT * FROM job_performance_metrics;

.once ./scripts/export/documents.json
SELECT * FROM documents;

.once ./scripts/export/document_versions.json
SELECT * FROM document_versions;

.once ./scripts/export/incident_reports.json
SELECT * FROM incident_reports;

.once ./scripts/export/compliance_checks.json
SELECT * FROM compliance_checks;

.once ./scripts/export/training_records.json
SELECT * FROM training_records;

.once ./scripts/export/certifications.json
SELECT * FROM certifications;

.once ./scripts/export/roles.json
SELECT * FROM roles;

.once ./scripts/export/permissions.json
SELECT * FROM permissions;

.once ./scripts/export/role_permissions.json
SELECT * FROM role_permissions;

.once ./scripts/export/admin_permissions.json
SELECT * FROM admin_permissions;

.once ./scripts/export/consent_form_content.json
SELECT * FROM consent_form_content;

.once ./scripts/export/contract_content.json
SELECT * FROM contract_content;

.once ./scripts/export/loyalty_points.json
SELECT * FROM loyalty_points;

.once ./scripts/export/loyalty_transactions.json
SELECT * FROM loyalty_transactions;

.once ./scripts/export/referrals.json
SELECT * FROM referrals;

.once ./scripts/export/voice_notes.json
SELECT * FROM voice_notes;

.once ./scripts/export/sms_fallback_logs.json
SELECT * FROM sms_fallback_logs;

.once ./scripts/export/cleaning_checklists.json
SELECT * FROM cleaning_checklists;

.once ./scripts/export/checklist_items.json
SELECT * FROM checklist_items;

.once ./scripts/export/client_preferences_extended.json
SELECT * FROM client_preferences_extended;

.once ./scripts/export/battery_alerts.json
SELECT * FROM battery_alerts;

.once ./scripts/export/gps_tracking_history.json
SELECT * FROM gps_tracking_history;

.once ./scripts/export/travel_time_history.json
SELECT * FROM travel_time_history;

.once ./scripts/export/cleaning_feedback.json
SELECT * FROM cleaning_feedback;

.once ./scripts/export/cleaning_photos.json
SELECT * FROM cleaning_photos;

.once ./scripts/export/push_subscriptions.json
SELECT * FROM push_subscriptions;

.once ./scripts/export/data_deletion_requests.json
SELECT * FROM data_deletion_requests;

.once ./scripts/export/gps_consent.json
SELECT * FROM gps_consent;

.once ./scripts/export/staff_pool_transitions.json
SELECT * FROM staff_pool_transitions;

.once ./scripts/export/data_access_audit.json
SELECT * FROM data_access_audit;

.once ./scripts/export/proxy_access_audit.json
SELECT * FROM proxy_access_audit;

-- Export marketing-specific tables
.once ./scripts/export/services.json
SELECT * FROM services;

.once ./scripts/export/service_categories.json
SELECT * FROM service_categories;

.once ./scripts/export/service_pricing.json
SELECT * FROM service_pricing;

.once ./scripts/export/service_areas.json
SELECT * FROM service_areas;

.once ./scripts/export/promo_codes.json
SELECT * FROM promo_codes;

.once ./scripts/export/promotions.json
SELECT * FROM promotions;

.once ./scripts/export/referral_rewards.json
SELECT * FROM referral_rewards;

.once ./scripts/export/promo_distribution_tracking.json
SELECT * FROM promo_distribution_tracking;

.once ./scripts/export/short_urls.json
SELECT * FROM short_urls;

.once ./scripts/export/promo_scans.json
SELECT * FROM promo_scans;

.once ./scripts/export/quote_requests.json
SELECT * FROM quote_requests;

.once ./scripts/export/quotes.json
SELECT * FROM quotes;

.once ./scripts/export/quote_logs.json
SELECT * FROM quote_logs;

.once ./scripts/export/leaders.json
SELECT * FROM leaders;

.once ./scripts/export/about_us_content.json
SELECT * FROM about_us_content;

.once ./scripts/export/testimonials.json
SELECT * FROM testimonials;

.once ./scripts/export/reviews.json
SELECT * FROM reviews;

.once ./scripts/export/faq.json
SELECT * FROM faq;

.once ./scripts/export/blog_posts.json
SELECT * FROM blog_posts;

.once ./scripts/export/blog_categories.json
SELECT * FROM blog_categories;

.once ./scripts/export/contact_submissions.json
SELECT * FROM contact_submissions;

.once ./scripts/export/newsletters.json
SELECT * FROM newsletters;

.once ./scripts/export/campaigns.json
SELECT * FROM campaigns;

.once ./scripts/export/campaign_recipients.json
SELECT * FROM campaign_recipients;

.once ./scripts/export/email_templates.json
SELECT * FROM email_templates;

.once ./scripts/export/locations.json
SELECT * FROM locations;

.once ./scripts/export/cleaner_photos.json
SELECT * FROM cleaner_photos;

.once ./scripts/export/client_feedback.json
SELECT * FROM client_feedback;

.once ./scripts/export/cleaning_checklist.json
SELECT * FROM cleaning_checklist;

.once ./scripts/export/geofences.json
SELECT * FROM geofences;

.once ./scripts/export/client_preferences.json
SELECT * FROM client_preferences;

.once ./scripts/export/analytics_events.json
SELECT * FROM analytics_events;

.once ./scripts/export/page_views.json
SELECT * FROM page_views;

-- Export backend-specific tables
.once ./scripts/export/booking_services.json
SELECT * FROM booking_services;

.once ./scripts/export/booking_status_history.json
SELECT * FROM booking_status_history;

.once ./scripts/export/payments.json
SELECT * FROM payments;

.once ./scripts/export/payment_methods.json
SELECT * FROM payment_methods;

.once ./scripts/export/invoices.json
SELECT * FROM invoices;

.once ./scripts/export/invoice_items.json
SELECT * FROM invoice_items;

.once ./scripts/export/transactions.json
SELECT * FROM transactions;

.once ./scripts/export/stripe_customers.json
SELECT * FROM stripe_customers;

.once ./scripts/export/stripe_events.json
SELECT * FROM stripe_events;

.once ./scripts/export/webhook_events.json
SELECT * FROM webhook_events;

.once ./scripts/export/api_keys.json
SELECT * FROM api_keys;

.once ./scripts/export/api_rate_limits.json
SELECT * FROM api_rate_limits;

.once ./scripts/export/integration_logs.json
SELECT * FROM integration_logs;

.once ./scripts/export/system_config.json
SELECT * FROM system_config;

.once ./scripts/export/feature_flags.json
SELECT * FROM feature_flags;

.once ./scripts/export/migrations.json
SELECT * FROM migrations;

.once ./scripts/export/health_checks.json
SELECT * FROM health_checks;
