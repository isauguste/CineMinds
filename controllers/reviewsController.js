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
      JOIN users u ON r.user_id = u.user_id
      JOIN movies m ON r.movie_id = m.movie_id
      WHERE r.deleted_at IS NULL
    `);

    console.log("Query successful. Rows:", rows);
    res.json(rows);
  } catch (err) {
    console.error('Error fetching pending reviews:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

