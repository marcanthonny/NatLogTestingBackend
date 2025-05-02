const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

// Update main login route 
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ 
        error: 'Username and password are required'
      });
    }

    // Find user and verify credentials
    const user = await User.findOne({ 
      username: username.toLowerCase(),
    }).select('+password +role +active');

    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ 
        error: 'Invalid credentials' 
      });
    }

    // Generate token
    const token = jwt.sign(
      { 
        userId: user._id,
        username: user.username,
        role: user.role
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Update last login and send response
    await User.findByIdAndUpdate(user._id, {
      lastLogin: new Date(),
      active: true
    });

    res.json({ 
      token,
      role: user.role,
      username: user.username
    });

  } catch (error) {
    console.error('[Auth] Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
