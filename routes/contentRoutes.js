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
const { uploadFields } = require("../middleware/upload.middleware");

const contentUpload = uploadFields([
  { name: "thumbnail", maxCount: 1 },
  { name: "media", maxCount: 1 },
  { name: "mediaUrl", maxCount: 1 }
]);

router.get("/", getContent);
router.get("/:id", getContentById);
router.post("/", protect, admin, contentUpload, createContent);
router.put("/:id", protect, admin, contentUpload, updateContent);
router.delete("/:id", protect, admin, deleteContent);

module.exports = router;

