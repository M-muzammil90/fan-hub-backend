const express = require("express");
const router = express.Router();
const {
  getContent,
  getContentById,
  createContent,
  updateContent,
  deleteContent
} = require("../controllers/contentController");
const { protect } = require("../middleware/authMiddleware");
const { admin } = require("../middleware/adminMiddleware");

router.get("/", getContent);
router.get("/:id", getContentById);
router.post("/", protect, admin, createContent);
router.put("/:id", protect, admin, updateContent);
router.delete("/:id", protect, admin, deleteContent);

module.exports = router;

