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

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URL, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
}).then(() => {
  console.log('Connected to MongoDB');
}).catch(err => {
  console.error('MongoDB connection error:', err);
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

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error'
  });
});

// Start session cleanup task
startCleanupTask();

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;