const express = require('express');
const router = express.Router();
const managerController = require('../controllers/managerController');

// Import middleware
const { requireManager } = require('../utils/authMiddleware');

// GET all mappings (Manager only)
router.get('/mappings', requireManager, managerController.getMappings);

// POST new mapping (Manager only)
router.post('/mappings', requireManager, managerController.addMapping);

// DELETE a mapping (Manager only)
router.delete('/mappings/:id', requireManager, managerController.deleteMapping);

// POST to feature a mood (Manager only)
router.post('/featured-mood', requireManager, managerController.pinFeaturedMood);

module.exports = router;

