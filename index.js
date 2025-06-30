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
const userRoutes = require('./routes/users');
const batchCorrectionFormRoutes = require('./routes/batchCorrectionForm');
const branchRoutes = require('./routes/branches');
const toteFormRoutes = require('./routes/toteForm');
const customerRoutes = require('./routes/customers');
const Branch = require('./models/Branch');

// Log startup info
console.log('\n🚀 Starting APL Natlog Backend...');
console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
console.log(`   Time: ${new Date().toISOString()}`);

// Initialize Express
const app = express();
const PORT = process.env.PORT || 5000;

// Configure CORS FIRST - before any other middleware
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:5000',
      'https://aplnatlog-backend.vercel.app',
      'https://natlogportal.vercel.app',
      'https://aplnatlog-backend-30wj7ffh1-marcanthonnys-projects.vercel.app',
      'https://batch-corr-form.vercel.app',
      'https://toteform.vercel.app'
    ];
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log('CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  credentials: true,
  optionsSuccessStatus: 200 // Some legacy browsers (IE11, various SmartTVs) choke on 204
}));

// Handle preflight requests BEFORE any other middleware
app.options('*', cors());
app.use((req, res, next) => {
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

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

    // Initialize branches automatically after successful connection
    try {
      console.log('[Server] Initializing default branches...');
      await Branch.initializeBranches();
      console.log('[Server] ✅ Default branches initialized successfully!');
    } catch (branchError) {
      console.error('[Server] Warning: Branch initialization failed:', branchError.message);
      // Don't fail the entire startup if branch init fails
    }

    // Initialize ToteForm collection
    try {
      console.log('[Server] Initializing ToteForm collection...');
      const ToteForm = require('./models/ToteForm');
      await ToteForm.createIndexes();
      console.log('[Server] ✅ ToteForm collection initialized successfully!');
    } catch (toteFormError) {
      console.error('[Server] Warning: ToteForm initialization failed:', toteFormError.message);
      // Don't fail the entire startup if ToteForm init fails
    }

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

// Configure middleware FIRST, before any routes
app.use(express.json());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

// Serve static files with proper MIME types
app.use(express.static(path.join(__dirname, 'public'), {
  setHeaders: (res, path) => {
    if (path.endsWith('.html')) {
      res.setHeader('Content-Type', 'text/html');
    }
  }
}));

// Only set JSON content type for API routes
app.use('/api', (req, res, next) => {
  res.setHeader('Content-Type', 'application/json');
  next();
});

// Simple admin route - no content-type override needed
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Auth routes - these handle their own authentication
app.use('/api/auth', authRoutes);

// Apply auth middleware to all other /api routes EXCEPT customers
app.use('/api', (req, res, next) => {
  // Skip auth middleware for customer routes since they have their own auth
  if (req.path.startsWith('/customers')) {
    return next();
  }
  return authMiddleware(req, res, next);
});

// Add specific CORS handling for customer routes
app.use('/api/customers', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', 'https://toteform.vercel.app');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

// Register access control API
app.use('/api/access-controls', require('./routes/accessControl'));

// Protected routes come last
app.use('/api/snapshots', snapshotsRouter);
app.use('/api/batch-correction', batchCorrectionRouter);
app.use('/api/week-config', require('./routes/weekConfig'));
app.use('/api/tote-form', toteFormRoutes);
app.use('/api/customers', customerRoutes);

// Mount routes with proper prefixes
app.use('/api/users', userRoutes);
app.use('/api/snapshots', require('./routes/snapshots'));
app.use('/api/branches', branchRoutes);
app.use('/api/batch-correction-form', batchCorrectionFormRoutes);

// Add roles route
app.use('/api/roles', require('./routes/roles'));

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

// Get branches info endpoint
app.get('/api/branches-info', async (req, res) => {
  try {
    const branches = await Branch.find({ active: true }).select('code name').lean();
    res.json({
      success: true,
      branches: branches,
      count: branches.length
    });
  } catch (error) {
    console.error('[Branches Info] Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch branches info',
      branches: [],
      count: 0
    });
  }
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
    const dbStatus = mongoose.connection.readyState;
    const dbStatusText = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting'
    };
    
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: {
        status: dbStatusText[dbStatus] || 'unknown',
        readyState: dbStatus
      },
      uptime: process.uptime(),
      memory: process.memoryUsage()
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      error: error.message
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