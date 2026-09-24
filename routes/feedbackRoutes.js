const express = require("express");
const router = express.Router();
const { getFeedback } = require("../controllers/feedbackController");
const { protect } = require("../middleware/authMiddleware");
const { admin } = require("../middleware/adminMiddleware");

router.get("/", protect, admin, getFeedback);

module.exports = router;
