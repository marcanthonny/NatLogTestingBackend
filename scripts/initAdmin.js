require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

async function initAdmin() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    console.log('Creating admin user...');
    const hashedPassword = await bcrypt.hash('Admin@1234', 10);
    
    // Force create/update admin user
    await User.findOneAndUpdate(
      { username: 'admin' },
      {
        username: 'admin',
        password: hashedPassword,
        role: 'admin',
        active: true
      },
      { upsert: true, new: true }
    );

    console.log('Admin user created/updated successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

initAdmin();
