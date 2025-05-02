const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const User = require('../models/User');

// Get all users
router.get('/users', async (req, res) => {
  try {
    const users = await User.find({}, '-password'); // Exclude password
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new user
router.post('/users', async (req, res) => {
  try {
    const { username, password, role } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ username, password: hashedPassword, role });
    await user.save();
    res.status(201).json({ message: 'User created successfully' });
  } catch (error) {
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
