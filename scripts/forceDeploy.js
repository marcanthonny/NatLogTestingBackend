const fs = require('fs');
const path = require('path');

// Create a timestamp file to force deployment
const timestamp = new Date().toISOString();
const deployFile = path.join(__dirname, '..', 'DEPLOY_TIMESTAMP.txt');

try {
  fs.writeFileSync(deployFile, `Last deployment: ${timestamp}\nEnvironment: ${process.env.NODE_ENV || 'development'}\nServerless: ${process.env.VERCEL === '1' ? 'yes' : 'no'}`);
  console.log('✅ Deployment timestamp created:', timestamp);
  console.log('📁 File location:', deployFile);
  console.log('🚀 This should trigger a fresh deployment on Vercel');
} catch (error) {
  console.error('❌ Failed to create deployment timestamp:', error.message);
  process.exit(1);
} 