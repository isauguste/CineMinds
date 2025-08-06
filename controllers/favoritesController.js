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
  const userId = req.user.id;

  try {
    const [favorites] = await db.query(`
      SELECT 
        f.id,
        f.movie_id,
        f.rating,
        f.added_at,
        m.title,
        m.poster_url,
        m.genre,
        m.movie_year
      FROM favorites f
      JOIN movies m ON f.movie_id = m.id
      WHERE f.user_id = ?
      ORDER BY f.added_at DESC
    `, [userId]);

    res.json(favorites);
  } catch (err) {
    console.error('Error fetching favorites:', err);
    res.status(500).json({ error: 'Server error' });
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

