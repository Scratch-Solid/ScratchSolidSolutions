import bcrypt from 'bcryptjs';

// Generate password hashes for admin users
async function createAdminUsers() {
  const jasonPassword = '0736417176';
  const arnicaPassword = '0746998097';
  
  const jasonHash = await bcrypt.hash(jasonPassword, 12);
  const arnicaHash = await bcrypt.hash(arnicaPassword, 12);
  
  console.log('Jason Tshaka Admin:');
  console.log('Email: it@scratchsolidsolutions.org');
  console.log('Password: 0736417176');
  console.log('Hash:', jasonHash);
  console.log('');
  
  console.log('Arnica Nqayi Admin:');
  console.log('Email: customerservice@scratchsolidsolutions.org');
  console.log('Password: 0746998097');
  console.log('Hash:', arnicaHash);
}

createAdminUsers().catch(console.error);
