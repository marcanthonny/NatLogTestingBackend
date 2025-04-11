const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const app = express();
const PORT = process.env.PORT || 5000;

// Enhanced error handling middleware
app.use((err, req, res, next) => {
  console.error('Global error handler caught:', err);
  res.status(500).json({ 
    error: 'Server error',
    message: err.message,
    stack: process.env.NODE_ENV === 'production' ? '🥞' : err.stack
  });
});

// Update CORS configuration for Vercel deployment
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://your-frontend-url.vercel.app'] 
    : ['http://localhost:3000'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Configure body parsers with increased limits for snapshot data
app.use(bodyParser.json({ 
  limit: '500mb',
  verify: (req, res, buf) => {
    try {
      // Only parse as JSON for non-upload routes to save memory
      if (!req.path.includes('/api/upload')) {
        JSON.parse(buf);
      }
    } catch (e) {
      console.error('Invalid JSON received:', e.message);
      res.status(400).json({ error: 'Invalid JSON in request body' });
      throw new Error('Invalid JSON');
    }
  }
}));
app.use(bodyParser.urlencoded({ limit: '500mb', extended: true }));

// Debug middleware to log requests
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Explicitly create the snapshots directory - Update this section
const snapshotsDir = path.join(__dirname, 'snapshots');
console.log('Ensuring snapshots directory exists at:', snapshotsDir);

try {
  if (!fs.existsSync(snapshotsDir)) {
    console.log('Creating snapshots directory...');
    fs.mkdirSync(snapshotsDir, { recursive: true });
  }

  // Test write permissions
  const testFile = path.join(snapshotsDir, 'test.txt');
  fs.writeFileSync(testFile, 'test');
  fs.unlinkSync(testFile);
  console.log('Successfully verified write permissions to snapshots directory');

  // Create or verify index.json
  const indexPath = path.join(snapshotsDir, 'index.json');
  if (!fs.existsSync(indexPath)) {
    console.log('Creating new index.json file...');
    fs.writeFileSync(indexPath, JSON.stringify([], null, 2));
  }
} catch (error) {
  console.error('CRITICAL ERROR: Failed to setup snapshots directory:', error);
  console.error('Attempted path:', snapshotsDir);
  process.exit(1); // Exit if we can't set up the required directory
}

// Add uploads directory path configuration with separate subdirectories
const uploadsDir = path.join(__dirname, 'uploads');
const iraUploadsDir = path.join(uploadsDir, 'ira-cc');
const excelEditorUploadsDir = path.join(uploadsDir, 'excel-editor');

// Ensure upload directories exist
[iraUploadsDir, excelEditorUploadsDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log('Created directory:', dir);
  }
});

// Add middleware to attach directory paths to requests
app.use((req, res, next) => {
  req.snapshotsDir = snapshotsDir;
  req.uploadsDir = uploadsDir;
  req.iraUploadsDir = iraUploadsDir;
  req.excelEditorUploadsDir = excelEditorUploadsDir;
  next();
});

// Debug middleware to log all requests - ADD THIS BEFORE ROUTES
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Import and register routes - FIXED: ensure this is before static file serving
const snapshotsRouter = require('./routes/snapshots');

// Import the Excel Editor routes
const excelEditorRouter = require('./routes/excelEditor');

// API Routes - make sure these are correctly mounted
app.use('/api/snapshots', snapshotsRouter);

// Mount the Excel Editor routes BEFORE the static file serving
app.use('/api/excel-editor', excelEditorRouter);

// Add a test endpoint to verify API is working
app.get('/api/test', (req, res) => {
  res.json({ status: 'API is working' });
});

// Add API health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve static files from the React app AFTER registering API routes
app.use(express.static(path.join(__dirname, '../frontend/build')));

