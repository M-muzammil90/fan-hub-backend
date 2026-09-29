const express = require("express");
const router = express.Router();
const {
  getUserRatings,
  getApprovedRatingsForContent,
  createRating,
  updateRating,
  deleteRating
} = require("../controllers/ratingController");
const { protect } = require("../middleware/authMiddleware");

router.get("/content/:contentId", getApprovedRatingsForContent);
router.get("/", protect, getUserRatings);
router.post("/", protect, createRating);
router.put("/:id", protect, updateRating);
router.delete("/:id", protect, deleteRating);

module.exports = router;
