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
    default: () => new Date(Date.now() + 24*60*60*1000), // 24 hours from creation
    required: true,
    index: { expires: 0 } // MongoDB TTL index for automatic cleanup
  }
});

// Remove old indexes
sessionSchema.index({ userId: 1 });

// Simplify touch method
sessionSchema.methods.touch = async function() {
  this.lastActive = new Date();
  return this.save();
};

module.exports = mongoose.model('Session', sessionSchema);
