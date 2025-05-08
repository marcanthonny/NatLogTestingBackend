const mongoose = require('mongoose');
const Snapshot = require('../models/Snapshot'); // Assuming you have a Snapshot model

class DataHandler {
  constructor() {
    this.initialized = false;
    this.connectionTimeout = 5000;
    this.operationTimeout = 2000;
  }

  async init() {
    if (this.initialized) return;
    
    try {
      if (!mongoose.connection.readyState) {
        console.log('[MongoDB] Connecting to database...');
        await mongoose.connect(process.env.MONGODB_URL, {
          useNewUrlParser: true,
          useUnifiedTopology: true,
          serverSelectionTimeoutMS: this.connectionTimeout,
          socketTimeoutMS: this.operationTimeout,
          maxPoolSize: 1,
          minPoolSize: 0,
          maxIdleTimeMS: 3000, // Reduced from 5000
          family: 4,
          autoCreate: false // Disable automatic collection creation
        });
        
        // Monitor connection state
        mongoose.connection.on('disconnected', () => {
          console.log('[MongoDB] Disconnected - cleaning up');
          this.initialized = false;
          mongoose.connection.removeAllListeners();
          mongoose.disconnect().catch(console.error);
        });
        
        mongoose.connection.on('error', (err) => {
          console.error('[MongoDB] Connection error:', err);
          this.initialized = false;
        });
      }

      // Verify connection is ready
      if (mongoose.connection.readyState !== 1) {
        throw new Error('Database not connected');
      }

      this.initialized = true;
    } catch (error) {
      console.error('[MongoDB] Connection error:', error);
      this.initialized = false;
      throw new Error('Database connection failed: ' + error.message);
    }
  }

  async getHealthStatus() {
    try {
      await this.init();
      
      const mongoState = mongoose.connection.readyState;
      const dbName = mongoose.connection.name;
      const host = mongoose.connection.host;

      return {
        status: 'ok',
        timestamp: new Date().toISOString(),
        database: {
          connected: mongoState === 1,
          state: ['disconnected', 'connected', 'connecting', 'disconnecting'][mongoState] || 'unknown',
          name: dbName || 'unknown',
          host: host || 'unknown',
          details: {
            readyState: mongoState,
            dbName: dbName,
            host: host
          }
        }
      };
    } catch (error) {
      console.error('[Health] Check failed:', error);
      return {
        status: 'error',
        timestamp: new Date().toISOString(),
        error: error.message,
        database: {
          connected: false,
          state: 'error',
          details: error.message
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
