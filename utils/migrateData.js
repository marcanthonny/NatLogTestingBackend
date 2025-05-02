const fs = require('fs').promises;
const path = require('path');
const mongoose = require('mongoose');
const Snapshot = require('../models/Snapshot');

async function migrateSnapshots() {
  try {
    console.log('Starting snapshot migration...');
    
    // Read all snapshot files
    const snapshotsDir = path.join(__dirname, '../snapshots');
    const files = await fs.readdir(snapshotsDir);
    const jsonFiles = files.filter(f => f.endsWith('.json') && f !== 'index.json' && f !== 'index.json.bak');

    let migratedCount = 0;
    let errorCount = 0;

    for (const file of jsonFiles) {
      try {
        const content = await fs.readFile(path.join(snapshotsDir, file), 'utf8');
        const snapshotData = JSON.parse(content);
        
        // Check if snapshot already exists
        const existing = await Snapshot.findOne({ id: snapshotData.id });
        if (!existing) {
          await Snapshot.create(snapshotData);
          migratedCount++;
          console.log(`Migrated: ${file}`);
        }
      } catch (err) {
        errorCount++;
        console.error(`Error migrating ${file}:`, err.message);
      }
    }

    console.log(`\nMigration completed:`);
    console.log(`- Successfully migrated: ${migratedCount} snapshots`);
    console.log(`- Errors encountered: ${errorCount}`);

  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}

module.exports = { migrateSnapshots };
