// Seed users script for development/testing
// Run with: node seed-users.js

const SEED_KEY = 'dev-seed-key-123';
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

async function seedUser(userData) {
  try {
    const response = await fetch(`${BASE_URL}/api/seed-users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        seedKey: SEED_KEY,
        ...userData
      })
    });

    const data = await response.json();
    
    if (response.ok) {
      console.log(`✅ Created ${userData.userType} user:`);
      console.log(`   Email: ${userData.email}`);
      console.log(`   Login username: ${data.loginCredentials.username}`);
      console.log(`   Password: ${data.loginCredentials.password}`);
      console.log(`   Token: ${data.token.substring(0, 20)}...`);
      console.log();
      return data;
    } else {
      console.log(`❌ Failed to create ${userData.userType} user:`, data.error);
      return null;
    }
  } catch (error) {
    console.error(`❌ Error creating ${userData.userType} user:`, error);
    return null;
  }
}

async function main() {
  console.log('🌱 Seeding test users...\n');

  // Create admin user
  const adminUser = await seedUser({
    userType: 'admin',
    email: 'admin@scratchsolid.co.za',
    password: 'Admin@123',
    name: 'System Admin',
    phone: '+27123456789'
  });

  // Create cleaner user
  const cleanerUser = await seedUser({
    userType: 'cleaner',
    email: 'cleaner@scratchsolid.co.za',
    password: 'Cleaner@123',
    name: 'Test Cleaner',
    phone: '+27821234567',
    department: 'cleaning',
    paysheetCode: 'SCRATCH001'
  });

  // Create digital user
  const digitalUser = await seedUser({
    userType: 'digital',
    email: 'digital@scratchsolid.co.za',
    password: 'Digital@123',
    name: 'Test Digital',
    phone: '+27823456789',
    department: 'digital',
    paysheetCode: 'SOLID001'
  });

  // Create transport user
  const transportUser = await seedUser({
    userType: 'transport',
    email: 'transport@scratchsolid.co.za',
    password: 'Transport@123',
    name: 'Test Transport',
    phone: '+27825678901',
    department: 'transport',
    paysheetCode: 'TRANS001'
  });

  console.log('\n✨ Seeding complete!\n');
  console.log('📋 Test Credentials Summary:');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('Admin:');
  console.log('   Email: admin@scratchsolid.co.za');
  console.log('   Password: Admin@123');
  console.log('   Login with: email');
  console.log('');
  console.log('Cleaner:');
  console.log('   Paysheet Code: SCRATCH001');
  console.log('   Phone: +27821234567');
  console.log('   Password: Cleaner@123');
  console.log('   Login with: paysheet code OR phone');
  console.log('');
  console.log('Digital:');
  console.log('   Paysheet Code: SOLID001');
  console.log('   Phone: +27823456789');
  console.log('   Password: Digital@123');
  console.log('   Login with: paysheet code OR phone');
  console.log('');
  console.log('Transport:');
  console.log('   Paysheet Code: TRANS001');
  console.log('   Phone: +27825678901');
  console.log('   Password: Transport@123');
  console.log('   Login with: paysheet code OR phone');
  console.log('═══════════════════════════════════════════════════════════');
}

main();
