const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true
  },
  password: {
    type: String,
    required: true,
    select: false // Hide password by default
  },
  email: {
    type: String,
    required: function() {
      return this.role !== 'admin'; // Only required for non-admin users
    },
    unique: true,
    sparse: true, // Allow multiple null values (for admin)
    lowercase: true,
    trim: true
  },
  role: {
    type: String,
    enum: ['admin', 'user', 'viewer'],
    default: 'viewer'
  },
  active: {
    type: Boolean,
    default: true
  },
  lastLogin: Date,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Fix compound index syntax
userSchema.index({ username: 1, role: 1 });

// Simplify to a single pre-save hook for password hashing
userSchema.pre('save', async function(next) {
  // Only hash if password was modified
  if (!this.isModified('password')) return next();
  
  try {
    // Always hash password before saving
    this.password = await bcrypt.hash(this.password, 10);
    next();
  } catch (error) {
    next(error);
  }
});

// Fix password comparison method
userSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    console.error('[Auth] Password comparison error:', error);
    throw new Error('Password comparison failed');
  }
};

// Add static method to create user with hashed password
userSchema.statics.createUser = async function(userData) {
  try {
    const user = new this(userData);
    await user.save();
    return user;
  } catch (error) {
    if (error.code === 11000) {
      throw new Error('Username already exists');
    }
    throw error;
  }
};

// Static method to handle hashed updates
userSchema.statics.findByIdAndUpdateWithHash = async function(id, updateData) {
  if (updateData.password) {
    updateData.password = await bcrypt.hash(updateData.password, 10);
  }
  return this.findByIdAndUpdate(id, updateData, { new: true });
};

module.exports = mongoose.model('User', userSchema);
