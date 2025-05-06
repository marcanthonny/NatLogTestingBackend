const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Regular login endpoint for frontend users (both admin and regular)
router.post('/login', async (req, res) => {
  try {
    console.log('[Auth] Login attempt:', { username: req.body.username });
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    // Debug: Check if user exists
    const user = await User.findOne({ username: username.toLowerCase() })
      .select('+password +role')
      .exec();
    console.log('[Auth] User found:', { exists: !!user, username: username });
    
    if (!user) {
      console.log('[Auth] User not found:', username);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Debug: Check password comparison
    const isValidPassword = await user.comparePassword(password);
    console.log('[Auth] Password check:', { isValid: isValidPassword, username: username });
    
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
    let username, password;

    // Check for Basic Auth header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Basic ')) {
      const base64Credentials = authHeader.split(' ')[1];
      const credentials = Buffer.from(base64Credentials, 'base64').toString('utf8');
      [username, password] = credentials.split(':');
      console.log('[Auth] Using Basic Auth credentials, username:', username);
    } else {
      // Check request body
      ({ username, password } = req.body);
      console.log('[Auth] Using request body credentials, username:', username);
    }

    console.log('[Auth] Admin login attempt details:', { 
      username,
      hasPassword: !!password,
      authType: authHeader ? 'Basic' : 'Body'
    });

    if (!username || !password) {
      console.log('[Auth] Missing credentials:', { username: !!username, password: !!password });
      return res.status(400).json({ error: 'Username and password required' });
    }

    const user = await User.findOne({ username: username.toLowerCase() })
      .select('+password +role')
      .exec();
    
    console.log('[Auth] User lookup result:', { 
      found: !!user, 
      username,
      hasPassword: !!user?.password,
      role: user?.role
    });

    if (!user) {
      console.log('[Auth] User not found:', username);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isValidPassword = await user.comparePassword(password);
    console.log('[Auth] Password validation:', {
      isValid: isValidPassword,
      username: username,
      role: user.role
    });

    if (!isValidPassword) {
      console.log('[Auth] Invalid password for user:', username);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check if user is admin
    if (user.role !== 'admin') {
      console.log('[Auth] Non-admin user attempted admin login:', username);
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
