const express = require('express');
const router = express.Router();
const axios = require('axios');
const mongoose = require('mongoose');
const { migrateToMongoDB, checkMongoDBStatus } = require('../utils/dbMigration');
const Snapshot = require('../models/Snapshot');
const { migrateSnapshots } = require('../utils/migrateSnapshots');

// Use MongoDB Atlas URL from environment variable
const MONGODB_URL = process.env.MONGODB_URL;

// New helper function to ensure snapshots directory exists
const ensureSnapshotsDir = async () => {
  const snapshotsDir = path.join(__dirname, '../snapshots');
  try {
    await fs.access(snapshotsDir);
  } catch {
    await fs.mkdir(snapshotsDir, { recursive: true });
  }
  return snapshotsDir;
};

// Add this helper function
const migrateSnapshot = (snapshot) => {
  if (!snapshot.iraStats && snapshot.iraPercentage) {
    // Convert old format to new format
    snapshot.iraStats = {
      counted: 0, // We don't have this data in old format
      notCounted: 0,
      percentage: snapshot.iraPercentage,
      branchPercentages: [] // Start with empty array
    };
    delete snapshot.iraPercentage;
  }

  if (!snapshot.ccStats && snapshot.ccPercentage) {
    snapshot.ccStats = {
      counted: 0,
      notCounted: 0,
      percentage: snapshot.ccPercentage,
      branchPercentages: []
    };
    delete snapshot.ccPercentage;
  }

  return snapshot;
};

// GET all snapshots
router.get('/', async (req, res) => {
  try {
    const snapshots = await Snapshot.find().sort({ date: -1 });
    res.json(snapshots);
  } catch (error) {
    console.error('Error loading snapshots:', error);
    res.status(500).json({ error: error.message });
  }
});

// Save new snapshot
router.post('/', async (req, res) => {
  try {
    const snapshot = new Snapshot({
      id: Date.now().toString(),
      ...req.body,
      createdAt: new Date()
    });

    await snapshot.save();
    res.json(snapshot);
  } catch (error) {
    console.error('Error saving snapshot:', error);
    res.status(400).json({ error: error.message });
  }
});

// Get snapshot by ID 
router.get('/:id', async (req, res) => {
  try {
    const snapshot = await Snapshot.findOne({ id: req.params.id });
    if (!snapshot) {
      throw new Error('Snapshot not found');
    }
    res.json(snapshot);
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
});

// Delete snapshot
router.delete('/:id', async (req, res) => {
  try {
    await Snapshot.deleteOne({ id: req.params.id });
    res.json({ message: 'Snapshot deleted' });
  } catch (error) {
    res.status(404).json({ error: 'Snapshot not found' });
  }
});

// Create email draft from snapshot
router.post('/email-draft', async (req, res) => {
  try {
    const { snapshotId } = req.body;
    const response = await axios.get(`${MONGODB_URL}/snapshots/${snapshotId}`);
    const snapshot = response.data;

    if (!snapshot) {
      return res.status(404).json({ error: 'Snapshot not found' });
    }

    // Generate email draft URL
    const subject = encodeURIComponent(`IRA CC Report - ${new Date().toLocaleDateString()}`);
    const body = encodeURIComponent(`IRA CC Snapshot Report\n\nDate: ${snapshot.date}\nName: ${snapshot.name}`);
    const emailUrl = `mailto:?subject=${subject}&body=${body}`;

    res.json({ emailUrl });
  } catch (error) {
    res.status(404).json({ error: 'Snapshot not found' });
  }
});

// Check MongoDB status
router.get('/db-status', async (req, res) => {
  try {
    // Check MongoDB connection
    if (mongoose.connection.readyState !== 1) {
      return res.status(500).json({
        connected: false,
        status: 'Database disconnected',
        readyState: mongoose.connection.readyState
      });
    }

    // Count documents in snapshots collection
    const count = await mongoose.connection.db.collection('snapshots').countDocuments();
    
    res.json({
      connected: true,
      status: 'Database connected',
      host: mongoose.connection.host,
      name: mongoose.connection.name,
      count: count
    });
  } catch (error) {
    console.error('Database status check failed:', error);
    res.status(500).json({
      connected: false,
      error: error.message,
      details: 'Failed to check database status'
    });
  }
});

// Trigger migration
router.post('/migrate', async (req, res) => {
  try {
    const result = await migrateToMongoDB();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add to snapshots.js routes
router.post('/migrate', async (req, res) => {
  try {
    const result = await migrateSnapshots();
    res.json(result);
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Add status endpoint
router.get('/status', async (req, res) => {
  try {
    const count = await Snapshot.countDocuments();
    res.json({
      total: count,
      databaseConnected: mongoose.connection.readyState === 1
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
