const mongoose = require("mongoose");
const Bookmark = require("../models/Bookmark");
const Content = require("../models/Content");

// Get current user's bookmarks
const getUserBookmarks = async (req, res) => {
  try {
    const bookmarks = await Bookmark.find({ user: req.user.id }).populate(
      "content",
      "title slug contentType thumbnail description"
    );

    return res.status(200).json({
      success: true,
      count: bookmarks.length,
      bookmarks: bookmarks
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// Create a bookmark for the current user
const createBookmark = async (req, res) => {
  try {
    const { content, note } = req.body;

    if (!content) {
      return res.status(400).json({ success: false, message: "Content ID is required" });
    }

    if (!mongoose.Types.ObjectId.isValid(content)) {
      return res.status(400).json({ success: false, message: "Invalid content ID format" });
    }

    const contentExists = await Content.findById(content);
    if (!contentExists) {
      return res.status(404).json({ success: false, message: "Content not found" });
    }

    const existing = await Bookmark.findOne({ user: req.user.id, content });
    if (existing) {
      return res.status(409).json({ success: false, message: "Content is already bookmarked" });
    }

    const bookmark = await Bookmark.create({
      user: req.user.id,
      content,
      note: note ? note.trim() : ""
    });

    const populated = await Bookmark.findById(bookmark._id).populate(
      "content",
      "title slug contentType thumbnail description"
    );

    return res.status(201).json({
      success: true,
      message: "Bookmark created successfully",
      bookmark: populated
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ success: false, message: "Content is already bookmarked" });
    }
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// Delete a bookmark — only the owner can delete their own bookmark
const deleteBookmark = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid bookmark ID format" });
    }

    const bookmark = await Bookmark.findById(id);
    if (!bookmark) {
      return res.status(404).json({ success: false, message: "Bookmark not found" });
    }

    // Ownership check — User A cannot delete User B's bookmark
    if (bookmark.user.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: "You are not authorized to delete this bookmark" });
    }

    await Bookmark.findByIdAndDelete(id);

    return res.status(200).json({ success: true, message: "Bookmark removed successfully" });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

module.exports = {
  getUserBookmarks,
  createBookmark,
  deleteBookmark
};

