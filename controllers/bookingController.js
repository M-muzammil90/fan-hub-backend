const crypto = require("crypto");
const mongoose = require("mongoose");
const Booking = require("../models/Booking");
const Event = require("../models/Event");
const User = require("../models/User");

// Generate unique booking reference format: FHP-2026-XXXXXX
const generateBookingReference = () => {
  const year = new Date().getFullYear();
  const randomChars = crypto.randomBytes(3).toString("hex").toUpperCase();
  return `FHP-${year}-${randomChars}`;
};

/**
 * POST /api/bookings or POST /api/events/:eventId/bookings
 * Create new event ticket booking with atomic availability check
 */
const createBooking = async (req, res) => {
  try {
    const eventId = req.params.eventId || req.body.eventId;
    const {
      customerName,
      email,
      phone,
      ticketType = "General Pass",
      quantity = 1,
      notes = ""
    } = req.body;

    if (!eventId || !mongoose.Types.ObjectId.isValid(eventId)) {
      return res.status(400).json({
        success: false,
        message: "A valid Event ID is required"
      });
    }

    if (!customerName || !customerName.trim()) {
      return res.status(400).json({
        success: false,
        message: "Customer full name is required"
      });
    }

    if (!email || !email.trim() || !email.includes("@")) {
      return res.status(400).json({
        success: false,
        message: "A valid customer email address is required"
      });
    }

    if (!phone || !phone.trim()) {
      return res.status(400).json({
        success: false,
        message: "Customer contact phone number is required"
      });
    }

    const numTickets = parseInt(quantity, 10);
    if (isNaN(numTickets) || numTickets <= 0) {
      return res.status(400).json({
        success: false,
        message: "Ticket quantity must be at least 1"
      });
    }

    if (numTickets > 10) {
      return res.status(400).json({
        success: false,
        message: "Maximum 10 tickets allowed per booking"
      });
    }

    // 1. Fetch Event to verify existence, status, and pricing
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found"
      });
    }

    if (event.isPublished === false) {
      return res.status(400).json({
        success: false,
        message: "This event is currently unpublished and not accepting bookings"
      });
    }

    if (event.status === "Cancelled") {
      return res.status(400).json({
        success: false,
        message: "This event has been cancelled"
      });
    }

    if (event.status === "Completed") {
      return res.status(400).json({
        success: false,
        message: "This event has already concluded"
      });
    }

    // 2. Determine Unit Price from Event / Tier (NEVER trust frontend price)
    let unitPrice = event.ticketPrice !== undefined ? event.ticketPrice : 1500;
    let selectedTier = null;

    if (event.ticketTiers && event.ticketTiers.length > 0) {
      selectedTier = event.ticketTiers.find(
        (t) => t.name.toLowerCase() === ticketType.toLowerCase().trim()
      );
      if (selectedTier) {
        unitPrice = selectedTier.price;
      }
    }

    // 3. Check Overall Availability
    const currentAvailable = event.availableTickets !== undefined ? event.availableTickets : event.totalTickets || 100;
    if (currentAvailable <= 0) {
      return res.status(400).json({
        success: false,
        message: "Sorry, tickets for this event are completely sold out!"
      });
    }

    if (numTickets > currentAvailable) {
      return res.status(400).json({
        success: false,
        message: `Only ${currentAvailable} ${currentAvailable === 1 ? 'ticket is' : 'tickets are'} currently available.`
      });
    }

    // 4. Atomic inventory decrement to strictly prevent overselling and race conditions
    const updatedEvent = await Event.findOneAndUpdate(
      {
        _id: eventId,
        availableTickets: { $gte: numTickets }
      },
      {
        $inc: { availableTickets: -numTickets }
      },
      { new: true }
    );

    if (!updatedEvent) {
      return res.status(400).json({
        success: false,
        message: "Tickets are no longer available in the requested quantity. Please try a smaller quantity."
      });
    }

    // 5. Generate Unique Booking Reference
    let reference = generateBookingReference();
    let isUnique = false;
    let attempts = 0;
    while (!isUnique && attempts < 5) {
      const existing = await Booking.findOne({ bookingReference: reference });
      if (!existing) {
        isUnique = true;
      } else {
        reference = generateBookingReference();
        attempts++;
      }
    }

    const totalAmount = unitPrice * numTickets;

    // Attach logged-in userId if available
    const userId = req.user?.id ? req.user.id : null;

    // 6. Create Booking Document in MongoDB
    const booking = await Booking.create({
      eventId: event._id,
      userId,
      customerName: customerName.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      ticketType: selectedTier ? selectedTier.name : ticketType.trim(),
      quantity: numTickets,
      unitPrice,
      totalAmount,
      bookingStatus: "Confirmed",
      bookingReference: reference,
      notes: notes ? notes.trim() : ""
    });

    const populatedBooking = await Booking.findById(booking._id).populate(
      "eventId",
      "title slug startDate endDate startTime endTime venue city address image organizer status ticketUrl"
    );

    return res.status(201).json({
      success: true,
      message: "Ticket booking confirmed successfully!",
      booking: populatedBooking,
      remainingTickets: updatedEvent.availableTickets
    });
  } catch (error) {
    console.error("Error creating booking:", error);
    return res.status(500).json({
      success: false,
      message: "An error occurred while processing your booking. Please try again."
    });
  }
};

