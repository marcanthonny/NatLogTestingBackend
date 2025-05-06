const express = require('express');
const router = express.Router();
const dataHandler = require('../utils/dataHandler');

// Add error handler middleware
const handleError = (res, error) => {
  console.error('[Snapshots] Error:', error);
  res.status(500).json({
    error: error.message || 'Internal server error',
    timestamp: new Date().toISOString()
  });
};

// Fix route paths by removing /snapshots prefix (it's added in app.js)
router.get('/', async (req, res) => {
  try {
    res.setHeader('Content-Type', 'application/json');
    const snapshots = await dataHandler.getSnapshots();
    res.json(snapshots || []);
  } catch (error) {
    handleError(res, error);
  }
});

router.post('/', async (req, res) => {
  try {
    res.setHeader('Content-Type', 'application/json');
    const snapshot = await dataHandler.addSnapshot(req.body);
    res.status(201).json(snapshot);
  } catch (error) {
    handleError(res, error);
  }
});

router.delete('/:id', async (req, res) => {
  try {
    res.setHeader('Content-Type', 'application/json');
    const snapshot = await dataHandler.deleteSnapshot(req.params.id);
    if (!snapshot) {
      return res.status(404).json({ error: 'Snapshot not found' });
    }
    res.json({ message: 'Snapshot deleted successfully', snapshot });
  } catch (error) {
    handleError(res, error);
  }
});

router.get('/:id', async (req, res) => {
  try {
    res.setHeader('Content-Type', 'application/json');
    const snapshot = await dataHandler.getSnapshotById(req.params.id);
    if (!snapshot) {
      return res.status(404).json({ error: 'Snapshot not found' });
    }
    res.json(snapshot);
  } catch (error) {
    handleError(res, error);
  }
});

module.exports = router;
