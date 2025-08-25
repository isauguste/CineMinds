const db = require('../config/db');

// Add a movie to user's favorites (supports DB + TMDB)
exports.addFavorite = async (req, res) => {
  try {
    const userId = req.user?.id;           // set by your auth middleware
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    // From client:
    // - DB movie:  { movieId: <local id>, source: 'db' }
    // - TMDB movie:{ movieId: <tmdb id>, source: 'tmdb', title, year, poster, genres[], trailerLink, review }
    const {
      movieId,
      source = 'db',
      rating = null,
      title,
      year,
      poster,
      genres,           
      trailerLink = '',
      review = '',
    } = req.body || {};

    if (!movieId) return res.status(400).json({ error: 'movieId is required' });

    let dbMovieId;

    if (source === 'tmdb') {
      const apiId = String(movieId);

      // Check if TMDB movie already exists in local catalog
      const [found] = await db.query(
        'SELECT id FROM movies WHERE api_movie_id = ? LIMIT 1',
        [apiId]
      );

      if (found.length) {
        dbMovieId = found[0].id;
      } else {
        // Insert minimal record using fields sent by client
        const genreStr = Array.isArray(genres) ? genres.join(', ') : (genres || '');
        const yr = Number.isFinite(parseInt(year, 10)) ? parseInt(year, 10) : null;

        const [ins] = await db.query(
          `INSERT INTO movies (title, year, genre, poster_url, rating, api_movie_id, trailer_url, review)
           VALUES (?, ?, ?, ?, NULL, ?, ?, ?)`,
          [title || 'Untitled', yr, genreStr, poster || '', apiId, trailerLink || '', review || '']
        );

        dbMovieId = ins.insertId;
      }
    } else {
      // Existing DB movie
      dbMovieId = parseInt(movieId, 10);
      if (isNaN(dbMovieId)) return res.status(400).json({ error: 'Invalid movieId' });
    }

    // Prevent duplicates
    const [existing] = await db.query(
      'SELECT 1 FROM favorites WHERE user_id = ? AND movie_id = ? LIMIT 1',
      [userId, dbMovieId]
    );
    if (existing.length) {
      return res.status(409).json({ error: 'Movie already in favorites' });
    }

    await db.query(
      'INSERT INTO favorites (user_id, movie_id, rating) VALUES (?, ?, ?)',
      [userId, dbMovieId, rating]
    );

    res.json({ message: 'Favorite added successfully', movieId: dbMovieId });
  } catch (err) {
    console.error('[favorites.addFavorite] error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};


// Get user's favorite movies
exports.getFavorites = async (req, res) => {
  try {
    const userId = req.user.id;

    const sql = `
      SELECT
        f.movie_id,
        m.title,
        m.genre,
        m.poster_url,
        COALESCE(f.rating, 0) AS user_rating
      FROM favorites f
      JOIN movies m ON m.id = f.movie_id
      WHERE f.user_id = ?
      ORDER BY m.title ASC
    `;
    const [rows] = await db.execute(sql, [userId]);
    res.json(rows);
  } catch (err) {
    console.error('getFavorites error:', err);
    res.status(500).json({ error: 'Failed to load favorites' });
  }
};

// Updates user's from favorite movies 
exports.updateRating = async (req, res) => {
  try {
    const userId = req.user.id;
    const movieId = req.params.movieId;
    const { rating } = req.body;

    if (rating == null || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'rating must be 1–5' });
    }

    // Try update first
    const [upd] = await db.execute(
      `UPDATE favorites SET rating = ? WHERE user_id = ? AND movie_id = ?`,
      [rating, userId, movieId]
    );

    // If the movie isn’t in favorites, optionally insert it with a rating
    if (upd.affectedRows === 0) {
      await db.execute(
        `INSERT INTO favorites (user_id, movie_id, rating) VALUES (?, ?, ?)`,
        [userId, movieId, rating]
      );
    }

    return res.json({ movie_id: Number(movieId), user_rating: Number(rating) });
  } catch (err) {
    console.error('updateRating error:', err);
    res.status(500).json({ error: 'Failed to update rating' });
  }
};
// Remove a movie from favorites
exports.deleteFavorite = async (req, res) => {
  const userId = req.user.id;
  const { movieId } = req.params;

  try {
    await db.query(
      'DELETE FROM favorites WHERE user_id = ? AND movie_id = ?',
      [userId, movieId]
    );

    res.json({ message: 'Favorite removed successfully' });
  } catch (err) {
    console.error('Error deleting favorite:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

