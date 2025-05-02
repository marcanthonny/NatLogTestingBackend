const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

async function setupUsers() {
  try {
    await mongoose.connect(process.env.MONGODB_URL);
    
    // Check if admin exists
    const adminExists = await User.findOne({ username: 'admin' });
    if (!adminExists) {
      const hashedPassword = await bcrypt.hash('Admin@1234', 10);
      await User.create({
        username: 'admin',
        password: hashedPassword,
        role: 'admin'
      });
      console.log('Admin user created');
    }

    await mongoose.connection.close();
  } catch (error) {
    console.error('Setup failed:', error);
    process.exit(1);
  }
}

setupUsers();
