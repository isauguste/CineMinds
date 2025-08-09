const db = require('../config/db');
const { discoverByGenres, namesToIdsCSV, fetchTrailerUrl, shapeTmdbMovie } = require('../services/tmdb');

// Simple keyword map so free‑text like “I feel amazing…” still maps to a mood

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
  sad:     ['Drama','Comedy'],
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

function dedupeByKey(list) {
  const seen = new Set();
  const out = [];
  for (const m of list) {
    const key = m.id ? `id:${m.id}` : `${m.title}-${m.year}`;
    if (!seen.has(key)) { seen.add(key); out.push(m); }
  }
  return out;
}

// GET /api/mood/moods
async function getMoods(_req, res) {
  try {
    const [rows] = await db.query('SELECT id, mood_label FROM moods');
    res.json(rows);
  } catch (err) {
    console.error('[moodController.getMoods] DB error:', err);
    res.status(500).json({ error: 'Failed to fetch moods' });
  }
}

async function withConcurrency(items, limit, worker) {
  const out = [];
  let i = 0;
  async function run() {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await worker(items[idx], idx);
    }
  }
  const runners = Array.from({ length: Math.min(limit, items.length) }, run);
  await Promise.all(runners);
  return out;
}

// POST /api/mood/analyzeMood
async function analyzeMood(req, res) {
  const { moodText, limit = 30, page = 1 } = req.body || {};
  if (!moodText) return res.status(400).json({ error: 'Mood input is required' });

  const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 30, 1), 100);
  const safePage  = Math.max(parseInt(page, 10) || 1, 1);
  const offset    = (safePage - 1) * safeLimit;

  try {
    const normalizedMood = detectMood(moodText) || String(moodText).toLowerCase();

    // 1) Genres from DB or defaults
    const [mapRows] = await db.query('SELECT genre FROM mood_genre_map WHERE mood = ?', [normalizedMood]);
    let genres = mapRows.map(r => r.genre);
    if (!genres.length && DEFAULT_GENRES[normalizedMood]) genres = DEFAULT_GENRES[normalizedMood];

    // 2) DB first
    let results = [];
    if (genres.length) {
      const likes = genres.map(() => 'genre LIKE ?').join(' OR ');
      const likeParams = genres.map(g => `%${g}%`);
      const [rows] = await db.query(
        `SELECT * FROM movies
         WHERE (${likes})
         ORDER BY (poster_url IS NULL OR poster_url = ''), date_added DESC
         LIMIT ? OFFSET ?`,
        [...likeParams, safeLimit, offset]
      );
      const shaped = rows
        .filter(m => (m.poster_url || '').trim() !== '')
        .map(m => ({
          id: m.id ?? null,
          title: m.title ?? 'Untitled',
          year: m.year ?? 'Unknown',
          genres: m.genre ? m.genre.split(',').map(g => g.trim()) : [],
          poster: m.poster_url ?? '',
          trailerLink: m.trailer_url ?? '',
          reviews: m.review ? [m.review] : [],
          _source: 'db',
        }));
      results = shaped;
    }

    // 3) TMDB fill + enrichment (genres, overview, trailer)
    if (genres.length && results.length < safeLimit) {
      const withGenresCSV = await namesToIdsCSV(genres);
      if (withGenresCSV) {
        const tmdb = await discoverByGenres({ withGenresCSV, page: safePage });
        // shape + then fetch trailers with small concurrency
        let tmdbShaped = await Promise.all(tmdb.map(shapeTmdbMovie));

        // fetch trailers for the first N tmdb items to avoid lots of requests
        const N = Math.min(20, tmdbShaped.length);
        const withTrailers = await withConcurrency(
          tmdbShaped.slice(0, N),
          5, // up to 5 parallel requests
          async (m) => ({ ...m, trailerLink: await fetchTrailerUrl(m.id) })
        );
        tmdbShaped = [...withTrailers, ...tmdbShaped.slice(N)]; // rest keep empty trailer

        results = dedupeByKey([...results, ...tmdbShaped]);
      }
    }

    // 4) Broad DB fallback if still empty
    if (!results.length) {
      const [fallbackRows] = await db.query(
        `SELECT * FROM movies
         ORDER BY (poster_url IS NULL OR poster_url = ''), date_added DESC
         LIMIT ? OFFSET ?`,
        [safeLimit, offset]
      );
      results = fallbackRows.map(m => ({
        id: m.id ?? null,
        title: m.title ?? 'Untitled',
        year: m.year ?? 'Unknown',
        genres: m.genre ? m.genre.split(',').map(g => g.trim()) : [],
        poster: m.poster_url ?? '',
        trailerLink: m.trailer_url ?? '',
        reviews: m.review ? [m.review] : [],
        _source: 'db',
      }));
    }

    // 5) Trim to limit and send
    res.json({ movies: results.slice(0, safeLimit) });
  } catch (err) {
    console.error('[moodController.analyzeMood] error:', err?.response?.data || err);
    res.status(500).json({ error: 'Failed to analyze mood' });
  }
}

module.exports = { getMoods, analyzeMood };
