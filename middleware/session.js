const session = require('express-session');
const MongoStore = require('connect-mongo');

module.exports = session({
  secret: process.env.JWT_SECRET,
  name: 'natlog.sid',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGODB_URL,
    ttl: 24 * 60 * 60, // Session TTL (1 day)
    autoRemove: 'native',
    touchAfter: 24 * 3600 // Only update session once per day unless data changes
  }),
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 1 day
  }
});
