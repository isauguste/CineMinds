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
exports.pinFeaturedMood = async (req, res) => {
  const { mood_id } = req.body;
  if (!mood_id) return res.status(400).json({ error: "Mood ID is required." });

  try {
    // Ensure only one featured mood exists
    await db.query(`DELETE FROM featured_mood`);

    // Insert the new featured mood
    await db.query(`INSERT INTO featured_mood (mood_id) VALUES (?)`, [mood_id]);

    res.json({ message: "Featured mood updated successfully." });
  } catch (err) {
    console.error("Error pinning featured mood:", err);
    res.status(500).json({ error: "Failed to pin featured mood." });
  }
};

// GET currently featured mood
exports.getFeaturedMood = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT m.id, m.mood_label
      FROM moods m
      JOIN featured_mood f ON m.id = f.mood_id
      LIMIT 1
    `);

    if (rows.length === 0) {
      return res.status(200).json(null);
    }

    res.json(rows[0]);
  } catch (err) {
    console.error("Error fetching featured mood:", err);
    res.status(500).json({ error: "Failed to fetch featured mood." });
  }
};


