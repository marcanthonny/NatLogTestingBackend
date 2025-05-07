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

// Get all users - Changed from '/' to match frontend request
router.get('/', async (req, res) => {
  try {
    console.log('[Users] Fetching all users');
    const users = await User.find({}).select('-password').lean();
    console.log('[Users] Found users:', users.length);
    res.json(users);
  } catch (error) {
    console.error('[Users] Error fetching users:', error);
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

// Change user password without hashing
router.post('/:id/change-password', isAdmin, async (req, res) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword) {
      return res.status(400).json({ error: 'New password is required' });
    }

    await User.findByIdAndUpdate(req.params.id, { 
      password: newPassword // Save raw password
    });

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('[Users] Password change error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update user with password rehashing if needed
router.put('/:id', async (req, res) => {
  try {
    const { username, password, role } = req.body;
    const updateData = { username, role };
    
    // Only update password if provided
    if (password) {
      // Let User model handle the hashing in the pre-save hook
      updateData.password = password;
    }
    
    await User.findByIdAndUpdate(req.params.id, 
      updateData,
      { new: true, runValidators: true }
    );
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
