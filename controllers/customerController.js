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

    // Load all branches and create name/code -> _id maps (case-insensitive)
    const Branch = require('../models/Branch');
    const branches = await Branch.find({});
    const branchNameToId = {};
    const branchCodeToId = {};
    branches.forEach(b => {
      branchNameToId[b.name.trim().toLowerCase()] = b._id;
      if (b.code) branchCodeToId[b.code.trim().toLowerCase()] = b._id;
    });
    console.log('Branch names in DB:', Object.keys(branchNameToId));
    console.log('Branch codes in DB:', Object.keys(branchCodeToId));

    // Dynamically detect the branch column header
    const headers = Object.keys(data[0] || {});
    let detectedBranchHeader = headers.find(h => /branch|cabang/i.test(h));
    console.log('Detected branch header:', detectedBranchHeader);

    let imported = 0;
    for (const row of data) {
      if (!row['No Cust'] || !row['Name']) continue;
      let branchId = null;
      // Accept multiple possible column names for branch, or detected header
      let branchValue = row['Branch'] || row['BRANCH'] || row['Cabang'] || row['KODE CABANG'] || (detectedBranchHeader && row[detectedBranchHeader]);
      if (branchValue) {
        const branchKey = String(branchValue).trim().toLowerCase();
        branchId = branchNameToId[branchKey] || branchCodeToId[branchKey] || null;
        console.log(`Excel branch value: '${branchValue}' (key: '${branchKey}') -> branchId: ${branchId}`);
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
    const userRole = req.user?.role; // Get user role from auth middleware
    
    // Build search query
    let searchQuery = {
      $or: [
        { name: new RegExp(query || '', 'i') },
        { customerNumber: new RegExp(query || '', 'i') }
      ]
    };

    // If user is not admin, require branchId and filter by branch
    if (userRole !== 'admin') {
      if (!branchId) {
        return res.status(400).json({ error: 'Branch is required for non-admin users' });
      }
      searchQuery.branch = branchId;
    }
    // If user is admin and branchId is provided, filter by branch (optional)
    else if (branchId) {
      searchQuery.branch = branchId;
    }

    // Search customers with populated branch information
    const customers = await Customer.find(searchQuery)
      .populate('branch', 'code name')
      .limit(20);

    res.json(customers);
  } catch (err) {
    console.error('Search customers error:', err);
    res.status(500).json({ error: 'Failed to fetch customers' });
  }
};

exports.updateCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    const customer = await Customer.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );
    
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    
    res.json(customer);
  } catch (error) {
    console.error('Update customer error:', error);
    res.status(500).json({ error: 'Failed to update customer' });
  }
};

exports.deleteCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    
    const customer = await Customer.findByIdAndDelete(id);
    
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    
    res.json({ message: 'Customer deleted successfully' });
  } catch (error) {
    console.error('Delete customer error:', error);
    res.status(500).json({ error: 'Failed to delete customer' });
  }
};