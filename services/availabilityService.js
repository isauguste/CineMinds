const axios = require("axios");
const crypto = require("crypto");
const db = require("../config/db");

const TTL_DAYS = parseInt(process.env.AVAILABILITY_TTL_DAYS || "7", 10);

/* ----------------------- cache helpers ----------------------- */
function cacheKey({ title, year, tmdbId }) {
  const raw = JSON.stringify({
    title: (title || "").trim().toLowerCase(),
    year,
    tmdbId,
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

  let payload = rows[0].payload_json;
  if (typeof payload === "string") {
    try { payload = JSON.parse(payload); } catch { return null; }
  }
  return payload;
}

async function saveToCache(key, movieId, payload) {
  await db.query(
    `INSERT INTO availability_cache (cache_key, movie_id, payload_json)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE payload_json=VALUES(payload_json), updated_at=CURRENT_TIMESTAMP`,
    [key, movieId || null, JSON.stringify(payload)]
  );
}

/* ----------------------- normalize helpers ----------------------- */
function pickLink(obj = {}) {
  return (
    obj.link ||
    obj.webUrl ||
    obj.watchLink ||
    obj.url ||
    obj.deeplink ||
    obj.deepLink ||
    null
  );
}

/**
 * Handles multiple v4 shapes:
 * - streamingInfo[country] = { netflix:[{...}], hulu:[...], ... }
 * - streamingInfo[country] = [{ service:'netflix', streamingType:'subscription', link:'...' }, ...]
 * - streamingOptions / streamingInfoByCountry and UPPERCASE country keys
 */
function svcName(svc) {
  if (!svc) return null;
  if (typeof svc === "string") return svc;
  return svc.id || svc.name || null; // <-- handle object shape
}

function normalizeRapidApi(item) {
  const out = [];
  const country = (process.env.STREAM_AVAIL_COUNTRY || "us").toLowerCase();
  const root = item.streamingInfo || item.streamingOptions || item.streamingInfoByCountry || {};
  const byCountry =
    root[country] ||
    root[country?.toUpperCase?.()] ||
    (root.country && (root.country[country] || root.country[country?.toUpperCase?.()]));

  if (!byCountry) return out;

  // A) provider-keyed object -> arrays
  if (!Array.isArray(byCountry) && typeof byCountry === "object") {
    for (const provider of Object.keys(byCountry)) {
      const offers = byCountry[provider] || [];
      for (const offer of offers) {
        out.push({
          platform: svcName(offer.service) || provider,
          access: offer.streamingType || offer.type || offer.monetizationType || "unknown",
          link: offer.link || offer.webUrl || offer.url || null,
        });
      }
    }
  }

  // B) array of offers with service object
  if (Array.isArray(byCountry)) {
    for (const offer of byCountry) {
      out.push({
        platform: svcName(offer.service) || offer.provider || "unknown",
        access: offer.streamingType || offer.type || offer.monetizationType || "unknown",
        link: offer.link || offer.webUrl || offer.url || null,
      });
    }
  }

  const seen = new Set();
  return out.filter(x => {
    const k = `${(x.platform||"").toLowerCase()}:${(x.access||"").toLowerCase()}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}


/* ----------------------- provider fetch (v4 search → get show) ----------------------- */
async function fetchFromRapidAPI({ title, year, raw }) {
  const country = (process.env.STREAM_AVAIL_COUNTRY || "us").toLowerCase();
  const headers = {
    "X-RapidAPI-Key": process.env.RAPIDAPI_KEY,
    "X-RapidAPI-Host": "streaming-availability.p.rapidapi.com",
  };

  // 1) Search by title (v4 requires country)
  const searchResp = await axios.get(process.env.STREAM_AVAIL_BASE, {
    params: {
      title,
      country,
      show_type: "movie",
      output_language: process.env.STREAM_AVAIL_OUTPUT_LANG || "en",
      series_granularity: "show",
      ...(year ? { year } : {}),
    },
    headers,
  });

  // Accept multiple shapes: result, results, or array response
  let results =
    searchResp?.data?.result ||
    searchResp?.data?.results ||
    (Array.isArray(searchResp?.data) ? searchResp.data : null);

  if (!Array.isArray(results) || results.length === 0) {
    return raw ? { _search: (searchResp?.data ?? null) } : [];
  }

  const showId = results[0].id || results[0].showId || results[0]._id;
  if (!showId) return raw ? { _search: results } : [];

  // 2) Get full show (contains availability per country)
  const showResp = await axios.get(
    `${process.env.STREAM_AVAIL_GET_SHOW}/${encodeURIComponent(showId)}`,
    {
      params: {
        country,
        output_language: process.env.STREAM_AVAIL_OUTPUT_LANG || "en",
        series_granularity: "show",
      },
      headers,
    }
  );

  const show = showResp?.data || {};
  if (raw) return show;

  return normalizeRapidApi(show);
}

/* ----------------------- public API ----------------------- */
async function getAvailability({ title, year, tmdbId, movieId, nocache, raw }) {
  const key = cacheKey({ title, year, tmdbId });

  if (!nocache && !raw) {
    const cached = await getFromCache(key);
    if (cached) return cached;
  }

  try {
    const result = await fetchFromRapidAPI({ title, year, raw });

    const payload = raw
      ? result
      : { sources: result, fetchedAt: new Date().toISOString() };

    if (!raw) await saveToCache(key, movieId || null, payload);
    return payload;
  } catch (e) {
    console.error(
      "RapidAPI fetch error:",
      e.response?.status || e.message,
      typeof e.response?.data === "object"
        ? JSON.stringify(e.response.data).slice(0, 400)
        : String(e.response?.data || "").slice(0, 400)
    );
    return raw ? { error: e.message } : { sources: [], fetchedAt: new Date().toISOString() };
  }
}

module.exports = { getAvailability };

