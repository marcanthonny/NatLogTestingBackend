const fs = require('fs').promises;
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function migrateSnapshots() {
  try {
    console.log('Starting snapshots migration to Supabase...');
    
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

        // Check if snapshot exists in Supabase
        const { data: existing, error: checkError } = await supabase
          .from('snapshots')
          .select('id')
          .eq('snapshot_id', snapshot.id)
          .single();

        if (checkError && !checkError.message.includes('No rows found')) {
          throw checkError;
        }

        if (!existing) {
          const { error: insertError } = await supabase
            .from('snapshots')
            .insert({
              snapshot_id: snapshot.id,
              name: snapshot.name,
              date: snapshot.date,
              week_number: snapshot.weekNumber,
              ira_stats: snapshot.iraStats,
              cc_stats: snapshot.ccStats
            });

          if (insertError) throw insertError;
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
