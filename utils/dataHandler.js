const mongoose = require('mongoose');
const Snapshot = require('../models/Snapshot'); // Assuming you have a Snapshot model
const connectDB = require('../config/database');

class DataHandler {
  constructor() {
    this.initialized = false;
  }

  async init() {
    if (this.initialized) return;
    
    try {
      await connectDB();
    } catch (error) {
      console.error('[MongoDB] Connection error:', error);
      this.initialized = false;
      throw new Error('Database connection failed: ' + error.message);
    }

    this.initialized = true;
  }

  async getHealthStatus() {
    await this.init();
    try {
      const mongoState = mongoose.connection.readyState;
      const snapshots = await Snapshot.countDocuments();

      return {
        status: 'ok',
        timestamp: new Date().toISOString(),
        snapshotsLoaded: snapshots,
        database: {
          connected: mongoState === 1,
          state: ['disconnected', 'connected', 'connecting', 'disconnecting'][mongoState],
          name: mongoose.connection.name,
          host: mongoose.connection.host
        }
      };
    } catch (error) {
      console.error('[Health] Status check failed:', error);
      return {
        status: 'error',
        timestamp: new Date().toISOString(),
        error: error.message,
        database: {
          connected: false,
          state: 'error',
          lastError: error.message
        }
      };
    }
  }

  async getSnapshots() {
    await this.init();
    try {
      return await Snapshot.find({});
    } catch (error) {
      console.error('Error fetching snapshots:', error.message);
      return [];
    }
  }

  async addSnapshot(snapshot) {
    await this.init();
    try {
      // Auto-generate a unique id if missing
      if (!snapshot.id) {
        snapshot.id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      }
      const newSnapshot = new Snapshot(snapshot);
      return await newSnapshot.save();
    } catch (error) {
      console.error('Error adding snapshot:', error.message);
      throw error;
    }
  }

  async getSnapshotById(id) {
    await this.init();
    try {
      return await Snapshot.findOne({ id });
    } catch (error) {
      console.error(`Error fetching snapshot ${id}:`, error.message);
      throw error;
    }
  }

  async deleteSnapshot(id) {
    await this.init();
    try {
      return await Snapshot.findOneAndDelete({ id });
    } catch (error) {
      console.error(`Error deleting snapshot ${id}:`, error.message);
      throw error;
    }
  }
}

module.exports = new DataHandler();
