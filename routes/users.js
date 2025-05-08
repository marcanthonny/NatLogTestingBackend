const express = require('express');
const router = express.Router();
const User = require('../models/User');

// Simple middleware for admin check
const isAdmin = (req, res, next) => {
  if (req.user?.role === 'admin') return next();
  res.status(403).json({ error: 'Admin access required' });
};

// Get all users - optimized
router.get('/', async (req, res) => {
  try {
    const users = await User.find()
      .select('username email role active')
      .lean()
      .limit(100)
      .exec();
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Create user - simplified
router.post('/', isAdmin, async (req, res) => {
  try {
    const user = new User(req.body);
    await user.save();
    res.status(201).json({ message: 'User created' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete user - simplified
router.delete('/:id', isAdmin, async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'User deleted' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
