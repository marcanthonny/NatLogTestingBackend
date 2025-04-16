const mongoose = require('mongoose');

const branchPercentageSchema = new mongoose.Schema({
  branch: String,
  percentage: Number
});

const statsSchema = new mongoose.Schema({
  counted: Number,
  notCounted: Number,
  percentage: Number,
  branchPercentages: [branchPercentageSchema]
});

const snapshotSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: String,
  date: Date,
  weekNumber: Number,
  iraStats: statsSchema,
  ccStats: statsSchema,
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Snapshot', snapshotSchema);
