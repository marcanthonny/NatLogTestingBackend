const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const connectDB = require('./config/database');
const mongoose = require('mongoose');
const path = require('path');
const authRoutes = require('./routes/auth');
const snapshotsRouter = require('./routes/snapshots');
const authMiddleware = require('./middleware/auth');
const dataHandler = require('./utils/dataHandler');
const batchCorrectionRouter = require('./routes/batchCorrection');

// Log startup info
console.log('\n🚀 Starting APL Natlog Backend...');
console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
console.log(`   Time: ${new Date().toISOString()}`);

// Initialize Express
const app = express();
const PORT = process.env.PORT || 5000;

// Initialize MongoDB connection with better error handling
let dbInitialized = false;
const MAX_RETRIES = 3;
const RETRY_DELAY = 5000;
let retryCount = 0;

const initializeDB = async () => {
  if (dbInitialized) return;
  
  try {
    console.log('[Server] Attempting database connection...');
    const connection = await connectDB();
    
    if (!connection) {
      throw new Error('Connection returned null');
    }

    // Wait for connection to be ready
    if (connection.connection.readyState !== 1) {
      await new Promise((resolve) => {
        connection.connection.once('connected', resolve);
        setTimeout(() => {
          if (connection.connection.readyState !== 1) {
            throw new Error('Connection timeout');
          }
        }, 5000);
      });
    }

    dbInitialized = true;
    retryCount = 0;
    console.log('[Server] MongoDB connected successfully:', {
      database: connection.connection.name,
      host: connection.connection.host,
      state: connection.connection.readyState
    });

    return connection;
  } catch (error) {
    console.error('[Server] Database connection failed:', error.message);
    dbInitialized = false;

    // Implement retry logic
    if (retryCount < MAX_RETRIES) {
      retryCount++;
      console.log(`[Server] Retrying connection in ${RETRY_DELAY/1000}s... (${retryCount}/${MAX_RETRIES})`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      return initializeDB();
    }

    throw error;
  }
};

// Initialize database before setting up routes
(async () => {
  try {
    await initializeDB();
  } catch (error) {
    console.error('[Server] Failed to initialize database after retries:', error.message);
  }
})();

// Add connection check middleware
app.use(async (req, res, next) => {
  if (!dbInitialized && mongoose.connection.readyState !== 1) {
    await initializeDB();
  }
  next();
});

// Add detailed connection status to middleware
app.use((req, res, next) => {
  const mongoState = mongoose.connection.readyState;
  req.dbStatus = {
    connected: mongoState === 1,
    state: ['disconnected', 'connected', 'connecting', 'disconnecting'][mongoState],
    details: {
      host: mongoose.connection.host,
      name: mongoose.connection.name,
      readyState: mongoState
    }
  };
  next();
});

// Enhanced error handling middleware for serverless
app.use((err, req, res, next) => {
  console.error('Global error handler caught:', err);
  res.status(500).json({ 
    error: 'Server error',
    message: err.message,
    stack: process.env.NODE_ENV === 'production' ? undefined : err.stack
  });
});

// Serve static files FIRST, before any other middleware
app.use(express.static(path.join(__dirname, 'public')));

// Then configure other middleware
app.use(express.json());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

// Configure CORS
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:5000',
    'https://aplnatlog-backend.vercel.app',
    'https://natlogportal.vercel.app',
    'https://aplnatlog-backend-30wj7ffh1-marcanthonnys-projects.vercel.app'
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// Handle preflight requests
app.options('*', cors());

// Add CORS headers
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Content-Type', 'application/json');
  next();
});

// Add content-type middleware for HTML
app.use((req, res, next) => {
  if (req.path.endsWith('.html')) {
    res.setHeader('Content-Type', 'text/html');
  }
  next();
});

// Simple admin route - no content-type override needed
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Auth routes must come BEFORE protecting /api routes
app.use('/api/auth', authRoutes);

// AFTER auth routes, then protect other API routes
app.use('/api', (req, res, next) => {
  if (req.path.startsWith('/auth/')) {
    return next();
  }
  authMiddleware(req, res, next);
});

// Protected routes come last
app.use('/api/snapshots', snapshotsRouter);
app.use('/api/batch-correction', batchCorrectionRouter);

// Mount routes with proper prefixes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users')); // Make sure this line exists
app.use('/api/snapshots', require('./routes/snapshots'));

// Add connection status middleware before routes
app.use((req, res, next) => {
  // Add fresh DB status check
  const mongoState = mongoose.connection.readyState;
  req.dbStatus = {
    connected: mongoState === 1,
    state: ['disconnected', 'connected', 'connecting', 'disconnecting'][mongoState],
    details: {
      host: mongoose.connection.host,
      name: mongoose.connection.name,
      readyState: mongoState,
      initialized: dbInitialized
    }
  };
  next();
});

// Test endpoint
app.get('/api/test', (req, res) => {
  res.json({ 
    status: 'API is working',
    env: process.env.NODE_ENV,
    serverless: process.env.VERCEL === '1'
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    message: 'APL Natlog Backend API',
    version: '1.0.0',
    env: process.env.NODE_ENV || 'development',
    database: {
      connected: req.dbStatus.connected,
      state: req.dbStatus.state,
      name: mongoose.connection.name,
      host: mongoose.connection.host
    }
  });
});

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    const status = await dataHandler.getHealthStatus();
    res.setHeader('Content-Type', 'application/json');
    res.json(status);
  } catch (error) {
    console.error('[Health] Check failed:', error);
    res.setHeader('Content-Type', 'application/json');
    res.status(500).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error.message,
      database: {
        connected: false,
        state: 'error'
      }
    });
  }
});

// Optimized file upload route for serverless
app.post('/api/upload', (req, res) => {
  try {
    const { fileData, fileName, fileType, category } = req.body;
    
    if (!fileData || !fileName) {
      return res.status(400).json({
        success: false,
        error: 'Missing file data or file name'
      });
    }
    
    // Process the data in memory
    const processedData = {
      fileName,
      fileType,
      category,
      data: fileData,
      processedAt: new Date().toISOString()
    };
    
    res.json({
      success: true,
      data: processedData
    });
  } catch (error) {
    console.error('Error processing upload:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'File processing failed'
    });
  }
});

// Error handler for serverless environment
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    path: req.path,
    serverless: true,
    env: process.env.NODE_ENV
  });
});

// Add error handling middleware
app.use((err, req, res, next) => {
  console.error('[API Error]:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message,
    timestamp: new Date().toISOString()
  });
});

// Export the Express app for serverless deployment
module.exports = app;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});