const Customer = require('../models/Customer');
const XLSX = require('xlsx');
const fs = require('fs');

// Import customers from Excel file
exports.importCustomers = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    const workbook = XLSX.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet);

    let imported = 0;
    for (const row of data) {
      if (!row['No Cust'] || !row['Name']) continue;
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
          telephone: row['Telephone'] || ''
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