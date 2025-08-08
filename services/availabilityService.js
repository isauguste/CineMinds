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
  return rows[0].payload_json;
}

async function saveToCache(key, movieId, payload) {
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
  const url = process.env.STREAM_AVAIL_BASE;
  const params = {
    title,
    country: process.env.STREAM_AVAIL_COUNTRY || "us",
    output_language: process.env.STREAM_AVAIL_OUTPUT_LANG || "en",
    show_type: "movie"
  };
  if (year) params.year = year;

  const resp = await axios.get(url, {
    params,
    headers: {
      "X-RapidAPI-Key": process.env.RAPIDAPI_KEY,
      "X-RapidAPI-Host": "streaming-availability.p.rapidapi.com"
    }
  });

  const results = resp?.data?.result || [];
  if (!results.length) return [];
  return normalizeRapidApi(results[0]);
}

async function getAvailability({ title, year, tmdbId, movieId }) {
  const key = cacheKey({ title, year, tmdbId });
  const cached = await getFromCache(key);
  if (cached) return cached;

  let normalized = [];
  try {
    normalized = await fetchFromRapidAPI({ title, year });
  } catch (e) {
    console.error("RapidAPI fetch error:", e.message);
    normalized = [];
  }

  const payload = { sources: normalized, fetchedAt: new Date().toISOString() };
  await saveToCache(key, movieId || null, payload);
  return payload;
}

module.exports = { getAvailability };

