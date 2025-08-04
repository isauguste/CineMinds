const express = require('express');
const router = express.Router();
const moderationController = require('../controllers/moderationController');
const { requireManager } = require('../utils/authMiddleware');

router.get('/reviews', requireManager, moderationController.getReviews);
router.delete('/reviews/:id', requireManager, moderationController.deleteReview);

module.exports = router;

