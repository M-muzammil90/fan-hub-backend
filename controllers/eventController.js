const Event = require("../models/Event");

const getEvents = async (req, res) => {
  try {
    const filter = {};
    if (req.query.category) {
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
    return res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

const getEventById = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id).populate("category", "name slug");
    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found"
      });
    }

    return res.status(200).json({
      success: true,
      event: event
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

module.exports = {
  getEvents,
  getEventById
};
