const mongoose = require("mongoose");
const Season = require("../models/Season");
const Series = require("../models/Series");
const Episode = require("../models/Episode");
const WatchHistory = require("../models/WatchHistory");
const cloudinaryService = require("../services/cloudinary.service");

/**
 * GET /api/seasons/series/:seriesId
 * Get all seasons of a given Series with their episodes.
 */
const getSeasonsBySeries = async (req, res) => {
  try {
    const { seriesId } = req.params;
    let sQuery = { series: seriesId };

    if (!mongoose.Types.ObjectId.isValid(seriesId)) {
      const foundSeries = await Series.findOne({ slug: seriesId.toLowerCase() });
      if (!foundSeries) {
        return res.status(404).json({
          success: false,
          message: "Series not found"
        });
      }
      sQuery.series = foundSeries._id;
    }

    const seasons = await Season.find(sQuery).sort({ seasonNumber: 1 }).lean();
    const seasonIds = seasons.map((s) => s._id);

    const episodes = await Episode.find({ season: { $in: seasonIds } })
      .sort({ episodeNumber: 1 })
      .lean();

    const seasonsWithEpisodes = seasons.map((season) => ({
      ...season,
      episodes: episodes.filter((ep) => ep.season.toString() === season._id.toString()),
      episodeCount: episodes.filter((ep) => ep.season.toString() === season._id.toString()).length
    }));

    return res.status(200).json({
      success: true,
      count: seasonsWithEpisodes.length,
      seasons: seasonsWithEpisodes
    });
  } catch (error) {
    console.error("Error in getSeasonsBySeries:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
};

/**
 * GET /api/seasons/:id
 * Get single season with its episodes.
 */
const getSeasonById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Season ID format"
      });
    }

    const season = await Season.findById(id).populate("series", "title slug category").lean();
    if (!season) {
      return res.status(404).json({
        success: false,
        message: "Season not found"
      });
    }

    const episodes = await Episode.find({ season: id }).sort({ episodeNumber: 1 }).lean();

    return res.status(200).json({
      success: true,
      data: {
        ...season,
        episodes,
        episodeCount: episodes.length
      }
    });
  } catch (error) {
    console.error("Error in getSeasonById:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
};

/**
 * POST /api/seasons
 * Create new Season (Admin only)
 */
const createSeason = async (req, res) => {
  try {
    const { series: seriesId, seasonNumber, title, description, releaseYear, trailerUrl, isPublished } = req.body;

    if (!seriesId) {
      return res.status(400).json({
        success: false,
        message: "Series ID is required"
      });
    }

    if (!mongoose.Types.ObjectId.isValid(seriesId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Series ID format"
      });
    }

    const seriesDoc = await Series.findById(seriesId);
    if (!seriesDoc) {
      return res.status(404).json({
        success: false,
        message: "Parent series not found"
      });
    }

    const num = parseInt(seasonNumber, 10);
    if (isNaN(num) || num < 1) {
      return res.status(400).json({
        success: false,
        message: "Season number must be a positive integer"
      });
    }

    // Check unique constraint: (series + seasonNumber)
    const existingSeason = await Season.findOne({ series: seriesId, seasonNumber: num });
    if (existingSeason) {
      return res.status(400).json({
        success: false,
        message: `Season ${num} already exists for this series`,
        error: "DUPLICATE_SEASON"
      });
    }

    let posterUrl = req.body.poster || "";
    let posterPublicId = "";

    if (req.file) {
      const pUpload = await cloudinaryService.uploadImage(req.file, {
        folder: "fan-hub-plus/seasons/posters"
      });
      posterUrl = pUpload.url;
      posterPublicId = pUpload.publicId;
    }

    const newSeason = await Season.create({
      series: seriesId,
      seasonNumber: num,
      title: title ? title.trim() : `Season ${num}`,
      description: description || "",
      poster: posterUrl || seriesDoc.poster,
      posterPublicId,
      releaseYear: releaseYear ? parseInt(releaseYear, 10) : new Date().getFullYear(),
      trailerUrl: trailerUrl || "",
      isPublished: isPublished !== undefined ? isPublished === true || isPublished === "true" : true
    });

    return res.status(201).json({
      success: true,
      message: "Season created successfully",
      data: newSeason
    });
  } catch (error) {
    console.error("Error creating season:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create season",
      error: error.message
    });
  }
};

