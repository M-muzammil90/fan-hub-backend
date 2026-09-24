const express = require("express");
const router = express.Router();
const { getContent, getContentById } = require("../controllers/contentController");

router.get("/", getContent);
router.get("/:id", getContentById);

module.exports = router;
