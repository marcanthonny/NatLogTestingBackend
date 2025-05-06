const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const User = require('../models/User');

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

// Create new user - Fixed route path
router.post('/', async (req, res) => {
  try {
    console.log('[Users] Creating new user:', req.body.username);
    const { username, password, role } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ username, password: hashedPassword, role });
    await user.save();
    console.log('[Users] User created successfully');
    res.status(201).json({ message: 'User created successfully' });
  } catch (error) {
    console.error('[Users] Create user error:', error);
    res.status(400).json({ error: error.message });
  }
});

// Update user
router.put('/users/:id', async (req, res) => {
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

// Delete user
router.delete('/users/:id', async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
