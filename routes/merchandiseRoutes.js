const express = require("express");
const router = express.Router();
const {
  getMerchandise,
  getMerchandiseById,
  createMerchandise,
  updateMerchandise,
  deleteMerchandise
} = require("../controllers/merchandiseController");
const { protect } = require("../middleware/authMiddleware");
const { admin } = require("../middleware/adminMiddleware");

router.get("/", getMerchandise);
router.get("/:id", getMerchandiseById);
router.post("/", protect, admin, createMerchandise);
router.put("/:id", protect, admin, updateMerchandise);
router.delete("/:id", protect, admin, deleteMerchandise);

module.exports = router;

