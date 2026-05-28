const hex = '2432622431302453666b6a734f526d626b48313052397035747535674f6344614b624e4178663431393053417a4334594d5149562e52506462614969';
const hash = Buffer.from(hex, 'hex').toString('utf8');
console.log('Decoded hash:', hash);
console.log('Starts with $2b$10$:', hash.startsWith('$2b$10$') ? 'YES' : 'NO');
console.log('Length:', hash.length);
