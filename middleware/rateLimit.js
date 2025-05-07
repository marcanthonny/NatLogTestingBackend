const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');

// Use MongoDB for rate limiting in production
const MongoStore = {
  incr: async (key) => {
    const session = await mongoose.connection.collection('ratelimit').findOne({ key });
    if (!session) {
      await mongoose.connection.collection('ratelimit').insertOne({
        key,
        count: 1,
        expires: new Date(Date.now() + 60000)
      });
      return 1;
    }
    if (session.expires < new Date()) {
      await mongoose.connection.collection('ratelimit').updateOne(
        { key },
        { 
          $set: { 
            count: 1,
            expires: new Date(Date.now() + 60000)
          }
        }
      );
      return 1;
    }
    await mongoose.connection.collection('ratelimit').updateOne(
      { key },
      { $inc: { count: 1 } }
    );
    return session.count + 1;
  },
  decr: async (key) => {
    await mongoose.connection.collection('ratelimit').updateOne(
      { key },
      { $inc: { count: -1 } }
    );
  },
  resetKey: async (key) => {
    await mongoose.connection.collection('ratelimit').deleteOne({ key });
  }
};

// Configure rate limiter with proxy support
const limiter = rateLimit({
  store: MongoStore,
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  trustProxy: true, // Trust X-Forwarded-For header
  message: { error: 'Too many requests, please try again later' },
  skip: (req) => req.path === '/api/health', // Skip health checks
  keyGenerator: (req) => {
    // Use X-Forwarded-For header if available (from Vercel)
    return req.headers['x-forwarded-for'] || req.ip;
  },
  skipFailedRequests: true, // Don't count failed requests
  skip: (req) => {
    // Skip more paths in production
    return req.path === '/api/health' || 
           req.path === '/admin' ||
           req.path === '/favicon.ico';
  },
  handler: (req, res) => {
    res.status(429).json({
      error: 'Too many requests, please try again later',
      retryAfter: Math.ceil(limiter.windowMs / 1000)
    });
  },
  // Add timeout for store operations
  timeout: 5000
});

module.exports = limiter;
