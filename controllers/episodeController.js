const mongoose = require("mongoose");
const Episode = require("../models/Episode");
const Season = require("../models/Season");
const Series = require("../models/Series");
const WatchHistory = require("../models/WatchHistory");
const cloudinaryService = require("../services/cloudinary.service");

/**
 * GET /api/episodes/season/:seasonId
 * Get all episodes for a specific Season
 */
const getEpisodesBySeason = async (req, res) => {
  try {
    const { seasonId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(seasonId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Season ID format"
      });
    }

    const episodes = await Episode.find({ season: seasonId }).sort({ episodeNumber: 1 }).lean();

    return res.status(200).json({
      success: true,
      count: episodes.length,
      episodes
    });
  } catch (error) {
    console.error("Error in getEpisodesBySeason:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
};

/**
 * GET /api/episodes/:id
 * Get single episode with populated series, season, and dynamic cross-season previous/next navigation pointers.
 */
const getEpisodeById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Episode ID format"
      });
    }

    const episode = await Episode.findById(id)
      .populate("season", "seasonNumber title poster releaseYear")
      .populate("series", "title slug poster backdrop category rating genres")
      .lean();

    if (!episode) {
      return res.status(404).json({
        success: false,
        message: "Episode not found"
      });
    }

    // Increment episode view count
    Episode.findByIdAndUpdate(id, { $inc: { viewCount: 1 } }).exec();

    // Cross-Season Previous and Next Navigation Algorithm
    const parentSeriesId = episode.series?._id || episode.series;

    // Load all seasons of this series sorted by seasonNumber
    const allSeasons = await Season.find({ series: parentSeriesId, isPublished: true })
      .sort({ seasonNumber: 1 })
      .lean();

    const seasonIds = allSeasons.map((s) => s._id);

    // Load all episodes of this series across all published seasons
    const allEpisodes = await Episode.find({ season: { $in: seasonIds } })
      .sort({ episodeNumber: 1 })
      .lean();

    // Group episodes under their sorted seasons to form the complete timeline
    const orderedTimeline = [];
    allSeasons.forEach((season) => {
      const seasonEps = allEpisodes
        .filter((ep) => ep.season.toString() === season._id.toString())
        .sort((a, b) => a.episodeNumber - b.episodeNumber);

      seasonEps.forEach((ep) => {
        orderedTimeline.push({
          _id: ep._id,
          episodeNumber: ep.episodeNumber,
          title: ep.title,
          duration: ep.duration,
          thumbnail: ep.thumbnail,
          seasonId: season._id,
          seasonNumber: season.seasonNumber,
          seasonTitle: season.title
        });
      });
    });

    const currentIndex = orderedTimeline.findIndex((item) => item._id.toString() === id.toString());

    let previousEpisode = null;
    let nextEpisode = null;

    if (currentIndex > 0) {
      const prev = orderedTimeline[currentIndex - 1];
      previousEpisode = {
        _id: prev._id,
        episodeNumber: prev.episodeNumber,
        title: prev.title,
        seasonNumber: prev.seasonNumber,
        seasonTitle: prev.seasonTitle,
        seasonId: prev.seasonId
      };
    }

    if (currentIndex >= 0 && currentIndex < orderedTimeline.length - 1) {
      const next = orderedTimeline[currentIndex + 1];
      nextEpisode = {
        _id: next._id,
        episodeNumber: next.episodeNumber,
        title: next.title,
        seasonNumber: next.seasonNumber,
        seasonTitle: next.seasonTitle,
        seasonId: next.seasonId
      };
    }

    return res.status(200).json({
      success: true,
      data: {
        ...episode,
        navigation: {
          previousEpisode,
          nextEpisode,
          currentIndex: currentIndex >= 0 ? currentIndex + 1 : 1,
          totalSeriesEpisodes: orderedTimeline.length
        }
      }
    });
  } catch (error) {
    console.error("Error in getEpisodeById:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
};

/**
 * POST /api/episodes
 * Create new Episode (Admin only)
 */
const createEpisode = async (req, res) => {
  try {
    const {
      season: seasonId,
      episodeNumber,
      title,
      description,
      duration,
      videoUrl: directVideoUrl,
      thumbnail: directThumbnail,
      freePreview,
      releaseDate
    } = req.body;

    if (!seasonId) {
      return res.status(400).json({
        success: false,
        message: "Season ID is required"
      });
    }

    if (!mongoose.Types.ObjectId.isValid(seasonId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Season ID format"
      });
    }

    const seasonDoc = await Season.findById(seasonId);
    if (!seasonDoc) {
      return res.status(404).json({
        success: false,
        message: "Parent season not found"
      });
    }

    const epNum = parseInt(episodeNumber, 10);
    if (isNaN(epNum) || epNum < 1) {
      return res.status(400).json({
        success: false,
        message: "Episode number must be a positive integer"
      });
    }

    if (!title || !title.trim()) {
      return res.status(400).json({
        success: false,
        message: "Episode title is required"
      });
    }

    // Check unique constraint: (season + episodeNumber)
    const existingEpisode = await Episode.findOne({ season: seasonId, episodeNumber: epNum });
    if (existingEpisode) {
      return res.status(400).json({
        success: false,
        message: `Episode ${epNum} already exists in Season ${seasonDoc.seasonNumber}`,
        error: "DUPLICATE_EPISODE"
      });
    }

    let videoUrl = directVideoUrl || "";
    let videoPublicId = "";
    let videoResourceType = "video";
    let thumbnailUrl = directThumbnail || "";
    let thumbnailPublicId = "";

    if (req.files) {
      if (req.files.video && req.files.video[0]) {
        const vUpload = await cloudinaryService.uploadVideo(req.files.video[0], {
          folder: "fan-hub-plus/episodes/videos"
        });
        videoUrl = vUpload.url;
        videoPublicId = vUpload.publicId;
        videoResourceType = vUpload.resourceType;
      }
      if (req.files.thumbnail && req.files.thumbnail[0]) {
        const tUpload = await cloudinaryService.uploadImage(req.files.thumbnail[0], {
          folder: "fan-hub-plus/episodes/thumbnails"
        });
        thumbnailUrl = tUpload.url;
        thumbnailPublicId = tUpload.publicId;
      }
    }

    if (!videoUrl) {
      return res.status(400).json({
        success: false,
        message: "Video URL or uploaded video file is required"
      });
    }

    const newEpisode = await Episode.create({
      season: seasonId,
      series: seasonDoc.series,
      episodeNumber: epNum,
      title: title.trim(),
      description: description || "",
      duration: duration ? duration.trim() : "24m",
      videoUrl,
      videoPublicId,
      videoResourceType,
      thumbnail: thumbnailUrl || seasonDoc.poster,
      thumbnailPublicId,
      freePreview: freePreview === true || freePreview === "true",
      releaseDate: releaseDate ? new Date(releaseDate) : new Date()
    });

    return res.status(201).json({
      success: true,
      message: "Episode created successfully",
      data: newEpisode
    });
  } catch (error) {
    console.error("Error creating episode:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create episode",
      error: error.message
    });
  }
};

