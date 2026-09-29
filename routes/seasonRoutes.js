const express = require("express");
const router = express.Router();
const {
  getSeasonsBySeries,
  getSeasonById,
  createSeason,
  updateSeason,
  deleteSeason
} = require("../controllers/seasonController");
const { protect } = require("../middleware/authMiddleware");
const { admin } = require("../middleware/adminMiddleware");
const { uploadSingle } = require("../middleware/upload.middleware");

const seasonUpload = uploadSingle("poster");

router.get("/series/:seriesId", getSeasonsBySeries);
router.get("/:id", getSeasonById);

router.post("/", protect, admin, seasonUpload, createSeason);
router.put("/:id", protect, admin, seasonUpload, updateSeason);
router.delete("/:id", protect, admin, deleteSeason);

module.exports = router;
