const express = require('express');
const router = express.Router();
const WeekConfig = require('../models/WeekConfig');

router.get('/week-config', async (req, res) => {
  try {
    let config = await WeekConfig.findOne();
    if (!config) {
      config = await WeekConfig.create({
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
    }
    res.json(config);
  } catch (error) {
    console.error('Error fetching week config:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/week-config', async (req, res) => {
  try {
    const config = await WeekConfig.findOneAndUpdate(
      {}, 
      { ...req.body, updatedAt: new Date() },
      { upsert: true, new: true }
    );
    res.json(config);
  } catch (error) {
    console.error('Error saving week config:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
