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
const { startCleanupTask } = require('./utils/sessionManager');
const session = require('./middleware/session');

console.log('🚀 Starting APL Natlog Backend...');

const app = express();
const PORT = process.env.PORT || 5000;

// Trust proxy headers from Vercel
app.set('trust proxy', 1);

// Configure middleware
app.use(express.json({ limit: '50mb' }));
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

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

// Add session middleware before routes
app.use(session);
process.env.MONGODB_URL, {
// Connect to MongoDB with optimized settings for serverless
mongoose.connect(process.env.MONGODB_URL, { true,
  useNewUrlParser: true,ion
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000,000,
  socketTimeoutMS: 10000,ctTimeoutMS: 10000,
  keepAlive: false, // Disable keepAliveze: 10,
  maxPoolSize: 1,    // Minimize connections
  connectTimeoutMS: 5000,: true,
  family: 4
}).then(() => { });
  console.log('Connected to MongoDB');    console.log('Connected to MongoDB');
}).catch(err => {
  console.error('MongoDB connection error:', err);ror:', err);
});

// Add connection error handler
mongoose.connection.on('error', err => {
  console.error('MongoDB connection error:', err);c
  mongoose.connection.close();
});reconnect...');
etTimeout(connectDB, 5000);
// Add cleanup on disconnect});
mongoose.connection.on('disconnected', () => {
  console.log('MongoDB disconnected - cleaning up');ore starting app
});

// Public routes// Add connection error handler
app.get('/', (req, res) => {on('error', err => {
  res.json({ status: 'ok', message: 'APL Natlog Backend API' });on error:', err);
});ose();

// Serve admin panel
app.get('/admin', (req, res) => {// Public routes
  res.type('text/html');(req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));kend API' });
});

// API routes
app.use('/api/health', require('./routes/health'));
app.use('/api/auth', authRoutes);
app.use('/api/users', authMiddleware, require('./routes/users'));
app.use('/api/roles', authMiddleware, require('./routes/roles'));});
app.use('/api/snapshots', authMiddleware, snapshotsRouter);
app.use('/api/batch-correction', authMiddleware, batchCorrectionRouter);
app.use('/api/week-config', authMiddleware, require('./routes/weekConfig'));'./routes/health'));

// Add keepalive endpointhMiddleware, require('./routes/users'));
app.get('/api/keepalive', (req, res) => {quire('./routes/roles'));
  res.json({ status: 'ok' });Router);
});('/api/batch-correction', authMiddleware, batchCorrectionRouter);
.use('/api/week-config', authMiddleware, require('./routes/weekConfig'));
// Modify error handler to ensure response
app.use((err, req, res, next) => {// Modify error handler to ensure response
  console.error('Error:', err);

  // Handle timeouts specifically  // Always send a response, even for timeouts
  if (err.name === 'TimeoutError') {ersSent) {
    return res.status(503).json({s || 500).json({
      error: 'Service temporarily unavailable, please try again'or'
    }); });
  }  }

















module.exports = app;});  console.log(`Server running on port ${PORT}`);app.listen(PORT, () => {// Start server// startCleanupTask(); // Comment out or remove this line// Don't start cleanup task in production/serverless});  }    });      error: err.message || 'Internal Server Error'    res.status(err.status || 500).json({  if (!res.headersSent) {
// Don't start cleanup task in production/serverless
// startCleanupTask(); // Comment out or remove this line

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;