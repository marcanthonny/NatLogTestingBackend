const express = require('express');
const router = express.Router();
const Role = require('../models/Role');
const { isAdmin } = require('../middleware/auth');

// Get all roles
router.get('/', async (req, res) => {
  try {
    const roles = await Role.find().sort('name');
    res.json(roles);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single role
router.get('/:name', async (req, res) => {
  try {
    const role = await Role.findOne({ name: req.params.name });
    if (!role) {
      return res.status(404).json({ error: 'Role not found' });
    }
    res.json(role);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new role (admin only)
router.post('/', isAdmin, async (req, res) => {
  try {
    const { name, description, permissions } = req.body;
    const role = new Role({ name, description, permissions });
    await role.save();
    res.status(201).json(role);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update role (admin only)
router.put('/:name', isAdmin, async (req, res) => {
  try {
    const { description, permissions } = req.body;
    const role = await Role.findOneAndUpdate(
      { name: req.params.name },
      { description, permissions, updatedAt: Date.now() },
      { new: true }
    );
    if (!role) {
      return res.status(404).json({ error: 'Role not found' });
    }
    res.json(role);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete role (admin only)
router.delete('/:name', isAdmin, async (req, res) => {
  try {
    const role = await Role.findOneAndDelete({ name: req.params.name });
    if (!role) {
      return res.status(404).json({ error: 'Role not found' });
    }
    res.json({ message: 'Role deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
