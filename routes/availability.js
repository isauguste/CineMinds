const router = require("express").Router();
const controller = require("../controllers/availabilityController");

// GET /api/availability
router.get("/", controller.getAvailability);

module.exports = router;

