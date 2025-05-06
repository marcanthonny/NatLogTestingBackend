const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Regular login endpoint for frontend users (both admin and regular)
router.post('/login', async (req, res) => {
  try {
    console.log('[Auth] Login attempt for user:', req.body.username);
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    // Explicitly include password in query with select('+password')
    const user = await User.findOne({ username: username.toLowerCase() })
      .select('+password +role')
      .exec();
    
    if (!user) {
      console.log('[Auth] User not found:', username);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isValidPassword = await user.comparePassword(password);
    if (!isValidPassword) {
      console.log('[Auth] Invalid password for user:', username);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { userId: user._id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    console.log('[Auth] Login successful for user:', username);
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

// Admin-only login endpoint for backend admin panel
router.post('/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    const user = await User.findOne({ username: username.toLowerCase() }).select('+password +role');

    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check if user is admin
    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied: Admin privileges required' });
    }

    const token = jwt.sign(
      { userId: user._id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({ 
      success: true,
      token,
      user: {
        username: user.username,
        role: user.role
      }
    });

  } catch (error) {
    console.error('[Auth] Admin login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