// Optimized file upload route with streaming support
app.post('/api/upload', (req, res) => {
  console.log('File upload request received');
  
  // Use the uploads directory instead of temp
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  
  // For chunked uploads
  if (req.headers['x-chunk-upload'] === 'true') {
    handleChunkedUpload(req, res);
    return;
  }
  
  // For standard uploads
  try {
    const fileData = req.body.fileData;
    const fileName = req.body.fileName;
    const fileType = req.body.fileType;
    const category = req.body.category; // 'ira' or 'cc'
    
    if (!fileData || !fileName) {
      return res.status(400).json({
        success: false,
        error: 'Missing file data or file name'
      });
    }
    
    console.log(`Processing ${category} file: ${fileName}`);
    
    // Process the file based on type and return processed data
    const processedData = processFileData(fileData, fileName, fileType, category);
    
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

// Handler for chunked file uploads
function handleChunkedUpload(req, res) {
  const chunkIndex = parseInt(req.headers['x-chunk-index']);
  const totalChunks = parseInt(req.headers['x-total-chunks']);
  const fileName = req.headers['x-file-name'];
  const fileId = req.headers['x-file-id'];
  const category = req.headers['x-category']; // 'ira' or 'cc'
  
  console.log(`Receiving chunk ${chunkIndex + 1}/${totalChunks} for ${fileName}`);
  
  const tempDir = path.join(__dirname, 'temp');
  const chunkFile = path.join(tempDir, `${fileId}_${chunkIndex}`);
  
  // Save the chunk
  try {
    fs.writeFileSync(chunkFile, req.body.data);
    
    // Check if this is the last chunk
    if (chunkIndex === totalChunks - 1) {
      // Combine all chunks
      const completeFilePath = path.join(tempDir, fileId);
      const writeStream = fs.createWriteStream(completeFilePath);
      
      let combinedChunks = 0;
      
      const combineChunks = () => {
        if (combinedChunks < totalChunks) {
          const chunkPath = path.join(tempDir, `${fileId}_${combinedChunks}`);
          const chunkStream = fs.createReadStream(chunkPath);
          
          chunkStream.pipe(writeStream, { end: false });
          
          chunkStream.on('end', () => {
            fs.unlinkSync(chunkPath); // Delete the chunk
            combinedChunks++;
            combineChunks();
          });
          
          chunkStream.on('error', (err) => {
            console.error('Error combining chunks:', err);
            res.status(500).json({
              success: false,
              error: 'Failed to combine chunks'
            });
          });
        } else {
          // All chunks combined
          writeStream.end();
          
          // Process the complete file
          const fileData = fs.readFileSync(completeFilePath, 'utf8');
          const processedData = processFileData(fileData, fileName, 
                                              path.extname(fileName).substr(1), 
                                              category);
          
          // Delete the complete file
          fs.unlinkSync(completeFilePath);
          
          res.json({
            success: true,
            data: processedData
          });
        }
      };
      
      combineChunks();
    } else {
      // Not the last chunk, acknowledge receipt
      res.json({
        success: true,
        chunkIndex: chunkIndex
      });
    }
  } catch (error) {
    console.error('Error handling chunk:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process chunk'
    });
  }
}

// Process file data based on file type and category
function processFileData(fileData, fileName, fileType, category) {
  // ... Implement your file processing logic here
  // This would include parsing Excel files, identifying columns, etc.
  
  // Return properly structured data based on category
  return {
    fileName,
    fileType,
    // ... other processed data
  };
}

// The "catchall" handler - make sure this is AFTER all API routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/build/index.html'));
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Snapshots API: http://localhost:${PORT}/api/snapshots`);
  console.log(`Snapshots directory: ${snapshotsDir}`);
  
  // Verify we can write to the snapshots directory
  const testFile = path.join(snapshotsDir, 'test.txt');
  try {
    fs.writeFileSync(testFile, 'Test write permission');
    fs.unlinkSync(testFile);
    console.log('Snapshot directory is writable ✅');
  } catch (error) {
    console.error('ERROR: Cannot write to snapshots directory:', error.message);
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    path: req.path
  });
});