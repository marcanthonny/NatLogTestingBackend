const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const BatchCorrectionForm = require('../models/BatchCorrectionForm');

// Apply auth middleware to all routes
router.use(auth);

// Get all forms (with pagination and sorting)
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const sortBy = req.query.sortBy || 'createdAt';
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;

    const forms = await BatchCorrectionForm.find()
      .sort({ [sortBy]: sortOrder })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await BatchCorrectionForm.countDocuments();

    res.json({
      forms,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalForms: total
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get a single form by ID
router.get('/:id', async (req, res) => {
  try {
    const form = await BatchCorrectionForm.findById(req.params.id);
    if (!form) {
      return res.status(404).json({ error: 'Form not found' });
    }
    res.json(form);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create a new form
router.post('/', async (req, res) => {
  try {
    const form = new BatchCorrectionForm(req.body);
    await form.save();
    res.status(201).json(form);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update a form
router.put('/:id', async (req, res) => {
  try {
    const form = await BatchCorrectionForm.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!form) {
      return res.status(404).json({ error: 'Form not found' });
    }
    res.json(form);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete a form
router.delete('/:id', async (req, res) => {
  try {
    const form = await BatchCorrectionForm.findByIdAndDelete(req.params.id);
    if (!form) {
      return res.status(404).json({ error: 'Form not found' });
    }
    res.json({ message: 'Form deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router; 