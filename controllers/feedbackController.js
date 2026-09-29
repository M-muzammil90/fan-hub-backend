const mongoose = require("mongoose");
const Feedback = require("../models/Feedback");

// ADMIN: Get all feedback
const getFeedback = async (req, res) => {
  try {
    const filter = {};
    if (req.query.status) {
      const allowedStatuses = ["pending", "reviewed", "resolved"];
      if (!allowedStatuses.includes(req.query.status)) {
        return res.status(400).json({ success: false, message: "Invalid status filter. Allowed: pending, reviewed, resolved" });
      }
      filter.status = req.query.status;
    }
    if (req.query.type) {
      const allowedTypes = ["bug", "suggestion", "query"];
      if (!allowedTypes.includes(req.query.type)) {
        return res.status(400).json({ success: false, message: "Invalid type filter. Allowed: bug, suggestion, query" });
      }
      filter.type = req.query.type;
    }

    const feedbackList = await Feedback.find(filter).populate("user", "name email");

    return res.status(200).json({
      success: true,
      count: feedbackList.length,
      feedback: feedbackList
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// ADMIN: Get single feedback by ID
const getFeedbackById = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid feedback ID format" });
    }

    const feedback = await Feedback.findById(req.params.id).populate("user", "name email");
    if (!feedback) {
      return res.status(404).json({ success: false, message: "Feedback not found" });
    }

    return res.status(200).json({ success: true, feedback: feedback });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// ADMIN: Update feedback status
const updateFeedback = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid feedback ID format" });
    }

    const feedback = await Feedback.findById(id);
    if (!feedback) {
      return res.status(404).json({ success: false, message: "Feedback not found" });
    }

    const { status } = req.body;

    if (status === undefined) {
      return res.status(400).json({ success: false, message: "Status field is required for update" });
    }

    const allowedStatuses = ["pending", "reviewed", "resolved"];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status value. Allowed: pending, reviewed, resolved"
      });
    }

    feedback.status = status;
    await feedback.save();

    const updated = await Feedback.findById(id).populate("user", "name email");

    return res.status(200).json({
      success: true,
      message: "Feedback status updated successfully",
      feedback: updated
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// ADMIN: Delete feedback
const deleteFeedback = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid feedback ID format" });
    }

    const feedback = await Feedback.findById(id);
    if (!feedback) {
      return res.status(404).json({ success: false, message: "Feedback not found" });
    }

    await Feedback.findByIdAndDelete(id);

    return res.status(200).json({ success: true, message: "Feedback deleted successfully" });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// USER: Create feedback
const createFeedback = async (req, res) => {
  try {
    const { type, message } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, message: "Feedback message is required" });
    }

    const allowedTypes = ["bug", "suggestion", "query"];
    const normalizedType = allowedTypes.includes(type) ? type : "query";

    // User ID from JWT. If user is not logged in, user is null
    const userId = req.user ? req.user.id : null;

    const feedback = await Feedback.create({
      user: userId,
      type: normalizedType,
      message: message.trim(),
      status: "pending" // Always starts as pending
    });

    return res.status(201).json({
      success: true,
      message: "Feedback submitted successfully",
      feedback: {
        id: feedback._id,
        type: feedback.type,
        message: feedback.message,
        status: feedback.status,
        createdAt: feedback.createdAt
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

module.exports = {
  getFeedback,
  getFeedbackById,
  updateFeedback,
  deleteFeedback,
  createFeedback
};

