const axios = require("axios");
const crypto = require("crypto");
const db = require("../config/db"); 

const TTL_DAYS = parseInt(process.env.AVAILABILITY_TTL_DAYS || "7", 10);

function cacheKey({ title, year, tmdbId }) {
  const raw = JSON.stringify({
    title: (title || "").trim().toLowerCase(),
    year,
    tmdbId
  });
  return crypto.createHash("sha256").update(raw).digest("hex").slice(0, 64);
}
async function getFromCache(key) {
  const [rows] = await db.query(
    "SELECT payload_json, updated_at FROM availability_cache WHERE cache_key=?",
    [key]
  );
  if (!rows.length) return null;

  const updated = new Date(rows[0].updated_at);
  const ageDays = (Date.now() - updated.getTime()) / 86400000;
  if (ageDays > TTL_DAYS) return null;

  // payload_json is LONGTEXT -> parse if string
  let payload = rows[0].payload_json;
  if (typeof payload === "string") {
    try {
      payload = JSON.parse(payload);
    } catch {
      return null; // corrupted cache -> treat as miss
    }
  }
  return payload;
}

async function saveToCache(key, movieId, payload) {
  // store as string (
  await db.query(
    `INSERT INTO availability_cache (cache_key, movie_id, payload_json)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE payload_json=VALUES(payload_json), updated_at=CURRENT_TIMESTAMP`,
    [key, movieId || null, JSON.stringify(payload)]
  );
}

function normalizeRapidApi(item) {
  const out = [];
  const byCountry = item?.streamingInfo || {};
  const country = (process.env.STREAM_AVAIL_COUNTRY || "us").toLowerCase();
  const entries = byCountry[country] || {};

  for (const provider of Object.keys(entries)) {
    for (const offer of entries[provider]) {
      out.push({
        platform: provider,
        access: offer.type || "unknown",
        link: offer.link || null
      });
    }
  }

  const seen = new Set();
  return out.filter(x => {
    const k = `${x.platform}:${x.access}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

async function fetchFromRapidAPI({ title, year }) {
  // Step 1: search by title (v4)
  const searchUrl = process.env.STREAM_AVAIL_BASE;
  const params = {
    title,
    show_type: "movie",
    output_language: process.env.STREAM_AVAIL_OUTPUT_LANG || "en",
    series_granularity: "show",
  };
  if (year) params.year = year;

  const headers = {
    "X-RapidAPI-Key": process.env.RAPIDAPI_KEY,
    "X-RapidAPI-Host": "streaming-availability.p.rapidapi.com",
  };

  const searchResp = await axios.get(searchUrl, { params, headers });
  const results = searchResp?.data?.result || searchResp?.data?.results || [];
  if (!Array.isArray(results) || results.length === 0) return [];

  // Pick best match (first)
  const match = results[0];
  // id field differs across versions; v4 typically uses 'id'
  const showId = match.id || match.showId || match._id;
  if (!showId) return [];

  // Step 2: fetch full show details (contains per-country streamingInfo)
  const getShowUrl = `${process.env.STREAM_AVAIL_GET_SHOW}/${encodeURIComponent(showId)}`;
  const getParams = {
    country: (process.env.STREAM_AVAIL_COUNTRY || "us").toLowerCase(),
    output_language: process.env.STREAM_AVAIL_OUTPUT_LANG || "en",
  };
  const showResp = await axios.get(getShowUrl, { params: getParams, headers });
  const show = showResp?.data || {};

  // Normalize from the full show payload
  return normalizeRapidApi(show);
}

async function getAvailability({ title, year, tmdbId, movieId, nocache }) {
  const key = cacheKey({ title, year, tmdbId });

  if (!nocache) {
    const cached = await getFromCache(key);
    if (cached) return cached;
  }

  let normalized = [];
  try {
    normalized = await fetchFromRapidAPI({ title, year });
  } catch (e) {
    console.error("RapidAPI fetch error:", e.response?.status || e.message);
    normalized = [];
  }

  const payload = { sources: normalized, fetchedAt: new Date().toISOString() };
  await saveToCache(key, movieId || null, payload);
  return payload;
}

module.exports = { getAvailability };

