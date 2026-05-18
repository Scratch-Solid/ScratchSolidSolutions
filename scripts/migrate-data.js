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

// Table distribution - based on actual 48 tables in old scratchsolid-db
// Excluding: _cf_KV, sqlite_sequence (system tables)
const SHARED_TABLES = ['users', 'sessions', 'bookings'];

const PORTAL_TABLES = [
  'cleaner_profiles', 'staff', 'booking_assignments',
  'employees', 'contracts', 'pending_contracts',
  'task_completions', 'audit_logs', 'notifications',
  'roles', 'permissions', 'role_permissions', 'admin_permissions',
  'consent_form_content', 'contract_content',
  'staff_pool_transitions',
  'job_performance_metrics', 'staff_monthly_reviews',
  'data_access_audit', 'proxy_access_audit',
  'staff_public_profiles'
];

const MARKETING_TABLES = [
  'services', 'service_pricing',
  'promo_codes', 'promo_scans', 'promo_distribution',
  'short_urls',
  'quote_requests',
  'leaders', 'about_us_content', 'reviews',
  'content_pages', 'background_images', 'content', 'marketing_cms'
];

const BACKEND_TABLES = [
  'payments', 'pricing', 'pricing_config',
  'weekend_requests', 'password_reset_tokens',
  'business_events', 'templates', 'ai_responses'
];

// Tables to skip (system tables)
const SKIP_TABLES = ['_cf_KV', 'sqlite_sequence', 'schema_migrations'];

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
    
    // Parse D1 API response: { "result": [{ "results": [...rows...], "meta": {...} }] }
    const response = JSON.parse(result);
    const data = response.result?.[0]?.results || [];
    
    console.log(`  Exported ${data.length} rows from ${table}`);
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
