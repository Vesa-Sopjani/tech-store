// Krijo një skript për të hash-u password-et tuaja
// create-hash.js
const bcrypt = require('bcryptjs');

async function createHashes() {
  console.log('🔐 Creating hashes for passwords:');
  
  // Hash për "admin123"
  const hash1 = await bcrypt.hash('admin123', 12);
  console.log('\nHash for "admin123":');
  console.log(hash1);
  console.log('Length:', hash1.length);
  
  // Hash për "Valjeta1"
  const hash2 = await bcrypt.hash('Valjeta1', 12);
  console.log('\nHash for "Valjeta1":');
  console.log(hash2);
  console.log('Length:', hash2.length);
  
  // Test verifikimi
  console.log('\n🔍 Verification test:');
  const test1 = await bcrypt.compare('admin123', hash1);
  console.log('"admin123" matches hash1?', test1);
  
  const test2 = await bcrypt.compare('Valjeta1', hash2);
  console.log('"Valjeta1" matches hash2?', test2);
}

createHashes();