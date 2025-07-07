// routes/movies.js
const express = require('express');
const router = express.Router();
const { sendRPC } = require('../mq/mqClient');

// GET /api/movies
router.get('/', async (req, res) => {
  try {
    const response = await sendRPC('get_movies_queue', { type: 'fetch_movies' });

    if (!response || !Array.isArray(response.movies)) {
      return res.status(500).json({ error: 'Invalid response from MQ' });
    }

    res.json({ movies: response.movies });
  } catch (error) {
    console.error('[ROUTE ERROR]', error);
    res.status(500).json({ error: 'Failed to fetch movies' });
  }
});

module.exports = router;

