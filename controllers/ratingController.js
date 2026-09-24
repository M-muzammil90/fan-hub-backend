const mongoose = require("mongoose");
const Rating = require("../models/Rating");
const Content = require("../models/Content");

// Get current user's ratings
const getUserRatings = async (req, res) => {
  try {
    const ratings = await Rating.find({ user: req.user.id }).populate(
      "content",
      "title slug contentType thumbnail"
    );

    return res.status(200).json({
      success: true,
      count: ratings.length,
      ratings: ratings
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// Create a rating for the current user
const createRating = async (req, res) => {
  try {
    const { content, rating } = req.body;

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
      return res.status(409).json({ success: false, message: "You have already rated this content. Use PUT to update." });
    }

    const newRating = await Rating.create({
      user: req.user.id,
      content,
      rating: ratingNum
    });

    const populated = await Rating.findById(newRating._id).populate(
      "content",
      "title slug contentType thumbnail"
    );

    return res.status(201).json({
      success: true,
      message: "Rating submitted successfully",
      rating: populated
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ success: false, message: "You have already rated this content" });
    }
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// Update a rating — only the owner can update their own rating
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

    // Ownership check — User A cannot update User B's rating
    if (ratingDoc.user.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: "You are not authorized to update this rating" });
    }

    const { rating } = req.body;

    if (rating === undefined) {
      return res.status(400).json({ success: false, message: "Rating value is required" });
    }

    const ratingNum = Number(rating);
    if (!Number.isInteger(ratingNum) || ratingNum < 1 || ratingNum > 5) {
      return res.status(400).json({ success: false, message: "Rating must be an integer between 1 and 5" });
    }

    ratingDoc.rating = ratingNum;
    await ratingDoc.save();

    const updated = await Rating.findById(id).populate("content", "title slug contentType thumbnail");

    return res.status(200).json({
      success: true,
      message: "Rating updated successfully",
      rating: updated
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// Delete a rating — only the owner can delete their own rating
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

    // Ownership check
    if (ratingDoc.user.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: "You are not authorized to delete this rating" });
    }

    await Rating.findByIdAndDelete(id);

    return res.status(200).json({ success: true, message: "Rating removed successfully" });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

module.exports = {
  getUserRatings,
  createRating,
  updateRating,
  deleteRating
};

