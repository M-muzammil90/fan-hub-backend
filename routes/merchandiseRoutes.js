const express = require("express");
const router = express.Router();
const { getMerchandise, getMerchandiseById } = require("../controllers/merchandiseController");

router.get("/", getMerchandise);
router.get("/:id", getMerchandiseById);

module.exports = router;
