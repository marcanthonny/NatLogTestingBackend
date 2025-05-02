const mongoose = require('mongoose');

const weekSchema = new mongoose.Schema({
  startDate: String,
  endDate: String,
  target: Number
});

const configSchema = new mongoose.Schema({
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
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('WeekConfig', configSchema);
