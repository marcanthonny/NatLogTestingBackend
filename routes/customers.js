const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const customerController = require('../controllers/customerController');
const auth = require('../middleware/auth');

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
const upload = multer({ storage });

// Admin only: Import customers from Excel
router.post('/import', auth(['admin']), upload.single('file'), customerController.importCustomers);

// Search customers (autocomplete) - requires authentication
router.get('/', auth, customerController.searchCustomers);

// Update customer (admin only)
router.put('/:id', auth(['admin']), customerController.updateCustomer);

// Delete customer (admin only)
router.delete('/:id', auth(['admin']), customerController.deleteCustomer);

module.exports = router; 