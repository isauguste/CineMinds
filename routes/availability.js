const router = require("express").Router();
const controller = require("../controllers/availabilityController");

router.get("/", controller.getAvailability);

module.exports = router;

