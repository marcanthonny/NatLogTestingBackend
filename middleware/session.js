const session = require('express-session');
const MongoStore = require('connect-mongo');

module.exports = session({
  secret: process.env.JWT_SECRET || 'fallback-secret-key',
  name: 'natlog.sid',
  resave: false,
  saveUninitialized: false,
  rolling: true, // Refresh session with each request
  store: MongoStore.create({
    mongoUrl: process.env.MONGODB_URL,
    ttl: 60 * 60, // 1 hour TTL
    autoRemove: 'native',
    touchAfter: 60, // Update session every minute if active
    mongoOptions: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 3000,
      socketTimeoutMS: 8000,
      maxPoolSize: 1
    },
    crypto: {
      secret: process.env.JWT_SECRET
    }
  }),
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 60 * 60 * 1000, // 1 hour
    sameSite: 'lax'
  }
});
