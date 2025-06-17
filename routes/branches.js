const express = require('express');
const router = express.Router();
const Branch = require('../models/Branch');
const User = require('../models/User');

// Middleware to check if user is admin
const isAdmin = async (req, res, next) => {
  try {
    const user = await User.findById(req.user?.userId);
    if (user?.role === 'admin') {
      next();
    } else {
      res.status(403).json({ error: 'Admin access required' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Authorization check failed' });
  }
};

// Get all branches
router.get('/', async (req, res) => {
  try {
    console.log('[Branches] Fetching all branches');
    const branches = await Branch.find({}).lean();
    console.log('[Branches] Found branches:', branches.length);
    res.json(branches);
  } catch (error) {
    console.error('[Branches] Error fetching branches:', error);
    res.status(500).json({ error: 'Failed to fetch branches' });
  }
});

// Get active branches only
router.get('/active', async (req, res) => {
  try {
    console.log('[Branches] Fetching active branches');
    const branches = await Branch.find({ active: true }).lean();
    console.log('[Branches] Found active branches:', branches.length);
    res.json(branches);
  } catch (error) {
    console.error('[Branches] Error fetching active branches:', error);
    res.status(500).json({ error: 'Failed to fetch active branches' });
  }
});

// Get branch by ID
router.get('/:id', async (req, res) => {
  try {
    const branch = await Branch.findById(req.params.id).lean();
    if (!branch) {
      return res.status(404).json({ error: 'Branch not found' });
    }
    res.json(branch);
  } catch (error) {
    console.error('[Branches] Error fetching branch:', error);
    res.status(500).json({ error: 'Failed to fetch branch' });
  }
});

// Create new branch (admin only)
router.post('/', isAdmin, async (req, res) => {
  try {
    const { code, name, active = true } = req.body;
    
    if (!code || !name) {
      return res.status(400).json({ error: 'Branch code and name are required' });
    }

    const branch = new Branch({ code, name, active });
    await branch.save();
    res.status(201).json({ message: 'Branch created successfully', branch });
  } catch (error) {
    console.error('[Branches] Create branch error:', error);
    if (error.code === 11000) {
      res.status(400).json({ error: 'Branch code already exists' });
    } else {
      res.status(400).json({ error: error.message });
    }
  }
});

// Update branch (admin only)
router.put('/:id', isAdmin, async (req, res) => {
  try {
    const { code, name, active } = req.body;
    const updateData = {};
    
    if (code !== undefined) updateData.code = code;
    if (name !== undefined) updateData.name = name;
    if (active !== undefined) updateData.active = active;

    const branch = await Branch.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );

    if (!branch) {
      return res.status(404).json({ error: 'Branch not found' });
    }

    res.json({ message: 'Branch updated successfully', branch });
  } catch (error) {
    console.error('[Branches] Update branch error:', error);
    if (error.code === 11000) {
      res.status(400).json({ error: 'Branch code already exists' });
    } else {
      res.status(400).json({ error: error.message });
    }
  }
});

// Delete branch (admin only)
router.delete('/:id', isAdmin, async (req, res) => {
  try {
    // Check if any users are assigned to this branch
    const usersWithBranch = await User.find({ branch: req.params.id });
    if (usersWithBranch.length > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete branch. Users are still assigned to this branch.',
        userCount: usersWithBranch.length
      });
    }

    const branch = await Branch.findByIdAndDelete(req.params.id);
    if (!branch) {
      return res.status(404).json({ error: 'Branch not found' });
    }

    res.json({ message: 'Branch deleted successfully' });
  } catch (error) {
    console.error('[Branches] Delete branch error:', error);
    res.status(400).json({ error: error.message });
  }
});

// Initialize default branches (admin only)
router.post('/initialize', isAdmin, async (req, res) => {
  try {
    await Branch.initializeBranches();
    res.json({ message: 'Default branches initialized successfully' });
  } catch (error) {
    console.error('[Branches] Initialize branches error:', error);
    res.status(500).json({ error: 'Failed to initialize branches' });
  }
});

module.exports = router; 