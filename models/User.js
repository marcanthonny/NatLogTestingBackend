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
    enum: ['admin', 'user'],
    default: 'user'
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

// Fix password comparison method
userSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    console.log('[Auth] Password comparison debug:', {
      candidatePassword,
      storedPassword: this.password,
      isHashed: this.password.startsWith('$2')
    });

    // Temporary: direct comparison if password is not hashed
    if (!this.password.startsWith('$2')) {
      const isMatch = candidatePassword === this.password;
      console.log('[Auth] Using direct password comparison:', isMatch);
      return isMatch;
    }

    const isMatch = await bcrypt.compare(candidatePassword, this.password);
    console.log('[Auth] Bcrypt password comparison:', isMatch);
    return isMatch;
  } catch (error) {
    console.error('[Auth] Password comparison error:', error);
    throw new Error('Password comparison failed');
  }
};

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

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

module.exports = mongoose.model('User', userSchema);
