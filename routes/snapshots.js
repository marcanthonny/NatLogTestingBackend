const express = require('express');
const router = express.Router();
const dataHandler = require('../utils/dataHandler');

router.get('/snapshots', async (req, res) => {
  try {
    const snapshots = await dataHandler.getSnapshots();
    res.json(snapshots);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/snapshots', async (req, res) => {
  try {
    const snapshot = await dataHandler.addSnapshot(req.body);
    res.status(201).json(snapshot);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/snapshots/:id', async (req, res) => {
  try {
    const snapshot = await dataHandler.deleteSnapshot(req.params.id);
    if (!snapshot) {
      return res.status(404).json({ error: 'Snapshot not found' });
    }
    res.json({ message: 'Snapshot deleted successfully', snapshot });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/snapshots/:id', async (req, res) => {
  try {
    const snapshot = await dataHandler.getSnapshotById(req.params.id);
    if (!snapshot) {
      return res.status(404).json({ error: 'Snapshot not found' });
    }
    res.json(snapshot);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
