const mongoose = require('mongoose');

const batchCorrectionSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true
  },
  doNumber: {
    type: String,
    required: true
  },
  materialCode: {
    type: String,
    required: true
  },
  quantity: {
    type: Number,
    required: true
  },
  materialDescription: {
    type: String,
    required: true
  },
  batchSystem: {
    type: String,
    required: true
  },
  physicalBatch: {
    type: String,
    required: true
  },
  expiredDateSystem: {
    type: Date,
    required: true
  },
  physicalExpiredDate: {
    type: Date,
    required: true
  },
  userPickerCode: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('BatchCorrection', batchCorrectionSchema);
