const express = require('express');
const router = express.Router();
const moodController = require('../controllers/moodController');

router.get('/moods', moodController.getMoods);
router.post('/analyzeMood', moodController.analyzeMood);

module.exports = router;

