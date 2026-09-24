const express = require("express");
const router = express.Router();
const { getFeedback, createFeedback } = require("../controllers/feedbackController");
const { protect } = require("../middleware/authMiddleware");
const { admin } = require("../middleware/adminMiddleware");

// Admin route - preserved for backward compatibility with existing tests
router.get("/", protect, admin, getFeedback);

// User route - submit feedback
router.post("/", protect, createFeedback);

module.exports = router;


