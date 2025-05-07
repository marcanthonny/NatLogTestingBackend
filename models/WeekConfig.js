const mongoose = require('mongoose');

const weekSchema = {
  target: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  startDate: {
    type: Date
  },
  endDate: {
    type: Date
  }
};

const weekConfigSchema = new mongoose.Schema({
  ira: {
    week1: weekSchema,
    week2: weekSchema,
    week3: weekSchema,
    week4: weekSchema
  },
  cc: {
    week1: weekSchema,
    week2: weekSchema,
    week3: weekSchema,
    week4: weekSchema
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('WeekConfig', weekConfigSchema);
