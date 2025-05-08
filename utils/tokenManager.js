const jwt = require('jsonwebtoken');

class TokenManager {
  static createToken(user, sessionData = {}) {
    return jwt.sign(
      {
        userId: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        permissions: user.permissions,
        sessionData: {
          ...sessionData,
          lastActive: new Date()
        }
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
  }

  static verifyToken(token) {
    try {
      return jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return null;
    }
  }

  static needsRefresh(token) {
    const decoded = this.verifyToken(token);
    if (!decoded) return false;
    return decoded.iat < Date.now()/1000 - 3600; // 1 hour
  }
}

module.exports = TokenManager;
