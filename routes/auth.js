const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

// Update main login route 
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    console.log('[Auth] Login attempt:', { username, hasPassword: !!password });
    
    if (!username || !password) {
      return res.status(400).json({ 
        error: 'Username and password are required'
      });
    }

    // Find user without filtering by role first
    const user = await User.findOne({ 
      username: username.toLowerCase()
    }).select('+password +role +active');

    if (!user) {
      console.log('[Auth] User not found:', username);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isValidPassword = await user.comparePassword(password);
    if (!isValidPassword) {
      console.log('[Auth] Invalid password for user:', username);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate token with complete user info
    const token = jwt.sign(
      { 
        userId: user._id,
        username: user.username,
        role: user.role
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Update last login
    await User.findByIdAndUpdate(user._id, {
      lastLogin: new Date(),
      active: true
    });

    // Return complete response
    res.json({ 
      success: true,
      token,
      user: {
        username: user.username,
        role: user.role
      }
    });

  } catch (error) {
    console.error('[Auth] Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
