const Bookmark = require("../models/Bookmark");

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
    return res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

module.exports = {
  getUserBookmarks
};
