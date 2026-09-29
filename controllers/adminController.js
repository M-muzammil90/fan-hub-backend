const User = require("../models/User");
const Content = require("../models/Content");
const Category = require("../models/Category");
const Character = require("../models/Character");
const Merchandise = require("../models/Merchandise");
const Event = require("../models/Event");
const FanSubmission = require("../models/FanSubmission");
const Rating = require("../models/Rating");
const Bookmark = require("../models/Bookmark");
const Feedback = require("../models/Feedback");
const Series = require("../models/Series");
const Season = require("../models/Season");
const Episode = require("../models/Episode");

const getAnalytics = async (req, res) => {
  try {
    const [
      totalUsers,
      activeUsers,
      totalContent,
      featuredContent,
      totalCategories,
      totalCharacters,
      totalMerchandise,
      totalEvents,
      totalSubmissions,
      pendingSubmissions,
      totalRatings,
      totalBookmarks,
      totalFeedback,
      totalSeries,
      totalSeasons,
      totalEpisodes
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: "user" }),
      Content.countDocuments(),
      Content.countDocuments({ isFeatured: true }),
      Category.countDocuments(),
      Character.countDocuments(),
      Merchandise.countDocuments(),
      Event.countDocuments(),
      FanSubmission.countDocuments(),
      FanSubmission.countDocuments({ status: "pending" }),
      Rating.countDocuments(),
      Bookmark.countDocuments(),
      Feedback.countDocuments(),
      Series.countDocuments(),
      Season.countDocuments(),
      Episode.countDocuments()
    ]);

    const [contentByType, adminUsers] = await Promise.all([
      Content.aggregate([
        { $group: { _id: "$contentType", count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      User.countDocuments({ role: "admin" })
    ]);

    const popularCategories = await Content.aggregate([
      {
        $group: {
          _id: "$category",
          totalContent: { $sum: 1 },
          totalViews: { $sum: "$viewCount" },
          averagePopularity: { $avg: "$popularityScore" }
        }
      },
      { $sort: { totalContent: -1, totalViews: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: "categories",
          localField: "_id",
          foreignField: "_id",
          as: "categoryDetails"
        }
      },
      { $unwind: "$categoryDetails" },
      {
        $project: {
          _id: "$categoryDetails._id",
          name: "$categoryDetails.name",
          slug: "$categoryDetails.slug",
          totalContent: 1,
          totalViews: 1,
          averagePopularity: { $round: ["$averagePopularity", 1] }
        }
      }
    ]);

    return res.status(200).json({
      success: true,
      analytics: {
        users: {
          totalUsers,
          activeUsers,
          adminUsers
        },
        content: {
          totalContent,
          featuredContent,
          byType: contentByType || []
        },
        popularCategories: popularCategories || [],
        activity: {
          totalCategories,
          totalCharacters,
          totalMerchandise,
          totalEvents,
          totalSubmissions,
          pendingSubmissions,
          totalRatings,
          totalBookmarks,
          totalFeedback,
          totalSeries,
          totalSeasons,
          totalEpisodes
        }
      }
    });
  } catch (error) {
    console.error("Error in getAnalytics:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error"
    });
  }
};

module.exports = {
  getAnalytics
};
