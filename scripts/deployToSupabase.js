require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { execSync } = require('child_process');
const path = require('path');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function deployToSupabase() {
  try {
    console.log('🚀 Starting Supabase deployment...');

    // 1. Run database migrations
    console.log('Running migrations...');
    const migrationPath = path.join(__dirname, '../supabase/migrations');
    execSync(`supabase db push --db-url=${process.env.SUPABASE_DB_URL}`);

    // 2. Migrate existing data
    console.log('Migrating data...');
    const { error } = await migrateData();
    if (error) throw error;

    console.log('✅ Deployment completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Deployment failed:', error);
    process.exit(1);
  }
}

deployToSupabase();
