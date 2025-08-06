const db = require('../config/db'); 

exports.getPendingReviews = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
        r.review_id,
        r.review_text,
        r.created_at,
        r.mood_tag,
        m.title AS movie_title,
        u.username
      FROM reviews r
      JOIN users u ON r.user_id = u.id
      JOIN movies m ON r.movie_id = m.id
      WHERE r.deleted_at IS NULL
    `);

    res.json(rows);
  } catch (err) {
    console.error('Error fetching pending reviews:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.submitReview = async (req, res) => {
  const { movie_id, review_text, mood_tag } = req.body;
  const user_id = req.user?.id;

  if (!movie_id || !review_text || !mood_tag || !user_id) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const query = `
      INSERT INTO reviews (user_id, movie_id, review_text, mood_tag)
      VALUES (?, ?, ?, ?)
    `;
    await db.query(query, [user_id, movie_id, review_text, mood_tag]);

    res.status(201).json({ message: 'Review submitted successfully' });
  } catch (err) {
    console.error('Error submitting review:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.getReviewsByMovieId = async (req, res) => {
  try {
    const { movieId } = req.params;
    const [rows] = await db.query(
      `SELECT r.review_id, r.review_text, r.created_at, r.mood_tag, u.username
       FROM reviews r
       JOIN users u ON r.user_id = u.id
       WHERE r.movie_id = ? AND r.deleted_at IS NULL`,
      [movieId]
    );
    res.json(rows);
  } catch (err) {
    console.error('Error fetching reviews by movieId:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

