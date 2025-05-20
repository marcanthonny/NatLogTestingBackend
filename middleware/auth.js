const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;

const publicPaths = [
  '/api/auth/login',
  '/api/auth/admin/login',
  '/api/auth/register',
  '/api/auth/validate',
  '/admin',
  '/',
  '/api/health'
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

  // Check if the path is public
  const isPublicPath = publicPaths.includes(req.path) || req.path.startsWith('/api/auth/');
  if (isPublicPath) {
    return next();
  }

  // Verify auth header for protected routes
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Authentication required',
      debug: { 
        path: req.path,
        hasHeader: !!authHeader,
        headerValue: authHeader ? authHeader.substring(0, 20) + '...' : null
      }
    });
  }

  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    console.error('Auth error:', err.message);
    res.status(401).json({ 
      error: 'Invalid or expired token',
      message: err.message
    });
  }
};

module.exports = authMiddleware;
