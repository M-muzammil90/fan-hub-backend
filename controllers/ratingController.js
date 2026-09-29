const mongoose = require("mongoose");
const Rating = require("../models/Rating");
const Content = require("../models/Content");

const populateFields = "title slug contentType thumbnail";
const approvedFilter = {
  $or: [{ status: "approved" }, { status: { $exists: false } }]
};

const getUserRatings = async (req, res) => {
  try {
    const ratings = await Rating.find({ user: req.user.id })
      .populate("content", populateFields)
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: ratings.length,
      ratings
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

const getApprovedRatingsForContent = async (req, res) => {
  try {
    const { contentId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(contentId)) {
      return res.status(400).json({ success: false, message: "Invalid content ID format" });
    }

    const ratings = await Rating.find({
      content: contentId,
      ...approvedFilter
    })
      .populate("user", "name avatar")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: ratings.length,
      ratings
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

const createRating = async (req, res) => {
  try {
    const { content, rating, review } = req.body;

    if (!content || rating === undefined) {
      return res.status(400).json({ success: false, message: "Content ID and rating are required" });
    }

    if (!mongoose.Types.ObjectId.isValid(content)) {
      return res.status(400).json({ success: false, message: "Invalid content ID format" });
    }

    const ratingNum = Number(rating);
    if (!Number.isInteger(ratingNum) || ratingNum < 1 || ratingNum > 5) {
      return res.status(400).json({ success: false, message: "Rating must be an integer between 1 and 5" });
    }

    const contentExists = await Content.findById(content);
    if (!contentExists) {
      return res.status(404).json({ success: false, message: "Content not found" });
    }

    const existing = await Rating.findOne({ user: req.user.id, content });
    if (existing) {
      existing.rating = ratingNum;
      existing.review = typeof review === "string" ? review.trim() : existing.review;
      existing.status = "pending";
      await existing.save();
      const populated = await Rating.findById(existing._id).populate("content", populateFields);
      return res.status(200).json({
        success: true,
        message: "Review updated and sent for admin approval",
        rating: populated
      });
    }

    const newRating = await Rating.create({
      user: req.user.id,
      content,
      rating: ratingNum,
      review: typeof review === "string" ? review.trim() : "",
      status: "pending"
    });

    const populated = await Rating.findById(newRating._id).populate("content", populateFields);

    return res.status(201).json({
      success: true,
      message: "Review submitted. It will appear publicly after admin approval.",
      rating: populated
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ success: false, message: "You have already rated this content" });
    }
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

const updateRating = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid rating ID format" });
    }

    const ratingDoc = await Rating.findById(id);
    if (!ratingDoc) {
      return res.status(404).json({ success: false, message: "Rating not found" });
    }

    if (ratingDoc.user.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: "You are not authorized to update this rating" });
    }

    const { rating, review } = req.body;

    if (rating !== undefined) {
      const ratingNum = Number(rating);
      if (!Number.isInteger(ratingNum) || ratingNum < 1 || ratingNum > 5) {
        return res.status(400).json({ success: false, message: "Rating must be an integer between 1 and 5" });
      }
      ratingDoc.rating = ratingNum;
    }

    if (typeof review === "string") {
      ratingDoc.review = review.trim();
    }

    ratingDoc.status = "pending";
    await ratingDoc.save();

    const updated = await Rating.findById(id).populate("content", populateFields);

    return res.status(200).json({
      success: true,
      message: "Review updated and sent for admin approval",
      rating: updated
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

const deleteRating = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid rating ID format" });
    }

    const ratingDoc = await Rating.findById(id);
    if (!ratingDoc) {
      return res.status(404).json({ success: false, message: "Rating not found" });
    }

    if (ratingDoc.user.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: "You are not authorized to delete this rating" });
    }

    await Rating.findByIdAndDelete(id);

    return res.status(200).json({ success: true, message: "Rating removed successfully" });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

const getAdminRatings = async (req, res) => {
  try {
    const filter = {};
    if (req.query.status) {
      const allowed = ["pending", "approved", "rejected"];
      if (!allowed.includes(req.query.status)) {
        return res.status(400).json({ success: false, message: "Invalid status filter" });
      }
      filter.status = req.query.status;
    }

    const ratings = await Rating.find(filter)
      .populate("user", "name email avatar")
      .populate("content", populateFields)
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: ratings.length,
      ratings
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

const moderateRating = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid rating ID format" });
    }

    const ratingDoc = await Rating.findById(id);
    if (!ratingDoc) {
      return res.status(404).json({ success: false, message: "Rating not found" });
    }

    const { status } = req.body;
    const allowed = ["pending", "approved", "rejected"];
    if (!allowed.includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status. Allowed: pending, approved, rejected" });
    }

    ratingDoc.status = status;
    await ratingDoc.save();

    const updated = await Rating.findById(id)
      .populate("user", "name email avatar")
      .populate("content", populateFields);

    return res.status(200).json({
      success: true,
      message: `Review ${status} successfully`,
      rating: updated
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

module.exports = {
  getUserRatings,
  getApprovedRatingsForContent,
  createRating,
  updateRating,
  deleteRating,
  getAdminRatings,
  moderateRating
};
