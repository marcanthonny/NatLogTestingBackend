const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

// Update main login route 
router.post('/login', async (req, res) => {
  try {
    // Debug request
    console.log('[Auth] Request body:', {
      username: req.body.username,
      hasPassword: !!req.body.password,
      headers: req.headers
    });

    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ 
        error: 'Username and password are required',
        debug: { hasUsername: !!username, hasPassword: !!password }
      });
    }

    // Find user - remove case sensitivity
    const user = await User.findOne({ 
      username: username.toLowerCase()
    }).select('+password +role +active');  // Explicitly include fields

    if (!user) {
      console.log('[Auth] Login failed - User not found:', username);
      return res.status(401).json({ 
        error: 'Invalid credentials',
        debug: { userFound: false }
      });
    }

    // Check if user is active
    if (!user.active) {
      console.log('[Auth] Login failed - User inactive:', username);
      return res.status(401).json({ 
        error: 'Account is inactive',
        debug: { userActive: false }
      });
    }

    // Direct password comparison
    const isValid = await bcrypt.compare(password, user.password);
    
    console.log('[Auth] Password check:', {
      username,
      isValid,
      hashedLength: user.password?.length
    });

    if (!isValid) {
      return res.status(401).json({ 
        error: 'Invalid credentials',
        debug: { passwordValid: false }
      });
    }

    if (!process.env.JWT_SECRET) {
      console.error('[Auth] JWT_SECRET not configured');
      return res.status(500).json({ error: 'Server configuration error' });
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

    // Update last login
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
    res.status(500).json({ 
      error: 'Internal server error', 
      message: error.message,
      debug: { errorType: error.name }
    });
  }
});

// Add admin login route
router.post('/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Find admin user in MongoDB
    const user = await User.findOne({ 
      username: username.toLowerCase(),
      role: 'admin' // Only allow admin users
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid admin credentials' });
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid admin credentials' });
    }

    // Generate admin token
    const token = jwt.sign(
      { userId: user._id, username: user.username, role: 'admin' },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({ token });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ error: 'Internal server error' }); 
  }
});

module.exports = router;
