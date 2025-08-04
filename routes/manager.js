const express = require('express');
const router = express.Router();
const managerController = require('../controllers/managerController');

// GET all mappings
router.get('/mappings', managerController.getMappings);

// POST new mapping
router.post('/mappings', managerController.addMapping);

// DELETE a mapping
router.delete('/mappings/:id', managerController.deleteMapping);

module.exports = router;
