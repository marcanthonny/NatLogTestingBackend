const fs = require('fs').promises;
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function migrateAllData() {
  try {
    console.log('Starting data migration to Supabase...');
    
    // Migrate snapshots
    const snapshotResults = await migrateSnapshots();
    console.log('Snapshots migration:', snapshotResults);

    // Migrate batch corrections
    const batchResults = await migrateBatchCorrections();
    console.log('Batch corrections migration:', batchResults);

    // Migrate week configs
    const weekConfigResults = await migrateWeekConfigs();
    console.log('Week configs migration:', weekConfigResults);

    return { success: true };
  } catch (error) {
    console.error('Migration failed:', error);
    return { success: false, error: error.message };
  }
}

async function migrateSnapshots() {
  const files = await fs.readdir(path.join(__dirname, '../snapshots'));
  const jsonFiles = files.filter(f => f.endsWith('.json') && !f.includes('index'));
  
  let migrated = 0, failed = 0;
  
  for (const file of jsonFiles) {
    try {
      const content = await fs.readFile(path.join(__dirname, '../snapshots', file), 'utf8');
      const snapshot = JSON.parse(content);

      const { error } = await supabase
        .from('snapshots')
        .insert({
          snapshot_id: snapshot.id,
          name: snapshot.name,
          date: snapshot.date,
          week_number: snapshot.weekNumber,
          ira_stats: snapshot.iraStats,
          cc_stats: snapshot.ccStats
        });

      if (error) throw error;
      migrated++;
    } catch (error) {
      failed++;
      console.error(`Failed to migrate ${file}:`, error.message);
    }
  }

  return { migrated, failed, total: jsonFiles.length };
}

async function migrateBatchCorrections() {
  // Similar structure to migrateSnapshots but for batch corrections
  // Implementation depends on how your batch corrections are stored
}

async function migrateWeekConfigs() {
  // Migrate week configuration settings
  // Implementation depends on your current week config storage
}

module.exports = { migrateAllData };
