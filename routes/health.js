const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

router.get('/', async (req, res) => {
  try {
    const mongoState = mongoose.connection.readyState;
    const status = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: {
        connected: mongoState === 1,
        state: ['disconnected', 'connected', 'connecting', 'disconnecting'][mongoState] || 'unknown',
        name: mongoose.connection.name || 'unknown',
        host: mongoose.connection.host || 'unknown'
      }
    };
    res.json(status);
  } catch (error) {
    res.status(500).json({
      status: 'error',
      error: error.message
    });
  }
});

module.exports = router;
