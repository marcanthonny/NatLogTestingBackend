const express = require('express');
const router = express.Router();
const { checkPermission } = require('../utils/permissionUtils');
const { authMiddleware } = require('../middleware/auth');
const Snapshot = require('../models/Snapshot');
const dataHandler = require('../utils/dataHandler');

// Protected routes
router.use(authMiddleware);

// Get all snapshots
router.get('/', async (req, res) => {
  try {
    const hasPermission = await checkPermission(req.user, 'view:snapshots');
    if (!hasPermission) {
      return res.status(403).json({ error: 'You dont have the permission to view snapshots' });
    }

    const snapshots = await Snapshot.find();
    res.json(snapshots);
  } catch (error) {
    console.error('Error fetching snapshots:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const hasPermission = await checkPermission(req.user, 'create:snapshots');
    if (!hasPermission) {
      return res.status(403).json({ error: 'You dont have the permission to create snapshots' });
    }

    res.setHeader('Content-Type', 'application/json');
    const snapshot = await dataHandler.addSnapshot(req.body);
    res.status(201).json(snapshot);
  } catch (error) {
    console.error('Error creating snapshot:', error);
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const hasPermission = await checkPermission(req.user, 'delete:snapshots');
    if (!hasPermission) {
      return res.status(403).json({ error: 'You dont have the permission to delete snapshots' });
    }

    res.setHeader('Content-Type', 'application/json');
    const snapshot = await dataHandler.deleteSnapshot(req.params.id);
    if (!snapshot) {
      return res.status(404).json({ error: 'Snapshot not found' });
    }
    res.json({ message: 'Snapshot deleted successfully', snapshot });
  } catch (error) {
    console.error('Error deleting snapshot:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const hasPermission = await checkPermission(req.user, 'view:snapshots');
    if (!hasPermission) {
      return res.status(403).json({ error: 'You dont have the permission to view snapshot details' });
    }

    res.setHeader('Content-Type', 'application/json');
    const snapshot = await dataHandler.getSnapshotById(req.params.id);
    if (!snapshot) {
      return res.status(404).json({ error: 'Snapshot not found' });
    }
    res.json(snapshot);
  } catch (error) {
    console.error('Error fetching snapshot:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
