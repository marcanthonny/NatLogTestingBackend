const mongoose = require('mongoose');
const connectDB = require('../config/database');

const initToteFormDb = async () => {
  try {
    console.log('🔧 Initializing ToteForm database...');
    
    // Connect to database
    await connectDB();
    
    // Import the ToteForm model
    const ToteForm = require('../models/ToteForm');
    
    // Create indexes for better performance
    await ToteForm.createIndexes();
    
    console.log('✅ ToteForm database initialized successfully!');
    console.log('   - Collection: toteforms');
    console.log('   - Indexes created for: userId, userBranch, boxCondition, createdAt');
    
    // Close connection
    await mongoose.connection.close();
    
  } catch (error) {
    console.error('❌ Error initializing ToteForm database:', error);
    process.exit(1);
  }
};

// Run if called directly
if (require.main === module) {
  initToteFormDb();
}

module.exports = initToteFormDb; 