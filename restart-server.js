const { spawn } = require('child_process');
const path = require('path');

console.log('Starting server setup and restart...');

// Define paths
const BASE_DIR = path.join(__dirname);
const INDEX_PATH = path.join(BASE_DIR, 'index.js');

// Start the server
console.log('Starting Node.js server...');
console.log('Using index.js at:', INDEX_PATH);

const serverProcess = spawn('node', [INDEX_PATH], {
  stdio: 'inherit',
  shell: true,
  cwd: BASE_DIR
});

serverProcess.on('error', (error) => {
  console.error('Failed to start server:', error);
});

serverProcess.on('exit', (code, signal) => {
  if (code !== 0) {
    console.log(`Server process exited with code ${code} and signal ${signal}`);
  }
});

console.log(`Server should be running at http://localhost:5000/`);
console.log('Press Ctrl+C to stop the server');
