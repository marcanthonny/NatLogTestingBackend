const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  username: {
    type: String,
    required: true
  },
  role: {
    type: String,
    required: true
  },
  permissions: [{
    type: String
  }],
  loginTime: {
    type: Date,
    default: Date.now,
    required: true
  },
  lastActive: {
    type: Date,
    default: Date.now,
    required: true
  },
  expiresAt: {
    type: Date,
    default: () => new Date(+new Date() + 24*60*60*1000), // 24 hours from creation
    required: true
  }
});

// Index for performance and TTL
sessionSchema.index({ userId: 1 });
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // Auto-delete expired sessions

// Update lastActive timestamp on access
sessionSchema.methods.touch = async function() {
  this.lastActive = new Date();
  return this.save();
};

module.exports = mongoose.model('Session', sessionSchema);
