const axios = require('axios');
                                                         
const TMDB_API_KEY   = process.env.TMDB_API_KEY;                
const TMDB_IMAGE_BASE = process.env.TMDB_IMAGE_BASE || 'https://image.tmdb.org/t/p/w500';

if (!TMDB_API_KEY) {
  console.warn('[tmdb] TMDB_API_KEY is missing. TMDB discover fallback will be disabled.');
}

const api = axios.create({
  baseURL: 'https://api.themoviedb.org/3',
  params: { api_key: TMDB_API_KEY, language: 'en-US' },
});

let genreCache = null; // { nameLower -> id }

async function getGenreMap() {
  if (genreCache) return genreCache;
  if (!TMDB_API_KEY) return {}; // no key, no map
  const { data } = await api.get('/genre/movie/list');
  const map = {};
  (data.genres || []).forEach(g => { map[g.name.toLowerCase()] = g.id; });
  genreCache = map;
  return map;
}

// Convert ["Comedy","Drama"] -> "35,18"
async function namesToIdsCSV(names = []) {
  const map = await getGenreMap();
  const ids = names
    .map(n => map[String(n).toLowerCase()])
    .filter(Boolean);
  return ids.join(',');
}

async function discoverByGenres({ withGenresCSV, page = 1 }) {
  if (!TMDB_API_KEY || !withGenresCSV) return [];
  const { data } = await api.get('/discover/movie', {
    params: {
      with_genres: withGenresCSV,
      sort_by: 'popularity.desc',
      include_adult: false,
      include_video: false,
      page, // 1-based
    },
  });
  return data.results || [];
}

function shapeTmdbMovie(m) {
  return {
    id: m.id, 
    title: m.title || m.original_title || 'Untitled',
    year: (m.release_date || '').slice(0, 4) || 'Unknown',
    genres: [], 
    poster: m.poster_path ? `${TMDB_IMAGE_BASE}${m.poster_path}` : '',
    trailerLink: '', // you can enrich via /movie/{id}/videos later
    reviews: [],
    _source: 'tmdb',
  };
}

module.exports = { discoverByGenres, namesToIdsCSV, shapeTmdbMovie };

