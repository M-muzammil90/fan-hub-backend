const mongoose = require("mongoose");
const WatchHistory = require("../models/WatchHistory");
const Series = require("../models/Series");
const Season = require("../models/Season");
const Episode = require("../models/Episode");

/**
 * POST /api/watch-history
 * Save or update watch progress for the current logged-in user.
 */
const saveProgress = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required"
      });
    }

    const { seriesId, seasonId, episodeId, progressSeconds, totalDuration } = req.body;

    if (!seriesId || !seasonId || !episodeId) {
      return res.status(400).json({
        success: false,
        message: "seriesId, seasonId, and episodeId are required"
      });
    }

    const progress = parseFloat(progressSeconds) || 0;
    const duration = parseFloat(totalDuration) || 0;
    const completed = duration > 0 && progress >= duration * 0.9; // 90%+ is completed

    const history = await WatchHistory.findOneAndUpdate(
      {
        user: userId,
        series: seriesId,
        episode: episodeId
      },
      {
        season: seasonId,
        progressSeconds: progress,
        totalDuration: duration,
        completed,
        lastWatchedAt: new Date()
      },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true
      }
    );

    return res.status(200).json({
      success: true,
      data: history
    });
  } catch (error) {
    console.error("Error saving watch progress:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
};

/**
 * GET /api/watch-history/continue-watching
 * Get list of series/episodes the user is currently watching.
 */
const getContinueWatching = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required"
      });
    }

    const historyList = await WatchHistory.find({ user: userId })
      .sort({ lastWatchedAt: -1 })
      .populate({
        path: "series",
        select: "title slug poster backdrop category genres"
      })
      .populate({
        path: "season",
        select: "seasonNumber title poster"
      })
      .populate({
        path: "episode",
        select: "episodeNumber title duration thumbnail videoUrl freePreview"
      })
      .limit(10)
      .lean();

    // Filter out items where series/season/episode was deleted
    const validItems = historyList.filter((item) => item.series && item.season && item.episode);

    return res.status(200).json({
      success: true,
      count: validItems.length,
      data: validItems
    });
  } catch (error) {
    console.error("Error in getContinueWatching:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
};

/**
 * GET /api/watch-history/series/:seriesId
 * Get watch progress for all episodes in a given series.
 */
const getSeriesWatchProgress = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { seriesId } = req.params;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }

    if (!mongoose.Types.ObjectId.isValid(seriesId)) {
      return res.status(400).json({ success: false, message: "Invalid Series ID" });
    }

    const history = await WatchHistory.find({ user: userId, series: seriesId }).lean();

    const progressMap = {};
    history.forEach((h) => {
      progressMap[h.episode.toString()] = {
        progressSeconds: h.progressSeconds,
        totalDuration: h.totalDuration,
        completed: h.completed,
        lastWatchedAt: h.lastWatchedAt
      };
    });

    return res.status(200).json({
      success: true,
      data: progressMap
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
};

/**
 * DELETE /api/watch-history
 * Clear all watch history for user.
 */
const clearWatchHistory = async (req, res) => {
  try {
    const userId = req.user?.id;
    await WatchHistory.deleteMany({ user: userId });

    return res.status(200).json({
      success: true,
      message: "Watch history cleared successfully"
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
};

module.exports = {
  saveProgress,
  getContinueWatching,
  getSeriesWatchProgress,
  clearWatchHistory
};
