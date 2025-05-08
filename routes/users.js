const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const User = require('../models/User');

// Middleware to check if user is admin
const isAdmin = async (req, res, next) => {
  try {
    const user = await User.findById(req.user?.userId);
    if (user?.role === 'admin') {
      next();
    } else {
      res.status(403).json({ error: 'Admin access required' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Authorization check failed' });
  }
};

// Add cache control headers
const setCacheHeaders = (res) => {
  res.set('Cache-Control', 'private, max-age=10');
  res.set('ETag', Math.random().toString(36));
};

// Get all users with optimization
router.get('/', async (req, res) => {
  try {
    console.log('[Users] Fetching all users');
    
    // Use lean() for better performance and limit fields
    const users = await User.find({})
      .select('username email role active')
      .lean()
      .maxTimeMS(2000) // 2 second timeout
      .exec();

    console.log('[Users] Found users:', users.length);
    setCacheHeaders(res);
    res.json(users);
  } catch (error) {
    console.error('[Users] Error fetching users:', error);
    if (error.name === 'MongoTimeoutError') {
      return res.status(504).json({ error: 'Request timeout - please try again' });
    }
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Create new user with proper password hashing
router.post('/', isAdmin, async (req, res) => {
  try {
    const { username, password, role, email } = req.body;
    
    if (role !== 'admin' && !email) {
      return res.status(400).json({ error: 'Email required for non-admin users' });
    }

    // Let the User model handle the hashing
    const user = new User({ 
      username, 
      password,
      role,
      email: email || undefined
    });
    await user.save();
    res.status(201).json({ message: 'User created successfully' });
  } catch (error) {
    console.error('[Users] Create user error:', error);
    res.status(400).json({ error: error.message });
  }
});

// Change user password with hashing
router.post('/:id/change-password', isAdmin, async (req, res) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword) {
      return res.status(400).json({ error: 'New password is required' });
    }

    await User.findByIdAndUpdateWithHash(req.params.id, { 
      password: newPassword
    });

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('[Users] Password change error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update user with proper password hashing
router.put('/:id', async (req, res) => {
  try {
    const { username, password, role } = req.body;
    const updateData = { username, role };
    if (password) {
      updateData.password = password;
    }
    
    await User.findByIdAndUpdateWithHash(req.params.id, updateData);
    res.json({ message: 'User updated successfully' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete user - Fix path by removing /users prefix
router.delete('/:id', async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
