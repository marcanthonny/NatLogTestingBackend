const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const connectDB = require('./config/database');
const mongoose = require('mongoose');
const path = require('path');

// Log startup info
console.log('\n🚀 Starting APL Natlog Backend...');
console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
console.log(`   Time: ${new Date().toISOString()}`);

// Initialize Express
const app = express();
const PORT = process.env.PORT || 5000;

// Initialize MongoDB connection
connectDB().then(connection => {
  if (connection) {
    console.log('MongoDB initialized successfully');
  } else {
    console.warn('MongoDB connection failed, running in degraded mode');
  }
});

// Add connection status middleware
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

// Update CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://natlogportal.vercel.app']
    : ['http://localhost:3000'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// Add CORS pre-flight handling
app.options('*', cors());

// Configure body parsers
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

// Debug middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Remove file system operations, use environment variables for configuration
app.use((req, res, next) => {
  // Add configuration to request object
  req.config = {
    env: process.env.NODE_ENV || 'development',
    isServerless: process.env.VERCEL === '1'
  };
  next();
});

// Import data handler
const dataHandler = require('./utils/dataHandler');

// Initialize data before starting server
app.use(async (req, res, next) => {
  if (!dataHandler.initialized) {
    await dataHandler.init();
  }
  next();
});

// Import and register routes
const snapshotsRouter = require('./routes/snapshots');
const excelEditorRouter = require('./routes/excelEditor');
const weekConfigRouter = require('./routes/weekConfig');

app.use('/api', snapshotsRouter);
app.use('/api', excelEditorRouter);
app.use('/api', weekConfigRouter);

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
  const snapshots = await dataHandler.getSnapshots();
  res.json({
    status: 'ok',
    time: new Date().toISOString(),
    env: process.env.NODE_ENV || 'development',
    snapshotsLoaded: snapshots.length
  });
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

// Export the Express app for serverless deployment
module.exports = app;