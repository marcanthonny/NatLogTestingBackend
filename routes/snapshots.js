const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();
const { createExcelWorkbook } = require('../utils/excelExporter');
const { generateEmailContent } = require('../utils/emailGenerator');
const ExcelJS = require('exceljs');
const nodemailer = require('nodemailer');
const { processFileData } = require('../utils/fileProcessor');
const { exportToExcel } = require('../utils/excelExporter');

// List of valid branches
const VALID_BRANCHES = [
  '1982 - PT. APL JAYAPURA',
  '1981 - PT. APL KUPANG',
  '1980 - PT. APL DENPASAR',
  '1972 - PT. APL PONTIANAK',
  '1971 - PT. APL SAMARINDA',
  '1970 - PT. APL BANJARMASIN',
  '1962 - PT. APL PALU',
  '1961 - PT. APL MAKASSAR',
  '1957 - PT. APL BANDAR LAMPUNG',
  '1956 - PT. APL PALEMBANG',
  '1955 - PT. APL JAMBI',
  '1954 - PT. APL BATAM',
  '1953 - PT. APL PEKANBARU',
  '1952 - PT. APL PADANG',
  '1951 - PT. APL MEDAN',
  '1940 - PT. APL SURABAYA',
  '1932 - PT. APL YOGYAKARTA',
  '1930 - PT. APL SEMARANG',
  '1922 - PT. APL BANDUNG',
  '1921 - PT. APL TANGERANG',
  '1920 - PT. APL BOGOR',
  '1910 - PT. APL JAKARTA 1',
  '1960 - PT. APL MANADO'
];

// Middleware to ensure snapshots directory exists
router.use((req, res, next) => {
  const snapshotsDir = path.join(__dirname, '../snapshots');
  const indexPath = path.join(snapshotsDir, 'index.json');
  
  try {
    if (!fs.existsSync(snapshotsDir)) {
      fs.mkdirSync(snapshotsDir, { recursive: true });
    }
    if (!fs.existsSync(indexPath)) {
      fs.writeFileSync(indexPath, '[]', 'utf8');
    }
    req.snapshotsDir = snapshotsDir;
    req.indexPath = indexPath;
    next();
  } catch (error) {
    next(error);
  }
});

// Test endpoint to check if the router is correctly mounted
router.get('/test', (req, res) => {
  res.json({ status: 'Snapshots API is working' });
});

// Update the GET route to handle no data case
router.get('/', (req, res) => {
  try {
    const indexPath = req.indexPath;
    console.log('Reading snapshots from:', indexPath);
    
    if (!fs.existsSync(indexPath)) {
      console.log('Index file not found, creating new one');
      fs.writeFileSync(indexPath, JSON.stringify([]));
      return res.json([]);
    }
    
    const content = fs.readFileSync(indexPath, 'utf8');
    if (!content.trim()) {
      console.log('Empty index file, returning empty array');
      return res.json([]);
    }
    
    const snapshots = JSON.parse(content);
    console.log(`Found ${snapshots.length} snapshots`);
    res.json(snapshots);
  } catch (error) {
    console.error('Error retrieving snapshots:', error);
    res.status(500).json({ 
      error: 'Failed to retrieve snapshots', 
      details: error.message 
    });
  }
});

// Get a specific snapshot by ID
router.get('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const snapshotPath = path.join(req.snapshotsDir, `${id}.json`);
    
    console.log(`Fetching snapshot with ID: ${id}`);
    console.log(`Looking for file at: ${snapshotPath}`);
    
    if (!fs.existsSync(snapshotPath)) {
      console.log(`Snapshot file not found: ${snapshotPath}`);
      return res.status(404).json({ error: 'Snapshot not found' });
    }
    
    const snapshot = JSON.parse(fs.readFileSync(snapshotPath, 'utf8'));
    res.json(snapshot);
  } catch (error) {
    console.error('Error retrieving snapshot:', error);
    res.status(500).json({ error: 'Failed to retrieve snapshot', details: error.message });
  }
});

