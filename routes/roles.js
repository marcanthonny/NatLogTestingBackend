const express = require('express');
const router = express.Router();
const Role = require('../models/Role');
const authMiddleware = require('../middleware/auth').authMiddleware;
const { AVAILABLE_SITES } = require('../config/roles');

// Get all roles
router.get('/', async (req, res) => {
  try {
    console.log('[Roles] Fetching all roles');
    const roles = await Role.find().lean();
    res.json(roles);
  } catch (error) {
    console.error('[Roles] Error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch roles',
      details: error.message 
    });
  }
});

// Get single role by name
router.get('/:name', async (req, res, next) => {
  try {
    if (!req.user) {
      return authMiddleware(req, res, next);
    }

    console.log('[Roles] GET /:name - Fetching role:', req.params.name);
    const role = await Role.findOne({ name: req.params.name });
    if (!role) return res.status(404).json({ error: 'Role not found' });
    res.json(role);
  } catch (error) {
    console.error('[Roles] Error fetching role:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create new role 
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { name, description, permissions, allowedSites, isCustom } = req.body;
    if (!name) return res.status(400).json({ error: 'Role name is required' });

    // Validate sites
    if (allowedSites) {
      const invalidSites = allowedSites.filter(site => !AVAILABLE_SITES.includes(site));
      if (invalidSites.length > 0) {
        return res.status(400).json({ error: `Invalid sites: ${invalidSites.join(', ')}` });
      }
    }

    const role = new Role({
      name,
      description,
      permissions: permissions || [],
      allowedSites: allowedSites || [],
      isCustom
    });

    await role.save();
    res.status(201).json(role);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update role - change :id to :name
router.put('/:name', authMiddleware, async (req, res) => {
  try {
    console.log('[Roles] PUT /:name - Updating role:', req.params.name);
    const { description, permissions, allowedSites } = req.body;
    
    // Validate sites
    if (allowedSites) {
      const invalidSites = allowedSites.filter(site => !AVAILABLE_SITES.includes(site));
      if (invalidSites.length > 0) {
        return res.status(400).json({ error: `Invalid sites: ${invalidSites.join(', ')}` });
      }
    }

    const role = await Role.findOneAndUpdate(
      { name: req.params.name },
      { description, permissions, allowedSites },
      { new: true }
    );
    if (!role) return res.status(404).json({ error: 'Role not found' });
    console.log('[Roles] Updated role:', role);
    res.json(role);
  } catch (error) {
    console.error('[Roles] Error updating role:', error);
    res.status(500).json({ error: error.message }); 
  }
});

// Update delete route to use name instead of ID
router.delete('/:name', authMiddleware, async (req, res) => {
  try {
    const role = await Role.findOneAndDelete({ name: req.params.name });
    if (!role) return res.status(404).json({ error: 'Role not found' });
    res.json({ message: 'Role deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
