const express = require("express");
const router = express.Router();
const { getUsers, getUserById } = require("../controllers/userController");
const { protect } = require("../middleware/authMiddleware");
const { admin } = require("../middleware/adminMiddleware");

router.get("/", protect, admin, getUsers);
router.get("/:id", protect, admin, getUserById);

module.exports = router;
