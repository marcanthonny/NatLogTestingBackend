const jwt = require('jsonwebtoken');
const Role = require('../models/Role');

const JWT_SECRET = process.env.JWT_SECRET;

const publicPaths = [
  '/api/auth/login',  
  '/api/auth/admin/login',
  '/api/auth/register',
  '/admin',
  '/',
  '/api/health'
];

const authMiddleware = async (req, res, next) => {
  try {
    // Skip auth for preflight and excluded paths
    if (req.method === 'OPTIONS' || 
        req.path === '/health' || 
        req.path === '/test' || 
        req.path.startsWith('/auth/')) {
      return next();
    }

    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Add user info to request
    req.user = decoded;
    next();
  } catch (err) {
    console.error('[Auth] Error:', err.message);
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    res.status(500).json({ error: 'Auth error', details: err.message });
  }
};

// Permission middleware
const checkPermission = (requiredPermission) => async (req, res, next) => {
  try {
    // Get user from previous auth middleware
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get user's role
    const role = await Role.findOne({ name: user.role });
    if (!role) {
      return res.status(403).json({ error: 'Invalid role' });
    }

    // Check if role has wildcard permission or specific permission
    if (role.permissions.includes('*') || role.permissions.includes(requiredPermission)) {
      next();
    } else {
      res.status(403).json({ error: `Missing required permission: ${requiredPermission}` });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Export as an object with named exports
module.exports = { 
  authMiddleware,
  checkPermission
};

// Or if you prefer default export:
// module.exports = authMiddleware;
