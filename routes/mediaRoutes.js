const express = require("express");
const router = express.Router();
const {
  uploadSingleMedia,
  uploadMultipleMedia,
  deleteMedia
} = require("../controllers/mediaController");
const { uploadSingle, uploadArray } = require("../middleware/upload.middleware");
const { protect } = require("../middleware/authMiddleware");

// Upload single file (supports image, video, audio, pdf, doc)
router.post("/upload", protect, uploadSingle("file"), uploadSingleMedia);

// Upload multiple files
router.post("/upload-multiple", protect, uploadArray("files", 10), uploadMultipleMedia);

// Delete file from Cloudinary by publicId
router.delete("/", protect, deleteMedia);

module.exports = router;
