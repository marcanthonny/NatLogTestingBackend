const mongoose = require('mongoose');
const Snapshot = require('../models/Snapshot'); // Assuming you have a Snapshot model

class DataHandler {
  constructor() {
    this.initialized = false;
  }

  async init() {
    if (this.initialized) return;
    
    try {
      if (!mongoose.connection.readyState) {
        console.log('[MongoDB] Connecting to database...');
        await mongoose.connect(process.env.MONGODB_URL, {
          useNewUrlParser: true,
          useUnifiedTopology: true,
          serverSelectionTimeoutMS: 5000,
          socketTimeoutMS: 10000,
          keepAlive: false,
          maxPoolSize: 1,
          family: 4
        });
        
        // Handle serverless connection cleanup
        mongoose.connection.on('disconnected', () => {
          console.log('MongoDB disconnected - cleaning up');
          this.initialized = false;
          mongoose.connection.removeAllListeners();
        });
        
        // Force close connection after 10s
        setTimeout(() => {
          if (mongoose.connection.readyState === 1) {
            mongoose.connection.close();
          }
        }, 10000);
      }
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
