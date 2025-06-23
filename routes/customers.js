const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const customerController = require('../controllers/customerController');
const auth = require('../middleware/auth');

// Multer setup for Excel file upload
defaultUploadDir = path.join(__dirname, '../uploads');
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, defaultUploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage });

// Admin only: Import customers from Excel
router.post('/import', auth(['admin']), upload.single('file'), customerController.importCustomers);

// Search customers (autocomplete)
router.get('/', customerController.searchCustomers);

module.exports = router; 