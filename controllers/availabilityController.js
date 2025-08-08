const { getAvailability } = require("../services/availabilityService");

exports.getAvailability = async (req, res) => {
  try {
    const { title, year, tmdbId, movieId } = req.query;
    if (!title && !tmdbId) {
      return res.status(400).json({ error: "Provide title or tmdbId" });
    }
    const data = await getAvailability({ title, year, tmdbId, movieId });
    res.json(data);
  } catch (err) {
    console.error("Availability error:", err.message);
    res.status(500).json({ error: "Failed to fetch availability" });
  }
};

