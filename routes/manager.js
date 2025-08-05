const express = require('express');
const router = express.Router();
const managerController = require('../controllers/managerController');

// Import middleware
const { authenticateToken, requireManager } = require('../utils/authMiddleware');

// GET all mappings (Manager only)
router.get('/mappings', authenticateToken, requireManager, managerController.getMappings);

// POST new mapping (Manager only)
router.post('/mappings', authenticateToken, requireManager, managerController.createMapping);

// DELETE a mapping (Manager only)
router.delete('/mappings/:id', authenticateToken, requireManager, managerController.deleteMapping);

// POST to feature a mood (Manager only)
router.post('/featured-mood', authenticateToken, requireManager, managerController.pinFeaturedMood);

module.exports = router;

