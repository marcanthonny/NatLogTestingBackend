const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');
const authRoutes = require('./routes/auth');
const snapshotsRouter = require('./routes/snapshots');
const { authMiddleware } = require('./middleware/auth'); // Fixed import
const dataHandler = require('./utils/dataHandler');
const batchCorrectionRouter = require('./routes/batchCorrection');
const limiter = require('./middleware/rateLimit');

console.log('🚀 Starting APL Natlog Backend...');

const app = express();
const PORT = process.env.PORT || 5000;

// Trust proxy headers from Vercel
app.set('trust proxy', 1);

// Configure middleware
app.use(express.json({ limit: '1mb' }));
app.use(bodyParser.json({ limit: '1mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

// Add timeout middleware
app.use((req, res, next) => {
  res.setTimeout(5000, () => {
    res.status(504).json({ error: 'Request timeout' });
  });
  next();
});

// Configure CORS
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:5000',
    'https://aplnatlog-backend.vercel.app',
    'https://natlogportal.vercel.app'
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Apply rate limiting to all routes
app.use(limiter);

// Connect to MongoDB with optimized settings for serverless
mongoose.connect(process.env.MONGODB_URL, {
  useNewUrlParser: true,
  useUnifiedTopology: true, 
  serverSelectionTimeoutMS: 2000, // Reduced timeout
  socketTimeoutMS: 5000, // Reduced timeout
  keepAlive: false,
  maxPoolSize: 1,
  family: 4,
  autoCreate: false
}).then(() => {
  console.log('Connected to MongoDB');
}).catch(err => {
  console.error('MongoDB connection error:', err);
});

// Add connection error handler
mongoose.connection.on('error', err => {
  console.error('MongoDB connection error:', err);
  mongoose.connection.close();
});

// Add cleanup on disconnect
mongoose.connection.on('disconnected', () => {
  console.log('MongoDB disconnected - cleaning up');
});

// Add connection cleanup
mongoose.connection.on('connected', () => {
  setTimeout(() => {
    if (mongoose.connection.readyState === 1) {
      console.log('[MongoDB] Closing idle connection after timeout');
      mongoose.connection.close()
        .catch(err => console.error('[MongoDB] Close error:', err));
    }
  }, 5000);
});

// Public routes
app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'APL Natlog Backend API' });
});

// Serve admin panel
app.get('/admin', (req, res) => {
  res.type('text/html');
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// API routes
app.use('/api/health', require('./routes/health'));
app.use('/api/auth', authRoutes);
app.use('/api/users', authMiddleware, require('./routes/users'));
app.use('/api/roles', authMiddleware, require('./routes/roles'));
app.use('/api/snapshots', authMiddleware, snapshotsRouter);
app.use('/api/batch-correction', authMiddleware, batchCorrectionRouter);
app.use('/api/week-config', authMiddleware, require('./routes/weekConfig'));

// Configure routes with shorter timeouts
app.use('/api/users', require('./routes/users'));
app.use('/api/roles', require('./routes/roles')); 
app.use('/api/snapshots', require('./routes/snapshots'));

// Modify error handler to ensure response
app.use((err, req, res, next) => {
  console.error('Error details:', {
    name: err.name,
    message: err.message,
    path: req.path,
    method: req.method,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });

  // Handle various timeout scenarios
  if (err.name === 'TimeoutError' || 
      err.message?.includes('timeout') ||
      err.message?.includes('TIMEDOUT')) {
    return res.status(504).json({
      error: 'Request timeout - please try again',
      retryable: true
    });
  }

  if (!res.headersSent) {
    res.status(err.status || 500).json({
      error: err.message || 'Internal Server Error',
      path: req.path,
      timestamp: new Date().toISOString(),
      retryable: true
    });
  }
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

// Don't start cleanup task in production/serverless
// startCleanupTask(); // Comment out or remove this line

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;