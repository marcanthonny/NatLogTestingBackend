const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;

// In-memory token blacklist (in production, use Redis or database)
const tokenBlacklist = new Set();

// Helper function to check if token is blacklisted
const isTokenBlacklisted = (token) => {
  return tokenBlacklist.has(token);
};

// Export function to add tokens to blacklist (used by auth routes)
const blacklistToken = (token) => {
  tokenBlacklist.add(token);
  console.log('[Auth] Token blacklisted');
};

const publicPaths = [
  '/api/auth/login',
  '/api/auth/admin/login',
  '/api/auth/register',
  '/api/auth/validate',
  '/admin',
  '/',
  '/api/health',
  '/api/customers'
]; // Remove /api/auth/me from public paths

const authMiddleware = (rolesOrReq, res, next) => {
  // If called as auth(['admin']), return a middleware
  if (Array.isArray(rolesOrReq)) {
    const roles = rolesOrReq;
    return (req, res, next) => {
      // Standard auth logic
      const authHeader = req.headers && req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      try {
        const token = authHeader.split(' ')[1];
        
        // Check if token is blacklisted
        if (isTokenBlacklisted(token)) {
          console.log('[Auth] Blacklisted token detected');
          return res.status(401).json({ error: 'Token has been invalidated' });
        }
        
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = {
          ...decoded,
          id: decoded.userId || decoded.id || decoded._id,
        };
        if (!roles.includes(req.user.role)) {
          return res.status(403).json({ error: 'Forbidden: insufficient role' });
        }
        next();
      } catch (err) {
        return res.status(401).json({ error: 'Invalid or expired token', message: err.message });
      }
    };
  }

  // Otherwise, act as the standard middleware
  const req = rolesOrReq;
  console.log('[Auth] Processing request:', {
    path: req.path,
    method: req.method,
    authHeader: req.headers && req.headers.authorization ? 'Present' : 'Missing'
  });

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Check if path is public
  const isPublicPath = publicPaths.includes(req.path) || 
    (req.path.startsWith('/api/auth/') && req.path !== '/api/auth/me');
  
  if (isPublicPath) {
    console.log('[Auth] Allowing public path:', req.path);
    return next();
  }

  // Verify auth header
  const authHeader = req.headers && req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.log('[Auth] Missing/invalid auth header');
    return res.status(401).json({
      error: 'Authentication required',
      debug: { 
        path: req.path,
        hasHeader: !!authHeader,
        headerValue: authHeader ? `${authHeader.substring(0, 20)}...` : null
      }
    });
  }

  try {
    const token = authHeader.split(' ')[1];
    
    // Check if token is blacklisted
    if (isTokenBlacklisted(token)) {
      console.log('[Auth] Blacklisted token detected');
      return res.status(401).json({ error: 'Token has been invalidated' });
    }
    
    const decoded = jwt.verify(token, JWT_SECRET);
    console.log('[Auth] Token verified for user:', decoded.username);
    req.user = {
      ...decoded,
      id: decoded.userId || decoded.id || decoded._id,
    };
    next();
  } catch (err) {
    console.error('[Auth] Token verification failed:', err.message);
    res.status(401).json({ 
      error: 'Invalid or expired token',
      message: err.message
    });
  }
};

// Export both the middleware and the blacklist function
module.exports = authMiddleware;
module.exports.blacklistToken = blacklistToken;
