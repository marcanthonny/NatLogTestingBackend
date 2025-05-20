const express = require('express');
const router = express.Router();
const multer = require('multer');
const { processFiles } = require('../controllers/uploadController');

// Configure multer for memory storage
const upload = multer({ storage: multer.memoryStorage() });

// POST /api/upload/process
router.post('/process', upload.array('files'), processFiles);

module.exports = router;
