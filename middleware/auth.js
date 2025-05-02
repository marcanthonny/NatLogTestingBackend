const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;

// Update public paths to include all auth-related endpoints
const publicPaths = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/admin/login',
  '/admin',
  '/',
  '/api/health'  // Allow health checks without auth
];

const authMiddleware = (req, res, next) => {
  // Add CORS headers
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Skip auth for public paths or if path starts with /api/auth/
  if (publicPaths.includes(req.path) || req.path.startsWith('/api/auth/')) {
    return next();
  }

  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ 
      error: 'Authentication required',
      debug: { hasHeader: !!authHeader }
    });
  }

  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // For admin routes, require admin role
    if (req.path.startsWith('/admin') && decoded.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    req.user = decoded;
    next();
  } catch (err) {
    console.error('Token verification failed:', err.message);
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

module.exports = authMiddleware;
