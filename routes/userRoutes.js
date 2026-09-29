const express = require("express");
const router = express.Router();
const { getUsers, getUserById, updateUser, deleteUser, updateUserProfile } = require("../controllers/userController");
const { protect } = require("../middleware/authMiddleware");
const { admin } = require("../middleware/adminMiddleware");
const { uploadSingle } = require("../middleware/upload.middleware");

router.put("/profile", protect, uploadSingle("avatar"), updateUserProfile);
router.get("/", protect, admin, getUsers);
router.get("/:id", protect, admin, getUserById);
router.put("/:id", protect, admin, uploadSingle("avatar"), updateUser);
router.delete("/:id", protect, admin, deleteUser);

module.exports = router;


