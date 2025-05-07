const mongoose = require('mongoose');

const roleSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  description: {
    type: String,
    required: true
  },
  permissions: [{
    type: String
  }],
  allowedSites: [{
    type: String,
    enum: ['admin', 'frontend', 'backend']
  }],
  isCustom: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

roleSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Add method to check site access
roleSchema.methods.canAccessSite = function(site) {
  return this.allowedSites.includes(site);
};

module.exports = mongoose.model('Role', roleSchema);
