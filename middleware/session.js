const session = require('express-session');
const MongoStore = require('connect-mongo');

module.exports = session({
  secret: process.env.JWT_SECRET || 'fallback-secret-key',
  name: 'natlog.sid',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGODB_URL,
    ttl: 24 * 60 * 60, // Session TTL (1 day)
    autoRemove: 'native',
    touchAfter: 24 * 3600, // Only update session once per day unless data changes
    mongoOptions: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 10000
    }
  }),
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 1 day
    sameSite: 'lax'
  }
});
