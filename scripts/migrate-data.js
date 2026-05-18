#!/usr/bin/env node

/**
 * Data Migration Script
 * Migrates data from old scratchsolid-db to three new isolated databases
 * 
 * Usage: node scripts/migrate-data.js
 * 
 * Environment variables required:
 * - CLOUDFLARE_API_TOKEN
 * - CLOUDFLARE_ACCOUNT_ID
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Database IDs
const OLD_DB = 'scratchsolid-db';
const PORTAL_DB = 'scratchsolid-portal-db';
const MARKETING_DB = 'scratchsolid-marketing-db';
const BACKEND_DB = 'scratchsolid-backend-db';

// Table distribution
const SHARED_TABLES = ['users', 'sessions', 'bookings'];

const PORTAL_TABLES = [
  'cleaner_profiles', 'staff', 'booking_assignments',
  'payroll', 'payroll_adjustments', 'payroll_periods',
  'leave_requests', 'leave_balances',
  'notifications', 'notification_settings',
  'audit_logs', 'activity_logs',
  'departments', 'teams', 'team_members',
  'schedules', 'schedule_assignments',
  'time_tracking', 'time_off_requests',
  'performance_reviews', 'staff_monthly_reviews', 'job_performance_metrics',
  'documents', 'document_versions',
  'incident_reports',
  'compliance_checks', 'training_records', 'certifications',
  'roles', 'permissions', 'role_permissions', 'admin_permissions',
  'consent_form_content', 'contract_content',
  'loyalty_points', 'loyalty_transactions', 'referrals',
  'voice_notes', 'sms_fallback_logs',
  'cleaning_checklists', 'checklist_items',
  'client_preferences_extended',
  'battery_alerts', 'gps_tracking_history', 'travel_time_history',
  'cleaning_feedback', 'cleaning_photos', 'push_subscriptions',
  'data_deletion_requests', 'gps_consent',
  'staff_pool_transitions',
  'data_access_audit', 'proxy_access_audit'
];

const MARKETING_TABLES = [
  'services', 'service_categories', 'service_pricing', 'service_areas',
  'promo_codes', 'promotions', 'referral_rewards',
  'promo_distribution_tracking', 'short_urls', 'promo_scans',
  'quote_requests', 'quotes', 'quote_logs',
  'leaders', 'about_us_content', 'testimonials', 'reviews', 'faq',
  'blog_posts', 'blog_categories',
  'contact_submissions',
  'newsletters', 'campaigns', 'campaign_recipients', 'email_templates',
  'locations', 'cleaner_photos', 'client_feedback',
  'cleaning_checklist', 'geofences', 'client_preferences',
  'analytics_events', 'page_views'
];

const BACKEND_TABLES = [
  'booking_services', 'booking_status_history',
  'payments', 'payment_methods',
  'invoices', 'invoice_items', 'transactions',
  'stripe_customers', 'stripe_events',
  'webhook_events', 'api_keys', 'api_rate_limits',
  'integration_logs',
  'system_config', 'feature_flags',
  'migrations', 'health_checks'
];

// Execute wrangler command and return result
function wranglerQuery(db, query) {
  try {
    const result = execSync(
      `npx wrangler d1 execute ${db} --remote --command="${query}"`,
      { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }
    );
    return result;
  } catch (error) {
    console.error(`Error executing query on ${db}:`, error.message);
    throw error;
  }
}

// Export data from a table
function exportTable(db, table) {
  console.log(`Exporting ${table} from ${db}...`);
  try {
    const result = wranglerQuery(db, `SELECT * FROM ${table}`);
    
    // Parse the output to get JSON data
    const lines = result.split('\n').filter(line => line.trim());
    const data = lines.map(line => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    }).filter(row => row !== null);
    
    return data;
  } catch (error) {
    console.error(`Failed to export ${table}:`, error.message);
    return [];
  }
}

// Import data to a table
function importTable(db, table, data) {
  if (!data || data.length === 0) {
    console.log(`No data to import for ${table}`);
    return;
  }
  
  console.log(`Importing ${data.length} rows to ${table} in ${db}...`);
  
  data.forEach((row, index) => {
    try {
      const columns = Object.keys(row);
      const values = Object.values(row).map(v => {
        if (v === null) return 'NULL';
        if (typeof v === 'string') return `'${v.replace(/'/g, "''")}'`;
        if (typeof v === 'boolean') return v ? 1 : 0;
        return v;
      });
      
      const query = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${values.join(', ')})`;
      wranglerQuery(db, query);
      
      if ((index + 1) % 10 === 0) {
        console.log(`  Imported ${index + 1}/${data.length} rows...`);
      }
    } catch (error) {
      console.error(`Failed to import row ${index + 1} to ${table}:`, error.message);
    }
  });
  
  console.log(`Completed importing to ${table}`);
}

// Main migration function
async function migrate() {
  console.log('Starting data migration...');
  console.log('=====================================');
  
  // Create export directory
  const exportDir = path.join(__dirname, 'export');
  if (!fs.existsSync(exportDir)) {
    fs.mkdirSync(exportDir, { recursive: true });
  }
  
  // Step 1: Export shared tables
  console.log('\nStep 1: Exporting shared tables...');
  const sharedData = {};
  for (const table of SHARED_TABLES) {
    sharedData[table] = exportTable(OLD_DB, table);
    fs.writeFileSync(
      path.join(exportDir, `${table}.json`),
      JSON.stringify(sharedData[table], null, 2)
    );
  }
  
  // Step 2: Export portal-specific tables
  console.log('\nStep 2: Exporting portal-specific tables...');
  const portalData = {};
  for (const table of PORTAL_TABLES) {
    portalData[table] = exportTable(OLD_DB, table);
    fs.writeFileSync(
      path.join(exportDir, `${table}.json`),
      JSON.stringify(portalData[table], null, 2)
    );
  }
  
  // Step 3: Export marketing-specific tables
  console.log('\nStep 3: Exporting marketing-specific tables...');
  const marketingData = {};
  for (const table of MARKETING_TABLES) {
    marketingData[table] = exportTable(OLD_DB, table);
    fs.writeFileSync(
      path.join(exportDir, `${table}.json`),
      JSON.stringify(marketingData[table], null, 2)
    );
  }
  
  // Step 4: Export backend-specific tables
  console.log('\nStep 4: Exporting backend-specific tables...');
  const backendData = {};
  for (const table of BACKEND_TABLES) {
    backendData[table] = exportTable(OLD_DB, table);
    fs.writeFileSync(
      path.join(exportDir, `${table}.json`),
      JSON.stringify(backendData[table], null, 2)
    );
  }
  
  // Step 5: Import shared tables to all databases
  console.log('\nStep 5: Importing shared tables to all databases...');
  for (const table of SHARED_TABLES) {
    console.log(`\nImporting ${table} to portal DB...`);
    importTable(PORTAL_DB, table, sharedData[table]);
    
    console.log(`Importing ${table} to marketing DB...`);
    importTable(MARKETING_DB, table, sharedData[table]);
    
    console.log(`Importing ${table} to backend DB...`);
    importTable(BACKEND_DB, table, sharedData[table]);
  }
  
  // Step 6: Import portal-specific tables
  console.log('\nStep 6: Importing portal-specific tables...');
  for (const table of PORTAL_TABLES) {
    importTable(PORTAL_DB, table, portalData[table]);
  }
  
  // Step 7: Import marketing-specific tables
  console.log('\nStep 7: Importing marketing-specific tables...');
  for (const table of MARKETING_TABLES) {
    importTable(MARKETING_DB, table, marketingData[table]);
  }
  
  // Step 8: Import backend-specific tables
  console.log('\nStep 8: Importing backend-specific tables...');
  for (const table of BACKEND_TABLES) {
    importTable(BACKEND_DB, table, backendData[table]);
  }
  
  console.log('\n=====================================');
  console.log('Data migration completed!');
  console.log('\nNext steps:');
  console.log('1. Verify data integrity in all three databases');
  console.log('2. Test login functionality on all applications');
  console.log('3. Test application functionality');
  console.log('4. If successful, delete old database');
}

// Run migration
migrate().catch(error => {
  console.error('Migration failed:', error);
  process.exit(1);
});
