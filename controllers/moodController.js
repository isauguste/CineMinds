const db = require('../config/db');

// GET /api/mood/moods
exports.getMoods = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT id, mood_label FROM moods');
    res.json(rows);
  } catch (err) {
    console.error('[moodController.getMoods] DB error:', err);
    res.status(500).json({ error: 'Failed to fetch moods' });
  }
};

// POST /api/mood/analyzeMood
exports.analyzeMood = async (req, res) => {
  const { moodText, limit = 20, page = 1 } = req.body || {};
  if (!moodText) return res.status(400).json({ error: 'Mood input is required' });

  const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
  const safePage  = Math.max(parseInt(page, 10) || 1, 1);
  const offset    = (safePage - 1) * safeLimit;

  try {
    // 1) Get all mapped genres for this mood (larger pool)
    const [mapRows] = await db.query(
      'SELECT genre FROM mood_genre_map WHERE mood = ?',
      [String(moodText).toLowerCase()]
    );
    if (!mapRows.length) return res.status(404).json({ error: 'No genre found for that mood' });

    // 2) Build flexible LIKEs across multiple genres
    const likes = mapRows.map(() => 'genre LIKE ?').join(' OR ');
    const likeParams = mapRows.map(r => `%${r.genre}%`);

    // 3) Pull movies (prefer ones with posters), support paging
    const [movieRows] = await db.query(
      `
      SELECT *
      FROM movies
      WHERE (${likes})
      ORDER BY (poster_url IS NULL OR poster_url = ''), date_added DESC
      LIMIT ? OFFSET ?
      `,
      [...likeParams, safeLimit, offset]
    );

    const movies = movieRows
      .filter(m => m.poster_url && m.poster_url.trim() !== '')
      .map(m => ({
        id: m.id ?? null,
        title: m.title ?? 'Untitled',
        year: m.year ?? 'Unknown',
        genres: m.genre ? m.genre.split(',').map(g => g.trim()) : [],
        poster: m.poster_url ?? '',
        trailerLink: m.trailer_url ?? '',
        reviews: m.review ? [m.review] : [],
      }));

    res.json({ movies });
  } catch (err) {
    console.error('[moodController.analyzeMood] DB error:', err);
    res.status(500).json({ error: 'Failed to analyze mood' });
  }
};