// Save new snapshot
router.post('/', (req, res) => {
  try {
    console.log('Received POST request to save snapshot');
    
    // Validate request body
    if (!req.body) {
      console.error('Empty request body received');
      return res.status(400).json({ error: 'Request body is empty' });
    }

    const snapshot = req.body;
    console.log('Processing snapshot:', {
      name: snapshot.name,
      date: snapshot.date,
      hasIraStats: !!snapshot.iraStats,
      hasCcStats: !!snapshot.ccStats
    });

    // Generate ID if not provided
    const snapshotId = snapshot.id || Date.now().toString();
    
    // Ensure we have the snapshots directory path
    if (!req.snapshotsDir) {
      console.error('Snapshots directory not set in middleware');
      throw new Error('Server configuration error: snapshots directory not set');
    }

    // Log the full path we're trying to save to
    const snapshotPath = path.join(req.snapshotsDir, `${snapshotId}.json`);
    console.log('Attempting to save snapshot to:', snapshotPath);

    // Ensure directory exists
    if (!fs.existsSync(req.snapshotsDir)) {
      console.log('Creating snapshots directory:', req.snapshotsDir);
      fs.mkdirSync(req.snapshotsDir, { recursive: true });
    }

    // Save the full snapshot with formatting for readability
    fs.writeFileSync(snapshotPath, JSON.stringify(snapshot, null, 2));
    console.log('Successfully wrote snapshot file');

    // Update the index
    const indexPath = path.join(req.snapshotsDir, 'index.json');
    console.log('Reading index from:', indexPath);
    
    let index = [];
    if (fs.existsSync(indexPath)) {
      index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
    }

    const indexEntry = {
      id: snapshotId,
      name: snapshot.name,
      date: snapshot.date,
      iraPercentage: snapshot.iraStats?.percentage || 0,
      ccPercentage: snapshot.ccStats?.percentage || 0
    };

    // Update or add to index
    const existingIndex = index.findIndex(s => s.id === snapshotId);
    if (existingIndex >= 0) {
      index[existingIndex] = indexEntry;
    } else {
      index.push(indexEntry);
    }

    // Save updated index
    fs.writeFileSync(indexPath, JSON.stringify(index, null, 2));
    console.log('Successfully updated index file');

    // Send success response
    res.status(201).json({
      message: 'Snapshot saved successfully',
      id: snapshotId,
      savedTo: snapshotPath
    });
  } catch (error) {
    console.error('Error saving snapshot:', error);
    res.status(500).json({
      error: 'Failed to save snapshot',
      details: error.message,
      stack: error.stack
    });
  }
});

// Delete a snapshot
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const snapshotPath = path.join(req.snapshotsDir, `${id}.json`);
    
    // Check if snapshot exists
    if (!fs.existsSync(snapshotPath)) {
      return res.status(404).json({ error: 'Snapshot not found' });
    }
    
    // Delete the snapshot file
    fs.unlinkSync(snapshotPath);
    
    // Update the snapshots index
    if (fs.existsSync(req.indexPath)) {
      let snapshots = JSON.parse(fs.readFileSync(req.indexPath, 'utf8'));
      snapshots = snapshots.filter(snapshot => snapshot.id !== id);
      fs.writeFileSync(req.indexPath, JSON.stringify(snapshots, null, 2), 'utf8');
    }
    
    res.json({ message: 'Snapshot deleted successfully' });
  } catch (error) {
    console.error('Error deleting snapshot:', error);
    res.status(500).json({ error: 'Failed to delete snapshot', details: error.message });
  }
});

// Add route to export all snapshots as JSON
router.get('/export', (req, res) => {
  try {
    const indexPath = req.indexPath;
    const snapshots = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
    
    // Get all snapshot details
    const allSnapshotDetails = [];
    
    for (const snapshot of snapshots) {
      const snapshotPath = path.join(req.snapshotsDir, `${snapshot.id}.json`);
      if (fs.existsSync(snapshotPath)) {
        const snapshotData = JSON.parse(fs.readFileSync(snapshotPath, 'utf8'));
        allSnapshotDetails.push(snapshotData);
      }
    }
    
    res.setHeader('Content-Disposition', 'attachment; filename="snapshots-backup.json"');
    res.setHeader('Content-Type', 'application/json');
    res.json(allSnapshotDetails);
  } catch (error) {
    console.error('Error exporting snapshots:', error);
    res.status(500).json({ error: 'Failed to export snapshots', details: error.message });
  }
});

// Helper function to get snapshot by ID
const getSnapshot = (id, snapshotsDir) => {
  return new Promise((resolve, reject) => {
    try {
      const snapshotPath = path.join(snapshotsDir, `${id}.json`);
      
      if (!fs.existsSync(snapshotPath)) {
        throw new Error('Snapshot not found');
      }
      
      const snapshot = JSON.parse(fs.readFileSync(snapshotPath, 'utf8'));
      resolve(snapshot);
    } catch (error) {
      reject(error);
    }
  });
};

// Export snapshot to styled Excel
router.get('/export/:id', async (req, res) => {
  try {
    const snapshot = await getSnapshot(req.params.id, req.snapshotsDir);
    const workbook = await exportToExcel(snapshot);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="snapshot-${req.params.id}.xlsx"`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create Outlook email draft with custom template
router.post('/email-draft', async (req, res) => {
  try {
    const { snapshotId } = req.body;
    const snapshot = await getSnapshot(snapshotId, req.snapshotsDir);
    const templatePath = path.join(__dirname, '../../email-template.json');
    
    if (!fs.existsSync(templatePath)) {
      throw new Error('Email template not found');
    }
    
    const template = JSON.parse(fs.readFileSync(templatePath, 'utf8'));
    const emailContent = generateEmailContent(snapshot, template);
    const emailUrl = `https://outlook.office.com/mail/deeplink/compose?subject=${encodeURIComponent(template.subject)}&body=${encodeURIComponent(emailContent)}`;
    
    res.json({ 
      message: 'Email draft created successfully', 
      emailUrl,
      preview: emailContent 
    });
  } catch (error) {
    console.error('Error creating email draft:', error);
    res.status(500).json({ 
      error: 'Failed to create email draft', 
      details: error.message 
    });
  }
});

// Upload file and process data
router.post('/upload', async (req, res) => {
  try {
    const { fileData, fileName, fileType, category } = req.body;
    const processedData = processFileData(fileData, fileName, fileType, category);
    res.json(processedData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
