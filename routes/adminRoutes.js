const express = require("express");
const router = express.Router();
const {
  getAdminSubmissions,
  getAdminSubmissionById,
  updateAdminSubmission,
  deleteAdminSubmission
} = require("../controllers/fanSubmissionController");
const {
  getFeedback,
  getFeedbackById,
  updateFeedback,
  deleteFeedback
} = require("../controllers/feedbackController");
const { getAnalytics } = require("../controllers/adminController");
const { getAdminRatings, moderateRating } = require("../controllers/ratingController");
const { protect } = require("../middleware/authMiddleware");
const { admin } = require("../middleware/adminMiddleware");

router.get("/analytics", protect, admin, getAnalytics);

router.get("/fan-submissions", protect, admin, getAdminSubmissions);
router.get("/fan-submissions/:id", protect, admin, getAdminSubmissionById);
router.put("/fan-submissions/:id", protect, admin, updateAdminSubmission);
router.delete("/fan-submissions/:id", protect, admin, deleteAdminSubmission);

router.get("/feedback", protect, admin, getFeedback);
router.get("/feedback/:id", protect, admin, getFeedbackById);
router.put("/feedback/:id", protect, admin, updateFeedback);
router.delete("/feedback/:id", protect, admin, deleteFeedback);

router.get("/reviews", protect, admin, getAdminRatings);
router.put("/reviews/:id", protect, admin, moderateRating);

module.exports = router;

