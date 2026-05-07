// Generate bcrypt hashes for test users
const bcrypt = require('bcryptjs');

async function generateHash(password) {
  const hash = await bcrypt.hash(password, 10);
  console.log(`Password: ${password}`);
  console.log(`Hash: ${hash}`);
  console.log();
  return hash;
}

async function main() {
  console.log('Generating bcrypt hashes for test users...\n');
  
  await generateHash('Admin@123');
  await generateHash('Cleaner@123');
  await generateHash('Digital@123');
  await generateHash('Transport@123');
}

main();
