const express = require("express");
const router = express.Router();
const { getPublicSubmissions, getPublicSubmissionById } = require("../controllers/fanSubmissionController");

router.get("/", getPublicSubmissions);
router.get("/:id", getPublicSubmissionById);

module.exports = router;
