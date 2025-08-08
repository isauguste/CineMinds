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
  const si = item?.streamingInfo || {};
  const country = (process.env.STREAM_AVAIL_COUNTRY || "us").toLowerCase();
  const entries = si[country];

  if (!entries) return out;

  // Case A: Object keyed by provider -> arrays of offers
  if (!Array.isArray(entries) && typeof entries === "object") {
    for (const provider of Object.keys(entries)) {
      const offers = entries[provider] || [];
      for (const offer of offers) {
        out.push({
          platform: provider,
          access: offer.type || offer.streamingType || "unknown",
          link: offer.link || offer.webUrl || null,
        });
      }
    }
  }

  // Case B: Array of { service, streamingType, link }
  if (Array.isArray(entries)) {
    for (const offer of entries) {
      out.push({
        platform: offer.service || offer.provider || "unknown",
        access: offer.streamingType || offer.type || "unknown",
        link: offer.link || offer.webUrl || null,
      });
    }
  }

  // Dedup by platform+access
  const seen = new Set();
  return out.filter(x => {
    const k = `${(x.platform || "").toLowerCase()}:${(x.access || "").toLowerCase()}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}


async function fetchFromRapidAPI({ title, year }) {
  const country = (process.env.STREAM_AVAIL_COUNTRY || "us").toLowerCase();

  const headers = {
    "X-RapidAPI-Key": process.env.RAPIDAPI_KEY,
    "X-RapidAPI-Host": "streaming-availability.p.rapidapi.com",
  };

  async function search(params) {
    const url = process.env.STREAM_AVAIL_BASE; // /shows/search/title
    try {
      const resp = await axios.get(url, { params, headers });
      return resp?.data?.result || resp?.data?.results || [];
    } catch (e) {
      console.error(
        "Search error:",
        e.response?.status,
        JSON.stringify(e.response?.data)?.slice(0, 400)
      );
      return null;
    }
  }

  // Primary search params
  const pA = {
    title,
    country, // <-- REQUIRED
    show_type: "movie",
    output_language: process.env.STREAM_AVAIL_OUTPUT_LANG || "en",
    series_granularity: "show",
  };
  if (year) pA.year = year;

  let results = await search(pA);

  // Fallback style (if needed)
  if (!results) {
    const pB = {
      title,
      country, // <-- REQUIRED
      type: "movie",
      output_language: process.env.STREAM_AVAIL_OUTPUT_LANG || "en",
    };
    if (year) pB.year = year;
    results = await search(pB);
  }

  if (!results || !Array.isArray(results) || results.length === 0) return [];

  const match = results[0];
  const showId = match.id || match.showId || match._id;
  if (!showId) return [];

  try {
    const getShowUrl = `${process.env.STREAM_AVAIL_GET_SHOW}/${encodeURIComponent(showId)}`;
    const getParams = {
      country, // <-- REQUIRED
      output_language: process.env.STREAM_AVAIL_OUTPUT_LANG || "en",
      series_granularity: "show",
    };
    const showResp = await axios.get(getShowUrl, { params: getParams, headers });
    const show = showResp?.data || {};
    return normalizeRapidApi(show);
  } catch (e) {
    console.error(
      "GetShow error:",
      e.response?.status,
      JSON.stringify(e.response?.data)?.slice(0, 400)
    );
    return [];
  }
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

