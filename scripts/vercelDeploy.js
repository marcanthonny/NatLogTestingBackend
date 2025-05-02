const mongoose = require('mongoose');
const { migrateSnapshots } = require('../utils/migrateSnapshots');
const WeekConfig = require('../models/WeekConfig');
const { initializeUsers } = require('./initUsers');
const path = require('path');
const fs = require('fs').promises;

async function validateEnvironment() {
  const envConfig = {
    MONGODB_URL: {
      required: true,
      default: null
    },
    JWT_SECRET: {
      required: true,
      default: null
    },
    ADMIN_PASSWORD: {
      required: false,
      default: 'admin123' // Default password for development
    }
  };

  const missing = [];
  const configured = {};

  for (const [key, config] of Object.entries(envConfig)) {
    if (!process.env[key]) {
      if (config.required) {
        missing.push(key);
      } else if (config.default !== null) {
        console.log(`[ENV] Using default value for ${key}`);
        process.env[key] = config.default;
        configured[key] = 'default';
      }
    } else {
      configured[key] = 'set';
    }
  }
  
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables:\n` +
      missing.map(key => `  - ${key}`).join('\n') +
      `\n\nPlease set these in your Vercel project settings.`
    );
  }

  console.log('[ENV] Configuration status:', configured);
}

async function deployToVercel() {
  try {
    console.log('[Deploy] Starting Vercel deployment...');
    
    await validateEnvironment();
    
    // Add timeout for entire deployment process
    const deployTimeout = setTimeout(() => {
      console.error('Deployment timed out');
      process.exit(1);
    }, 30000);

    // Connect with serverless optimized options
    await mongoose.connect(process.env.MONGODB_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 10000,
      keepAlive: false,
      maxPoolSize: 1,
      family: 4
    });

    // Clear timeout on success
    clearTimeout(deployTimeout);
    
    // Rest of deployment code...
    console.log('Connected to MongoDB');

    // Run migrations and setup
    console.log('Running migrations...');
    await migrateSnapshots();
    
    console.log('Checking week configuration...');
    const existingConfig = await WeekConfig.findOne();
    if (!existingConfig) {
      console.log('Creating initial week configuration...');
      await WeekConfig.create({
        ira: {
          week1: { target: 99 },
          week2: { target: 99 },
          week3: { target: 99 },
          week4: { target: 99 }
        },
        cc: {
          week1: { target: 25 },
          week2: { target: 50 },
          week3: { target: 75 },
          week4: { target: 99 }
        }
      });
    }

    // Initialize collections and indexes
    console.log('Initializing database collections...');
    
    await Promise.all([
      mongoose.connection.createCollection('users').catch(err => {
        if (err.code !== 48) console.error('Error creating users collection:', err);
      }),
      mongoose.connection.createCollection('snapshots').catch(err => {
        if (err.code !== 48) console.error('Error creating snapshots collection:', err);
      })
    ]);

    // Initialize users
    console.log('Setting up users...');
    await initializeUsers();

    console.log('All deployment tasks completed successfully');
    await mongoose.disconnect();
    process.exit(0);

  } catch (error) {
    console.error('[Deploy] Failed:', error.message);
    if (error.message.includes('Missing required environment variables')) {
      console.error('\nHow to fix:');
      console.error('1. Go to Vercel project settings');
      console.error('2. Navigate to Environment Variables');
      console.error('3. Add the missing variables');
      console.error('\nFor development, you can create a .env file with:');
      console.error('MONGODB_URL=your_mongodb_connection_string');
      console.error('JWT_SECRET=your_jwt_secret');
      console.error('ADMIN_PASSWORD=your_admin_password (optional)');
    }
    process.exit(1);
  }
}

deployToVercel();
