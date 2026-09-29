const express = require("express");
const router = express.Router();
const {
  saveProgress,
  getContinueWatching,
  getSeriesWatchProgress,
  clearWatchHistory
} = require("../controllers/watchHistoryController");
const { protect } = require("../middleware/authMiddleware");

router.post("/", protect, saveProgress);
router.get("/continue-watching", protect, getContinueWatching);
router.get("/series/:seriesId", protect, getSeriesWatchProgress);
router.delete("/", protect, clearWatchHistory);

module.exports = router;
