const express = require('express');
const router = express.Router();
const { getMoods, analyzeMood } = require('../controllers/moodController');

router.get('/moods', getMoods);
router.post('/analyzeMood', analyzeMood);

module.exports = router;

