const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const Snapshot = require('../models/Snapshot');
const dataHandler = require('../utils/dataHandler');

// Protected routes
router.use(authMiddleware);

// Get all snapshots - with pagination
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const snapshots = await Snapshot.find()
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit))
      .lean()
      .exec();

    res.json(snapshots);
  } catch (error) {
    console.error('Error fetching snapshots:', error);
    res.status(500).json({ error: 'Failed to fetch snapshots' });
  }
});

// Get single snapshot - simplified
router.get('/:id', async (req, res) => {
  try {
    const snapshot = await Snapshot.findById(req.params.id)
      .lean()
      .exec();
    
    if (!snapshot) return res.status(404).json({ error: 'Not found' });
    res.json(snapshot);
  } catch (error) {
    console.error('Error fetching snapshot:', error);
    res.status(500).json({ error: 'Failed to fetch snapshot' });
  }
});

// Create snapshot
router.post('/', async (req, res) => {
  try {
    const snapshot = await dataHandler.addSnapshot(req.body);
    res.status(201).json(snapshot);
  } catch (error) {
    console.error('Error creating snapshot:', error);
    res.status(500).json({ error: 'Failed to create snapshot' });
  }
});

// Delete snapshot
router.delete('/:id', async (req, res) => {
  try {
    const snapshot = await dataHandler.deleteSnapshot(req.params.id);
    if (!snapshot) {
      return res.status(404).json({ error: 'Snapshot not found' });
    }
    res.json({ message: 'Snapshot deleted successfully' });
  } catch (error) {
    console.error('Error deleting snapshot:', error);
    res.status(500).json({ error: 'Failed to delete snapshot' });
  }
});

module.exports = router;
