const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Role = require('../models/Role');

const JWT_SECRET = process.env.JWT_SECRET;

const publicPaths = [
  '/api/health',
  '/api/test',
  '/api/auth/login',
  '/api/auth/admin/login',
  '/api/auth/register',
  '/admin',
  '/'
];

const authMiddleware = async (req, res, next) => {
  try {
    // Skip auth for public paths
    if (req.method === 'OPTIONS' || publicPaths.some(path => req.path.startsWith(path))) {
      return next();
    }

    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Get fresh user data and role permissions
    const user = await User.findById(decoded.userId).select('-password').lean();
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    const role = await Role.findOne({ name: user.role });
    
    // Attach user data to request
    req.user = {
      ...user,
      permissions: role ? role.permissions : []
    };

    next();
  } catch (err) {
    console.error('[Auth] Error:', err);
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    res.status(500).json({ error: 'Auth error' });
  }
};

module.exports = { authMiddleware };
