const fs = require('fs');
const path = require('path');

const loadEnv = () => {
  const nodeEnv = process.env.NODE_ENV || 'development';
  const envFile = nodeEnv === 'development' ? '.env.local' : '.env';
  const envPath = path.join(__dirname, '..', envFile);

  try {
    if (fs.existsSync(envPath)) {
      console.log(`[Config] Loading environment from ${envFile}`);
      require('dotenv').config({ path: envPath });
    } else {
      console.log(`[Config] Using default .env file`);
      require('dotenv').config();
    }
  } catch (error) {
    console.error('[Config] Error loading environment:', error);
    process.exit(1);
  }

  // Validate required environment variables
  const required = ['MONGODB_URL', 'JWT_SECRET'];
  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    console.error('[Config] Missing required environment variables:', missing);
    process.exit(1);
  }

  return {
    mongoUrl: process.env.MONGODB_URL,
    jwtSecret: process.env.JWT_SECRET,
    isLocal: nodeEnv === 'development',
    port: process.env.PORT || 5000
  };
};

module.exports = { loadEnv };
