const express = require('express');
const router = express.Router();
const Role = require('../models/Role');

// Get all roles - cached and optimized
router.get('/', async (req, res) => {
  try {
    const roles = await Role.find()
      .select('name description permissions')
      .lean()
      .exec();
    
    res.set('Cache-Control', 'private, max-age=300');
    res.json(roles);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch roles' });
  }
});

// Get single role - with caching
router.get('/:name', async (req, res) => {
  try {
    const role = await Role.findOne({ name: req.params.name })
      .lean()
      .exec();
    
    if (!role) return res.status(404).json({ error: 'Role not found' });
    
    res.set('Cache-Control', 'private, max-age=300');
    res.json(role);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch role' });
  }
});

module.exports = router;
