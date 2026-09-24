const express = require("express");
const router = express.Router();
const { getUserRatings } = require("../controllers/ratingController");
const { protect } = require("../middleware/authMiddleware");

router.get("/", protect, getUserRatings);

module.exports = router;
