const mongoose = require('mongoose');

const branchSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  active: {
    type: Boolean,
    default: true
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

branchSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Static method to initialize default branches
branchSchema.statics.initializeBranches = async function() {
  const defaultBranches = [
    { code: '1982', name: 'PT. APL JAYAPURA' },
    { code: '1981', name: 'PT. APL KUPANG' },
    { code: '1980', name: 'PT. APL DENPASAR' },
    { code: '1972', name: 'PT. APL PONTIANAK' },
    { code: '1971', name: 'PT. APL SAMARINDA' },
    { code: '1970', name: 'PT. APL BANJARMASIN' },
    { code: '1962', name: 'PT. APL PALU' },
    { code: '1961', name: 'PT. APL MAKASSAR' },
    { code: '1957', name: 'PT. APL BANDAR LAMPUNG' },
    { code: '1956', name: 'PT. APL PALEMBANG' },
    { code: '1955', name: 'PT. APL JAMBI' },
    { code: '1954', name: 'PT. APL BATAM' },
    { code: '1953', name: 'PT. APL PEKANBARU' },
    { code: '1952', name: 'PT. APL PADANG' },
    { code: '1951', name: 'PT. APL MEDAN' },
    { code: '1940', name: 'PT. APL SURABAYA' },
    { code: '1932', name: 'PT. APL YOGYAKARTA' },
    { code: '1930', name: 'PT. APL SEMARANG' },
    { code: '1922', name: 'PT. APL BANDUNG' },
    { code: '1921', name: 'PT. APL TANGERANG' },
    { code: '1920', name: 'PT. APL BOGOR' },
    { code: '1910', name: 'PT. APL JAKARTA 1' },
    { code: '1960', name: 'PT. APL MANADO' }
  ];

  for (const branch of defaultBranches) {
    await this.findOneAndUpdate(
      { code: branch.code },
      branch,
      { upsert: true, new: true }
    );
  }
};

module.exports = mongoose.model('Branch', branchSchema); 