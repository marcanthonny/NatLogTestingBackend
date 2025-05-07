const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Role = require('../models/Role');
const Session = require('../models/Session');

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
    // Check for session first
    if (req.session && req.session.user) {
      req.user = req.session.user;
      return next();
    }

    // Skip auth for options and public paths
    if (req.method === 'OPTIONS' || publicPaths.some(path => req.path.startsWith(path))) {
      return next();
    }

    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Get user with role and permissions
    const user = await User.findById(decoded.userId)
      .select('-password')
      .lean();
      
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    // Get role permissions
    const role = await Role.findOne({ name: user.role });
    
    // Attach user and permissions to request
    req.user = {
      ...user,
      permissions: role ? role.permissions : []
    };

    // Store in session for future requests
    req.session.user = req.user;

    // Update session last active time
    await Session.findOneAndUpdate(
      { userId: user._id },
      { lastActive: new Date() }
    );

    next();
  } catch (err) {
    console.error('[Auth] Error:', err);
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    res.status(500).json({ error: 'Auth error: ' + err.message });
  }
};

module.exports = { authMiddleware };
