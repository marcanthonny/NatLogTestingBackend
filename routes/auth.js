const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const auth = require('../middleware/auth'); // Fix: Update import to match file name

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
      .populate('branch', 'code name')
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
      process.env.JWT_SECRET
    );

    console.log('[Auth] Login successful for user:', username);
    res.json({ 
      success: true,
      token,
      user: {
        username: user.username,
        role: user.role,
        branch: user.branch
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
      .populate('branch', 'code name')
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
      process.env.JWT_SECRET
    );

    res.json({ 
      success: true,
      token,
      user: {
        username: user.username,
        role: user.role,
        branch: user.branch
      }
    });

  } catch (error) {
    console.error('[Auth] Admin login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Token validation endpoint
router.get('/validate', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ valid: false });
  }

  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    res.json({ 
      valid: true, 
      user: {
        id: decoded.id,
        username: decoded.username,
        email: decoded.email
      }
    });
  } catch (err) {
    res.status(401).json({ valid: false });
  }
});

// Add /me endpoint near the top with other routes
router.get('/me', auth, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    // Use req.user.id (set by middleware)
    const user = await User.findById(req.user.id)
      .select('-password')
      .populate('branch', 'code name')
      .exec();
    
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Return a clean user object
    res.json({
      id: user._id,
      username: user.username,
      name: user.name,
      role: user.role,
      branch: user.branch, // populated with code and name
      email: user.email
    });
  } catch (error) {
    console.error('[Auth] /me error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Test endpoint to verify auth routes are working
router.get('/test', (req, res) => {
  res.json({ 
    message: 'Auth routes are working',
    timestamp: new Date().toISOString(),
    path: req.path
  });
});

router.put('/settings', auth, async (req, res) => {
  try {
    const { username, email, currentPassword, newPassword } = req.body;
    const userId = req.user.userId;

    const user = await User.findById(userId).select('+password');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // If changing password, verify current password using comparePassword method
    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({ error: 'Current password is required to change password' });
      }

      const isValid = await user.comparePassword(currentPassword);
      if (!isValid) {
        return res.status(400).json({ error: 'Current password is incorrect' });
      }

      // Use raw password - model's pre-save hook will hash it
      user.password = newPassword;
    }

    // Update other fields
    user.username = username;
    user.email = email;

    await user.save(); // This will trigger the pre-save hook to hash password

    // Return user without password
    const updatedUser = user.toObject();
    delete updatedUser.password;
    
    res.json({ user: updatedUser });
  } catch (error) {
    console.error('Settings update error:', error);
    res.status(400).json({ error: error.message });
  }
});

// Cross-domain login endpoint
router.get('/cross-login', async (req, res) => {
  try {
    const natlogToken = req.query.token;

    if (!natlogToken) {
      console.log('[Auth] Cross-login: Missing token');
      return res.redirect('https://batch-corr-form.vercel.app/login'); // Redirect to login if no token
    }

    let decoded;
    try {
      // Verify the token from the Natlog Portal
      decoded = jwt.verify(natlogToken, process.env.JWT_SECRET);
    } catch (err) {
      console.error('[Auth] Cross-login: Token verification failed:', err.message);
      return res.redirect('https://batch-corr-form.vercel.app/login'); // Redirect on invalid token
    }

    const user = await User.findById(decoded.userId).select('+role');

    if (!user || user.role !== 'admin') {
      console.log('[Auth] Cross-login: User not found or not admin', { userId: decoded.userId, role: user?.role });
      return res.redirect('https://batch-corr-form.vercel.app/login'); // Redirect if not admin
    }

    // Generate a new, short-lived token for the Batch Corr Form app
    const batchCorrToken = jwt.sign(
      { userId: user._id, username: user.username, role: user.role },
      process.env.JWT_SECRET, // Use the same secret for simplicity, but ideally a different one
      { expiresIn: '5m' } // Token expires in 5 minutes
    );

    console.log('[Auth] Cross-login successful for admin user:', user.username);

    // Redirect to the Batch Corr Form admin page with the new token
    res.redirect(`https://batch-corr-form.vercel.app/admin?crossToken=${batchCorrToken}`);

  } catch (error) {
    console.error('[Auth] Cross-login error:', error);
    res.redirect('https://batch-corr-form.vercel.app/login'); // Redirect on unexpected error
  }
});

// Validate cross-domain token
router.post('/validate-cross-token', async (req, res) => {
  try {
    const { crossToken } = req.body;

    if (!crossToken) {
      console.log('[Auth] Validate Cross-token: Missing token');
      return res.status(400).json({ valid: false, error: 'Token required' });
    }

    let decoded;
    try {
      // Verify the cross token
      decoded = jwt.verify(crossToken, process.env.JWT_SECRET);
    } catch (err) {
      console.error('[Auth] Validate Cross-token: Verification failed:', err.message);
      return res.status(401).json({ valid: false, error: 'Invalid or expired token' });
    }

    const user = await User.findById(decoded.userId).select('+role').populate('branch', 'code name');

    if (!user || user.role !== 'admin') {
      console.log('[Auth] Validate Cross-token: User not found or not admin', { userId: decoded.userId, role: user?.role });
      return res.status(403).json({ valid: false, error: 'Access denied' });
    }

    // Generate a standard token for the Batch Corr Form app
    const standardToken = jwt.sign(
      { userId: user._id, username: user.username, role: user.role },
      process.env.JWT_SECRET
    );

    console.log('[Auth] Validate Cross-token: Successful for user:', user.username);

    res.json({ 
      valid: true,
      token: standardToken,
      user: {
        username: user.username,
        role: user.role,
        branch: user.branch
      }
    });

  } catch (error) {
    console.error('[Auth] Validate Cross-token error:', error);
    res.status(500).json({ valid: false, error: 'Internal server error' });
  }
});

module.exports = router;
