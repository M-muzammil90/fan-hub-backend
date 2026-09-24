const Rating = require("../models/Rating");

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
    return res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

module.exports = {
  getUserRatings
};
