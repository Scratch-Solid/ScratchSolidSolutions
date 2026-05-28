const bcrypt = require('bcryptjs');

const hash = '$2b$10$SfkjsORmbkH10R9p5tu5gOcDaKbNAxf4190SAzC4YMQIV.RPdbaIi';
const password = 'Admin@123';

bcrypt.compare(password, hash).then(result => {
  console.log('Password verification result:', result);
  if (result) {
    console.log('Password matches!');
  } else {
    console.log('Password does NOT match');
  }
}).catch(err => {
  console.error('Error:', err);
});
