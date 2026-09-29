const mongoose = require("mongoose");
const Series = require("../models/Series");
const Season = require("../models/Season");
const Episode = require("../models/Episode");
const Category = require("../models/Category");
const WatchHistory = require("../models/WatchHistory");
const cloudinaryService = require("../services/cloudinary.service");

// Helper to generate a clean URL slug
const slugify = (text) => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w\-]+/g, "")
    .replace(/\-\-+/g, "-");
};

/**
 * GET /api/series
 * Get all series with filtering, sorting, pagination, and calculated season/episode counts.
 */
const getAllSeries = async (req, res) => {
  try {
    const filter = {};
    const { category, genre, status, search, sortBy, isFeatured, page = 1, limit = 24 } = req.query;

    if (category) {
      if (mongoose.Types.ObjectId.isValid(category)) {
        filter.category = category;
      } else {
        const foundCat = await Category.findOne({ slug: category });
        if (foundCat) filter.category = foundCat._id;
      }
    }

    if (genre) {
      filter.genres = { $regex: genre, $options: "i" };
    }

    if (status) {
      filter.status = status;
    }

    if (isFeatured !== undefined) {
      filter.isFeatured = isFeatured === "true" || isFeatured === true;
    }

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { genres: { $regex: search, $options: "i" } }
      ];
    }

    let sortOptions = { createdAt: -1 };
    if (sortBy === "popular") sortOptions = { viewCount: -1, rating: -1 };
    else if (sortBy === "rating") sortOptions = { rating: -1 };
    else if (sortBy === "alphabetical") sortOptions = { title: 1 };
    else if (sortBy === "latest") sortOptions = { releaseYear: -1, createdAt: -1 };

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const [seriesList, total] = await Promise.all([
      Series.find(filter)
        .populate("category", "name slug")
        .sort(sortOptions)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Series.countDocuments(filter)
    ]);

    // Attach seasonsCount and episodesCount for each series
    const seriesIds = seriesList.map((s) => s._id);
    const [seasonCounts, episodeCounts] = await Promise.all([
      Season.aggregate([
        { $match: { series: { $in: seriesIds } } },
        { $group: { _id: "$series", count: { $sum: 1 } } }
      ]),
      Episode.aggregate([
        { $match: { series: { $in: seriesIds } } },
        { $group: { _id: "$series", count: { $sum: 1 } } }
      ])
    ]);

    const seasonMap = {};
    seasonCounts.forEach((sc) => {
      seasonMap[sc._id.toString()] = sc.count;
    });

    const episodeMap = {};
    episodeCounts.forEach((ec) => {
      episodeMap[ec._id.toString()] = ec.count;
    });

    const enhancedSeries = seriesList.map((item) => ({
      ...item,
      seasonsCount: seasonMap[item._id.toString()] || 0,
      episodesCount: episodeMap[item._id.toString()] || 0
    }));

    return res.status(200).json({
      success: true,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
      series: enhancedSeries
    });
  } catch (error) {
    console.error("Error in getAllSeries:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
};

/**
 * GET /api/series/featured
 * Get featured series for banners / showcase
 */
const getFeaturedSeries = async (req, res) => {
  try {
    const featured = await Series.find({ isFeatured: true, isPublished: true })
      .populate("category", "name slug")
      .sort({ rating: -1, viewCount: -1 })
      .limit(8)
      .lean();

    return res.status(200).json({
      success: true,
      count: featured.length,
      series: featured
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
 * GET /api/series/:idOrSlug
 * Get single series with fully populated seasons and episodes.
 */
const getSeriesByIdOrSlug = async (req, res) => {
  try {
    const { idOrSlug } = req.params;
    let seriesQuery;

    if (mongoose.Types.ObjectId.isValid(idOrSlug)) {
      seriesQuery = { _id: idOrSlug };
    } else {
      seriesQuery = { slug: idOrSlug.toLowerCase() };
    }

    const series = await Series.findOne(seriesQuery).populate("category", "name slug").lean();

    if (!series) {
      return res.status(404).json({
        success: false,
        message: "Series not found"
      });
    }

    // Increment view count asynchronously
    Series.findByIdAndUpdate(series._id, { $inc: { viewCount: 1 } }).exec();

    // Fetch all seasons belonging to this series, ordered by seasonNumber
    const seasons = await Season.find({ series: series._id }).sort({ seasonNumber: 1 }).lean();
    const seasonIds = seasons.map((s) => s._id);

    // Fetch all episodes belonging to these seasons, ordered by episodeNumber
    const episodes = await Episode.find({ season: { $in: seasonIds } })
      .sort({ episodeNumber: 1 })
      .lean();

    // Group episodes by season
    const seasonsWithEpisodes = seasons.map((season) => ({
      ...season,
      episodes: episodes.filter((ep) => ep.season.toString() === season._id.toString())
    }));

    return res.status(200).json({
      success: true,
      data: {
        ...series,
        seasons: seasonsWithEpisodes,
        totalSeasons: seasons.length,
        totalEpisodes: episodes.length
      }
    });
  } catch (error) {
    console.error("Error in getSeriesByIdOrSlug:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
};

/**
 * POST /api/series
 * Create new Series (Admin only)
 */
const createSeries = async (req, res) => {
  try {
    const {
      title,
      slug: customSlug,
      description,
      category,
      status,
      releaseYear,
      trailerUrl,
      genres,
      tags,
      rating,
      isFeatured,
      isPublished
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({
        success: false,
        message: "Series title is required"
      });
    }

    if (!category) {
      return res.status(400).json({
        success: false,
        message: "Category is required"
      });
    }

    if (!mongoose.Types.ObjectId.isValid(category)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Category ID format"
      });
    }

    const categoryExists = await Category.findById(category);
    if (!categoryExists) {
      return res.status(404).json({
        success: false,
        message: "Referenced category does not exist"
      });
    }

    let finalSlug = customSlug ? slugify(customSlug) : slugify(title);
    const existingSlug = await Series.findOne({ slug: finalSlug });
    if (existingSlug) {
      finalSlug = `${finalSlug}-${Date.now().toString().slice(-4)}`;
    }

    let posterUrl = req.body.poster || "";
    let posterPublicId = "";
    let backdropUrl = req.body.backdrop || "";
    let backdropPublicId = "";

    // Upload files if present in multipart
    if (req.files) {
      if (req.files.poster && req.files.poster[0]) {
        const pUpload = await cloudinaryService.uploadImage(req.files.poster[0], {
          folder: "fan-hub-plus/series/posters"
        });
        posterUrl = pUpload.url;
        posterPublicId = pUpload.publicId;
      }
      if (req.files.backdrop && req.files.backdrop[0]) {
        const bUpload = await cloudinaryService.uploadImage(req.files.backdrop[0], {
          folder: "fan-hub-plus/series/backdrops"
        });
        backdropUrl = bUpload.url;
        backdropPublicId = bUpload.publicId;
      }
    }

    let parsedGenres = [];
    if (Array.isArray(genres)) parsedGenres = genres;
    else if (typeof genres === "string") {
      try {
        parsedGenres = JSON.parse(genres);
      } catch (e) {
        parsedGenres = genres.split(",").map((g) => g.trim()).filter(Boolean);
      }
    }

    let parsedTags = [];
    if (Array.isArray(tags)) parsedTags = tags;
    else if (typeof tags === "string") {
      try {
        parsedTags = JSON.parse(tags);
      } catch (e) {
        parsedTags = tags.split(",").map((t) => t.trim()).filter(Boolean);
      }
    }

    const newSeries = await Series.create({
      title: title.trim(),
      slug: finalSlug,
      description: description || "",
      category,
      status: status || "ongoing",
      releaseYear: releaseYear ? parseInt(releaseYear, 10) : new Date().getFullYear(),
      poster: posterUrl,
      posterPublicId,
      backdrop: backdropUrl,
      backdropPublicId,
      trailerUrl: trailerUrl || "",
      genres: parsedGenres,
      tags: parsedTags,
      rating: rating !== undefined ? parseFloat(rating) : 0,
      isFeatured: isFeatured === true || isFeatured === "true",
      isPublished: isPublished !== undefined ? isPublished === true || isPublished === "true" : true
    });

    const populated = await Series.findById(newSeries._id).populate("category", "name slug");

    return res.status(201).json({
      success: true,
      message: "Series created successfully",
      data: populated
    });
  } catch (error) {
    console.error("Error creating series:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create series",
      error: error.message
    });
  }
};

/**
 * PUT /api/series/:id
 * Update Series (Admin only)
 */
const updateSeries = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Series ID format"
      });
    }

    const series = await Series.findById(id);
    if (!series) {
      return res.status(404).json({
        success: false,
        message: "Series not found"
      });
    }

    const {
      title,
      slug: customSlug,
      description,
      category,
      status,
      releaseYear,
      trailerUrl,
      genres,
      tags,
      rating,
      isFeatured,
      isPublished,
      poster: directPoster,
      backdrop: directBackdrop
    } = req.body;

    if (title) series.title = title.trim();

    if (customSlug && customSlug !== series.slug) {
      const cleanSlug = slugify(customSlug);
      const existing = await Series.findOne({ slug: cleanSlug, _id: { $ne: id } });
      if (existing) {
        return res.status(400).json({
          success: false,
          message: "Slug is already in use by another series"
        });
      }
      series.slug = cleanSlug;
    }

    if (description !== undefined) series.description = description;

    if (category) {
      if (!mongoose.Types.ObjectId.isValid(category)) {
        return res.status(400).json({ success: false, message: "Invalid category ID" });
      }
      series.category = category;
    }

    if (status) series.status = status;
    if (releaseYear) series.releaseYear = parseInt(releaseYear, 10);
    if (trailerUrl !== undefined) series.trailerUrl = trailerUrl;
    if (rating !== undefined) series.rating = parseFloat(rating);
    if (isFeatured !== undefined) series.isFeatured = isFeatured === true || isFeatured === "true";
    if (isPublished !== undefined) series.isPublished = isPublished === true || isPublished === "true";

    if (genres !== undefined) {
      if (Array.isArray(genres)) series.genres = genres;
      else if (typeof genres === "string") {
        try {
          series.genres = JSON.parse(genres);
        } catch (e) {
          series.genres = genres.split(",").map((g) => g.trim()).filter(Boolean);
        }
      }
    }

    if (tags !== undefined) {
      if (Array.isArray(tags)) series.tags = tags;
      else if (typeof tags === "string") {
        try {
          series.tags = JSON.parse(tags);
        } catch (e) {
          series.tags = tags.split(",").map((t) => t.trim()).filter(Boolean);
        }
      }
    }

    // Handle poster file or direct URL
    if (req.files && req.files.poster && req.files.poster[0]) {
      if (series.posterPublicId) {
        await cloudinaryService.deleteFile(series.posterPublicId, "image");
      }
      const pUpload = await cloudinaryService.uploadImage(req.files.poster[0], {
        folder: "fan-hub-plus/series/posters"
      });
      series.poster = pUpload.url;
      series.posterPublicId = pUpload.publicId;
    } else if (directPoster !== undefined) {
      series.poster = directPoster;
    }

    // Handle backdrop file or direct URL
    if (req.files && req.files.backdrop && req.files.backdrop[0]) {
      if (series.backdropPublicId) {
        await cloudinaryService.deleteFile(series.backdropPublicId, "image");
      }
      const bUpload = await cloudinaryService.uploadImage(req.files.backdrop[0], {
        folder: "fan-hub-plus/series/backdrops"
      });
      series.backdrop = bUpload.url;
      series.backdropPublicId = bUpload.publicId;
    } else if (directBackdrop !== undefined) {
      series.backdrop = directBackdrop;
    }

    await series.save();
    const updated = await Series.findById(series._id).populate("category", "name slug");

    return res.status(200).json({
      success: true,
      message: "Series updated successfully",
      data: updated
    });
  } catch (error) {
    console.error("Error updating series:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update series",
      error: error.message
    });
  }
};

