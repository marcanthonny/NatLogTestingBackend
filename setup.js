/**
 * Setup script for the Excel Automation project
 * This creates necessary folders and initializes configuration files
 */
const fs = require('fs');
const path = require('path');

console.log('Setting up backend folders and files...');

// Create snapshots directory
const snapshotsDir = path.join(__dirname, 'snapshots');
if (!fs.existsSync(snapshotsDir)) {
  console.log('Creating snapshots directory...');
  fs.mkdirSync(snapshotsDir, { recursive: true });
}

// Create snapshots index file
const indexPath = path.join(snapshotsDir, 'index.json');
if (!fs.existsSync(indexPath)) {
  console.log('Creating snapshots index file...');
  fs.writeFileSync(indexPath, JSON.stringify([]));
}

console.log('Setup complete! The following directories and files were created:');
console.log(`- ${snapshotsDir} (for storing snapshot data)`);
console.log(`- ${indexPath} (index of all snapshots)`);
console.log('\nYou can now run the application with "npm start"');
