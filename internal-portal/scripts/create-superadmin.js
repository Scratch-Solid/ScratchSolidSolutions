// Secure script to create superadmin user
// Usage: node scripts/create-superadmin.js <password>
// This script hashes the password and outputs SQL for manual execution

const bcrypt = require('bcryptjs');

const SUPERADMIN_EMAIL = 'it@scratchsolidsolutions.org';
const SUPERADMIN_NAME = 'Jason Tshaka';
const SUPERADMIN_ROLE = 'admin';

async function createSuperadmin() {
  const password = process.argv[2];
  
  if (!password) {
    console.error('Error: Password required as argument');
    console.error('Usage: node scripts/create-superadmin.js <password>');
    process.exit(1);
  }

  console.log('Hashing password...');
  const passwordHash = await bcrypt.hash(password, 10);
  console.log('Password hashed successfully');

  const timestamp = new Date().toISOString();
  
  const sql = `
-- Create superadmin user
-- Generated at: ${timestamp}
-- Email: ${SUPERADMIN_EMAIL}
-- Name: ${SUPERADMIN_NAME}
-- Role: ${SUPERADMIN_ROLE}

INSERT INTO users (name, email, password_hash, role, created_at, updated_at, email_verified)
VALUES ('${SUPERADMIN_NAME}', '${SUPERADMIN_EMAIL}', '${passwordHash}', '${SUPERADMIN_ROLE}', datetime('now'), datetime('now'), 1);

-- Create session for superadmin (optional - will be created on login)
-- Session token will be generated when user logs in
`;

  console.log('\n=== SQL TO EXECUTE ===\n');
  console.log(sql);
  console.log('\n=== END SQL ===\n');
  console.log('Copy this SQL and execute it with wrangler:');
  console.log('npx wrangler d1 execute <database-name> --remote --command "<SQL>"');
  console.log('\nOr save to a file and execute:');
  console.log('npx wrangler d1 execute <database-name> --remote --file=superadmin.sql');
}

createSuperadmin().catch(console.error);
