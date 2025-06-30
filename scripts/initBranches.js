const mongoose = require('mongoose');
const Branch = require('../models/Branch');
require('dotenv').config();

const initializeBranches = async () => {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/natlogportal';
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 30000,
      keepAlive: true,
      maxPoolSize: 1,
      family: 4
    });
    console.log('Connected to MongoDB');

    // Initialize default branches
    console.log('Initializing default branches...');
    await Branch.initializeBranches();
    
    // Fetch and display all branches
    const branches = await Branch.find({}).sort({ code: 1 });
    console.log('\n✅ Default branches initialized successfully!');
    console.log('\nAvailable branches:');
    branches.forEach(branch => {
      console.log(`  ${branch.code} - ${branch.name} ${branch.active ? '(Active)' : '(Inactive)'}`);
    });

    console.log(`\nTotal branches: ${branches.length}`);
    
  } catch (error) {
    console.error('Error initializing branches:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
};

// Run the initialization
initializeBranches(); 