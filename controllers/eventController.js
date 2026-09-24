const mongoose = require("mongoose");
const Event = require("../models/Event");
const Category = require("../models/Category");

const getEvents = async (req, res) => {
  try {
    const filter = {};
    if (req.query.category) {
      if (!mongoose.Types.ObjectId.isValid(req.query.category)) {
        return res.status(400).json({ success: false, message: "Invalid category ID format" });
      }
      filter.category = req.query.category;
    }
    if (req.query.city) {
      filter.city = { $regex: req.query.city, $options: "i" };
    }

    const events = await Event.find(filter).populate("category", "name slug");

    return res.status(200).json({
      success: true,
      count: events.length,
      events: events
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

const getEventById = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid event ID format" });
    }

    const event = await Event.findById(req.params.id).populate("category", "name slug");
    if (!event) {
      return res.status(404).json({ success: false, message: "Event not found" });
    }

    return res.status(200).json({ success: true, event: event });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

const createEvent = async (req, res) => {
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
      image,
      ticketUrl,
      isFeatured
    } = req.body;

    if (!title || !title.trim() || !slug || !slug.trim() || !category || !city || !startDate) {
      return res.status(400).json({
        success: false,
        message: "Title, slug, category, city, and startDate are required"
      });
    }

    if (!mongoose.Types.ObjectId.isValid(category)) {
      return res.status(400).json({ success: false, message: "Invalid category ID format" });
    }

    const categoryExists = await Category.findById(category);
    if (!categoryExists) {
      return res.status(404).json({ success: false, message: "Referenced category not found" });
    }

    const normalizedSlug = slug.trim().toLowerCase();
    const existingSlug = await Event.findOne({ slug: normalizedSlug });
    if (existingSlug) {
      return res.status(409).json({ success: false, message: "Event slug already exists" });
    }

    const parsedStartDate = new Date(startDate);
    if (isNaN(parsedStartDate.getTime())) {
      return res.status(400).json({ success: false, message: "Invalid startDate format" });
    }

    if (endDate) {
      const parsedEndDate = new Date(endDate);
      if (isNaN(parsedEndDate.getTime())) {
        return res.status(400).json({ success: false, message: "Invalid endDate format" });
      }
      if (parsedEndDate < parsedStartDate) {
        return res.status(400).json({ success: false, message: "endDate cannot be before startDate" });
      }
    }

    if (latitude !== undefined && (latitude < -90 || latitude > 90)) {
      return res.status(400).json({ success: false, message: "Latitude must be between -90 and 90" });
    }
    if (longitude !== undefined && (longitude < -180 || longitude > 180)) {
      return res.status(400).json({ success: false, message: "Longitude must be between -180 and 180" });
    }

    const newEvent = await Event.create({
      title: title.trim(),
      slug: normalizedSlug,
      description: description ? description.trim() : "",
      category,
      city: city.trim(),
      venue: venue ? venue.trim() : "",
      address: address ? address.trim() : "",
      latitude: latitude !== undefined ? Number(latitude) : undefined,
      longitude: longitude !== undefined ? Number(longitude) : undefined,
      startDate: parsedStartDate,
      endDate: endDate ? new Date(endDate) : undefined,
      image: image || "",
      ticketUrl: ticketUrl || "",
      isFeatured: isFeatured !== undefined ? Boolean(isFeatured) : false
    });

    const populatedEvent = await Event.findById(newEvent._id).populate("category", "name slug");

    return res.status(201).json({
      success: true,
      message: "Event created successfully",
      event: populatedEvent
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ success: false, message: "Event slug already exists" });
    }
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

const updateEvent = async (req, res) => {
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
      image,
      ticketUrl,
      isFeatured
    } = req.body;

    if (title !== undefined) {
      if (!title || !title.trim()) return res.status(400).json({ success: false, message: "Title cannot be empty" });
      event.title = title.trim();
    }

    if (slug !== undefined) {
      if (!slug || !slug.trim()) return res.status(400).json({ success: false, message: "Slug cannot be empty" });
      const normalizedSlug = slug.trim().toLowerCase();
      if (normalizedSlug !== event.slug) {
        const existingSlug = await Event.findOne({ slug: normalizedSlug });
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

    if (city !== undefined) {
      if (!city || !city.trim()) return res.status(400).json({ success: false, message: "City cannot be empty" });
      event.city = city.trim();
    }

    if (startDate !== undefined) {
      const parsed = new Date(startDate);
      if (isNaN(parsed.getTime())) return res.status(400).json({ success: false, message: "Invalid startDate format" });
      event.startDate = parsed;
    }

    if (endDate !== undefined) {
      const parsedEnd = new Date(endDate);
      if (isNaN(parsedEnd.getTime())) return res.status(400).json({ success: false, message: "Invalid endDate format" });
      const currentStart = startDate ? new Date(startDate) : event.startDate;
      if (parsedEnd < currentStart) {
        return res.status(400).json({ success: false, message: "endDate cannot be before startDate" });
      }
      event.endDate = parsedEnd;
    }

    if (latitude !== undefined) {
      if (latitude < -90 || latitude > 90) return res.status(400).json({ success: false, message: "Latitude must be between -90 and 90" });
      event.latitude = Number(latitude);
    }
    if (longitude !== undefined) {
      if (longitude < -180 || longitude > 180) return res.status(400).json({ success: false, message: "Longitude must be between -180 and 180" });
      event.longitude = Number(longitude);
    }

    if (description !== undefined) event.description = description.trim();
    if (venue !== undefined) event.venue = venue.trim();
    if (address !== undefined) event.address = address.trim();
    if (image !== undefined) event.image = image;
    if (ticketUrl !== undefined) event.ticketUrl = ticketUrl;
    if (isFeatured !== undefined) event.isFeatured = Boolean(isFeatured);

    await event.save();

    const updatedEvent = await Event.findById(id).populate("category", "name slug");

    return res.status(200).json({
      success: true,
      message: "Event updated successfully",
      event: updatedEvent
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ success: false, message: "Event slug already exists" });
    }
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

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

    await Event.findByIdAndDelete(id);

    return res.status(200).json({ success: true, message: "Event deleted successfully" });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

module.exports = {
  getEvents,
  getEventById,
  createEvent,
  updateEvent,
  deleteEvent
};

