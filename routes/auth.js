const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Role = require('../models/Role'); // Add Role model
const Session = require('../models/Session'); // Add Session model

// Regular login endpoint with improved error handling
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    // Check database connection
    if (mongoose.connection.readyState !== 1) {
      console.error('[Auth] Database not connected, state:', mongoose.connection.readyState);
      return res.status(503).json({ error: 'Database connection error', retryable: true });
    }

    // Add timeout for user lookup
    const user = await User.findOne({ username: username.toLowerCase() })
      .select('+password +role')
      .maxTimeMS(2000)
      .exec();
    
    if (!user) {
      console.log('[Auth] Login failed - user not found:', username);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isValidPassword = await user.comparePassword(password).catch(err => {
      console.error('[Auth] Password comparison error:', err);
      return false;
    });

    if (!isValidPassword) {
      console.log('[Auth] Login failed - invalid password for user:', username);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Get role with timeout
    const userRole = await Role.findOne({ name: user.role })
      .maxTimeMS(1000)
      .lean()
      .exec()
      .catch(err => {
        console.error('[Auth] Role lookup error:', err);
        return null;
      });

    const permissions = userRole ? userRole.permissions : [];

    const token = jwt.sign(
      { userId: user._id, username: user.username, role: user.role, permissions },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Update last login
    await User.findByIdAndUpdate(user._id, { lastLogin: new Date() })
      .catch(err => console.error('[Auth] Failed to update last login:', err));

    res.json({ 
      success: true,
      token,
      user: {
        username: user.username,
        role: user.role,
        permissions
      }
    });

  } catch (error) {
    console.error('[Auth] Login error:', error);
    const status = error.name === 'MongoTimeoutError' ? 504 : 500;
    res.status(status).json({ 
      error: 'Internal server error',
      retryable: true,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
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

// Add logout endpoint
router.post('/logout', async (req, res) => {
  try {
    // Don't wait for session deletion, just return success
    res.json({ success: true, message: 'Logged out successfully' });
    
    // Optionally delete session in background
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        await Session.deleteOne({ userId: decoded.userId }).catch(console.error);
      } catch (err) {
        console.error('[Auth] Token verification failed during logout:', err);
      }
    }
  } catch (error) {
    console.error('[Auth] Logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
});

module.exports = router;
