const express = require("express");
const router = express.Router();
const {
  getEvents,
  getUpcomingEvents,
  getFeaturedEvents,
  getNearbyEvents,
  getCalendarEvents,
  getEventBySlugOrId,
  createEvent,
  updateEvent,
  deleteEvent,
  togglePublishEvent,
  toggleFeatureEvent
} = require("../controllers/eventController");
const { createBooking, getEventBookings } = require("../controllers/bookingController");
const { protect, optionalProtect } = require("../middleware/authMiddleware");
const { admin } = require("../middleware/adminMiddleware");
const { uploadSingle } = require("../middleware/upload.middleware");

// Public routes (Sub-routes must precede /:id)
router.get("/", getEvents);
router.get("/upcoming", getUpcomingEvents);
router.get("/featured", getFeaturedEvents);
router.get("/nearby", getNearbyEvents);
router.get("/calendar", getCalendarEvents);
router.get("/:id", getEventBySlugOrId);

// Event Booking Routes
router.post("/:eventId/bookings", optionalProtect, createBooking);
router.get("/:eventId/bookings", protect, admin, getEventBookings);

// Admin protected routes
router.post("/", protect, admin, uploadSingle("image"), createEvent);
router.put("/:id", protect, admin, uploadSingle("image"), updateEvent);
router.delete("/:id", protect, admin, deleteEvent);
router.patch("/:id/publish", protect, admin, togglePublishEvent);
router.patch("/:id/feature", protect, admin, toggleFeatureEvent);

module.exports = router;

