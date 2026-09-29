const express = require("express");
const router = express.Router();
const {
  getPublicSubmissions,
  getPublicSubmissionById,
  createSubmission
} = require("../controllers/fanSubmissionController");
const { protect } = require("../middleware/authMiddleware");
const { uploadSingle } = require("../middleware/upload.middleware");

// Public routes - approved submissions only
router.get("/", getPublicSubmissions);
router.get("/:id", getPublicSubmissionById);

// User route - authenticated users can submit their own fan art/content
router.post("/", protect, uploadSingle("image"), createSubmission);

module.exports = router;

