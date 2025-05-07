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

// Create new user with email requirement
router.post('/', isAdmin, async (req, res) => {
  try {
    const { username, password, role, email } = req.body;
    
    // Validate email for non-admin users
    if (role !== 'admin' && !email) {
      return res.status(400).json({ error: 'Email required for non-admin users' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ 
      username, 
      password: hashedPassword, 
      role,
      email: email || undefined // Use undefined for admin to avoid empty string
    });
    await user.save();
    res.status(201).json({ message: 'User created successfully' });
  } catch (error) {
    console.error('[Users] Create user error:', error);
    res.status(400).json({ error: error.message });
  }
});

// Change user password (admin only)
router.post('/:id/change-password', isAdmin, async (req, res) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword) {
      return res.status(400).json({ error: 'New password is required' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await User.findByIdAndUpdate(req.params.id, { 
      password: hashedPassword,
      $set: { 'password': hashedPassword }
    });

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('[Users] Password change error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update user - Fix path by removing /users prefix
router.put('/:id', async (req, res) => {
  try {
    const { username, password, role } = req.body;
    const updateData = { username, role };
    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }
    await User.findByIdAndUpdate(req.params.id, updateData);
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
