const mongoose = require('mongoose');

const AccessControlSchema = new mongoose.Schema({
  globalAccess: { type: Boolean, default: false },
  allowedUsers: [{
    username: String,
    permissions: [String],
    hasPanelAccess: Boolean
  }],
  allowedRoles: [{
    role: String,
    permissions: [String],
    hasPanelAccess: Boolean
  }],
  allowedBranches: [{
    branch: String,
    permissions: [String],
    hasPanelAccess: Boolean
  }]
}, { timestamps: true });

module.exports = mongoose.model('AccessControl', AccessControlSchema); 