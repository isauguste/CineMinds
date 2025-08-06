const express = require('express');
const router = express.Router();
const favoritesController = require('../controllers/favoritesController');
const { authenticateToken } = require('../utils/authMiddleware');

router.post('/', authenticateToken, favoritesController.saveToFavorites);

module.exports = router;

