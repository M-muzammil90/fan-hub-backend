const express = require("express");
const router = express.Router();
const {
  getEpisodesBySeason,
  getEpisodeById,
  createEpisode,
  updateEpisode,
  deleteEpisode
} = require("../controllers/episodeController");
const { protect } = require("../middleware/authMiddleware");
const { admin } = require("../middleware/adminMiddleware");
const { uploadFields } = require("../middleware/upload.middleware");

const episodeUpload = uploadFields([
  { name: "thumbnail", maxCount: 1 },
  { name: "video", maxCount: 1 }
]);

router.get("/season/:seasonId", getEpisodesBySeason);
router.get("/:id", getEpisodeById);

router.post("/", protect, admin, episodeUpload, createEpisode);
router.put("/:id", protect, admin, episodeUpload, updateEpisode);
router.delete("/:id", protect, admin, deleteEpisode);

module.exports = router;
