const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User'); // Add this line at the top

let retryCount = 0;
const MAX_RETRIES = 5;
const RETRY_DELAY = 5000;
let isConnecting = false;

const connectDB = async () => {
  try {
    // Prevent multiple connection attempts
    if (isConnecting) {
      console.log('[MongoDB] Connection already in progress...');
      return null;
    }

    if (!process.env.MONGODB_URL) {
      throw new Error('MONGODB_URL environment variable is not set');
    }

    isConnecting = true;

    const options = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000, // Further reduced for serverless
      socketTimeoutMS: 10000, // Further reduced for serverless
      keepAlive: false, // Disabled for serverless
      dbName: 'aplnatlog-backend',
      retryWrites: true,
      w: 'majority',
      ssl: process.env.NODE_ENV === 'production',
      autoIndex: false,
      connectTimeoutMS: 5000,
      maxPoolSize: 1, // Minimum for serverless
      family: 4 // Force IPv4
    };

    // Remove any existing listeners to prevent memory leaks
    mongoose.connection.removeAllListeners();

    // Set up connection listeners
    mongoose.connection.once('connecting', () => {
      console.log('[MongoDB] Connecting to database...');
    });

    mongoose.connection.once('connected', () => {
      console.log('[MongoDB] Connected successfully');
      retryCount = 0;
      isConnecting = false;
    });

    mongoose.connection.once('disconnected', () => {
      console.log('[MongoDB] Disconnected from database');
      isConnecting = false;
      // Only attempt reconnect if not shutting down
      if (process.env.NODE_ENV === 'production' && retryCount < MAX_RETRIES) {
        handleConnectionError();
      }
    });

    mongoose.connection.on('error', (err) => {
      console.error('[MongoDB] Connection error:', err.message);
      isConnecting = false;
      if (retryCount < MAX_RETRIES) {
        handleConnectionError();
      }
    });

    console.log(`[MongoDB] Connecting... (Attempt ${retryCount + 1}/${MAX_RETRIES})`);
    
    const conn = await mongoose.connect(process.env.MONGODB_URL, options);

    // Initialize collections if they don't exist
    const collections = await mongoose.connection.db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);

    // Create users collection if it doesn't exist
    if (!collectionNames.includes('users')) {
      console.log('[MongoDB] Creating users collection...');
      await mongoose.connection.db.createCollection('users');

      // Create admin user with better error handling
      try {
        const hashedPassword = await bcrypt.hash('Admin@1234', 10);
        console.log('[MongoDB] Creating admin user...');
        
        await mongoose.connection.db.collection('users').insertOne({
          username: 'admin',
          password: hashedPassword,
          role: 'admin',
          active: true,
          createdAt: new Date()
        });
        
        console.log('[MongoDB] Admin user created successfully');
      } catch (error) {
        console.error('[MongoDB] Error creating admin user:', error);
        if (error.code !== 11000) { // Ignore duplicate key errors
          throw error;
        }
      }
    }

    // Create userList collection if it doesn't exist
    if (!collectionNames.includes('userList')) {
      console.log('[MongoDB] Creating userList collection...');
      await mongoose.connection.db.createCollection('userList', {
        validator: {
          $jsonSchema: {
            bsonType: "object",
            required: ["name", "active"],
            properties: {
              name: {
                bsonType: "string",
                description: "must be a string and is required"
              },
              email: {
                bsonType: "string",
                pattern: "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$"
              },
              active: {
                bsonType: "bool",
                description: "must be a boolean and is required"
              },
              createdAt: {
                bsonType: "date",
                description: "must be a valid date"
              }
            }
          }
        }
      });
      // Create indexes for userList
      await mongoose.connection.db.collection('userList').createIndex(
        { name: 1 }, { unique: true }
      );
      await mongoose.connection.db.collection('userList').createIndex(
        { email: 1 }, { sparse: true }
      );
    }

    console.log('[MongoDB] Initial connection successful');
    return conn;

  } catch (error) {
    console.error('[MongoDB] Connection failed:', error.message);
    isConnecting = false;
    if (retryCount < MAX_RETRIES) {
      return handleConnectionError(error);
    }
    throw error;
  }
};

const handleConnectionError = async (error) => {
  retryCount++;
  const delay = RETRY_DELAY * retryCount;
  
  console.log(`[MongoDB] Retrying in ${delay/1000}s... (${retryCount}/${MAX_RETRIES})`);
  
  await new Promise(resolve => setTimeout(resolve, delay));
  
  try {
    return await connectDB();
  } catch (err) {
    console.error('[MongoDB] Reconnection attempt failed:', err.message);
    return null;
  }
};

module.exports = connectDB;
