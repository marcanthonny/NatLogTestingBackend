const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;

const authMiddleware = (req, res, next) => {
  // Add CORS headers
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Skip auth for login endpoints
  if (req.path === '/api/auth/admin/login' || req.path === '/api/auth/login') {
    return next();
  }

  // Check for admin pages
  if (req.path.startsWith('/admin')) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.redirect('/login');
    }

    try {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Require admin role
      if (decoded.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
      }
      
      req.user = decoded;
      return next();
    } catch (error) {
      return res.redirect('/login');
    }
  }

  // Skip auth for public paths
  const publicPaths = ['/api/auth/login', '/admin', '/'];
  if (publicPaths.includes(req.path)) {
    return next();
  }

  const authHeader = req.headers.authorization;
  console.log('[Auth] Headers:', req.headers);

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.log('[Auth] No valid auth header');
    return res.status(401).json({ 
      error: 'Authentication required',
      debug: { hasHeader: !!authHeader }
    });
  }

  const token = authHeader.split(' ')[1];
  try {
    if (!JWT_SECRET) {
      throw new Error('JWT_SECRET not configured');
    }
    const decoded = jwt.verify(token, JWT_SECRET);
    console.log('Token verified for user:', decoded.username);
    req.user = decoded;
    next();
  } catch (err) {
    console.error('Token verification failed:', err.message);
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

module.exports = authMiddleware;
