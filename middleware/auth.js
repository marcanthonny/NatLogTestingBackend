const jwt = require('jsonwebtoken');
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

const authMiddleware = (req, res, next) => {
  try {
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
    req.user = decoded;
    next();
  } catch (err) {
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
