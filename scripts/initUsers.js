const mongoose = require('mongoose');
const User = require('../models/User');
const bcrypt = require('bcryptjs');

const initializeUsers = async () => {
  try {
    console.log('[Users] Checking MongoDB users collection...');
    
    const adminExists = await User.findOne({ username: 'admin' });
    
    if (!adminExists) {
      console.log('[Users] Creating default admin user...');
      
      // Use consistent admin password
      const adminPassword = 'Admin@1234';  // Match the password you're using
      
      const hashedPassword = await bcrypt.hash(adminPassword, 10);
      await User.create({
        username: 'admin',
        password: hashedPassword,
        role: 'admin',
        active: true
      });
      
      console.log('[Users] Default admin user created successfully');
    } else {
      console.log('[Users] Admin user already exists');
    }

    return { success: true };
  } catch (error) {
    console.error('[Users] Error:', error.message);
    throw error;
  }
};

module.exports = { initializeUsers };
