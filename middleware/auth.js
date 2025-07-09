const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET;

// Helper function to check if token was issued before password change
const isTokenIssuedBeforePasswordChange = async (decoded) => {
  try {
    const user = await User.findById(decoded.userId).select('passwordChangedAt');
    if (!user) return false;
    
    // If token was issued before password change, it's invalid
    const tokenIssuedAt = new Date(decoded.iat * 1000); // Convert JWT iat to Date
    return tokenIssuedAt < user.passwordChangedAt;
  } catch (error) {
    console.error('[Auth] Error checking password change:', error);
    return false;
  }
};

const publicPaths = [
  '/api/auth/login',
  '/api/auth/admin/login',
  '/api/auth/register',
  '/api/auth/validate',
  '/admin',
  '/',
  '/api/health'
]; // Remove /api/customers from public paths

const authMiddleware = (rolesOrReq, res, next) => {
  // If called as auth(['admin']), return a middleware
  if (Array.isArray(rolesOrReq)) {
    const roles = rolesOrReq;
    return async (req, res, next) => {
      // Standard auth logic
      const authHeader = req.headers && req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET);
        
        // Check if token was issued before password change
        const isInvalid = await isTokenIssuedBeforePasswordChange(decoded);
        if (isInvalid) {
          console.log('[Auth] Token issued before password change, invalidating');
          return res.status(401).json({ error: 'Token invalidated due to password change' });
        }
        
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

  // Handle token verification synchronously first, then check password change
  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Set user info immediately
    req.user = {
      ...decoded,
      id: decoded.userId || decoded.id || decoded._id,
    };
    
    console.log('[Auth] Token verified for user:', decoded.username);
    
    // Check password change asynchronously, but don't block the request
    isTokenIssuedBeforePasswordChange(decoded).then(isInvalid => {
      if (isInvalid) {
        console.log('[Auth] Token issued before password change, but request already processed');
        // Note: We can't send response here as it may have already been sent
        // The next request will be caught by this check
      }
    }).catch(err => {
      console.error('[Auth] Error checking password change:', err);
    });
    
    next();
  } catch (err) {
    console.error('[Auth] Token verification failed:', err.message);
    return res.status(401).json({ 
      error: 'Invalid or expired token',
      message: err.message
    });
  }
};

// Export the middleware (no longer need blacklist function)
module.exports = authMiddleware;
