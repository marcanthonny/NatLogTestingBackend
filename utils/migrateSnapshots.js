const fs = require('fs').promises;
const path = require('path');
const Snapshot = require('../models/Snapshot');

async function migrateSnapshots() {
  try {
    console.log('Starting snapshots migration...');
    
    // Read snapshots directory
    const snapshotsDir = path.join(__dirname, '../snapshots');
    const files = await fs.readdir(snapshotsDir);
    
    // Filter JSON files
    const jsonFiles = files.filter(f => 
      f.endsWith('.json') && 
      f !== 'index.json' && 
      f !== 'index.json.bak'
    );

    console.log(`Found ${jsonFiles.length} snapshot files to migrate`);
    
    let migrated = 0;
    let skipped = 0;
    let failed = 0;

    // Process each file
    for (const file of jsonFiles) {
      try {
        const filePath = path.join(snapshotsDir, file);
        const content = await fs.readFile(filePath, 'utf8');
        const snapshot = JSON.parse(content);

        // Check if snapshot already exists
        const existing = await Snapshot.findOne({ id: snapshot.id });
        
        if (!existing) {
          await Snapshot.create(snapshot);
          migrated++;
          console.log(`✓ Migrated: ${snapshot.name || snapshot.id}`);
        } else {
          skipped++;
          console.log(`→ Skipped existing: ${snapshot.name || snapshot.id}`);
        }
      } catch (error) {
        failed++;
        console.error(`✗ Failed to migrate ${file}:`, error.message);
      }
    }

    return {
      total: jsonFiles.length,
      migrated,
      skipped,
      failed,
      success: true
    };

  } catch (error) {
    console.error('Migration failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

module.exports = { migrateSnapshots };
