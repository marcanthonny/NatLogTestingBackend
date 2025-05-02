const express = require('express');
const router = express.Router();

router.get('/week-config', async (req, res) => {
  try {
    const WeekConfig = require('../models/WeekConfig');
    const config = await WeekConfig.findOne();
    res.json(config || {});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/week-config', async (req, res) => {
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
