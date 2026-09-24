const express = require("express");
const router = express.Router();
const { getUserBookmarks } = require("../controllers/bookmarkController");
const { protect } = require("../middleware/authMiddleware");

router.get("/", protect, getUserBookmarks);

module.exports = router;
