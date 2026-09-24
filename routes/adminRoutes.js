const express = require("express");
const router = express.Router();
const { getAdminSubmissions } = require("../controllers/fanSubmissionController");
const { protect } = require("../middleware/authMiddleware");
const { admin } = require("../middleware/adminMiddleware");

router.get("/fan-submissions", protect, admin, getAdminSubmissions);

module.exports = router;
