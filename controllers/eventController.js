const mongoose = require("mongoose");
const Event = require("../models/Event");
const Category = require("../models/Category");
const cloudinaryService = require("../services/cloudinary.service");

// Calculate Haversine distance in kilometers
const calculateDistanceKm = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
};

// GET /api/events - Filterable events listing
const getEvents = async (req, res) => {
  try {
    const {
      category,
      city,
      type,
      eventType,
      status,
      search,
      q,
      startDate,
      endDate,
      isFeatured,
      isPublished,
      includeUnpublished,
      limit,
      page,
      sort
    } = req.query;

    const filter = {};

    // Published filter (by default only return published for public requests)
    if (includeUnpublished !== "true" && isPublished === undefined) {
      filter.isPublished = true;
    } else if (isPublished !== undefined) {
      filter.isPublished = isPublished === "true";
    }

    // Category filter (supports Category ID or slug or 'all')
    if (category && category.toLowerCase() !== "all") {
      if (mongoose.Types.ObjectId.isValid(category)) {
        filter.category = category;
      } else {
        const catDoc = await Category.findOne({
          $or: [
            { slug: category.toLowerCase().trim() },
            { name: new RegExp(`^${category.trim()}$`, "i") }
          ]
        });
        if (catDoc) {
          filter.category = catDoc._id;
        } else {
          return res.status(200).json({ success: true, count: 0, events: [] });
        }
      }
    }

    // City filter (e.g., Karachi, Lahore, etc.)
    if (city && city.toLowerCase() !== "all" && city.toLowerCase() !== "all cities") {
      filter.city = { $regex: new RegExp(`^${city.trim()}$`, "i") };
    }

    // Event Type filter
    const selectedType = eventType || type;
    if (selectedType && selectedType.toLowerCase() !== "all") {
      filter.eventType = { $regex: new RegExp(`^${selectedType.trim()}$`, "i") };
    }

    // Status filter
    if (status && status.toLowerCase() !== "all") {
      filter.status = { $regex: new RegExp(`^${status.trim()}$`, "i") };
    }

    // Featured filter
    if (isFeatured !== undefined) {
      filter.isFeatured = isFeatured === "true";
    }

    // Search query across title, description, venue, city, organizer, eventType
    const searchTerm = search || q;
    if (searchTerm && searchTerm.trim()) {
      const reg = new RegExp(searchTerm.trim(), "i");
      filter.$or = [
        { title: reg },
        { description: reg },
        { venue: reg },
        { address: reg },
        { city: reg },
        { organizer: reg },
        { eventType: reg }
      ];
    }

    // Date range filtering
    if (startDate) {
      const start = new Date(startDate);
      if (!isNaN(start.getTime())) {
        filter.startDate = { ...filter.startDate, $gte: start };
      }
    }
    if (endDate) {
      const end = new Date(endDate);
      if (!isNaN(end.getTime())) {
        filter.startDate = { ...filter.startDate, $lte: end };
      }
    }

    // Sorting
    let sortOption = { startDate: 1 };
    if (sort === "newest") {
      sortOption = { createdAt: -1 };
    } else if (sort === "popular") {
      sortOption = { viewCount: -1 };
    } else if (sort === "date_desc") {
      sortOption = { startDate: -1 };
    }

    let query = Event.find(filter).populate("category", "name slug icon").sort(sortOption);

    if (limit) {
      const parsedLimit = parseInt(limit, 10);
      if (!isNaN(parsedLimit) && parsedLimit > 0) {
        const parsedPage = parseInt(page, 10) || 1;
        query = query.skip((parsedPage - 1) * parsedLimit).limit(parsedLimit);
      }
    }

    const events = await query.exec();

    return res.status(200).json({
      success: true,
      count: events.length,
      events
    });
  } catch (error) {
    console.error("Error in getEvents:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// GET /api/events/upcoming - Priority upcoming published events
const getUpcomingEvents = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 10;
    const now = new Date();
    // Allow events from start of today
    now.setHours(0, 0, 0, 0);

    const events = await Event.find({
      isPublished: true,
      status: { $ne: "Cancelled" },
      startDate: { $gte: now }
    })
      .populate("category", "name slug")
      .sort({ startDate: 1 })
      .limit(limit);

    // If fewer upcoming than requested, fallback to any published upcoming/ongoing
    if (events.length === 0) {
      const fallbackEvents = await Event.find({ isPublished: true })
        .populate("category", "name slug")
        .sort({ startDate: -1 })
        .limit(limit);
      return res.status(200).json({ success: true, count: fallbackEvents.length, events: fallbackEvents });
    }

    return res.status(200).json({
      success: true,
      count: events.length,
      events
    });
  } catch (error) {
    console.error("Error in getUpcomingEvents:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// GET /api/events/featured - Featured event banners/highlights
const getFeaturedEvents = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 5;
    let events = await Event.find({
      isPublished: true,
      isFeatured: true
    })
      .populate("category", "name slug")
      .sort({ startDate: 1 })
      .limit(limit);

    if (events.length === 0) {
      // Fallback to top published events
      events = await Event.find({ isPublished: true })
        .populate("category", "name slug")
        .sort({ startDate: 1 })
        .limit(limit);
    }

    return res.status(200).json({
      success: true,
      count: events.length,
      events
    });
  } catch (error) {
    console.error("Error in getFeaturedEvents:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// GET /api/events/nearby - Location-aware distance calculation
const getNearbyEvents = async (req, res) => {
  try {
    const { lat, lng, radius } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({
        success: false,
        message: "Latitude (lat) and Longitude (lng) query parameters are required"
      });
    }

    const userLat = parseFloat(lat);
    const userLng = parseFloat(lng);
    const radiusKm = parseFloat(radius) || 200; // default 200km radius

    if (isNaN(userLat) || isNaN(userLng)) {
      return res.status(400).json({ success: false, message: "Invalid latitude or longitude values" });
    }

    // Find published events with valid coordinates
    const events = await Event.find({
      isPublished: true,
      latitude: { $exists: true, $ne: null },
      longitude: { $exists: true, $ne: null }
    }).populate("category", "name slug");

    // Calculate distance and filter/sort
    const eventsWithDistance = events
      .map((event) => {
        const distance = calculateDistanceKm(userLat, userLng, event.latitude, event.longitude);
        return {
          ...event.toObject(),
          distanceKm: distance
        };
      })
      .filter((event) => event.distanceKm <= radiusKm)
      .sort((a, b) => a.distanceKm - b.distanceKm);

    return res.status(200).json({
      success: true,
      count: eventsWithDistance.length,
      userLocation: { lat: userLat, lng: userLng },
      events: eventsWithDistance
    });
  } catch (error) {
    console.error("Error in getNearbyEvents:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// GET /api/events/calendar - Calendar view schedule
const getCalendarEvents = async (req, res) => {
  try {
    const { month, year, city } = req.query;

    const filter = { isPublished: true };

    if (city && city.toLowerCase() !== "all" && city.toLowerCase() !== "all cities") {
      filter.city = { $regex: new RegExp(`^${city.trim()}$`, "i") };
    }

    if (year) {
      const parsedYear = parseInt(year, 10);
      let startDate, endDate;

      if (month) {
        const parsedMonth = parseInt(month, 10) - 1; // 0-indexed month
        startDate = new Date(parsedYear, parsedMonth, 1);
        endDate = new Date(parsedYear, parsedMonth + 1, 0, 23, 59, 59);
      } else {
        startDate = new Date(parsedYear, 0, 1);
        endDate = new Date(parsedYear, 11, 31, 23, 59, 59);
      }

      filter.startDate = { $gte: startDate, $lte: endDate };
    }

    const events = await Event.find(filter)
      .populate("category", "name slug")
      .sort({ startDate: 1 });

    return res.status(200).json({
      success: true,
      count: events.length,
      events
    });
  } catch (error) {
    console.error("Error in getCalendarEvents:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// GET /api/events/:slugOrId - Single event details
const getEventBySlugOrId = async (req, res) => {
  try {
    const { id } = req.params; // Could be slug or Mongo ObjectId

    let event = null;
    if (mongoose.Types.ObjectId.isValid(id)) {
      event = await Event.findById(id).populate("category", "name slug");
    }

    if (!event) {
      event = await Event.findOne({ slug: id.toLowerCase().trim() }).populate("category", "name slug");
    }

    if (!event) {
      return res.status(404).json({ success: false, message: "Event not found" });
    }

    // Increment views asynchronously
    Event.findByIdAndUpdate(event._id, { $inc: { viewCount: 1 } }).exec();

    return res.status(200).json({ success: true, event });
  } catch (error) {
    console.error("Error in getEventBySlugOrId:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// POST /api/events - Admin create event
const createEvent = async (req, res) => {
  let uploadedAsset = null;
  try {
    const {
      title,
      slug,
      description,
      category,
      city,
      venue,
      address,
      latitude,
      longitude,
      startDate,
      endDate,
      startTime,
      endTime,
      organizer,
      ticketUrl,
      ticketPrice,
      totalTickets,
      availableTickets,
      ticketTiers,
      eventType,
      status,
      isFeatured,
      isPublished,
      image
    } = req.body;

    if (!title || !title.trim() || !category || !city || !startDate) {
      return res.status(400).json({
        success: false,
        message: "Title, category, city, and startDate are required"
      });
    }

    if (!mongoose.Types.ObjectId.isValid(category)) {
      return res.status(400).json({ success: false, message: "Invalid category ID format" });
    }

    const categoryExists = await Category.findById(category);
    if (!categoryExists) {
      return res.status(404).json({ success: false, message: "Referenced category not found" });
    }

    // Generate or format slug
    const normalizedSlug = (slug && slug.trim())
      ? slug.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-")
      : title.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-");

    const existingSlug = await Event.findOne({ slug: normalizedSlug });
    if (existingSlug) {
      return res.status(409).json({ success: false, message: "Event slug already exists. Please choose a unique slug." });
    }

    const parsedStartDate = new Date(startDate);
    if (isNaN(parsedStartDate.getTime())) {
      return res.status(400).json({ success: false, message: "Invalid startDate format" });
    }

    let parsedEndDate = undefined;
    if (endDate) {
      parsedEndDate = new Date(endDate);
      if (isNaN(parsedEndDate.getTime())) {
        return res.status(400).json({ success: false, message: "Invalid endDate format" });
      }
      if (parsedEndDate < parsedStartDate) {
        return res.status(400).json({ success: false, message: "endDate cannot be before startDate" });
      }
    }

    let finalImageUrl = image || "";
    let finalImagePublicId = "";

    if (req.file) {
      uploadedAsset = await cloudinaryService.uploadImage(req.file, {
        folder: "fan-hub-plus/events"
      });
      finalImageUrl = uploadedAsset.url;
      finalImagePublicId = uploadedAsset.publicId;
    }

    const parsedTotalTickets = totalTickets !== undefined && totalTickets !== "" ? Number(totalTickets) : 100;
    const parsedAvailableTickets = availableTickets !== undefined && availableTickets !== "" ? Number(availableTickets) : parsedTotalTickets;
    const parsedTicketPrice = ticketPrice !== undefined && ticketPrice !== "" ? Number(ticketPrice) : 1500;

    let parsedTicketTiers = undefined;
    if (ticketTiers) {
      try {
        parsedTicketTiers = typeof ticketTiers === "string" ? JSON.parse(ticketTiers) : ticketTiers;
      } catch (e) {
        parsedTicketTiers = undefined;
      }
    }

    const newEvent = await Event.create({
      title: title.trim(),
      slug: normalizedSlug,
      description: description ? description.trim() : "",
      category,
      city: city.trim(),
      venue: venue ? venue.trim() : "",
      address: address ? address.trim() : "",
      latitude: latitude !== undefined && latitude !== "" ? Number(latitude) : undefined,
      longitude: longitude !== undefined && longitude !== "" ? Number(longitude) : undefined,
      startDate: parsedStartDate,
      endDate: parsedEndDate,
      startTime: startTime ? startTime.trim() : "06:00 PM",
      endTime: endTime ? endTime.trim() : "10:00 PM",
      organizer: organizer ? organizer.trim() : "FanHub Community",
      ticketUrl: ticketUrl ? ticketUrl.trim() : "",
      ticketPrice: parsedTicketPrice,
      totalTickets: parsedTotalTickets,
      availableTickets: parsedAvailableTickets,
      ticketTiers: parsedTicketTiers,
      eventType: eventType || "Convention",
      status: status || "Upcoming",
      image: finalImageUrl,
      imagePublicId: finalImagePublicId,
      isFeatured: isFeatured === true || isFeatured === "true",
      isPublished: isPublished !== undefined ? (isPublished === true || isPublished === "true") : true
    });

    const populatedEvent = await Event.findById(newEvent._id).populate("category", "name slug");

    return res.status(201).json({
      success: true,
      message: "Event created successfully",
      event: populatedEvent
    });
  } catch (error) {
    console.error("Error creating event:", error);
    if (uploadedAsset?.publicId) {
      await cloudinaryService.deleteFile(uploadedAsset.publicId, "image");
    }
    if (error.code === 11000) {
      return res.status(409).json({ success: false, message: "Event slug already exists" });
    }
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// PUT /api/events/:id - Admin update event
const updateEvent = async (req, res) => {
  let uploadedAsset = null;
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid event ID format" });
    }

    const event = await Event.findById(id);
    if (!event) {
      return res.status(404).json({ success: false, message: "Event not found" });
    }

    const {
      title,
      slug,
      description,
      category,
      city,
      venue,
      address,
      latitude,
      longitude,
      startDate,
      endDate,
      startTime,
      endTime,
      organizer,
      ticketUrl,
      ticketPrice,
      totalTickets,
      availableTickets,
      ticketTiers,
      eventType,
      status,
      isFeatured,
      isPublished,
      image
    } = req.body;

    if (title !== undefined) {
      if (!title || !title.trim()) return res.status(400).json({ success: false, message: "Title cannot be empty" });
      event.title = title.trim();
    }

    if (slug !== undefined) {
      if (!slug || !slug.trim()) return res.status(400).json({ success: false, message: "Slug cannot be empty" });
      const normalizedSlug = slug.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-");
      if (normalizedSlug !== event.slug) {
        const existingSlug = await Event.findOne({ slug: normalizedSlug, _id: { $ne: id } });
        if (existingSlug) return res.status(409).json({ success: false, message: "Event slug already exists" });
        event.slug = normalizedSlug;
      }
    }

    if (category !== undefined) {
      if (!mongoose.Types.ObjectId.isValid(category)) {
        return res.status(400).json({ success: false, message: "Invalid category ID format" });
      }
      const categoryExists = await Category.findById(category);
      if (!categoryExists) return res.status(404).json({ success: false, message: "Referenced category not found" });
      event.category = category;
    }

    if (city !== undefined) event.city = city.trim();
    if (venue !== undefined) event.venue = venue.trim();
    if (address !== undefined) event.address = address.trim();
    if (startTime !== undefined) event.startTime = startTime.trim();
    if (endTime !== undefined) event.endTime = endTime.trim();
    if (organizer !== undefined) event.organizer = organizer.trim();
    if (ticketUrl !== undefined) event.ticketUrl = ticketUrl.trim();
    if (ticketPrice !== undefined && ticketPrice !== "") event.ticketPrice = Number(ticketPrice);
    if (totalTickets !== undefined && totalTickets !== "") event.totalTickets = Number(totalTickets);
    if (availableTickets !== undefined && availableTickets !== "") event.availableTickets = Number(availableTickets);
    if (ticketTiers !== undefined) {
      try {
        event.ticketTiers = typeof ticketTiers === "string" ? JSON.parse(ticketTiers) : ticketTiers;
      } catch (e) {
        // ignore JSON parse error
      }
    }
    if (eventType !== undefined) event.eventType = eventType;
    if (status !== undefined) event.status = status;
    if (isFeatured !== undefined) event.isFeatured = isFeatured === true || isFeatured === "true";
    if (isPublished !== undefined) event.isPublished = isPublished === true || isPublished === "true";

    if (startDate !== undefined) {
      const parsed = new Date(startDate);
      if (isNaN(parsed.getTime())) return res.status(400).json({ success: false, message: "Invalid startDate format" });
      event.startDate = parsed;
    }

    if (endDate !== undefined) {
      if (endDate) {
        const parsedEnd = new Date(endDate);
        if (isNaN(parsedEnd.getTime())) return res.status(400).json({ success: false, message: "Invalid endDate format" });
        event.endDate = parsedEnd;
      } else {
        event.endDate = undefined;
      }
    }

    if (latitude !== undefined) {
      event.latitude = latitude !== "" && latitude !== null ? Number(latitude) : undefined;
    }
    if (longitude !== undefined) {
      event.longitude = longitude !== "" && longitude !== null ? Number(longitude) : undefined;
    }
    if (description !== undefined) event.description = description.trim();

    let oldPublicIdToDelete = null;
    if (req.file) {
      uploadedAsset = await cloudinaryService.uploadImage(req.file, {
        folder: "fan-hub-plus/events"
      });
      oldPublicIdToDelete = event.imagePublicId || cloudinaryService.extractPublicId(event.image);
      event.image = uploadedAsset.url;
      event.imagePublicId = uploadedAsset.publicId;
    } else if (image !== undefined && image !== event.image) {
      event.image = image;
      event.imagePublicId = "";
    }

    await event.save();

    if (oldPublicIdToDelete) {
      await cloudinaryService.deleteFile(oldPublicIdToDelete, "image");
    }

    const updatedEvent = await Event.findById(id).populate("category", "name slug");

    return res.status(200).json({
      success: true,
      message: "Event updated successfully",
      event: updatedEvent
    });
  } catch (error) {
    console.error("Error updating event:", error);
    if (uploadedAsset?.publicId) {
      await cloudinaryService.deleteFile(uploadedAsset.publicId, "image");
    }
    if (error.code === 11000) {
      return res.status(409).json({ success: false, message: "Event slug already exists" });
    }
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// DELETE /api/events/:id - Admin delete event
const deleteEvent = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid event ID format" });
    }

    const event = await Event.findById(id);
    if (!event) {
      return res.status(404).json({ success: false, message: "Event not found" });
    }

    const publicId = event.imagePublicId || cloudinaryService.extractPublicId(event.image);
    if (publicId) {
      await cloudinaryService.deleteFile(publicId, "image");
    }

    await Event.findByIdAndDelete(id);

    return res.status(200).json({ success: true, message: "Event deleted successfully" });
  } catch (error) {
    console.error("Error deleting event:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// PATCH /api/events/:id/publish - Admin toggle publish status
const togglePublishEvent = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid event ID format" });
    }

    const event = await Event.findById(id);
    if (!event) {
      return res.status(404).json({ success: false, message: "Event not found" });
    }

    const isPublished = req.body.isPublished !== undefined ? Boolean(req.body.isPublished) : !event.isPublished;
    event.isPublished = isPublished;
    await event.save();

    return res.status(200).json({
      success: true,
      message: `Event ${isPublished ? "published" : "unpublished"} successfully`,
      event
    });
  } catch (error) {
    console.error("Error in togglePublishEvent:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// PATCH /api/events/:id/feature - Admin toggle featured status
const toggleFeatureEvent = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid event ID format" });
    }

    const event = await Event.findById(id);
    if (!event) {
      return res.status(404).json({ success: false, message: "Event not found" });
    }

    const isFeatured = req.body.isFeatured !== undefined 
      ? (req.body.isFeatured === true || req.body.isFeatured === "true" || req.body.isFeatured === 1 || req.body.isFeatured === "1") 
      : !event.isFeatured;
    event.isFeatured = isFeatured;
    await event.save();

    return res.status(200).json({
      success: true,
      message: `Event ${isFeatured ? "featured" : "unfeatured"} successfully`,
      event
    });
  } catch (error) {
    console.error("Error in toggleFeatureEvent:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

module.exports = {
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
};
