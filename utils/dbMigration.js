const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');

const migrateToMongoDB = async () => {
  try {
    const snapshotsDir = path.join(__dirname, '../snapshots');
    const files = await fs.readdir(snapshotsDir);
    const jsonFiles = files.filter(f => f.endsWith('.json') && f !== 'index.json' && f !== 'index.json.bak');
    
    // Process in batches to avoid memory issues
    const batchSize = 10;
    for (let i = 0; i < jsonFiles.length; i += batchSize) {
      const batch = jsonFiles.slice(i, i + batchSize);
      const snapshots = await Promise.all(
        batch.map(async file => {
          const content = await fs.readFile(path.join(snapshotsDir, file), 'utf8');
          return JSON.parse(content);
        })
      );
      
      // Post batch to MongoDB
      await axios.post(`${process.env.MONGODB_URL}/snapshots/bulk`, snapshots);
      console.log(`Migrated batch ${i/batchSize + 1}/${Math.ceil(jsonFiles.length/batchSize)}`);
    }
    
    return { success: true, count: jsonFiles.length };
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
