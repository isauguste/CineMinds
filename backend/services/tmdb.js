const axios = require('axios');

const TMDB_API_KEY    = process.env.TMDB_API_KEY;
const TMDB_IMAGE_BASE = process.env.TMDB_IMAGE_BASE || 'https://image.tmdb.org/t/p/w500';

if (!TMDB_API_KEY) {
  console.warn('[tmdb] TMDB_API_KEY is missing. TMDB discover enrichment will be limited.');
}

const api = axios.create({
  baseURL: 'https://api.themoviedb.org/3',
  params: { api_key: TMDB_API_KEY, language: 'en-US' },
});

let genreMapByName = null; // name -> id
let genreMapById   = null; // id -> name

async function loadGenreMaps() {
  if (genreMapByName && genreMapById) return { genreMapByName, genreMapById };
  if (!TMDB_API_KEY) return { genreMapByName: {}, genreMapById: {} };
  const { data } = await api.get('/genre/movie/list');
  genreMapByName = {};
  genreMapById   = {};
  (data.genres || []).forEach(g => {
    genreMapByName[g.name.toLowerCase()] = g.id;
    genreMapById[g.id] = g.name;
  });
  return { genreMapByName, genreMapById };
}

async function namesToIdsCSV(names = []) {
  const { genreMapByName } = await loadGenreMaps();
  const ids = names.map(n => genreMapByName[String(n).toLowerCase()]).filter(Boolean);
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
      page,
    },
  });
  return data.results || [];
}

// Fetch first YouTube trailer URL (if any)
async function fetchTrailerUrl(movieId) {
  if (!TMDB_API_KEY) return '';
  const { data } = await api.get(`/movie/${movieId}/videos`);
  const vids = data.results || [];
  const trailer = vids.find(v => v.type === 'Trailer' && v.site === 'YouTube')
               ||  vids.find(v => v.site === 'YouTube');
  return trailer ? `https://www.youtube.com/watch?v=${trailer.key}` : '';
}

async function shapeTmdbMovie(m) {
  const { genreMapById } = await loadGenreMaps();
  return {
    id: m.id,
    title: m.title || m.original_title || 'Untitled',
    year: (m.release_date || '').slice(0, 4) || 'Unknown',
    genres: Array.isArray(m.genre_ids) ? m.genre_ids.map(id => genreMapById[id]).filter(Boolean) : [],
    poster: m.poster_path ? `${TMDB_IMAGE_BASE}${m.poster_path}` : '',
    trailerLink: '', // filled later by fetchTrailerUrl()
    reviews: m.overview ? [m.overview] : [],
    _source: 'tmdb',
  };
}

module.exports = {
  discoverByGenres,
  namesToIdsCSV,
  fetchTrailerUrl,
  shapeTmdbMovie,
};

