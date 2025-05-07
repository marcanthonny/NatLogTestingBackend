const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { getSessionAnalytics } = require('../utils/sessionManager');

router.get('/sessions', authMiddleware, async (req, res) => {
  try {
    const analytics = await getSessionAnalytics();
    res.json(analytics);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
