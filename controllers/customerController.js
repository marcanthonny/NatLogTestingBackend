const XLSX = require('xlsx');
const fs = require('fs');
const Customer = require('../models/Customer');

exports.importCustomers = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    const workbook = XLSX.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet);

    // Load all branches and create a name->_id map (case-insensitive)
    const Branch = require('../models/Branch');
    const branches = await Branch.find({});
    const branchNameToId = {};
    branches.forEach(b => {
      branchNameToId[b.name.trim().toLowerCase()] = b._id;
    });

    let imported = 0;
    for (const row of data) {
      if (!row['No Cust'] || !row['Name']) continue;
      let branchId = null;
      // Accept multiple possible column names for branch
      let branchValue = row['Branch'] || row['BRANCH'] || row['Cabang'] || row['KODE CABANG'];
      if (branchValue) {
        const branchName = String(branchValue).trim().toLowerCase();
        branchId = branchNameToId[branchName] || null;
      }
      await Customer.findOneAndUpdate(
        { customerNumber: String(row['No Cust']) },
        {
          customerNumber: String(row['No Cust']),
          name: row['Name'],
          street: row['Street'] || '',
          city: row['City'] || '',
          region: row['Region'] || '',
          postalCode: row['Postal code'] || '',
          country: row['Country'] || '',
          telephone: row['Telephone'] || '',
          branch: branchId
        },
        { upsert: true, new: true }
      );
      imported++;
    }
    // Remove uploaded file
    fs.unlinkSync(req.file.path);
    res.json({ message: `Imported ${imported} customers.` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to import customers' });
  }
};

exports.searchCustomers = async (req, res) => {
  try {
    const { branchId, query } = req.query;
    if (!branchId) return res.status(400).json({ error: 'Branch is required' });

    // Search by name or customerNumber, and filter by branch
    const customers = await Customer.find({
      branch: branchId,
      $or: [
        { name: new RegExp(query, 'i') },
        { customerNumber: new RegExp(query, 'i') }
      ]
    }).limit(20);

    res.json(customers);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch customers' });
  }
};