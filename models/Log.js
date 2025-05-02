const mongoose = require('mongoose');

const logSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    enum: ['AUTH', 'DB', 'API', 'ERROR']
  },
  message: {
    type: String,
    required: true
  },
  level: {
    type: String,
    required: true,
    enum: ['INFO', 'WARNING', 'ERROR']
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Log', logSchema);
