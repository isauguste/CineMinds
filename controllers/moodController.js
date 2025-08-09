const db = require('../config/db');

const MOOD_SYNONYMS = {
  happy:   ['happy','joy','joyful','glad','great','excited','amazing','awesome','love','ecstatic','thrilled'],
  sad:     ['sad','down','depressed','unhappy','blue','cry','tears','heartbroken','lonely'],
  anxious: ['anxious','nervous','worried','stressed','stress','overwhelmed','tense','panic'],
  angry:   ['angry','mad','furious','irritated','annoyed','pissed','rage','frustrated'],
  relaxed: ['relaxed','calm','chill','peaceful','serene','unwind','unwinding','cozy','laid back','nonchalant'],
  bored:   ['bored','meh','tired','dull','nothing to do','uninspired','lazy','tired']
};

// Used if mood_genre_map has no rows:
const DEFAULT_GENRES = {
  happy:   ['Comedy','Romance','Family','Animation'],
  sad:     ['Drama','Romance', 'Comedy'],
  anxious: ['Animation','Family','Comedy','Adventure'],
  angry:   ['Action','Thriller','Crime'],
  relaxed: ['Romance','Comedy','Drama'],
  bored:   ['Adventure','Action','Fantasy','Sci-Fi']
};

function detectMood(raw) {
  const text = String(raw || '').toLowerCase();
  const single = text.trim();
  if (MOOD_SYNONYMS[single]) return single;
  for (const [mood, words] of Object.entries(MOOD_SYNONYMS)) {
    if (words.some(w => text.includes(w))) return mood;
  }
  return null;
}

async function getMoods(_req, res) {
  try {
    const [rows] = await db.query('SELECT id, mood_label FROM moods');
    res.json(rows);
  } catch (err) {
    console.error('[moodController.getMoods] DB error:', err);
    res.status(500).json({ error: 'Failed to fetch moods' });
  }
}

async function analyzeMood(req, res) {
  const { moodText, limit = 30, page = 1 } = req.body || {};
  if (!moodText) return res.status(400).json({ error: 'Mood input is required' });

  const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 30, 1), 100);
  const safePage  = Math.max(parseInt(page, 10) || 1, 1);
  const offset    = (safePage - 1) * safeLimit;

  try {
    const normalizedMood = detectMood(moodText) || String(moodText).toLowerCase();

    const [mapRows] = await db.query(
      'SELECT genre FROM mood_genre_map WHERE mood = ?',
      [normalizedMood]
    );

    let genres = mapRows.map(r => r.genre);
    if (!genres.length && DEFAULT_GENRES[normalizedMood]) {
      genres = DEFAULT_GENRES[normalizedMood];
    }

    let movies = [];
    if (genres.length) {
      const likes = genres.map(() => 'genre LIKE ?').join(' OR ');
      const likeParams = genres.map(g => `%${g}%`);
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
      movies = movieRows;
    }

    if (!movies.length) {
      const [fallbackRows] = await db.query(
        `
        SELECT *
        FROM movies
        ORDER BY (poster_url IS NULL OR poster_url = ''), date_added DESC
        LIMIT ? OFFSET ?
        `,
        [safeLimit, offset]
      );
      movies = fallbackRows;
    }

    const shaped = movies
      .filter(m => (m.poster_url || '').trim() !== '')
      .map(m => ({
        id: m.id ?? null,
        title: m.title ?? 'Untitled',
        year: m.year ?? 'Unknown',
        genres: m.genre ? m.genre.split(',').map(g => g.trim()) : [],
        poster: m.poster_url ?? '',
        trailerLink: m.trailer_url ?? '',
        reviews: m.review ? [m.review] : [],
      }));

    res.json({ movies: shaped });
  } catch (err) {
    console.error('[moodController.analyzeMood] DB error:', err);
    res.status(500).json({ error: 'Failed to analyze mood' });
  }
}

module.exports = { getMoods, analyzeMood };
