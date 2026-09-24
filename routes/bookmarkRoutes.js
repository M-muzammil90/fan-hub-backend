const express = require("express");
const router = express.Router();
const { getUserBookmarks, createBookmark, deleteBookmark } = require("../controllers/bookmarkController");
const { protect } = require("../middleware/authMiddleware");

router.get("/", protect, getUserBookmarks);
router.post("/", protect, createBookmark);
router.delete("/:id", protect, deleteBookmark);

module.exports = router;

