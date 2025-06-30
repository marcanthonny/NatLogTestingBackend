const mongoose = require('mongoose');
const { loadEnv } = require('../config/envConfig');

const validateLocalEnv = async () => {
  try {
    console.log('[Validate] Checking local environment...');
    const config = loadEnv();

    if (!config.isLocal) {
      throw new Error('Not running in development environment');
    }

    console.log('[Validate] Checking MongoDB connection...');
    const conn = await mongoose.connect(config.mongoUrl, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 30000,
      keepAlive: true,
      maxPoolSize: 1,
      family: 4
    });

    console.log('[Validate] Local MongoDB connected:', {
      host: conn.connection.host,
      database: conn.connection.name
    });

    await mongoose.connection.close();
    console.log('[Validate] Environment validation successful');
    process.exit(0);
  } catch (error) {
    console.error('[Validate] Validation failed:', error.message);
    process.exit(1);
  }
};

validateLocalEnv();
