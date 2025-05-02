const crypto = require('crypto');

const generateJwtSecret = () => {
  // Generate a secure random string of 64 bytes and convert to base64
  const secret = crypto.randomBytes(64).toString('base64');
  
  console.log('\n=== Generated JWT Secret ===');
  console.log(secret);
  console.log('\nAdd this to your .env file as:');
  console.log(`JWT_SECRET=${secret}\n`);
};

generateJwtSecret();
