const mongoose = require('mongoose');
const WeekConfig = require('../models/WeekConfig');

async function setupMongoDB() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URL);
    console.log('Connected to MongoDB');

    // Create initial week configuration
    const initialConfig = {
      ira: {
        week1: { startDate: '', endDate: '', target: 99 },
        week2: { startDate: '', endDate: '', target: 99 },
        week3: { startDate: '', endDate: '', target: 99 },
        week4: { startDate: '', endDate: '', target: 99 }
      },
      cc: {
        week1: { startDate: '', endDate: '', target: 25 },
        week2: { startDate: '', endDate: '', target: 50 },
        week3: { startDate: '', endDate: '', target: 75 },
        week4: { startDate: '', endDate: '', target: 99 }
      }
    };

    await WeekConfig.findOneAndUpdate(
      {}, 
      initialConfig,
      { upsert: true, new: true }
    );

    console.log('Initial configuration created');
    
    // Ensure connection is properly closed
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
      console.log('MongoDB connection closed');
    }
  } catch (error) {
    console.error('Setup failed:', error);
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
    }
    process.exit(1);
  }
}

setupMongoDB();