/**
 * PUT /api/episodes/:id
 * Update Episode (Admin only)
 */
const updateEpisode = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Episode ID format"
      });
    }

    const episode = await Episode.findById(id);
    if (!episode) {
      return res.status(404).json({
        success: false,
        message: "Episode not found"
      });
    }

    const {
      episodeNumber,
      title,
      description,
      duration,
      videoUrl: directVideoUrl,
      thumbnail: directThumbnail,
      freePreview,
      releaseDate
    } = req.body;

    if (episodeNumber !== undefined) {
      const epNum = parseInt(episodeNumber, 10);
      if (isNaN(epNum) || epNum < 1) {
        return res.status(400).json({
          success: false,
          message: "Episode number must be a positive integer"
        });
      }

      if (epNum !== episode.episodeNumber) {
        const duplicate = await Episode.findOne({
          season: episode.season,
          episodeNumber: epNum,
          _id: { $ne: id }
        });
        if (duplicate) {
          return res.status(400).json({
            success: false,
            message: `Episode ${epNum} already exists in this season`,
            error: "DUPLICATE_EPISODE"
          });
        }
        episode.episodeNumber = epNum;
      }
    }

    if (title) episode.title = title.trim();
    if (description !== undefined) episode.description = description;
    if (duration !== undefined) episode.duration = duration.trim();
    if (freePreview !== undefined) episode.freePreview = freePreview === true || freePreview === "true";
    if (releaseDate) episode.releaseDate = new Date(releaseDate);

    // Handle video update
    if (req.files && req.files.video && req.files.video[0]) {
      if (episode.videoPublicId) {
        await cloudinaryService.deleteFile(episode.videoPublicId, episode.videoResourceType || "video");
      }
      const vUpload = await cloudinaryService.uploadVideo(req.files.video[0], {
        folder: "fan-hub-plus/episodes/videos"
      });
      episode.videoUrl = vUpload.url;
      episode.videoPublicId = vUpload.publicId;
      episode.videoResourceType = vUpload.resourceType;
    } else if (directVideoUrl !== undefined && directVideoUrl.trim() !== "") {
      episode.videoUrl = directVideoUrl.trim();
    }

    // Handle thumbnail update
    if (req.files && req.files.thumbnail && req.files.thumbnail[0]) {
      if (episode.thumbnailPublicId) {
        await cloudinaryService.deleteFile(episode.thumbnailPublicId, "image");
      }
      const tUpload = await cloudinaryService.uploadImage(req.files.thumbnail[0], {
        folder: "fan-hub-plus/episodes/thumbnails"
      });
      episode.thumbnail = tUpload.url;
      episode.thumbnailPublicId = tUpload.publicId;
    } else if (directThumbnail !== undefined) {
      episode.thumbnail = directThumbnail;
    }

    await episode.save();

    return res.status(200).json({
      success: true,
      message: "Episode updated successfully",
      data: episode
    });
  } catch (error) {
    console.error("Error updating episode:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update episode",
      error: error.message
    });
  }
};

/**
 * DELETE /api/episodes/:id
 * Delete Episode (Admin only)
 */
const deleteEpisode = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Episode ID format"
      });
    }

    const episode = await Episode.findById(id);
    if (!episode) {
      return res.status(404).json({
        success: false,
        message: "Episode not found"
      });
    }

    // Clean up Cloudinary files
    const mediaToDelete = [];
    if (episode.thumbnailPublicId) mediaToDelete.push({ publicId: episode.thumbnailPublicId, resourceType: "image" });
    if (episode.videoPublicId) mediaToDelete.push({ publicId: episode.videoPublicId, resourceType: episode.videoResourceType || "video" });

    if (mediaToDelete.length > 0) {
      cloudinaryService.deleteMultipleFiles(mediaToDelete).catch((err) => {
        console.error("Cloudinary cleanup warning on episode delete:", err.message);
      });
    }

    await Promise.all([
      WatchHistory.deleteMany({ episode: id }),
      Episode.findByIdAndDelete(id)
    ]);

    return res.status(200).json({
      success: true,
      message: "Episode deleted successfully"
    });
  } catch (error) {
    console.error("Error deleting episode:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete episode",
      error: error.message
    });
  }
};

module.exports = {
  getEpisodesBySeason,
  getEpisodeById,
  createEpisode,
  updateEpisode,
  deleteEpisode
};
