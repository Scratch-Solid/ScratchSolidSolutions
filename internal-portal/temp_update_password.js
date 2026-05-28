const bcrypt = require('bcryptjs');

async function generateHash() {
  const password = 'Admin@123';
  const hash = await bcrypt.hash(password, 10);
  console.log('Bcrypt hash:', hash);
  
  // Convert to hex for SQL
  const hex = Buffer.from(hash).toString('hex');
  console.log('Hex for SQL:', hex);
  
  console.log('\nSQL command:');
  console.log(`UPDATE users SET password_hash = X'${hex}' WHERE id = 4;`);
}

generateHash().catch(console.error);
