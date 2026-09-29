const express = require("express");
const router = express.Router();
const {
  getCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory
} = require("../controllers/categoryController");
const { protect } = require("../middleware/authMiddleware");
const { admin } = require("../middleware/adminMiddleware");
const { uploadSingle } = require("../middleware/upload.middleware");

router.get("/", getCategories);
router.get("/:id", getCategoryById);
router.post("/", protect, admin, uploadSingle("image"), createCategory);
router.put("/:id", protect, admin, uploadSingle("image"), updateCategory);
router.delete("/:id", protect, admin, deleteCategory);

module.exports = router;

