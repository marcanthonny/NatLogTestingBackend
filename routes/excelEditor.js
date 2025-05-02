const express = require('express');
const router = express.Router();

router.post('/change-format', async (req, res) => {
  try {
    const { column, targetFormat, data } = req.body;
    // Handle column format changes
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/apply-filter', async (req, res) => {
  try {
    const { filters, data } = req.body;
    // Handle data filtering
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
