const express = require("express");
const router = express.Router();
const {
  getCharacters,
  getCharacterById,
  createCharacter,
  updateCharacter,
  deleteCharacter
} = require("../controllers/characterController");
const { protect } = require("../middleware/authMiddleware");
const { admin } = require("../middleware/adminMiddleware");

router.get("/", getCharacters);
router.get("/:id", getCharacterById);
router.post("/", protect, admin, createCharacter);
router.put("/:id", protect, admin, updateCharacter);
router.delete("/:id", protect, admin, deleteCharacter);

module.exports = router;