/**
 * GET /api/bookings/my
 * Get bookings for the authenticated user or by email query
 */
const getMyBookings = async (req, res) => {
  try {
    const filter = {};

    if (req.user?.id) {
      // Find by user ID or user email
      const user = await User.findById(req.user.id);
      if (user) {
        filter.$or = [{ userId: req.user.id }, { email: user.email.toLowerCase() }];
      } else {
        filter.userId = req.user.id;
      }
    } else if (req.query.email) {
      filter.email = req.query.email.trim().toLowerCase();
    } else if (req.query.reference) {
      filter.bookingReference = req.query.reference.trim().toUpperCase();
    } else if (req.query.references) {
      const refs = req.query.references.split(",").map((r) => r.trim().toUpperCase()).filter(Boolean);
      filter.bookingReference = { $in: refs };
    } else {
      return res.status(200).json({
        success: true,
        count: 0,
        bookings: []
      });
    }

    const bookings = await Booking.find(filter)
      .populate("eventId", "title slug startDate endDate startTime endTime venue city address image status")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: bookings.length,
      bookings
    });
  } catch (error) {
    console.error("Error in getMyBookings:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

/**
 * GET /api/bookings/reference/:reference
 * Public / direct reference lookup for booking verification
 */
const getBookingByReference = async (req, res) => {
  try {
    const { reference } = req.params;
    if (!reference) {
      return res.status(400).json({ success: false, message: "Booking reference is required" });
    }

    const booking = await Booking.findOne({
      bookingReference: reference.trim().toUpperCase()
    }).populate("eventId", "title slug startDate endDate startTime endTime venue city address image organizer status ticketUrl");

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: `No booking found with reference code ${reference}`
      });
    }

    return res.status(200).json({
      success: true,
      booking
    });
  } catch (error) {
    console.error("Error in getBookingByReference:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

/**
 * GET /api/bookings/:id
 * Get single booking by MongoDB ID
 */
const getBookingById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid booking ID" });
    }

    const booking = await Booking.findById(id).populate(
      "eventId",
      "title slug startDate endDate startTime endTime venue city address image organizer status"
    );

    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    return res.status(200).json({ success: true, booking });
  } catch (error) {
    console.error("Error in getBookingById:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

/**
 * PATCH /api/bookings/:id/cancel
 * User cancels their own booking pass (restores available tickets)
 */
const cancelUserBooking = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid booking ID" });
    }

    const booking = await Booking.findById(id);
    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    if (booking.bookingStatus === "Cancelled") {
      return res.status(400).json({ success: false, message: "Booking is already cancelled" });
    }

    // Restore available tickets atomically
    await Event.findByIdAndUpdate(booking.eventId, {
      $inc: { availableTickets: booking.quantity }
    });

    booking.bookingStatus = "Cancelled";
    await booking.save();

    const updatedBooking = await Booking.findById(id).populate(
      "eventId",
      "title slug startDate venue city image"
    );

    return res.status(200).json({
      success: true,
      message: "Pass cancelled successfully. Reserved tickets have been released.",
      booking: updatedBooking
    });
  } catch (error) {
    console.error("Error in cancelUserBooking:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

/**
 * GET /api/admin/bookings
 * Admin view all bookings with search, event filter, status filter, and pagination
 */
const getAdminBookings = async (req, res) => {
  try {
    const { eventId, status, search, limit = 50, page = 1 } = req.query;
    const filter = {};

    if (eventId && mongoose.Types.ObjectId.isValid(eventId)) {
      filter.eventId = eventId;
    }

    if (status && status !== "all") {
      filter.bookingStatus = status;
    }

    if (search && search.trim()) {
      const reg = new RegExp(search.trim(), "i");
      filter.$or = [
        { bookingReference: reg },
        { customerName: reg },
        { email: reg },
        { phone: reg }
      ];
    }

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const [bookings, total] = await Promise.all([
      Booking.find(filter)
        .populate("eventId", "title slug startDate city venue image ticketPrice")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      Booking.countDocuments(filter)
    ]);

    return res.status(200).json({
      success: true,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
      bookings
    });
  } catch (error) {
    console.error("Error in getAdminBookings:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

/**
 * PATCH /api/admin/bookings/:id/status
 * Admin update booking status (Confirmed, Pending, Cancelled)
 */
const updateBookingStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid booking ID" });
    }

    const validStatuses = ["Confirmed", "Pending", "Cancelled"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(", ")}`
      });
    }

    const booking = await Booking.findById(id);
    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    const previousStatus = booking.bookingStatus;

    if (previousStatus !== status) {
      // If moving from Confirmed/Pending -> Cancelled: restore available tickets
      if (status === "Cancelled" && (previousStatus === "Confirmed" || previousStatus === "Pending")) {
        await Event.findByIdAndUpdate(booking.eventId, {
          $inc: { availableTickets: booking.quantity }
        });
      }

      // If moving from Cancelled -> Confirmed/Pending: decrement available tickets
      if (previousStatus === "Cancelled" && (status === "Confirmed" || status === "Pending")) {
        await Event.findByIdAndUpdate(booking.eventId, {
          $inc: { availableTickets: -booking.quantity }
        });
      }

      booking.bookingStatus = status;
      await booking.save();
    }

    const updated = await Booking.findById(id).populate(
      "eventId",
      "title slug startDate venue city image"
    );

    return res.status(200).json({
      success: true,
      message: `Booking status updated to ${status}`,
      booking: updated
    });
  } catch (error) {
    console.error("Error in updateBookingStatus:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

/**
 * GET /api/events/:eventId/bookings
 * Get all bookings for a specific event (Admin or event organizer)
 */
const getEventBookings = async (req, res) => {
  try {
    const { eventId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(eventId)) {
      return res.status(400).json({ success: false, message: "Invalid event ID" });
    }

    const bookings = await Booking.find({ eventId })
      .populate("userId", "name email")
      .sort({ createdAt: -1 });

    const totalBooked = bookings
      .filter((b) => b.bookingStatus !== "Cancelled")
      .reduce((sum, b) => sum + b.quantity, 0);

    const totalRevenue = bookings
      .filter((b) => b.bookingStatus === "Confirmed")
      .reduce((sum, b) => sum + b.totalAmount, 0);

    return res.status(200).json({
      success: true,
      count: bookings.length,
      totalBooked,
      totalRevenue,
      bookings
    });
  } catch (error) {
    console.error("Error in getEventBookings:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

module.exports = {
  createBooking,
  getMyBookings,
  getBookingByReference,
  getBookingById,
  cancelUserBooking,
  getAdminBookings,
  updateBookingStatus,
  getEventBookings
};
