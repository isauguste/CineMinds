const db = require('../config/db');

// GET all mappings
exports.getMappings = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT moods_to_genres.id, moods.mood_label AS mood, genres.name AS genre
      FROM moods_to_genres
      JOIN moods ON moods_to_genres.mood_id = moods.id
      JOIN genres ON moods_to_genres.genre_id = genres.id
    `);
    res.json(rows);
  } catch (err) {
    console.error('[ERROR getMappings]', err);
    res.status(500).json({ error: 'Failed to fetch mappings' });
  }
};

// POST new mapping
exports.addMapping = async (req, res) => {
  const { mood_id, genre_id } = req.body;
  if (!mood_id || !genre_id) {
    return res.status(400).json({ error: 'Mood and Genre are required' });
  }

  try {
    const [result] = await db.query(
      'INSERT INTO moods_to_genres (mood_id, genre_id) VALUES (?, ?)',
      [mood_id, genre_id]
    );
    res.json({ id: result.insertId, mood_id, genre_id });
  } catch (err) {
    console.error('[ERROR addMapping]', err);
    res.status(500).json({ error: 'Failed to add mapping' });
  }
};

// DELETE a mapping
exports.deleteMapping = async (req, res) => {
  const { id } = req.params;
  try {
    await db.query('DELETE FROM moods_to_genres WHERE id = ?', [id]);
    res.json({ message: 'Mapping deleted' });
  } catch (err) {
    console.error('[ERROR deleteMapping]', err);
    res.status(500).json({ error: 'Failed to delete mapping' });
  }
};

// Feature a mood (only one at a time)
async function pinFeaturedMood(req, res) {
  const { moodId } = req.body;
  try {
    await db.query('UPDATE moods SET is_featured = FALSE');
    await db.query('UPDATE moods SET is_featured = TRUE WHERE id = ?', [moodId]);
    res.json({ message: 'Featured mood updated successfully.' });
  } catch (err) {
    console.error('[ERROR] pinFeaturedMood:', err);
    res.status(500).json({ error: 'Failed to feature mood.' });
  }
};

