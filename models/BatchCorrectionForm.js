const mongoose = require('mongoose');

const batchCorrectionFormSchema = new mongoose.Schema({
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
  userPickerNumber: {
    type: String,
    required: true
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

// Update the updatedAt timestamp before saving
batchCorrectionFormSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('BatchCorrectionForm', batchCorrectionFormSchema, 'batchcorrections'); 