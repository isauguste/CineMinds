// routes/movies.js
const express = require('express');
const router = express.Router();
const { sendRPC } = require('../mq/mqClient');

// GET /api/movies
router.get('/:id', async (req, res) => {
   const { id: movieId } = req.params;

  try {
    const response = await sendRPC('get_movies_queue', {
      type: 'fetch_movie_by_id',
      movieId: movieId,
    });

    if (!response || !response.movie) {
      return res.status(404).json({ error: 'Movie not found from MQ' });
    }

    res.json(response.movie);
  } catch (error) {
    console.error('[ROUTE ERROR]', error);
    res.status(500).json({ error: 'Failed to fetch movie details' });
  }
});

module.exports = router;

