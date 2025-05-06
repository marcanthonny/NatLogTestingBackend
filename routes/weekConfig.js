const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');

// Apply auth middleware to all routes in this router
router.use(authMiddleware);

// Remove '/week-config' from the route paths since it will be added when mounting
router.get('/', async (req, res) => {
  try {
    const WeekConfig = require('../models/WeekConfig');
    const config = await WeekConfig.findOne();
    res.json(config || {});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const WeekConfig = require('../models/WeekConfig');
    const config = await WeekConfig.findOneAndUpdate(
      {}, 
      req.body,
      { upsert: true, new: true }
    );
    res.json(config);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
