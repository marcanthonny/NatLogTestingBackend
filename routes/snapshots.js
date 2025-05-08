const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const Snapshot = require('../models/Snapshot');
const dataHandler = require('../utils/dataHandler');

// Protected routes
router.use(authMiddleware);

// Get all snapshots
router.get('/', async (req, res) => {
  try {
    const snapshots = await Snapshot.find().lean().exec();
    res.json(snapshots);
  } catch (error) {
    console.error('Error fetching snapshots:', error);
    res.status(500).json({ error: 'Failed to fetch snapshots' });
  }
});

// Get single snapshot
router.get('/:id', async (req, res) => {
  try {
    const snapshot = await Snapshot.findOne({ id: req.params.id }).lean().exec();
    if (!snapshot) {
      return res.status(404).json({ error: 'Snapshot not found' });
    }
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
