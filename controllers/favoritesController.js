const db = require('../config/db');

// Add a movie to user's favorites
exports.addFavorite = async (req, res) => {
  const userId = req.user.id; // from token
  const { movieId, rating } = req.body;

  if (!movieId) {
    return res.status(400).json({ error: 'movieId is required' });
  }

  try {
    // Checks if movie already in favorites
    const [existing] = await db.query(
      'SELECT * FROM favorites WHERE user_id = ? AND movie_id = ?',
      [userId, movieId]
    );

    if (existing.length > 0) {
      return res.status(409).json({ error: 'Movie already in favorites' });
    }

    await db.query(
      'INSERT INTO favorites (user_id, movie_id, rating) VALUES (?, ?, ?)',
      [userId, movieId, rating || null]
    );

    res.json({ message: 'Favorite added successfully' });
  } catch (err) {
    console.error('Error adding favorite:', err);
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

