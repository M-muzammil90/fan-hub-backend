const express = require("express");
const router = express.Router();
const {
  getAllSeries,
  getFeaturedSeries,
  getSeriesByIdOrSlug,
  createSeries,
  updateSeries,
  deleteSeries
} = require("../controllers/seriesController");
const { protect } = require("../middleware/authMiddleware");
const { admin } = require("../middleware/adminMiddleware");
const { uploadFields } = require("../middleware/upload.middleware");

const seriesUpload = uploadFields([
  { name: "poster", maxCount: 1 },
  { name: "backdrop", maxCount: 1 }
]);

router.get("/", getAllSeries);
router.get("/featured", getFeaturedSeries);
router.get("/:idOrSlug", getSeriesByIdOrSlug);

router.post("/", protect, admin, seriesUpload, createSeries);
router.put("/:id", protect, admin, seriesUpload, updateSeries);
router.delete("/:id", protect, admin, deleteSeries);

module.exports = router;
