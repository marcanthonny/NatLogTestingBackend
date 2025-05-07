const express = require('express');
const router = express.Router();
const WeekConfig = require('../models/WeekConfig');
const { authMiddleware } = require('../middleware/auth');

// Apply auth middleware to all routes in this router
router.use(authMiddleware);

// Get current week configuration
router.get('/', async (req, res) => {
  try {
    const config = await WeekConfig.findOne();
    res.json(config || {
      ira: {
        week1: { target: 99 },
        week2: { target: 99 },
        week3: { target: 99 },
        week4: { target: 99 }
      },
      cc: {
        week1: { target: 25 },
        week2: { target: 50 },
        week3: { target: 75 },
        week4: { target: 99 }
      }
    });
  } catch (error) {
    console.error('[WeekConfig] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update week configuration
router.post('/', async (req, res) => {
  try {
    const config = await WeekConfig.findOne();
    if (config) {
      Object.assign(config, req.body);
      await config.save();
    } else {
      await WeekConfig.create(req.body);
    }
    res.json({ success: true });
  } catch (error) {
    console.error('[WeekConfig] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
