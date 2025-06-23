const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
  customerNumber: { type: String, required: true, unique: true }, // No Cust
  name: { type: String, required: true },
  street: { type: String },
  city: { type: String },
  region: { type: String },
  postalCode: { type: String },
  country: { type: String },
  telephone: { type: String },
  // Add more fields as needed
}, {
  timestamps: true
});

module.exports = mongoose.model('Customer', customerSchema); 