const Customer = require('../models/Customer');
const XLSX = require('xlsx');
const fs = require('fs');
const mongoose = require('mongoose');

// Import customers from Excel file
exports.importCustomers = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Check file size (50MB limit)
    const maxFileSize = 50 * 1024 * 1024; // 50MB
    if (req.file.size > maxFileSize) {
      return res.status(400).json({ 
        error: 'File too large', 
        message: 'File size must be less than 50MB',
        maxSize: '50MB',
        actualSize: `${(req.file.size / 1024 / 1024).toFixed(2)}MB`
      });
    }

    console.log('[Customer Import] Starting import process...');
    const startTime = Date.now();

    // Check database connection
    if (mongoose.connection.readyState !== 1) {
      console.log('[Customer Import] Database not connected, attempting to connect...');
      await mongoose.connect(process.env.MONGODB_URL, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        serverSelectionTimeoutMS: 10000,
        socketTimeoutMS: 30000,
        keepAlive: true,
        maxPoolSize: 1,
        family: 4
      });
    }

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
    const batchSize = 25; // Smaller batch size for faster processing
    const totalBatches = Math.ceil(validCustomers.length / batchSize);
    const maxProcessingTime = 25000; // 25 seconds max processing time

    for (let i = 0; i < validCustomers.length; i += batchSize) {
      // Check if we're approaching timeout
      const elapsedTime = Date.now() - startTime;
      if (elapsedTime > maxProcessingTime) {
        console.log(`[Customer Import] Approaching timeout, stopping at ${imported} customers`);
        break;
      }

      const batch = validCustomers.slice(i, i + batchSize);
      const currentBatch = Math.floor(i/batchSize) + 1;
      
      try {
        // Use bulkWrite for better performance
        const bulkOps = batch.map(customer => ({
          updateOne: {
            filter: { customerNumber: customer.customerNumber },
            update: { $set: customer },
            upsert: true
          }
        }));

        const result = await Customer.bulkWrite(bulkOps, { 
          ordered: false, // Allow unordered operations for better performance
          w: 1 // Write concern for better performance
        });
        
        imported += result.upsertedCount + result.modifiedCount;
        
        console.log(`[Customer Import] Processed batch ${currentBatch}/${totalBatches} - Imported: ${imported}`);
        
        // Remove delay to speed up processing
        // if (currentBatch < totalBatches) {
        //   await new Promise(resolve => setTimeout(resolve, 100));
        // }
        
      } catch (batchError) {
        console.error(`[Customer Import] Error in batch ${currentBatch}:`, batchError.message);
        // Continue with next batch instead of failing completely
        continue;
      }
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

    // Check if we processed all customers or hit timeout
    const processedAll = imported === validCustomers.length;
    const message = processedAll 
      ? `Imported ${imported} customers successfully in ${duration.toFixed(2)} seconds.`
      : `Imported ${imported} out of ${validCustomers.length} customers in ${duration.toFixed(2)} seconds. File was too large for complete processing.`;

    res.json({ 
      message,
      imported,
      totalProcessed: validCustomers.length,
      duration: duration.toFixed(2),
      totalRows: data.length,
      validRows: validCustomers.length,
      complete: processedAll
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
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // Build query
    const query = search ? { name: { $regex: search, $options: 'i' } } : {};

    // Get total count for pagination
    const total = await Customer.countDocuments(query);

    // Get customers with pagination
    const customers = await Customer.find(query)
      .skip(skip)
      .limit(limit)
      .select('customerNumber name city region country street postalCode telephone')
      .sort({ name: 1 }); // Sort by name alphabetically

    res.json({
      customers,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('[Customer Search] Error:', error);
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