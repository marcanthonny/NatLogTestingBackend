const mongoose = require('mongoose');

let retryCount = 0;
const MAX_RETRIES = 3;

const connectDB = async () => {
  try {
    if (!process.env.MONGODB_URL) {
      throw new Error('MONGODB_URL not found in environment variables');
    }

    const options = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      keepAlive: true,
      keepAliveInitialDelay: 300000,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    };

    console.log(`Connecting to MongoDB... (Attempt ${retryCount + 1}/${MAX_RETRIES})`);

    const conn = await mongoose.connect(process.env.MONGODB_URL, options);

    mongoose.connection.on('connected', () => {
      console.log('MongoDB Connected Successfully');
      retryCount = 0; // Reset retry counter on successful connection
    });

    mongoose.connection.on('error', (err) => {
      console.error('MongoDB connection error:', err);
      if (retryCount < MAX_RETRIES) {
        retryCount++;
        console.log(`Retrying connection in 5 seconds...`);
        setTimeout(() => connectDB(), 5000);
      }
    });

    mongoose.connection.on('disconnected', () => {
      console.log('MongoDB disconnected');
      if (retryCount < MAX_RETRIES) {
        retryCount++;
        console.log(`Attempting to reconnect... (Attempt ${retryCount}/${MAX_RETRIES})`);
        setTimeout(() => connectDB(), 5000);
      }
    });

    return conn;
  } catch (error) {
    console.error('MongoDB connection error:', error.message);
    if (retryCount < MAX_RETRIES) {
      retryCount++;
      console.log(`Retrying in 5 seconds... (Attempt ${retryCount}/${MAX_RETRIES})`);
      await new Promise(resolve => setTimeout(resolve, 5000));
      return connectDB();
    }
    throw error;
  }
};

module.exports = connectDB;
