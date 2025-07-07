const express = require('express');
const router = express.Router();
const db = require('../config/db'); 

// POST /api/analyzeMood
router.post('/analyzeMood', async (req, res) => {
  const { moodText } = req.body;

  if (!moodText) {
    return res.status(400).json({ error: 'Mood input is required' });
  }

  try {
    // Step 1: Find genre match from mood
    const [mappingRows] = await db.query(
      'SELECT genre FROM mood_genre_map WHERE mood = ? LIMIT 1',
      [moodText.toLowerCase()]
    );

    if (mappingRows.length === 0) {
      return res.status(404).json({ error: 'No genre found for that mood' });
    }

    const genre = mappingRows[0].genre;

    // Step 2: Get movies matching that genre
    const [movieRows] = await db.query(
      `SELECT * FROM movies WHERE genre LIKE ? LIMIT 10`,
      [`%${genre}%`]
    );

    // Step 3: Build response
    const movies = movieRows.map(movie => ({
      id: movie.id ?? null,
      title: movie.title ?? 'Untitled',
      year: movie.year ?? 'Unknown',
      genres: movie.genre ? movie.genre.split(',').map(g => g.trim()) : [],
      poster: movie.poster_url ?? '',
      trailerLink: movie.trailer_url ?? '',
      reviews: movie.review ? [movie.review] : [],
    }));

    res.json({ movies });
  } catch (err) {
    console.error('[MOOD ROUTE ERROR]', err);
    res.status(500).json({ error: 'Failed to analyze mood' });
  }
});

module.exports = router;

