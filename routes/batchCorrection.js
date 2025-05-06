const express = require('express');
const router = express.Router();
const BatchCorrection = require('../models/BatchCorrection');

router.post('/', async (req, res) => {
  try {
    const batchCorrection = new BatchCorrection(req.body);
    await batchCorrection.save();
    res.json({ success: true, data: batchCorrection });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

router.get('/', async (req, res) => {
  try {
    const corrections = await BatchCorrection.find().sort({ createdAt: -1 });
    res.json({ success: true, data: corrections });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

module.exports = router;
