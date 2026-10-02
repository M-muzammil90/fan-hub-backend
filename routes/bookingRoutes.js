const express = require("express");
const router = express.Router();
const {
  createBooking,
  getMyBookings,
  getBookingByReference,
  getBookingById,
  cancelUserBooking,
  getAdminBookings,
  updateBookingStatus
} = require("../controllers/bookingController");
const { protect, optionalProtect } = require("../middleware/authMiddleware");
const { admin } = require("../middleware/adminMiddleware");

// Public / User Booking Routes
router.post("/", optionalProtect, createBooking);
router.get("/my", optionalProtect, getMyBookings);
router.get("/reference/:reference", getBookingByReference);
router.get("/:id", optionalProtect, getBookingById);
router.patch("/:id/cancel", optionalProtect, cancelUserBooking);

// Admin Booking Routes
router.get("/admin/all", protect, admin, getAdminBookings);
router.patch("/admin/:id/status", protect, admin, updateBookingStatus);

module.exports = router;
