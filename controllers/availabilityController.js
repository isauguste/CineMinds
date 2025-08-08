const { getAvailability } = require("../services/availabilityService");

exports.getAvailability = async (req, res) => {
  try {
    const { title, year, tmdbId, movieId, nocache } = req.query;
    if (!title && !tmdbId) {
      return res.status(400).json({ error: "Provide title or tmdbId" });
    }
    const data = await getAvailability({ title, year, tmdbId, movieId, nocache: nocache === "1" });
    res.json(data);
  } catch (err) {
    console.error("Availability error:", err.message);
    res.status(500).json({ error: "Failed to fetch availability" });
  }
};


