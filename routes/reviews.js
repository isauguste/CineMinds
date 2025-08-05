const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewsController');
const { authenticateToken, requireManager } = require('../utils/authMiddleware');

// GET all pending reviews (Manager only)
router.get('/pending', authenticateToken, requireManager, reviewController.getPendingReviews);

module.exports = router;

