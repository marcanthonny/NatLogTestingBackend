const express = require('express');
const router = express.Router();
const accessControlController = require('../controllers/accessControlController');
const auth = require('../middleware/auth');

// Only allow admins to update access controls
router.get('/', auth, accessControlController.getAccessControls);
router.post('/', auth, accessControlController.updateAccessControls);

module.exports = router; 