const Customer = require('../models/Customer');
const XLSX = require('xlsx');
const fs = require('fs');

// Import customers from Excel file
exports.importCustomers = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    console.log('[Customer Import] Starting import process...');
    const startTime = Date.now();

    const workbook = XLSX.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet);

    console.log(`[Customer Import] Found ${data.length} rows in Excel file`);

    // Filter valid rows and prepare bulk operations
    const validCustomers = [];
    const customerNumbers = new Set();

    for (const row of data) {
      if (!row['No Cust'] || !row['Name']) continue;
      
      const customerNumber = String(row['No Cust']);
      
      // Skip duplicates in the same file
      if (customerNumbers.has(customerNumber)) continue;
      customerNumbers.add(customerNumber);

      validCustomers.push({
        customerNumber,
        name: row['Name'],
        street: row['Street'] || '',
        city: row['City'] || '',
        region: row['Region'] || '',
        postalCode: row['Postal code'] || '',
        country: row['Country'] || '',
        telephone: row['Telephone'] || ''
      });
    }

    console.log(`[Customer Import] Processing ${validCustomers.length} valid customers`);

    // Use bulk operations for better performance
    let imported = 0;
    const batchSize = 100; // Process in batches of 100

    for (let i = 0; i < validCustomers.length; i += batchSize) {
      const batch = validCustomers.slice(i, i + batchSize);
      
      // Use bulkWrite for better performance
      const bulkOps = batch.map(customer => ({
        updateOne: {
          filter: { customerNumber: customer.customerNumber },
          update: { $set: customer },
          upsert: true
        }
      }));

      const result = await Customer.bulkWrite(bulkOps);
      imported += result.upsertedCount + result.modifiedCount;
      
      console.log(`[Customer Import] Processed batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(validCustomers.length/batchSize)}`);
    }

    // Remove uploaded file
    try {
      fs.unlinkSync(req.file.path);
    } catch (unlinkError) {
      console.warn('[Customer Import] Could not delete uploaded file:', unlinkError.message);
    }

    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;

    console.log(`[Customer Import] Completed in ${duration}s. Imported ${imported} customers.`);

    res.json({ 
      message: `Imported ${imported} customers successfully in ${duration.toFixed(2)} seconds.`,
      imported,
      duration: duration.toFixed(2),
      totalRows: data.length,
      validRows: validCustomers.length
    });
  } catch (error) {
    console.error('[Customer Import] Error:', error);
    
    // Clean up uploaded file on error
    if (req.file && req.file.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (unlinkError) {
        console.warn('[Customer Import] Could not delete uploaded file on error:', unlinkError.message);
      }
    }

    res.status(500).json({ 
      error: 'Failed to import customers',
      details: error.message 
    });
  }
};

// Search customers for autocomplete
exports.searchCustomers = async (req, res) => {
  try {
    const search = req.query.search || '';
    const customers = await Customer.find({
      name: { $regex: search, $options: 'i' }
    })
      .limit(20)
      .select('customerNumber name city region country');
    res.json(customers);
  } catch (error) {
    res.status(500).json({ error: 'Failed to search customers' });
  }
};

// Update customer
exports.updateCustomer = async (req, res) => {
  try {
    const id = req.params.id;
    const update = req.body;
    // Try by _id first, then by customerNumber
    let customer = await Customer.findByIdAndUpdate(id, update, { new: true });
    if (!customer) {
      customer = await Customer.findOneAndUpdate({ customerNumber: id }, update, { new: true });
    }
    if (!customer) return res.status(404).json({ error: 'Customer not found' });
    res.json(customer);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update customer' });
  }
};

// Delete customer
exports.deleteCustomer = async (req, res) => {
  try {
    const id = req.params.id;
    // Try by _id first, then by customerNumber
    let customer = await Customer.findByIdAndDelete(id);
    if (!customer) {
      customer = await Customer.findOneAndDelete({ customerNumber: id });
    }
    if (!customer) return res.status(404).json({ error: 'Customer not found' });
    res.json({ message: 'Customer deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete customer' });
  }
}; 