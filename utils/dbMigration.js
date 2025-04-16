const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');

const migrateToMongoDB = async () => {
  try {
    const snapshotsDir = path.join(__dirname, '../snapshots');
    const files = await fs.readdir(snapshotsDir);
    const jsonFiles = files.filter(f => f.endsWith('.json') && f !== 'index.json' && f !== 'index.json.bak');
    
    const snapshots = [];
    for (const file of jsonFiles) {
      const content = await fs.readFile(path.join(snapshotsDir, file), 'utf8');
      snapshots.push(JSON.parse(content));
    }

    // Sort by date
    snapshots.sort((a, b) => new Date(a.date) - new Date(b.date));
    
    // Post to MongoDB
    const mongoUrl = process.env.MONGODB_URL;
    const response = await axios.post(`${mongoUrl}/snapshots/bulk`, snapshots);
    
    console.log(`Successfully migrated ${snapshots.length} snapshots to MongoDB`);
    return response.data;
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
};

const checkMongoDBStatus = async () => {
  try {
    const mongoUrl = process.env.MONGODB_URL;
    const response = await axios.get(`${mongoUrl}/snapshots/count`);
    return {
      connected: true,
      count: response.data.count
    };
  } catch (error) {
    return {
      connected: false,
      error: error.message
    };
  }
};

module.exports = { migrateToMongoDB, checkMongoDBStatus };
