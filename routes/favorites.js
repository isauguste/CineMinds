const express = require('express');
const router = express.Router();
const favoritesController = require('../controllers/favoritesController');
const { authenticateToken } = require('../utils/authMiddleware');

// Add a favorite
router.post('/', authenticateToken, favoritesController.addFavorite);

// Get all favorites for the logged-in user
router.get('/', authenticateToken, favoritesController.getFavorites);

// Delete a favorite by movie ID
router.delete('/:movieId', authenticateToken, favoritesController.deleteFavorite);

module.exports = router;


