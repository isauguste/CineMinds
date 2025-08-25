const express = require('express');
const router = express.Router();
const moderationController = require('../controllers/moderationController');
const { authenticateToken, requireManager } = require('../utils/authMiddleware');

router.get('/reviews', authenticateToken, requireManager, moderationController.getReviews);
router.delete('/reviews/:id', authenticateToken, requireManager, moderationController.deleteReview);

module.exports = router;