/**
 * DELETE /api/series/:id
 * Cascade Delete Series: deletes all seasons, episodes, watch histories, and Cloudinary media.
 */
const deleteSeries = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Series ID format"
      });
    }

    const series = await Series.findById(id);
    if (!series) {
      return res.status(404).json({
        success: false,
        message: "Series not found"
      });
    }

    // 1. Find all seasons
    const seasons = await Season.find({ series: id });
    const seasonIds = seasons.map((s) => s._id);

    // 2. Find all episodes
    const episodes = await Episode.find({ $or: [{ series: id }, { season: { $in: seasonIds } }] });

    // 3. Collect all Cloudinary media for batch cleanup
    const mediaToDelete = [];
    if (series.posterPublicId) mediaToDelete.push({ publicId: series.posterPublicId, resourceType: "image" });
    if (series.backdropPublicId) mediaToDelete.push({ publicId: series.backdropPublicId, resourceType: "image" });

    seasons.forEach((season) => {
      if (season.posterPublicId) mediaToDelete.push({ publicId: season.posterPublicId, resourceType: "image" });
    });

    episodes.forEach((ep) => {
      if (ep.thumbnailPublicId) mediaToDelete.push({ publicId: ep.thumbnailPublicId, resourceType: "image" });
      if (ep.videoPublicId) mediaToDelete.push({ publicId: ep.videoPublicId, resourceType: ep.videoResourceType || "video" });
    });

    if (mediaToDelete.length > 0) {
      cloudinaryService.deleteMultipleFiles(mediaToDelete).catch((err) => {
        console.error("Cloudinary cleanup warning on series delete:", err.message);
      });
    }

    // 4. Cascade delete DB records
    await Promise.all([
      Episode.deleteMany({ $or: [{ series: id }, { season: { $in: seasonIds } }] }),
      Season.deleteMany({ series: id }),
      WatchHistory.deleteMany({ series: id }),
      Series.findByIdAndDelete(id)
    ]);

    return res.status(200).json({
      success: true,
      message: "Series and all associated seasons and episodes deleted successfully"
    });
  } catch (error) {
    console.error("Error deleting series:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete series",
      error: error.message
    });
  }
};

module.exports = {
  getAllSeries,
  getFeaturedSeries,
  getSeriesByIdOrSlug,
  createSeries,
  updateSeries,
  deleteSeries
};