/**
 * PUT /api/seasons/:id
 * Update Season (Admin only)
 */
const updateSeason = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Season ID format"
      });
    }

    const season = await Season.findById(id);
    if (!season) {
      return res.status(404).json({
        success: false,
        message: "Season not found"
      });
    }

    const { seasonNumber, title, description, releaseYear, trailerUrl, isPublished, poster: directPoster } = req.body;

    if (seasonNumber !== undefined) {
      const num = parseInt(seasonNumber, 10);
      if (isNaN(num) || num < 1) {
        return res.status(400).json({
          success: false,
          message: "Season number must be a positive integer"
        });
      }

      if (num !== season.seasonNumber) {
        const duplicate = await Season.findOne({
          series: season.series,
          seasonNumber: num,
          _id: { $ne: id }
        });
        if (duplicate) {
          return res.status(400).json({
            success: false,
            message: `Season ${num} already exists for this series`,
            error: "DUPLICATE_SEASON"
          });
        }
        season.seasonNumber = num;
      }
    }

    if (title !== undefined) season.title = title.trim();
    if (description !== undefined) season.description = description;
    if (releaseYear !== undefined) season.releaseYear = parseInt(releaseYear, 10);
    if (trailerUrl !== undefined) season.trailerUrl = trailerUrl;
    if (isPublished !== undefined) season.isPublished = isPublished === true || isPublished === "true";

    if (req.file) {
      if (season.posterPublicId) {
        await cloudinaryService.deleteFile(season.posterPublicId, "image");
      }
      const pUpload = await cloudinaryService.uploadImage(req.file, {
        folder: "fan-hub-plus/seasons/posters"
      });
      season.poster = pUpload.url;
      season.posterPublicId = pUpload.publicId;
    } else if (directPoster !== undefined) {
      season.poster = directPoster;
    }

    await season.save();

    return res.status(200).json({
      success: true,
      message: "Season updated successfully",
      data: season
    });
  } catch (error) {
    console.error("Error updating season:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update season",
      error: error.message
    });
  }
};

/**
 * DELETE /api/seasons/:id
 * Cascade Delete Season: deletes its episodes, watch history, and Cloudinary files.
 */
const deleteSeason = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Season ID format"
      });
    }

    const season = await Season.findById(id);
    if (!season) {
      return res.status(404).json({
        success: false,
        message: "Season not found"
      });
    }

    // 1. Find all episodes
    const episodes = await Episode.find({ season: id });

    // 2. Clean up media
    const mediaToDelete = [];
    if (season.posterPublicId) mediaToDelete.push({ publicId: season.posterPublicId, resourceType: "image" });

    episodes.forEach((ep) => {
      if (ep.thumbnailPublicId) mediaToDelete.push({ publicId: ep.thumbnailPublicId, resourceType: "image" });
      if (ep.videoPublicId) mediaToDelete.push({ publicId: ep.videoPublicId, resourceType: ep.videoResourceType || "video" });
    });

    if (mediaToDelete.length > 0) {
      cloudinaryService.deleteMultipleFiles(mediaToDelete).catch((err) => {
        console.error("Cloudinary cleanup warning on season delete:", err.message);
      });
    }

    // 3. Delete episodes, watch history, and season
    await Promise.all([
      Episode.deleteMany({ season: id }),
      WatchHistory.deleteMany({ season: id }),
      Season.findByIdAndDelete(id)
    ]);

    return res.status(200).json({
      success: true,
      message: "Season and its episodes deleted successfully"
    });
  } catch (error) {
    console.error("Error deleting season:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete season",
      error: error.message
    });
  }
};

module.exports = {
  getSeasonsBySeries,
  getSeasonById,
  createSeason,
  updateSeason,
  deleteSeason
};
