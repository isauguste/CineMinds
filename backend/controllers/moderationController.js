const db = require('../config/db');

// GET all active reviews (that are not soft-deleted)
exports.getReviews = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT r.review_id, r.review_text, r.mood_tag, r.created_at,
             u.username, m.title AS movie_title
      FROM reviews r
      JOIN users u ON r.user_id = u.id
      JOIN movies m ON r.movie_id = m.id
      WHERE r.deleted_at IS NULL
      ORDER BY r.created_at DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error('[ERROR getReviews]', err);
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
};

// DELETE (soft) a review
exports.deleteReview = async (req, res) => {
  const { id } = req.params;
  try {
    await db.query(`UPDATE reviews SET deleted_at = NOW() WHERE review_id = ?`, [id]);
    res.json({ message: 'Review deleted successfully' });
  } catch (err) {
    console.error('[ERROR deleteReview]', err);
    res.status(500).json({ error: 'Failed to delete review' });
  }
};

