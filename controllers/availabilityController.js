const { getAvailability } = require("../services/availabilityService");

exports.getAvailability = async (req, res) => {
  try {
    const { title, year, tmdbId, movieId, nocache, raw } = req.query;

    if (!title && !tmdbId) {
      return res.status(400).json({ error: "Provide title or tmdbId" });
    }

    const payload = await getAvailability({
      title,
      year: year ? parseInt(year, 10) : undefined,
      tmdbId,
      movieId,
      nocache: nocache === "1" || nocache === "true",
      raw: raw === "1" || raw === "true",
    });

    // raw debugging
    if (raw === "1" || raw === "true") {
      return res.json(payload);
    }

    // normalized response
    return res.json(payload);
  } catch (err) {
    console.error("Availability error:", err.message || err);
    res.status(500).json({ error: "Failed to fetch availability" });
  }
};

