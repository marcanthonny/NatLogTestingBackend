// removePasswordChangedAt.js
// Run this script with: node scripts/removePasswordChangedAt.js

const mongoose = require('mongoose');
const User = require('../models/User');

// Update this with your MongoDB connection string
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/your-db-name';

async function removePasswordChangedAt() {
  try {
    await mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('Connected to MongoDB');

    const result = await User.updateMany(
      { passwordChangedAt: { $exists: true } },
      { $unset: { passwordChangedAt: "" } }
    );
    console.log(`Updated ${result.nModified || result.modifiedCount} user(s).`);
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('Error removing passwordChangedAt:', error);
    process.exit(1);
  }
}

removePasswordChangedAt(); 