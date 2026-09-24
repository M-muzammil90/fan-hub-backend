const express = require("express");
const router = express.Router();
const { getUsers, getUserById, updateUser, deleteUser } = require("../controllers/userController");
const { protect } = require("../middleware/authMiddleware");
const { admin } = require("../middleware/adminMiddleware");

router.get("/", protect, admin, getUsers);
router.get("/:id", protect, admin, getUserById);
router.put("/:id", protect, admin, updateUser);
router.delete("/:id", protect, admin, deleteUser);

module.exports = router;

