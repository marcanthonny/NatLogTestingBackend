const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { loadEnv } = require('./envConfig');

let retryCount = 0;
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000;
let isConnecting = false;

let cached = global.mongoose;
if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function connectDB() {
  if (cached.conn) return cached.conn;
  if (!cached.promise) {
    cached.promise = mongoose.connect(process.env.MONGODB_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 30000,
      keepAlive: true,
      maxPoolSize: 1,
      family: 4
    }).then((mongoose) => mongoose);
  }
  cached.conn = await cached.promise;
  return cached.conn;
}

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
