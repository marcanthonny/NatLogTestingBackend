const express = require('express');
const router = express.Router();
const ToteForm = require('../models/ToteForm');
const auth = require('../middleware/auth');

// Submit tote form
router.post('/', auth, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized: user info missing' });
    }
    const { boxCondition, ...formData } = req.body;
    
    const toteForm = new ToteForm({
      boxCondition,
      ...formData,
      userId: req.user.id,
      userName: req.user.name || req.user.username,
      userRole: req.user.role,
      userBranch: req.user.branch
    });

    await toteForm.save();
    res.status(201).json({ message: 'Form submitted successfully', data: toteForm });
  } catch (error) {
    console.error('Error submitting tote form:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get tote forms with role-based filtering
router.get('/', auth, async (req, res) => {
  try {
    const { page = 1, limit = 10, boxCondition, branch } = req.query;
    const skip = (page - 1) * limit;

    let query = {};
    
    // Filter by box condition if specified
    if (boxCondition) {
      query.boxCondition = boxCondition;
    }

    // Role-based filtering
    if (req.user.role === 'admin') {
      // Admin can see all forms, but can filter by branch
      if (branch) {
        query.userBranch = branch;
      }
    } else if (req.user.role === 'branch') {
      // Branch users can only see forms from their branch
      query.userBranch = req.user.branch;
    }

    const forms = await ToteForm.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await ToteForm.countDocuments(query);
    const totalPages = Math.ceil(total / limit);

    res.json({
      data: forms,
      totalPages,
      currentPage: parseInt(page),
      total
    });
  } catch (error) {
    console.error('Error fetching tote forms:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get form by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const form = await ToteForm.findById(req.params.id);
    
    if (!form) {
      return res.status(404).json({ message: 'Form not found' });
    }

    // Check if user has permission to view this form
    if (req.user.role === 'branch' && form.userBranch !== req.user.branch) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(form);
  } catch (error) {
    console.error('Error fetching tote form:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update form
router.put('/:id', auth, async (req, res) => {
  try {
    const form = await ToteForm.findById(req.params.id);
    
    if (!form) {
      return res.status(404).json({ message: 'Form not found' });
    }

    // Check if user has permission to edit this form
    if (req.user.role === 'branch' && form.userBranch !== req.user.branch) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const updatedForm = await ToteForm.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    res.json(updatedForm);
  } catch (error) {
    console.error('Error updating tote form:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete form
router.delete('/:id', auth, async (req, res) => {
  try {
    const form = await ToteForm.findById(req.params.id);
    
    if (!form) {
      return res.status(404).json({ message: 'Form not found' });
    }

    // Check if user has permission to delete this form
    if (req.user.role === 'branch' && form.userBranch !== req.user.branch) {
      return res.status(403).json({ message: 'Access denied' });
    }

    await ToteForm.findByIdAndDelete(req.params.id);
    res.json({ message: 'Form deleted successfully' });
  } catch (error) {
    console.error('Error deleting tote form:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 