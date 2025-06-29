const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const customerController = require('../controllers/customerController');
const auth = require('../middleware/auth');

// CORS middleware for customer routes
const corsMiddleware = (req, res, next) => {
  res.header('Access-Control-Allow-Origin', 'https://toteform.vercel.app');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
};

// Apply CORS middleware to all customer routes
router.use(corsMiddleware);

// Multer setup for Excel file upload
const isServerless = process.env.VERCEL === '1' || process.env.NODE_ENV === 'production';
const defaultUploadDir = isServerless ? '/tmp' : path.join(__dirname, '../uploads');
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, defaultUploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

// Add file size limits and file type validation
const upload = multer({ 
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
    files: 1
  },
  fileFilter: (req, file, cb) => {
    // Check file type
    if (file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || 
        file.mimetype === 'application/vnd.ms-excel' ||
        file.originalname.endsWith('.xlsx') ||
        file.originalname.endsWith('.xls')) {
      cb(null, true);
    } else {
      cb(new Error('Only Excel files (.xlsx, .xls) are allowed'), false);
    }
  }
});

// Error handling middleware for multer
const handleMulterError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ 
        error: 'File too large', 
        message: 'File size must be less than 50MB' 
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ 
        error: 'Too many files', 
        message: 'Only one file can be uploaded at a time' 
      });
    }
    return res.status(400).json({ 
      error: 'File upload error', 
      message: error.message 
    });
  }
  
  if (error.message === 'Only Excel files (.xlsx, .xls) are allowed') {
    return res.status(400).json({ 
      error: 'Invalid file type', 
      message: 'Only Excel files (.xlsx, .xls) are allowed' 
    });
  }
  
  next(error);
};

// Admin only: Import customers from Excel
router.post('/import', auth(['admin']), upload.single('file'), handleMulterError, customerController.importCustomers);

// Search customers (autocomplete)
router.get('/', customerController.searchCustomers);

// Update customer (admin only)
router.put('/:id', auth(['admin']), customerController.updateCustomer);

// Delete customer (admin only)
router.delete('/:id', auth(['admin']), customerController.deleteCustomer);

module.exports = router; 