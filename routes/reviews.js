const express = require('express');
const router = express.Router();
const { updateReview } = require('../controllers/reviewsController');
const reviewController = require('../controllers/reviewsController');
const { authenticateToken, requireManager } = require('../utils/authMiddleware');

// POST /api/reviews – submit a review
router.post('/', authenticateToken, reviewController.submitReview);

// GET /api/reviews/:movieId – fetch reviews for a movie
router.get('/:movieId', reviewController.getReviewsByMovieId);

// GET /api/reviews/pending – manager-only
router.get('/pending', authenticateToken, requireManager, reviewController.getPendingReviews);

router.patch('/:movieId', requireLogin, updateReview);

module.exports = router;

